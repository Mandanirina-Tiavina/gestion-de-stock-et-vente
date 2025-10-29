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
      ORDER BY o.created_at DESC
    `);

    // Pour chaque commande, récupérer ses produits
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
      WHERE o.id = $1
    `, [id]);

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
    items, // Array of { product_id, quantity, custom_price }
    customer_name, 
    customer_phone, 
    customer_email,
    delivery_address, 
    delivery_date 
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Vérifier que tous les produits existent et ont du stock
    for (const item of items) {
      const productCheck = await client.query(
        'SELECT id, name, price, quantity FROM products WHERE id = $1',
        [item.product_id]
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

    // Créer la commande
    const orderResult = await client.query(`
      INSERT INTO orders (
        customer_name, customer_phone, customer_email,
        delivery_address, delivery_date, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [customer_name, customer_phone, customer_email, delivery_address, delivery_date, req.user.id]);

    const orderId = orderResult.rows[0].id;
    let totalAmount = 0;

    // Ajouter les produits à la commande
    for (const item of items) {
      const productResult = await client.query(`
        SELECT p.id, p.name, p.price, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = $1
      `, [item.product_id]);

      const product = productResult.rows[0];
      const unitPrice = item.custom_price || product.price;
      const totalPrice = unitPrice * item.quantity;
      totalAmount += totalPrice;

      await client.query(`
        INSERT INTO order_items (
          order_id, product_id, product_name, category_name,
          quantity, unit_price, total_price
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [orderId, product.id, product.name, product.category_name, item.quantity, unitPrice, totalPrice]);
    }

    // Mettre à jour le montant total de la commande
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

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Récupérer les informations de la commande
    const orderResult = await client.query(`
      SELECT * FROM orders WHERE id = $1
    `, [id]);

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Commande non trouvée.' });
    }

    const order = orderResult.rows[0];

    // Si le statut passe à "vendu"
    if (status === 'vendu' && order.status !== 'vendu') {
      const priceToUse = final_price || order.total_amount;

      if (!priceToUse) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Le prix final est requis pour marquer comme vendu.' });
      }

      // Récupérer les produits de la commande
      const itemsResult = await client.query(`
        SELECT * FROM order_items WHERE order_id = $1
      `, [id]);

      // Vérifier le stock pour chaque produit
      for (const item of itemsResult.rows) {
        const productCheck = await client.query(
          'SELECT quantity FROM products WHERE id = $1',
          [item.product_id]
        );

        if (productCheck.rows.length > 0 && productCheck.rows[0].quantity < item.quantity) {
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            error: `Stock insuffisant pour ${item.product_name}` 
          });
        }
      }

      // Mettre à jour la commande
      await client.query(`
        UPDATE orders 
        SET status = $1, final_price = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [status, priceToUse, id]);

      // Déduire du stock et créer les ventes
      for (const item of itemsResult.rows) {
        // Déduire du stock
        await client.query(`
          UPDATE products 
          SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [item.quantity, item.product_id]);

        // Ajouter dans l'historique des ventes
        await client.query(`
          INSERT INTO sales (
            order_id, product_id, product_name, category_name,
            customer_name, final_price, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [id, item.product_id, item.product_name, item.category_name, order.customer_name, item.total_price, req.user.id]);
      }

      // Ajouter dans les transactions comptables
      await client.query(`
        INSERT INTO transactions (type, category, amount, description, created_by)
        VALUES ('revenu', 'vente', $1, $2, $3)
      `, [priceToUse, `Vente commande #${id} - ${order.customer_name}`, req.user.id]);

      await client.query('COMMIT');

      res.json({ 
        message: 'Commande marquée comme vendue avec succès',
        status: 'vendu',
        final_price: priceToUse
      });

    } else {
      // Simple mise à jour du statut
      await client.query(`
        UPDATE orders 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [status, id]);

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

// Supprimer une commande
export const deleteOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Commande non trouvée.' });
    }

    res.json({ message: 'Commande supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la commande:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
