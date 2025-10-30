import pool from './database.js';

/**
 * Migration pour ajouter la colonne created_by aux tables qui n'en ont pas
 */

async function addCreatedByColumn() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Ajout de la colonne created_by...');
    
    // Ajouter created_by à products si elle n'existe pas
    await client.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    `);
    console.log('✅ Colonne created_by ajoutée à products');
    
    // Mettre à jour les produits existants pour les attribuer à l'admin (id=1)
    await client.query(`
      UPDATE products 
      SET created_by = 1 
      WHERE created_by IS NULL
    `);
    console.log('✅ Produits existants attribués à l\'admin');
    
    await client.query('COMMIT');
    console.log('🎉 Migration terminée avec succès !');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur lors de la migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addCreatedByColumn();
