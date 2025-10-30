import pool from './database.js';

/**
 * Supprime tous les utilisateurs existants
 */
async function resetUsers() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🚀 Suppression de tous les utilisateurs...');

    await client.query(`
      TRUNCATE TABLE user_preferences, users
      RESTART IDENTITY CASCADE
    `);

    await client.query('COMMIT');

    console.log('🎉 Tous les utilisateurs ont été supprimés avec succès !');
    console.log('ℹ️  Vous pouvez maintenant créer votre premier compte via l\'interface.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur lors de la suppression des utilisateurs:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

resetUsers();
