import pool from '../config/database.js';

// Obtenir toutes les catégories
export const getAllCategories = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM categories WHERE shop_id = $1 ORDER BY name ASC',
      [req.user.shopId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Créer une catégorie
export const createCategory = async (req, res) => {
  const { name, icon, color } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO categories (shop_id, name, icon, color) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.shopId, name, icon, color]
    );

    res.status(201).json({
      message: 'Catégorie créée avec succès',
      category: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Cette catégorie existe déjà.' });
    }
    console.error('Erreur lors de la création de la catégorie:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Mettre à jour une catégorie
export const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name, icon, color } = req.body;

  try {
    const result = await pool.query(
      'UPDATE categories SET name = $1, icon = $2, color = $3 WHERE id = $4 AND shop_id = $5 RETURNING *',
      [name, icon, color, id, req.user.shopId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Catégorie non trouvée.' });
    }

    res.json({
      message: 'Catégorie mise à jour avec succès',
      category: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Cette catégorie existe déjà.' });
    }
    console.error('Erreur lors de la mise à jour de la catégorie:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Supprimer une catégorie
export const deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 AND shop_id = $2 RETURNING *',
      [id, req.user.shopId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Catégorie non trouvée.' });
    }

    res.json({ message: 'Catégorie supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la catégorie:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Obtenir toutes les couleurs
export const getAllColors = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM colors WHERE shop_id = $1 ORDER BY name ASC',
      [req.user.shopId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des couleurs:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Créer une couleur
export const createColor = async (req, res) => {
  const { name, hex_code } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO colors (shop_id, name, hex_code) VALUES ($1, $2, $3) RETURNING *',
      [req.user.shopId, name, hex_code]
    );

    res.status(201).json({
      message: 'Couleur créée avec succès',
      color: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Cette couleur existe déjà.' });
    }
    console.error('Erreur lors de la création de la couleur:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Supprimer une couleur
export const deleteColor = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM colors WHERE id = $1 AND shop_id = $2 RETURNING *',
      [id, req.user.shopId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Couleur non trouvée.' });
    }

    res.json({ message: 'Couleur supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la couleur:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
