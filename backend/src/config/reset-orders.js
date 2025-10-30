import pool from './database.js';

/**
 * Script pour réinitialiser les tables orders et order_items
 * À exécuter une seule fois pour corriger la structure
 */

async function resetOrdersTables() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Réinitialisation des tables orders...');
    
    // Supprimer les tables dans le bon ordre (à cause des foreign keys)
    await client.query('DROP TABLE IF EXISTS order_items CASCADE');
    console.log('✅ Table order_items supprimée');
    
    await client.query('DROP TABLE IF EXISTS orders CASCADE');
    console.log('✅ Table orders supprimée');
    
    // Recréer la table orders (version multi-produits)
    await client.query(`
      CREATE TABLE orders (
        id SERIAL PRIMARY KEY,
        customer_name VARCHAR(200) NOT NULL,
        customer_phone VARCHAR(20),
        customer_email VARCHAR(100),
        delivery_address TEXT NOT NULL,
        delivery_date TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'vendu', 'annule')),
        final_price DECIMAL(10, 2),
        total_amount DECIMAL(10, 2) DEFAULT 0,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table orders recréée');
    
    // Recréer la table order_items
    await client.query(`
      CREATE TABLE order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        product_name VARCHAR(200) NOT NULL,
        category_name VARCHAR(100),
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price DECIMAL(10, 2) NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table order_items recréée');
    
    await client.query('COMMIT');
    console.log('🎉 Réinitialisation terminée avec succès !');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur lors de la réinitialisation:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

resetOrdersTables();
