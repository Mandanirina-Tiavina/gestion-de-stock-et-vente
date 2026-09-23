import pool from './database.js';
import bcrypt from 'bcrypt';

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Début de la migration de la base de données...');
    
    await client.query('BEGIN');

    // Table des utilisateurs
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'vendeur' CHECK (role IN ('admin', 'vendeur', 'comptable')),
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table users créée');

    // Table des tokens de vérification et réinitialisation
    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('email_verification', 'password_reset')),
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table verification_tokens créée');

    // Table des catégories
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        icon VARCHAR(50),
        color VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table categories créée');

    // Table des couleurs disponibles
    await client.query(`
      CREATE TABLE IF NOT EXISTS colors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        hex_code VARCHAR(7),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table colors créée');

    // Table des produits
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        color_id INTEGER REFERENCES colors(id) ON DELETE SET NULL,
        size VARCHAR(20),
        quantity INTEGER DEFAULT 0,
        price DECIMAL(10, 2) NOT NULL,
        alert_threshold INTEGER DEFAULT 5,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table products créée');

    // Table des commandes (version multi-produits)
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
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
    console.log('✅ Table orders créée');

    // Table des items de commande (multi-produits)
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

    // Table des ventes (historique)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        product_name VARCHAR(200) NOT NULL,
        category_name VARCHAR(100),
        customer_name VARCHAR(200) NOT NULL,
        final_price DECIMAL(10, 2) NOT NULL,
        sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Table sales créée');

    // Table des transactions comptables
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        type VARCHAR(20) NOT NULL CHECK (type IN ('revenu', 'depense')),
        category VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        description TEXT,
        transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table transactions créée');

    // Table des préférences utilisateur
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        theme VARCHAR(10) DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table user_preferences créée');

    // Insertion de données initiales
    
    // Couleurs par défaut
    await client.query(`
      INSERT INTO colors (name, hex_code) VALUES
        ('Noir', '#000000'),
        ('Blanc', '#FFFFFF'),
        ('Rouge', '#FF0000'),
        ('Bleu', '#0000FF'),
        ('Vert', '#00FF00'),
        ('Jaune', '#FFFF00'),
        ('Rose', '#FFC0CB'),
        ('Gris', '#808080'),
        ('Marron', '#8B4513'),
        ('Orange', '#FFA500')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✅ Couleurs par défaut insérées');

    // Catégories par défaut
    await client.query(`
      INSERT INTO categories (name, icon, color) VALUES
        ('T-shirt', '👕', '#3B82F6'),
        ('Pantalon', '👖', '#10B981'),
        ('Robe', '👗', '#EC4899'),
        ('Veste', '🧥', '#F59E0B'),
        ('Chaussures', '👟', '#8B5CF6'),
        ('Accessoires', '👜', '#EF4444')
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✅ Catégories par défaut insérées');

    // Utilisateur admin par défaut (password: admin123)
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    await client.query(`
      INSERT INTO users (username, email, password_hash, role) VALUES
        ('admin', 'admin@example.com', $1, 'admin')
      ON CONFLICT (username) DO NOTHING
    `, [adminPasswordHash]);
    console.log('✅ Utilisateur admin créé (username: admin, password: admin123)');

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
};

createTables();
