import pool from '../config/database.js';

// Obtenir toutes les transactions
export const getAllTransactions = async (req, res) => {
  const { type, start_date, end_date } = req.query;

  try {
    let query = `
      SELECT 
        t.id, t.type, t.category, t.amount, t.description,
        t.transaction_date, t.created_at,
        u.username as created_by_username
      FROM transactions t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.created_by = $1
    `;
    const params = [req.user.id];
    let paramIndex = 2;

    if (type) {
      query += ` AND t.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (start_date) {
      query += ` AND t.transaction_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND t.transaction_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    query += ' ORDER BY t.transaction_date DESC';

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des transactions:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Ajouter une transaction manuelle
export const createTransaction = async (req, res) => {
  const { type, category, amount, description, transaction_date } = req.body;

  try {
    const result = await pool.query(`
      INSERT INTO transactions (type, category, amount, description, transaction_date, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [type, category, amount, description, transaction_date || new Date(), req.user.id]);

    res.status(201).json({
      message: 'Transaction ajoutée avec succès',
      transaction: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la transaction:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Supprimer une transaction
export const deleteTransaction = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM transactions WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction non trouvée.' });
    }

    res.json({ message: 'Transaction supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la transaction:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Obtenir le résumé comptable
export const getAccountingSummary = async (req, res) => {
  try {
    // Total des revenus
    const revenusResult = await pool.query(`
      SELECT SUM(amount) as total FROM transactions WHERE type = 'revenu' AND created_by = $1
    `, [req.user.id]);
    const totalRevenus = parseFloat(revenusResult.rows[0].total) || 0;

    // Total des dépenses
    const depensesResult = await pool.query(`
      SELECT SUM(amount) as total FROM transactions WHERE type = 'depense' AND created_by = $1
    `, [req.user.id]);
    const totalDepenses = parseFloat(depensesResult.rows[0].total) || 0;

    // Solde net
    const solde = totalRevenus - totalDepenses;

    // Revenus du mois
    const monthRevenusResult = await pool.query(`
      SELECT SUM(amount) as total FROM transactions 
      WHERE type = 'revenu' AND created_by = $1
        AND EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    `, [req.user.id]);
    const monthRevenus = parseFloat(monthRevenusResult.rows[0].total) || 0;

    // Dépenses du mois
    const monthDepensesResult = await pool.query(`
      SELECT SUM(amount) as total FROM transactions 
      WHERE type = 'depense' AND created_by = $1
        AND EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    `, [req.user.id]);
    const monthDepenses = parseFloat(monthDepensesResult.rows[0].total) || 0;

    res.json({
      totalRevenus,
      totalDepenses,
      solde,
      monthRevenus,
      monthDepenses,
      monthSolde: monthRevenus - monthDepenses
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du résumé comptable:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
