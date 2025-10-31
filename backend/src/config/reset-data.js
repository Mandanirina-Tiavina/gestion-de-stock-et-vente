import pool from './database.js';

/**
 * Réinitialise les données dynamiques (produits, commandes, ventes, transactions).
 * Garde : utilisateurs, catégories, couleurs
 */
async function resetData() {
  const client = await pool.connect();

  try {
    console.log('🚀 Réinitialisation des données (products, orders, sales, transactions)...');

    await client.query('DELETE FROM transactions');
    console.log('✅ Transactions supprimées');

    await client.query('DELETE FROM sales');
    console.log('✅ Ventes supprimées');

    await client.query('DELETE FROM orders');
    console.log('✅ Commandes supprimées');

    await client.query('DELETE FROM products');
    console.log('✅ Produits supprimés');

    // Réinitialiser les séquences
    await client.query('ALTER SEQUENCE IF EXISTS transactions_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS sales_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS orders_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS products_id_seq RESTART WITH 1');

    console.log('🎉 Toutes les données ont été réinitialisées avec succès !');
    console.log('💡 Catégories, couleurs et utilisateurs conservés');
  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation des données:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

resetData();
