import pool from '../config/database.js';

// Obtenir toutes les commandes avec leurs produits
export const getAllOrders = async (req, res) => {
  try {
    const ordersResult = await pool.query(`
      SELECT 
        o.id, o.customer_name, o.customer_phone, o.customer_email,
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
        o.id, o.customer_name, o.customer_phone, o.customer_email,
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
    items,
    customer_name, 
    customer_phone, 
    customer_email,
    delivery_address, 
    delivery_date 
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'La commande doit contenir au moins un produit.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'La quantité de chaque produit doit être un entier positif.' });
      }
      if (item.custom_price !== undefined && item.custom_price !== null && item.custom_price < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Le prix personnalisé ne peut pas être négatif.' });
      }

      const productCheck = await client.query(
        'SELECT id, name, price, quantity FROM products WHERE id = $1 AND shop_id = $2',
        [item.product_id, req.user.shopId]
      );

      if (productCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Produit ${item.product_id} non trouvé.` });
      }

      if (productCheck.rows[0].quantity < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Stock insuffisant pour ${productCheck.rows[0].name}. Disponible: ${productCheck.rows[0].quantity}` 
        });
      }
    }

    const orderResult = await client.query(`
      INSERT INTO orders (
        shop_id, customer_name, customer_phone, customer_email,
        delivery_address, delivery_date, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [req.user.shopId, customer_name, customer_phone, customer_email, delivery_address, delivery_date, req.user.id]);

    const orderId = orderResult.rows[0].id;
    let totalAmount = 0;

    for (const item of items) {
      const productResult = await client.query(`
        SELECT 
          p.id, p.name, p.price, p.size,
          c.name as category_name,
          col.name as color_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN colors col ON p.color_id = col.id
        WHERE p.id = $1 AND p.shop_id = $2
      `, [item.product_id, req.user.shopId]);

      const product = productResult.rows[0];
      const unitPrice = item.custom_price ?? product.price;
      const totalPrice = Math.round(unitPrice * item.quantity * 100) / 100;
      totalAmount += totalPrice;

      let fullProductName = product.name;
      const details = [];
      if (product.size && product.size.trim() !== '') details.push(product.size);
      if (product.color_name && product.color_name.trim() !== '') details.push(product.color_name);
      if (details.length > 0) {
        fullProductName = `${product.name} - ${details.join(' - ')}`;
      }

      await client.query(`
        INSERT INTO order_items (
          order_id, product_id, product_name, category_name,
          quantity, unit_price, total_price
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [orderId, product.id, fullProductName, product.category_name, item.quantity, unitPrice, totalPrice]);

      await client.query(`
        UPDATE products 
        SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [item.quantity, product.id]);
    }

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
    await client.query('ROLLBACK');
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
      SELECT * FROM orders WHERE id = $1 AND shop_id = $2
    `, [id, req.user.shopId]);

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Commande non trouvée.' });
    }

    const order = orderResult.rows[0];

    if (status === 'vendu' && order.status !== 'vendu') {
      if (final_price !== undefined && final_price !== null && Number(final_price) < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Le prix final ne peut pas être négatif.' });
      }

      const priceToUse = final_price || order.total_amount;

      if (!priceToUse) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Le prix final est requis pour marquer comme vendu.' });
      }

      const itemsResult = await client.query(`
        SELECT oi.*
        FROM order_items oi
        WHERE oi.order_id = $1
      `, [id]);

      await client.query(`
        UPDATE orders 
        SET status = $1, final_price = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND shop_id = $4
      `, [status, priceToUse, id, req.user.shopId]);

      const totalAmount = Number(order.total_amount) || 0;
      const targetPrice = Number(priceToUse);
      const rows = itemsResult.rows;

      for (let i = 0; i < rows.length; i++) {
        const item = rows[i];
        let itemFinalPrice;
        if (totalAmount > 0) {
          const proportion = Number(item.total_price) / totalAmount;
          itemFinalPrice = Math.round(targetPrice * proportion * 100) / 100;
          if (i === rows.length - 1) {
            // Ajuster la dernière ligne pour coller exactement au prix final (annule l'arrondi)
            const allocated = rows
              .slice(0, i)
              .reduce((sum, r) => sum + (Math.round(targetPrice * (Number(r.total_price) / totalAmount) * 100) / 100), 0);
            itemFinalPrice = Math.round((targetPrice - allocated) * 100) / 100;
          }
        } else {
          itemFinalPrice = 0;
        }
        
        await client.query(`
          INSERT INTO sales (
            shop_id, order_id, product_id, product_name, category_name,
            customer_name, final_price, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [req.user.shopId, id, item.product_id, item.product_name, item.category_name, order.customer_name, itemFinalPrice, req.user.id]);
      }

      await client.query(`
        INSERT INTO transactions (
          shop_id, type, category, amount, description, transaction_date, created_by
        )
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
      `, [req.user.shopId, 'revenu', 'Vente', priceToUse, `Vente commande #${id} - ${order.customer_name}`, req.user.id]);

      await client.query('COMMIT');

      res.json({ 
        message: 'Commande marquée comme vendue avec succès',
        status: 'vendu',
        final_price: priceToUse
      });
    }
    
    else if (status === 'annule' && order.status !== 'annule') {
      if (order.status === 'vendu') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Une commande déjà vendue ne peut pas être annulée.' });
      }

      const itemsResult = await client.query(`
        SELECT * FROM order_items WHERE order_id = $1
      `, [id]);

      for (const item of itemsResult.rows) {
        await client.query(`
          UPDATE products 
          SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2 AND shop_id = $3
        `, [item.quantity, item.product_id, req.user.shopId]);
      }

      await client.query(`
        UPDATE orders 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND shop_id = $3
      `, [status, id, req.user.shopId]);

      await client.query('COMMIT');

      res.json({ 
        message: 'Commande annulée et stock remis',
        status 
      });
    }
    
    else {
      await client.query(`
        UPDATE orders 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND shop_id = $3
      `, [status, id, req.user.shopId]);

      await client.query('COMMIT');

      res.json({ 
        message: 'Statut de la commande mis à jour',
        status 
      });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  } finally {
    client.release();
  }
};

// Modifier une commande (uniquement si status = 'en_attente')
export const updateOrder = async (req, res) => {
  const { id } = req.params;
  const { customer_name, customer_phone, customer_email, delivery_address, delivery_date, items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'La commande doit contenir au moins un produit.' });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const orderCheck = await client.query(
      'SELECT * FROM orders WHERE id = $1 AND shop_id = $2',
      [id, req.user.shopId]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Commande non trouvée.' });
    }

    const order = orderCheck.rows[0];

    if (order.status !== 'en_attente') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Seules les commandes en attente peuvent être modifiées.' });
    }

    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'La quantité de chaque produit doit être un entier positif.' });
      }
      if (item.custom_price !== undefined && item.custom_price !== null && item.custom_price < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Le prix personnalisé ne peut pas être négatif.' });
      }
    }

    const oldItemsResult = await client.query('SELECT * FROM order_items WHERE order_id = $1', [id]);
    const oldItems = oldItemsResult.rows;

    for (const oldItem of oldItems) {
      await client.query(`
        UPDATE products 
        SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [oldItem.quantity, oldItem.product_id]);
    }

    await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);

    let totalAmount = 0;

    for (const item of items) {
      const productResult = await client.query(
        'SELECT id, name, price, quantity FROM products WHERE id = $1 AND shop_id = $2',
        [item.product_id, req.user.shopId]
      );

      if (productResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Produit avec ID ${item.product_id} non trouvé.` });
      }

      const product = productResult.rows[0];
      
      if (product.quantity < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Stock insuffisant pour ${product.name}. Disponible: ${product.quantity}` 
        });
      }

      const unitPrice = item.custom_price ?? product.price;
      const itemTotal = Math.round(unitPrice * item.quantity * 100) / 100;
      totalAmount += itemTotal;

      const categoryResult = await client.query(`
        SELECT c.name as category_name
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE p.id = $1
      `, [item.product_id]);

      const categoryName = categoryResult.rows[0]?.category_name || 'Non catégorisé';

      await client.query(`
        INSERT INTO order_items (order_id, product_id, product_name, category_name, quantity, unit_price, total_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [id, item.product_id, product.name, categoryName, item.quantity, unitPrice, itemTotal]);

      await client.query(`
        UPDATE products 
        SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [item.quantity, item.product_id]);
    }

    const updateResult = await client.query(`
      UPDATE orders 
      SET customer_name = $1, customer_phone = $2, customer_email = $3,
          delivery_address = $4, delivery_date = $5, total_amount = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND shop_id = $8
      RETURNING *
    `, [customer_name, customer_phone, customer_email, delivery_address, delivery_date, totalAmount, id, req.user.shopId]);

    await client.query('COMMIT');

    res.json({
      message: 'Commande modifiée avec succès',
      order: updateResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la modification de la commande:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  } finally {
    client.release();
  }
};

// Supprimer une commande (remet le stock si elle n'est pas 'vendu')
export const deleteOrder = async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      'SELECT * FROM orders WHERE id = $1 AND shop_id = $2',
      [id, req.user.shopId]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Commande non trouvée.' });
    }

    const order = orderResult.rows[0];

    if (order.status === 'vendu') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Une commande déjà vendue ne peut pas être supprimée.' });
    }

    let itemsResult = { rows: [] };
    if (order.status !== 'vendu') {
      itemsResult = await client.query(
        'SELECT * FROM order_items WHERE order_id = $1',
        [id]
      );
    }

    const deleteResult = await client.query(
      'DELETE FROM orders WHERE id = $1 AND shop_id = $2 RETURNING *',
      [id, req.user.shopId]
    );

    if (deleteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Commande non trouvée.' });
    }

    for (const item of itemsResult.rows) {
      if (item.product_id) {
        await client.query(`
          UPDATE products 
          SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2 AND shop_id = $3
        `, [item.quantity, item.product_id, req.user.shopId]);
      }
    }

    await client.query('COMMIT');

    res.json({ message: 'Commande supprimée avec succès' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la suppression de la commande:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  } finally {
    client.release();
  }
};
