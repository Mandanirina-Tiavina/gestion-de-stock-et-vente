import pool from './database.js';

/**
 * Réinitialise les données dynamiques (produits, commandes, ventes, transactions).
 */
async function resetData() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🚀 Réinitialisation des données (products, orders, sales, transactions)...');

    await client.query(`
      TRUNCATE TABLE order_items, orders, sales, transactions, products
      RESTART IDENTITY CASCADE
    `);

    await client.query('COMMIT');

    console.log('🎉 Toutes les données ont été réinitialisées avec succès !');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur lors de la réinitialisation des données:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

resetData();
