import pool from './database.js';

const resetAll = async () => {
  const client = await pool.connect();

  try {
    console.log('🧨 Reset complet de la base de données...');

    await client.query('BEGIN');

    const tables = [
      'user_preferences',
      'verification_tokens',
      'sales',
      'transactions',
      'order_items',
      'orders',
      'products',
      'colors',
      'categories',
      'users',
      'shops'
    ];

    for (const table of tables) {
      await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      console.log(`✅ Table ${table} supprimée`);
    }

    await client.query('COMMIT');
    console.log('🎉 Reset complet terminé. Lancez npm run migrate.');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur lors du reset:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

resetAll();
