import pool from '../config/database.js';

// Filtres de date : la date de fin est incluse (la journée entière), ce qui
// évite d'oublier les ventes du dernier jour quand l'UI envoie "YYYY-MM-DD".
const appendSalesFilters = (query, filters, params) => {
  let sql = query;

  if (filters.start_date) {
    params.push(filters.start_date);
    sql += ` AND s.sale_date >= $${params.length}::date`;
  }

  if (filters.end_date) {
    params.push(filters.end_date);
    sql += ` AND s.sale_date < ($${params.length}::date + INTERVAL '1 day')`;
  }

  if (filters.product_id) {
    params.push(filters.product_id);
    sql += ` AND s.product_id = $${params.length}`;
  }

  if (filters.category) {
    params.push(filters.category);
    sql += ` AND s.category_name = $${params.length}`;
  }

  return sql;
};

// Obtenir toutes les ventes
export const getAllSales = async (req, res) => {
  const { start_date, end_date, product_id, category } = req.query;

  try {
    const params = [req.user.shopId];
    let query = `
      SELECT 
        s.id, s.product_name, s.category_name, s.customer_name,
        s.final_price, s.sale_date,
        u.username as created_by_username
      FROM sales s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.shop_id = $1
    `;

    query = appendSalesFilters(query, { start_date, end_date, product_id, category }, params);
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
    const params = [req.user.shopId];
    let query = 'SELECT COALESCE(SUM(s.final_price), 0) as total FROM sales s WHERE s.shop_id = $1';

    if (start_date) {
      params.push(start_date);
      query += ` AND s.sale_date >= $${params.length}::date`;
    }

    if (end_date) {
      params.push(end_date);
      query += ` AND s.sale_date < ($${params.length}::date + INTERVAL '1 day')`;
    }

    const result = await pool.query(query, params);

    res.json({ total: parseFloat(result.rows[0].total) || 0 });
  } catch (error) {
    console.error('Erreur lors du calcul du total des ventes:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Obtenir les statistiques des ventes (filtrables par période)
export const getSalesStats = async (req, res) => {
  const { start_date, end_date } = req.query;

  try {
    const params = [req.user.shopId];
    const where = appendSalesFilters(
      ' WHERE s.shop_id = $1',
      { start_date, end_date },
      params
    );

    const totalResult = await pool.query(
      `SELECT COALESCE(SUM(s.final_price), 0) as total FROM sales s${where}`,
      params
    );
    const total = parseFloat(totalResult.rows[0].total) || 0;

    const countResult = await pool.query(
      `SELECT COUNT(*) as count, COUNT(DISTINCT s.order_id) as orders FROM sales s${where}`,
      params
    );
    const count = parseInt(countResult.rows[0].count, 10) || 0;
    const ordersCount = parseInt(countResult.rows[0].orders, 10) || 0;

    const categoryResult = await pool.query(`
      SELECT s.category_name, COUNT(*) as count, SUM(s.final_price) as total
      FROM sales s${where}
        AND s.category_name IS NOT NULL
      GROUP BY s.category_name
      ORDER BY total DESC
    `, params);

    // Le chiffre "mois en cours" reste global, indépendant des filtres.
    const monthResult = await pool.query(`
      SELECT COALESCE(SUM(final_price), 0) as total
      FROM sales
      WHERE EXTRACT(MONTH FROM sale_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM sale_date) = EXTRACT(YEAR FROM CURRENT_DATE)
        AND shop_id = $1
    `, [req.user.shopId]);
    const monthTotal = parseFloat(monthResult.rows[0].total) || 0;

    res.json({
      total,
      count,
      ordersCount,
      monthTotal,
      byCategory: categoryResult.rows
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
