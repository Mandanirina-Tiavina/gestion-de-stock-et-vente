import pool from '../config/database.js';

// Obtenir toutes les ventes
export const getAllSales = async (req, res) => {
  const { start_date, end_date, product_id, category } = req.query;

  try {
    let query = `
      SELECT 
        s.id, s.product_name, s.category_name, s.customer_name,
        s.final_price, s.sale_date,
        u.username as created_by_username
      FROM sales s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.created_by = $1
    `;
    const params = [req.user.id];
    let paramIndex = 2;

    if (start_date) {
      query += ` AND s.sale_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND s.sale_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    if (product_id) {
      query += ` AND s.product_id = $${paramIndex}`;
      params.push(product_id);
      paramIndex++;
    }

    if (category) {
      query += ` AND s.category_name = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    query += ' ORDER BY s.sale_date DESC';

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des ventes:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Obtenir le total des ventes
export const getSalesTotal = async (req, res) => {
  const { start_date, end_date } = req.query;

  try {
    let query = 'SELECT SUM(final_price) as total FROM sales WHERE created_by = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    if (start_date) {
      query += ` AND sale_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND sale_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    const result = await pool.query(query, params);

    res.json({ total: parseFloat(result.rows[0].total) || 0 });
  } catch (error) {
    console.error('Erreur lors du calcul du total des ventes:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Obtenir les statistiques des ventes
export const getSalesStats = async (req, res) => {
  try {
    // Total des ventes
    const totalResult = await pool.query('SELECT SUM(final_price) as total FROM sales WHERE created_by = $1', [req.user.id]);
    const total = parseFloat(totalResult.rows[0].total) || 0;

    // Nombre de ventes
    const countResult = await pool.query('SELECT COUNT(*) as count FROM sales WHERE created_by = $1', [req.user.id]);
    const count = parseInt(countResult.rows[0].count) || 0;

    // Ventes par catégorie
    const categoryResult = await pool.query(`
      SELECT category_name, COUNT(*) as count, SUM(final_price) as total
      FROM sales
      WHERE category_name IS NOT NULL AND created_by = $1
      GROUP BY category_name
      ORDER BY total DESC
    `, [req.user.id]);

    // Ventes du mois en cours
    const monthResult = await pool.query(`
      SELECT SUM(final_price) as total
      FROM sales
      WHERE EXTRACT(MONTH FROM sale_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM sale_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        AND created_by = $1
    `, [req.user.id]);
    const monthTotal = parseFloat(monthResult.rows[0].total) || 0;

    res.json({
      total,
      count,
      monthTotal,
      byCategory: categoryResult.rows
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
