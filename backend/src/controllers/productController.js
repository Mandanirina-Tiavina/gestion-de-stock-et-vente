import pool from '../config/database.js';

// Obtenir tous les produits avec informations complètes
export const getAllProducts = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id, p.name, p.size, p.quantity, p.price, p.alert_threshold,
        p.created_at, p.updated_at,
        c.id as category_id, c.name as category_name, c.icon as category_icon, c.color as category_color,
        col.id as color_id, col.name as color_name, col.hex_code
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN colors col ON p.color_id = col.id
      ORDER BY p.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des produits:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Obtenir un produit par ID
export const getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        p.id, p.name, p.size, p.quantity, p.price, p.alert_threshold,
        p.created_at, p.updated_at,
        c.id as category_id, c.name as category_name, c.icon as category_icon, c.color as category_color,
        col.id as color_id, col.name as color_name, col.hex_code
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN colors col ON p.color_id = col.id
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération du produit:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Créer un nouveau produit
export const createProduct = async (req, res) => {
  const { name, category_id, color_id, size, quantity, price, alert_threshold } = req.body;

  try {
    const result = await pool.query(`
      INSERT INTO products (name, category_id, color_id, size, quantity, price, alert_threshold)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [name, category_id, color_id, size, quantity, price, alert_threshold || 5]);

    res.status(201).json({
      message: 'Produit créé avec succès',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la création du produit:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Mettre à jour un produit
export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, category_id, color_id, size, quantity, price, alert_threshold } = req.body;

  try {
    const result = await pool.query(`
      UPDATE products 
      SET name = $1, category_id = $2, color_id = $3, size = $4, 
          quantity = $5, price = $6, alert_threshold = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [name, category_id, color_id, size, quantity, price, alert_threshold, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé.' });
    }

    res.json({
      message: 'Produit mis à jour avec succès',
      product: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du produit:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Supprimer un produit
export const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé.' });
    }

    res.json({ message: 'Produit supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du produit:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Obtenir les produits avec stock faible
export const getLowStockProducts = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id, p.name, p.size, p.quantity, p.price, p.alert_threshold,
        c.name as category_name, c.icon as category_icon,
        col.name as color_name, col.hex_code
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN colors col ON p.color_id = col.id
      WHERE p.quantity <= p.alert_threshold
      ORDER BY p.quantity ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des produits en stock faible:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
