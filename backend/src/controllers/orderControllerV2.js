import pool from '../config/database.js';

// Obtenir toutes les commandes avec leurs produits
export const getAllOrders = async (req, res) => {
  try {
    const ordersResult = await pool.query(`
      SELECT 
        o.id, o.customer_name, o.customer_phone, o.customer_email,
        o.delivery_address, o.delivery_date, o.status, o.final_price, o.total_amount,
        o.created_at, o.updated_at,
        u.username as created_by_username
      FROM orders o
      LEFT JOIN users u ON o.created_by = u.id
      WHERE o.created_by = $1
      ORDER BY o.created_at DESC
    `, [req.user.id]);

    // Pour chaque commande, récupérer ses produits
    const orders = await Promise.all(ordersResult.rows.map(async (order) => {
      const itemsResult = await pool.query(`
        SELECT 
          oi.id, oi.product_id, oi.product_name, oi.category_name,
          oi.quantity, oi.unit_price, oi.total_price
        FROM order_items oi
        WHERE oi.order_id = $1
      `, [order.id]);

      return {
        ...order,
        items: itemsResult.rows
      };
    }));

    res.json(orders);
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Obtenir une commande par ID avec ses produits
export const getOrderById = async (req, res) => {
  const { id } = req.params;

  try {
    const orderResult = await pool.query(`
      SELECT 
        o.id, o.customer_name, o.customer_phone, o.customer_email,
        o.delivery_address, o.delivery_date, o.status, o.final_price, o.total_amount,
        o.created_at, o.updated_at,
        u.username as created_by_username
      FROM orders o
      LEFT JOIN users u ON o.created_by = u.id
      WHERE o.id = $1
    `, [id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Commande non trouvée.' });
    }

    const itemsResult = await pool.query(`
      SELECT 
        oi.id, oi.product_id, oi.product_name, oi.category_name,
        oi.quantity, oi.unit_price, oi.total_price
      FROM order_items oi
      WHERE oi.order_id = $1
    `, [id]);

    res.json({
      ...orderResult.rows[0],
      items: itemsResult.rows
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la commande:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Créer une nouvelle commande multi-produits
export const createOrder = async (req, res) => {
  const { 
    items, // Array of { product_id, custom_price, quantity }
    customer_name, 
    customer_phone, 
    customer_email,
    delivery_address, 
    delivery_date 
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Vérifier que tous les produits existent et ont du stock
    for (const item of items) {
      const productCheck = await client.query(
        'SELECT id, name, price, quantity FROM products WHERE id = $1',
        [item.product_id]
      );

      if (productCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Produit ${item.product_id} non trouvé.` });
      }

      if (productCheck.rows[0].quantity < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Stock insuffisant pour ${productCheck.rows[0].name}. Disponible: ${productCheck.rows[0].quantity}` 
        });
      }
    }

    // Créer la commande
    const orderResult = await client.query(`
      INSERT INTO orders (
        customer_name, customer_phone, customer_email,
        delivery_address, delivery_date, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [customer_name, customer_phone, customer_email, delivery_address, delivery_date, req.user.id]);

    const orderId = orderResult.rows[0].id;
    let totalAmount = 0;

    // Ajouter les produits à la commande et déduire du stock
    for (const item of items) {
      const productResult = await client.query(`
        SELECT p.id, p.name, p.price, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = $1
      `, [item.product_id]);

      const product = productResult.rows[0];
      const unitPrice = item.custom_price || product.price;
      const totalPrice = unitPrice * item.quantity;
      totalAmount += totalPrice;

      await client.query(`
        INSERT INTO order_items (
          order_id, product_id, product_name, category_name,
          quantity, unit_price, total_price
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [orderId, product.id, product.name, product.category_name, item.quantity, unitPrice, totalPrice]);

      // NOUVEAU: Déduire du stock dès la création de la commande
      await client.query(`
        UPDATE products 
        SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [item.quantity, product.id]);
    }

    // Mettre à jour le montant total de la commande
    await client.query(`
      UPDATE orders SET total_amount = $1 WHERE id = $2
    `, [totalAmount, orderId]);

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Commande créée avec succès',
      order: {
        ...orderResult.rows[0],
        total_amount: totalAmount
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la création de la commande:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  } finally {
    client.release();
  }
};

// Mettre à jour le statut d'une commande
export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status, final_price } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Récupérer les informations de la commande
    const orderResult = await client.query(`
      SELECT * FROM orders WHERE id = $1
    `, [id]);

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Commande non trouvée.' });
    }

    const order = orderResult.rows[0];

    // Si le statut passe à "vendu"
    if (status === 'vendu' && order.status !== 'vendu') {
      const priceToUse = final_price || order.total_amount;

      if (!priceToUse) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Le prix final est requis pour marquer comme vendu.' });
      }

      // Récupérer les produits de la commande
      const itemsResult = await client.query(`
        SELECT * FROM order_items WHERE order_id = $1
      `, [id]);

      // NOUVEAU: Le stock a déjà été déduit lors de la création
      // On enregistre juste la vente et met à jour le prix final

      // Mettre à jour la commande
      await client.query(`
        UPDATE orders 
        SET status = $1, final_price = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [status, priceToUse, id]);

      // Créer les ventes (le stock est déjà déduit)
      for (const item of itemsResult.rows) {
        // Ajouter dans l'historique des ventes
        await client.query(`
          INSERT INTO sales (
            order_id, product_id, product_name, category_name,
            customer_name, final_price, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [id, item.product_id, item.product_name, item.category_name, order.customer_name, item.total_price, req.user.id]);
      }

      await client.query('COMMIT');

      res.json({ 
        message: 'Commande marquée comme vendue avec succès',
        status: 'vendu',
        final_price: priceToUse
      });
    }
    
    // Si le statut passe à "annule"
    else if (status === 'annule' && order.status !== 'annule') {
      // Récupérer les produits de la commande
      const itemsResult = await client.query(`
        SELECT * FROM order_items WHERE order_id = $1
      `, [id]);

      // NOUVEAU: Remettre le stock (annulation = remboursement stock)
      for (const item of itemsResult.rows) {
        await client.query(`
          UPDATE products 
          SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [item.quantity, item.product_id]);
      }

      // Mettre à jour le statut
      await client.query(`
        UPDATE orders 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [status, id]);

      await client.query('COMMIT');

      res.json({ 
        message: 'Commande annulée et stock remis',
        status 
      });
    }
    
    else {
      // Simple mise à jour du statut
      await client.query(`
        UPDATE orders 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [status, id]);

      await client.query('COMMIT');

      res.json({ 
        message: 'Statut de la commande mis à jour',
        status 
      });
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  } finally {
    client.release();
  }
};

// Modifier une commande (uniquement si status = 'en_cours')
export const updateOrder = async (req, res) => {
  const { id } = req.params;
  const { customer_name, customer_phone, customer_email, delivery_address, delivery_date, items } = req.body;

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Vérifier que la commande existe et est en cours
    const orderCheck = await client.query(
      'SELECT * FROM orders WHERE id = $1 AND created_by = $2',
      [id, req.user.id]
    );

    if (orderCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Commande non trouvée.' });
    }

    const order = orderCheck.rows[0];

    if (order.status !== 'en_cours' && order.status !== 'en_attente') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Seules les commandes en cours ou en attente peuvent être modifiées.' });
    }

    // NOUVEAU: Récupérer les anciens items pour remettre le stock
    const oldItemsResult = await client.query('SELECT * FROM order_items WHERE order_id = $1', [id]);
    const oldItems = oldItemsResult.rows;

    // Remettre le stock des anciens produits
    for (const oldItem of oldItems) {
      await client.query(`
        UPDATE products 
        SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [oldItem.quantity, oldItem.product_id]);
    }

    // Supprimer les anciens items
    await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);

    // Calculer le nouveau total et ajouter les nouveaux items
    let totalAmount = 0;

    for (const item of items) {
      const productResult = await client.query(
        'SELECT id, name, price, quantity FROM products WHERE id = $1',
        [item.product_id]
      );

      if (productResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Produit avec ID ${item.product_id} non trouvé.` });
      }

      const product = productResult.rows[0];
      
      // Vérifier le stock disponible
      if (product.quantity < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Stock insuffisant pour ${product.name}. Disponible: ${product.quantity}` 
        });
      }

      const unitPrice = item.custom_price !== undefined && item.custom_price !== null 
        ? item.custom_price 
        : product.price;
      const itemTotal = unitPrice * item.quantity;
      totalAmount += itemTotal;

      // Récupérer le nom de la catégorie
      const categoryResult = await client.query(`
        SELECT c.name as category_name
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE p.id = $1
      `, [item.product_id]);

      const categoryName = categoryResult.rows[0]?.category_name || 'Non catégorisé';

      await client.query(`
        INSERT INTO order_items (order_id, product_id, product_name, category_name, quantity, unit_price, total_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [id, item.product_id, product.name, categoryName, item.quantity, unitPrice, itemTotal]);

      // NOUVEAU: Déduire le stock des nouveaux produits
      await client.query(`
        UPDATE products 
        SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [item.quantity, item.product_id]);
    }

    // Mettre à jour la commande
    const updateResult = await client.query(`
      UPDATE orders 
      SET customer_name = $1, customer_phone = $2, customer_email = $3,
          delivery_address = $4, delivery_date = $5, total_amount = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [customer_name, customer_phone, customer_email, delivery_address, delivery_date, totalAmount, id]);

    await client.query('COMMIT');

    res.json({
      message: 'Commande modifiée avec succès',
      order: updateResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la modification de la commande:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  } finally {
    client.release();
  }
};

// Supprimer une commande
export const deleteOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Commande non trouvée.' });
    }

    res.json({ message: 'Commande supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la commande:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
