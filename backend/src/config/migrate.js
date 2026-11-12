import pool from './database.js';

// ---------------------------------------------------------------------------
// Schéma multi-boutique.
//
// Les identifiants techniques restent des UUID. Le numéro de commande
// (order_number) est un compteur métier propre à chaque boutique : la boutique
// A et la boutique B démarrent toutes les deux à 1.
// ---------------------------------------------------------------------------

const upgradeSchema = async (client) => {
  // Un stock négatif n'a pas de sens (anciennes données ou courses critiques).
  await client.query('UPDATE products SET quantity = 0 WHERE quantity < 0');
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'products_quantity_nonnegative'
      ) THEN
        ALTER TABLE products
          ADD CONSTRAINT products_quantity_nonnegative CHECK (quantity >= 0);
      END IF;
    END $$;
  `);

  // order_number : on retire l'ancienne identité globale, on repasse en BIGINT
  // et on garantit l'unicité par boutique (et non plus globalement).
  await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number BIGINT');
  await client.query('ALTER TABLE orders ALTER COLUMN order_number DROP IDENTITY IF EXISTS');
  await client.query('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_number_unique');

  await client.query(`
    WITH numbered AS (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY shop_id
               ORDER BY created_at ASC, id ASC
             ) AS rn
      FROM orders
      WHERE order_number IS NULL
    )
    UPDATE orders o
    SET order_number = n.rn
    FROM numbered n
    WHERE o.id = n.id
  `);

  await client.query('ALTER TABLE orders ALTER COLUMN order_number SET NOT NULL');

  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'orders_shop_order_number_unique'
      ) THEN
        ALTER TABLE orders
          ADD CONSTRAINT orders_shop_order_number_unique UNIQUE (shop_id, order_number);
      END IF;
    END $$;
  `);

  // Initialise les compteurs avec le plus grand numéro déjà présent.
  await client.query(`
    INSERT INTO shop_order_counters (shop_id, last_order_number)
    SELECT shop_id, COALESCE(MAX(order_number), 0)
    FROM orders
    GROUP BY shop_id
    ON CONFLICT (shop_id) DO UPDATE
      SET last_order_number =
        GREATEST(shop_order_counters.last_order_number, EXCLUDED.last_order_number)
  `);
};

const createTables = async () => {
  const client = await pool.connect();

  try {
    console.log('Démarrage de la migration multi-boutique...');

    await client.query('BEGIN');

    // Activer l'extension pour UUID
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    // Table des boutiques
    await client.query(`
      CREATE TABLE IF NOT EXISTS shops (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table shops créée');

    // Table des utilisateurs
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        username VARCHAR(50) NOT NULL,
        email VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'vendeur' CHECK (role IN ('admin', 'vendeur', 'comptable')),
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT users_shop_email UNIQUE (shop_id, email)
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_shop_username ON users(shop_id, username)
    `);
    console.log('✅ Table users créée (username unique par boutique)');

    // Table des tokens de vérification et réinitialisation
    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('email_verification', 'password_reset')),
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table verification_tokens créée');

    // Table des catégories (par boutique)
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(50),
        color VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(shop_id, name)
      )
    `);
    console.log('✅ Table categories créée (par boutique)');

    // Table des couleurs disponibles (par boutique)
    await client.query(`
      CREATE TABLE IF NOT EXISTS colors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL,
        hex_code VARCHAR(7),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(shop_id, name)
      )
    `);
    console.log('✅ Table colors créée (par boutique)');

    // Table des produits (par boutique)
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        color_id UUID REFERENCES colors(id) ON DELETE SET NULL,
        size VARCHAR(20),
        quantity INTEGER DEFAULT 0 CHECK (quantity >= 0),
        price DECIMAL(10, 2) NOT NULL,
        alert_threshold INTEGER DEFAULT 5,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table products créée');

    // Compteur de numéros de commande, séparé par boutique.
    await client.query(`
      CREATE TABLE IF NOT EXISTS shop_order_counters (
        shop_id UUID PRIMARY KEY REFERENCES shops(id) ON DELETE CASCADE,
        last_order_number BIGINT NOT NULL DEFAULT 0
      )
    `);
    console.log('✅ Table shop_order_counters créée');

    // Table des commandes (multi-produits, par boutique)
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number BIGINT NOT NULL,
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        customer_name VARCHAR(200) NOT NULL,
        customer_phone VARCHAR(20),
        customer_email VARCHAR(100),
        delivery_address TEXT NOT NULL,
        delivery_date TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'vendu', 'annule')),
        final_price DECIMAL(10, 2),
        total_amount DECIMAL(10, 2) DEFAULT 0,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT orders_shop_order_number_unique UNIQUE (shop_id, order_number)
      )
    `);
    console.log('✅ Table orders créée (order_number par boutique)');

    // Table des items de commande (hérite shop_id via orders)
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE SET NULL,
        product_name VARCHAR(200) NOT NULL,
        category_name VARCHAR(100),
        quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
        unit_price DECIMAL(10, 2) NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table order_items créée');

    // Table des ventes (historique, par boutique)
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE SET NULL,
        product_name VARCHAR(200) NOT NULL,
        category_name VARCHAR(100),
        customer_name VARCHAR(200) NOT NULL,
        final_price DECIMAL(10, 2) NOT NULL,
        sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Table sales créée');

    // Table des transactions comptables (par boutique)
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL CHECK (type IN ('revenu', 'depense')),
        category VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        description TEXT,
        transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table transactions créée');

    // Table des préférences utilisateur
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        theme VARCHAR(10) DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table user_preferences créée');

    // Rend la migration rejouable sur une base existante.
    await upgradeSchema(client);

    await client.query('COMMIT');
    console.log('🎉 Migration multi-boutique terminée avec succès !');

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
