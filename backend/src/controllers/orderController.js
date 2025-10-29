import pool from '../config/database.js';

// Obtenir toutes les commandes
export const getAllOrders = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.id, o.customer_name, o.customer_phone, o.customer_email,
        o.delivery_address, o.delivery_date, o.status, o.final_price,
        o.created_at, o.updated_at,
        p.id as product_id, p.name as product_name, p.price as product_price,
        c.name as category_name, col.name as color_name, p.size,
        u.username as created_by_username
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN colors col ON p.color_id = col.id
      LEFT JOIN users u ON o.created_by = u.id
      ORDER BY o.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Obtenir une commande par ID
export const getOrderById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        o.id, o.customer_name, o.customer_phone, o.customer_email,
        o.delivery_address, o.delivery_date, o.status, o.final_price,
        o.created_at, o.updated_at,
        p.id as product_id, p.name as product_name, p.price as product_price,
        c.name as category_name, col.name as color_name, p.size,
        u.username as created_by_username
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN colors col ON p.color_id = col.id
      LEFT JOIN users u ON o.created_by = u.id
      WHERE o.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Commande non trouvée.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération de la commande:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Créer une nouvelle commande
export const createOrder = async (req, res) => {
  const { 
    product_id, customer_name, customer_phone, customer_email,
    delivery_address, delivery_date 
  } = req.body;

  try {
    // Vérifier que le produit existe et a du stock
    const productCheck = await pool.query(
      'SELECT quantity FROM products WHERE id = $1',
      [product_id]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé.' });
    }

    if (productCheck.rows[0].quantity <= 0) {
      return res.status(400).json({ error: 'Produit en rupture de stock.' });
    }

    const result = await pool.query(`
      INSERT INTO orders (
        product_id, customer_name, customer_phone, customer_email,
        delivery_address, delivery_date, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [product_id, customer_name, customer_phone, customer_email, delivery_address, delivery_date, req.user.id]);

    res.status(201).json({
      message: 'Commande créée avec succès',
      order: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la création de la commande:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
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
      SELECT o.*, p.name as product_name, p.quantity, c.name as category_name
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.id = $1
    `, [id]);

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Commande non trouvée.' });
    }

    const order = orderResult.rows[0];

    // Si le statut passe à "vendu"
    if (status === 'vendu' && order.status !== 'vendu') {
      if (!final_price) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Le prix final est requis pour marquer comme vendu.' });
      }

      // Vérifier le stock
      if (order.quantity <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Stock insuffisant.' });
      }

      // Mettre à jour la commande
      await client.query(`
        UPDATE orders 
        SET status = $1, final_price = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [status, final_price, id]);

      // Déduire du stock
      await client.query(`
        UPDATE products 
        SET quantity = quantity - 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [order.product_id]);

      // Ajouter dans l'historique des ventes
      await client.query(`
        INSERT INTO sales (
          order_id, product_id, product_name, category_name,
          customer_name, final_price, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [id, order.product_id, order.product_name, order.category_name, order.customer_name, final_price, req.user.id]);

      // Ajouter dans les transactions comptables
      await client.query(`
        INSERT INTO transactions (type, category, amount, description, created_by)
        VALUES ('revenu', 'vente', $1, $2, $3)
      `, [final_price, `Vente: ${order.product_name} - ${order.customer_name}`, req.user.id]);

      await client.query('COMMIT');

      res.json({ 
        message: 'Commande marquée comme vendue avec succès',
        status: 'vendu',
        final_price 
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
