import pool from './database.js';

/**
 * Migration pour supporter les commandes multi-produits
 * Exécuter cette migration après la migration initiale
 */

async function migrateToMultiProducts() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🚀 Début de la migration multi-produits...');
    
    // 1. Créer la nouvelle table order_items
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
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
    console.log('✅ Table order_items créée');
    
    // 2. Migrer les données existantes de orders vers order_items
    const existingOrders = await client.query(`
      SELECT o.id, o.product_id, o.final_price, p.name as product_name, c.name as category_name
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.product_id IS NOT NULL
    `);
    
    if (existingOrders.rows.length > 0) {
      for (const order of existingOrders.rows) {
        await client.query(`
          INSERT INTO order_items (order_id, product_id, product_name, category_name, quantity, unit_price, total_price)
          VALUES ($1, $2, $3, $4, 1, $5, $5)
        `, [order.id, order.product_id, order.product_name || 'Produit', order.category_name, order.final_price || 0]);
      }
      console.log(`✅ ${existingOrders.rows.length} commandes migrées vers order_items`);
    }
    
    // 3. Modifier la table orders pour supprimer product_id et ajouter total_amount
    await client.query(`
      ALTER TABLE orders 
      DROP COLUMN IF EXISTS product_id,
      ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2) DEFAULT 0
    `);
    console.log('✅ Table orders modifiée');
    
    // 4. Calculer et mettre à jour total_amount pour les commandes existantes
    await client.query(`
      UPDATE orders o
      SET total_amount = (
        SELECT COALESCE(SUM(total_price), 0)
        FROM order_items
        WHERE order_id = o.id
      )
    `);
    console.log('✅ Montants totaux calculés');
    
    await client.query('COMMIT');
    console.log('🎉 Migration multi-produits terminée avec succès !');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur lors de la migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateToMultiProducts();
