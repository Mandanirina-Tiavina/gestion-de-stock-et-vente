import pool from '../config/database.js';

// ---------------------------------------------------------------------------
// Erreurs métier : permettent de sortir proprement d'une transaction.
// ---------------------------------------------------------------------------
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value) => typeof value === 'string' && UUID_RE.test(value.trim());

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const ALLOWED_STATUS_TRANSITIONS = {
  en_attente: ['vendu', 'annule'],
  annule: ['en_attente'],
  vendu: []
};

// Valide et normalise les lignes envoyées par le client.
const normalizeItems = (rawItems) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new HttpError(400, 'La commande doit contenir au moins un produit.');
  }

  return rawItems.map((raw) => {
    if (!raw || typeof raw !== 'object') {
      throw new HttpError(400, 'Article de commande invalide.');
    }
    if (!isUuid(raw.product_id)) {
      throw new HttpError(400, 'Identifiant de produit invalide.');
    }

    const quantity = Number(raw.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new HttpError(400, 'La quantité de chaque produit doit être un entier positif.');
    }

    let customPrice;
    if (raw.custom_price !== undefined && raw.custom_price !== null && raw.custom_price !== '') {
      customPrice = Number(raw.custom_price);
      if (!Number.isFinite(customPrice) || customPrice < 0) {
        throw new HttpError(400, 'Le prix personnalisé ne peut pas être négatif.');
      }
      customPrice = round2(customPrice);
    }

    return {
      product_id: raw.product_id.trim().toLowerCase(),
      quantity,
      custom_price: customPrice
    };
  });
};

// Cumule la demande par produit pour éviter qu'une commande contenant deux
// lignes du même produit dépasse le stock disponible.
const aggregateDemand = (items) => {
  const demand = new Map();
  for (const item of items) {
    demand.set(item.product_id, (demand.get(item.product_id) || 0) + item.quantity);
  }
  return demand;
};

// Verrouille et retourne les produits demandés (tri stable pour éviter les
// interblocages entre transactions concurrentes).
const loadProductsForUpdate = async (client, shopId, productIds) => {
  const ids = [...new Set(productIds.map((id) => id.toLowerCase()))];

  const result = await client.query(`
    SELECT
      p.id, p.name, p.price, p.size, p.quantity,
      c.name AS category_name,
      col.name AS color_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN colors col ON p.color_id = col.id
    WHERE p.shop_id = $1 AND p.id = ANY($2::uuid[])
    ORDER BY p.id
    FOR UPDATE OF p
  `, [shopId, ids]);

  const byId = new Map(result.rows.map((product) => [product.id.toLowerCase(), product]));

  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new HttpError(404, `Produit ${missing[0]} non trouvé.`);
  }

  return byId;
};

const checkStock = (demand, productsById) => {
  for (const [productId, quantity] of demand) {
    const product = productsById.get(productId);
    if (product.quantity < quantity) {
      throw new HttpError(
        400,
        `Stock insuffisant pour ${product.name}. Disponible: ${product.quantity}`
      );
    }
  }
};

const decrementStock = async (client, shopId, demand) => {
  for (const [productId, quantity] of demand) {
    const result = await client.query(`
      UPDATE products
      SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND shop_id = $3 AND quantity >= $1
    `, [quantity, productId, shopId]);

    if (result.rowCount === 0) {
      throw new HttpError(
        400,
        'Stock insuffisant : la commande a été modifiée entre-temps, veuillez réessayer.'
      );
    }
  }
};

const restoreStock = async (client, shopId, items) => {
  // Ordre stable de verrouillage pour éviter les interblocages entre
  // transactions concurrentes qui touchent les mêmes produits.
  const sortedItems = items
    .filter((item) => item.product_id)
    .slice()
    .sort((a, b) => String(a.product_id).localeCompare(String(b.product_id)));

  for (const item of sortedItems) {
    await client.query(`
      UPDATE products
      SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND shop_id = $3
    `, [item.quantity, item.product_id, shopId]);
  }
};

const buildProductName = (product) => {
  const details = [];
  if (product.size && product.size.trim() !== '') details.push(product.size);
  if (product.color_name && product.color_name.trim() !== '') details.push(product.color_name);
  return details.length > 0 ? `${product.name} - ${details.join(' - ')}` : product.name;
};

// Répartit le prix final sur chaque ligne de vente, au prorata des totaux.
// La dernière ligne absorbe l'arrondi pour que la somme soit exacte.
const allocatePrice = (items, totalAmount, targetPrice) => {
  const allocations = [];
  if (items.length === 0) return allocations;

  const fallbackEqual = !(totalAmount > 0);
  const equalShare = round2(targetPrice / items.length);

  let allocated = 0;
  for (let i = 0; i < items.length; i++) {
    const isLast = i === items.length - 1;
    let value;

    if (isLast) {
      value = round2(targetPrice - allocated);
    } else if (fallbackEqual) {
      value = equalShare;
    } else {
      value = round2(targetPrice * (Number(items[i].total_price) / totalAmount));
    }

    allocations.push(value);
    allocated = round2(allocated + value);
  }

  return allocations;
};

// Obtenir toutes les commandes avec leurs produits
export const getAllOrders = async (req, res) => {
  try {
    const ordersResult = await pool.query(`
      SELECT 
        o.id, o.order_number, o.customer_name, o.customer_phone, o.customer_email,
        o.delivery_address, o.delivery_date, o.status, o.final_price, o.total_amount,
        o.created_at, o.updated_at,
        u.username as created_by_username
      FROM orders o
      LEFT JOIN users u ON o.created_by = u.id
      WHERE o.shop_id = $1
      ORDER BY o.created_at DESC
    `, [req.user.shopId]);

    const orders = await Promise.all(ordersResult.rows.map(async (order) => {
      const itemsResult = await pool.query(`
        SELECT 
          oi.id, oi.product_id, oi.product_name, oi.category_name,
          oi.quantity, oi.unit_price, oi.total_price
        FROM order_items oi
        WHERE oi.order_id = $1
      `, [order.id]);

      return {
        ...order,
        items: itemsResult.rows
      };
    }));

    res.json(orders);
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Obtenir une commande par ID avec ses produits
export const getOrderById = async (req, res) => {
  const { id } = req.params;

  try {
    const orderResult = await pool.query(`
      SELECT 
        o.id, o.order_number, o.customer_name, o.customer_phone, o.customer_email,
        o.delivery_address, o.delivery_date, o.status, o.final_price, o.total_amount,
        o.created_at, o.updated_at,
        u.username as created_by_username
      FROM orders o
      LEFT JOIN users u ON o.created_by = u.id
      WHERE o.id = $1 AND o.shop_id = $2
    `, [id, req.user.shopId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Commande non trouvée.' });
    }

    const itemsResult = await pool.query(`
      SELECT 
        oi.id, oi.product_id, oi.product_name, oi.category_name,
        oi.quantity, oi.unit_price, oi.total_price
      FROM order_items oi
      WHERE oi.order_id = $1
    `, [id]);

    res.json({
      ...orderResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la commande:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Créer une nouvelle commande multi-produits
export const createOrder = async (req, res) => {
  const {
    items: rawItems,
    customer_name,
    customer_phone,
    customer_email,
    delivery_address,
    delivery_date
  } = req.body;

  const client = await pool.connect();

  try {
    const items = normalizeItems(rawItems);

    await client.query('BEGIN');

    const demand = aggregateDemand(items);
    const productsById = await loadProductsForUpdate(client, req.user.shopId, [...demand.keys()]);
    checkStock(demand, productsById);

    // Numéro de commande séquentiel propre à la boutique, alloué de façon
    // atomique (sûr même avec des créations concurrentes).
    const counterResult = await client.query(`
      INSERT INTO shop_order_counters (shop_id, last_order_number)
      VALUES ($1, 1)
      ON CONFLICT (shop_id) DO UPDATE
        SET last_order_number = shop_order_counters.last_order_number + 1
      RETURNING last_order_number
    `, [req.user.shopId]);

    const orderNumber = counterResult.rows[0].last_order_number;

    const orderResult = await client.query(`
      INSERT INTO orders (
        shop_id, order_number, customer_name, customer_phone, customer_email,
        delivery_address, delivery_date, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      req.user.shopId,
      orderNumber,
      customer_name,
      customer_phone,
      customer_email,
      delivery_address,
      delivery_date,
      req.user.id
    ]);

    const orderId = orderResult.rows[0].id;
    let totalAmount = 0;

    for (const item of items) {
      const product = productsById.get(item.product_id);
      const unitPrice = item.custom_price ?? round2(Number(product.price));
      const totalPrice = round2(unitPrice * item.quantity);
      totalAmount = round2(totalAmount + totalPrice);

      await client.query(`
        INSERT INTO order_items (
          order_id, product_id, product_name, category_name,
          quantity, unit_price, total_price
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        orderId,
        product.id,
        buildProductName(product),
        product.category_name,
        item.quantity,
        unitPrice,
        totalPrice
      ]);
    }

    await decrementStock(client, req.user.shopId, demand);

    await client.query(`
      UPDATE orders SET total_amount = $1 WHERE id = $2
    `, [totalAmount, orderId]);

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Commande créée avec succès',
      order: {
        ...orderResult.rows[0],
        total_amount: totalAmount
      }
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Erreur lors de la création de la commande:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  } finally {
    client.release();
  }
};

// Mettre à jour le statut d'une commande
export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status, final_price } = req.body;

  if (!['en_attente', 'vendu', 'annule'].includes(status)) {
    return res.status(400).json({ error: 'Statut invalide.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orderResult = await client.query(`
      SELECT * FROM orders WHERE id = $1 AND shop_id = $2 FOR UPDATE
    `, [id, req.user.shopId]);

    if (orderResult.rows.length === 0) {
      throw new HttpError(404, 'Commande non trouvée.');
    }

    const order = orderResult.rows[0];

    // Appel idempotent : on ne rejoue jamais une vente ou une annulation.
    if (order.status === status) {
      await client.query('COMMIT');
      return res.json({
        message: 'Le statut de la commande est déjà à jour',
        status,
        final_price: order.final_price
      });
    }

    const allowed = ALLOWED_STATUS_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      throw new HttpError(
        400,
        `Transition de statut impossible : ${order.status} → ${status}.`
      );
    }

    const itemsResult = await client.query(
      'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC, id ASC',
      [id]
    );
    const items = itemsResult.rows;

    if (status === 'vendu') {
      let targetPrice;
      const hasFinalPrice =
        final_price !== undefined && final_price !== null && final_price !== '';

      if (hasFinalPrice) {
        targetPrice = Number(final_price);
        if (!Number.isFinite(targetPrice) || targetPrice < 0) {
          throw new HttpError(400, 'Le prix final ne peut pas être négatif.');
        }
        targetPrice = round2(targetPrice);
      } else {
        targetPrice = round2(Number(order.total_amount) || 0);
      }

      const totalAmount = round2(Number(order.total_amount) || 0);
      const allocations = allocatePrice(items, totalAmount, targetPrice);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        await client.query(`
          INSERT INTO sales (
            shop_id, order_id, product_id, product_name, category_name,
            customer_name, final_price, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          req.user.shopId,
          id,
          item.product_id,
          item.product_name,
          item.category_name,
          order.customer_name,
          allocations[i],
          req.user.id
        ]);
      }

      await client.query(`
        UPDATE orders 
        SET status = $1, final_price = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND shop_id = $4
      `, [status, targetPrice, id, req.user.shopId]);

      await client.query(`
        INSERT INTO transactions (
          shop_id, type, category, amount, description, transaction_date, created_by
        )
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
      `, [
        req.user.shopId,
        'revenu',
        'Vente',
        targetPrice,
        `Vente commande #${order.order_number} - ${order.customer_name}`,
        req.user.id
      ]);

      await client.query('COMMIT');

      return res.json({
        message: 'Commande marquée comme vendue avec succès',
        status: 'vendu',
        final_price: targetPrice
      });
    }

    if (status === 'annule') {
      // Les lignes de vente n'existent pas encore : on rend simplement le stock.
      await restoreStock(client, req.user.shopId, items);

      await client.query(`
        UPDATE orders 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND shop_id = $3
      `, [status, id, req.user.shopId]);

      await client.query('COMMIT');

      return res.json({
        message: 'Commande annulée et stock remis',
        status
      });
    }

    // status === 'en_attente' : réactivation d'une commande annulée.
    // Le stock avait été rendu à l'annulation : on le redéduit ici.
    const demand = new Map();
    for (const item of items) {
      if (!item.product_id) {
        throw new HttpError(
          400,
          'Impossible de réactiver la commande : un produit a été supprimé du stock.'
        );
      }
      demand.set(
        item.product_id.toLowerCase(),
        (demand.get(item.product_id.toLowerCase()) || 0) + item.quantity
      );
    }

    const productsById = await loadProductsForUpdate(client, req.user.shopId, [...demand.keys()]);
    checkStock(demand, productsById);
    await decrementStock(client, req.user.shopId, demand);

    await client.query(`
      UPDATE orders 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND shop_id = $3
    `, [status, id, req.user.shopId]);

    await client.query('COMMIT');

    return res.json({
      message: 'Commande réactivée et stock réservé',
      status
    });

  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  } finally {
    client.release();
  }
};

// Modifier une commande (uniquement si status = 'en_attente')
export const updateOrder = async (req, res) => {
  const { id } = req.params;
  const { customer_name, customer_phone, customer_email, delivery_address, delivery_date, items: rawItems } = req.body;

  const client = await pool.connect();

  try {
    const items = normalizeItems(rawItems);

    await client.query('BEGIN');

    const orderCheck = await client.query(
      'SELECT * FROM orders WHERE id = $1 AND shop_id = $2 FOR UPDATE',
      [id, req.user.shopId]
    );

    if (orderCheck.rows.length === 0) {
      throw new HttpError(404, 'Commande non trouvée.');
    }

    const order = orderCheck.rows[0];

    if (order.status !== 'en_attente') {
      throw new HttpError(400, 'Seules les commandes en attente peuvent être modifiées.');
    }

    const oldItemsResult = await client.query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [id]
    );
    const oldItems = oldItemsResult.rows;

    // Rendre le stock des anciennes lignes avant de valider les nouvelles.
    await restoreStock(client, req.user.shopId, oldItems);

    const demand = aggregateDemand(items);
    const productsById = await loadProductsForUpdate(client, req.user.shopId, [...demand.keys()]);
    checkStock(demand, productsById);

    await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);

    let totalAmount = 0;

    for (const item of items) {
      const product = productsById.get(item.product_id);
      const unitPrice = item.custom_price ?? round2(Number(product.price));
      const itemTotal = round2(unitPrice * item.quantity);
      totalAmount = round2(totalAmount + itemTotal);

      await client.query(`
        INSERT INTO order_items (order_id, product_id, product_name, category_name, quantity, unit_price, total_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        id,
        product.id,
        buildProductName(product),
        product.category_name,
        item.quantity,
        unitPrice,
        itemTotal
      ]);
    }

    await decrementStock(client, req.user.shopId, demand);

    const updateResult = await client.query(`
      UPDATE orders 
      SET customer_name = $1, customer_phone = $2, customer_email = $3,
          delivery_address = $4, delivery_date = $5, total_amount = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND shop_id = $8
      RETURNING *
    `, [
      customer_name,
      customer_phone,
      customer_email,
      delivery_address,
      delivery_date,
      totalAmount,
      id,
      req.user.shopId
    ]);

    await client.query('COMMIT');

    res.json({
      message: 'Commande modifiée avec succès',
      order: updateResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Erreur lors de la modification de la commande:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  } finally {
    client.release();
  }
};

// Supprimer une commande non vendue (remet le stock uniquement si elle était
// encore en attente ; une commande annulée a déjà rendu son stock).
export const deleteOrder = async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      'SELECT * FROM orders WHERE id = $1 AND shop_id = $2 FOR UPDATE',
      [id, req.user.shopId]
    );

    if (orderResult.rows.length === 0) {
      throw new HttpError(404, 'Commande non trouvée.');
    }

    const order = orderResult.rows[0];

    if (order.status === 'vendu') {
      throw new HttpError(400, 'Une commande déjà vendue ne peut pas être supprimée.');
    }

    if (order.status === 'en_attente') {
      const itemsResult = await client.query(
        'SELECT * FROM order_items WHERE order_id = $1',
        [id]
      );
      await restoreStock(client, req.user.shopId, itemsResult.rows);
    }

    await client.query(
      'DELETE FROM orders WHERE id = $1 AND shop_id = $2',
      [id, req.user.shopId]
    );

    await client.query('COMMIT');

    res.json({ message: 'Commande supprimée avec succès' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error('Erreur lors de la suppression de la commande:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  } finally {
    client.release();
  }
};
