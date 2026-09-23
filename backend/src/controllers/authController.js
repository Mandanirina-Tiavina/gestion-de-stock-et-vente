import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

// Générer un token JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, shopId: user.shop_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Inscription : crée une boutique + son admin
export const register = async (req, res) => {
  const { shopName, username, email, password } = req.body;
  const role = 'admin';

  try {
    if (!shopName || shopName.trim().length < 2) {
      return res.status(400).json({ error: 'Le nom de la boutique doit contenir au moins 2 caractères.' });
    }

    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Le nom d\'utilisateur doit contenir au moins 3 caractères.' });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Email invalide.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    const normalizedShopName = shopName.trim();

    const shopExists = await pool.query('SELECT id FROM shops WHERE LOWER(name) = LOWER($1)', [normalizedShopName]);
    if (shopExists.rows.length > 0) {
      return res.status(400).json({ error: 'Ce nom de boutique est déjà utilisé.' });
    }

    const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const shopResult = await client.query(
        'INSERT INTO shops (name) VALUES ($1) RETURNING id, name',
        [normalizedShopName]
      );
      const shop = shopResult.rows[0];

      const userResult = await client.query(
        `INSERT INTO users (shop_id, username, email, password_hash, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, username, email, role, created_at`,
        [shop.id, username, email, passwordHash, role]
      );
      const newUser = userResult.rows[0];

      await client.query(
        'INSERT INTO user_preferences (user_id, theme) VALUES ($1, $2)',
        [newUser.id, 'light']
      );

      // Catégories par défaut de la boutique
      await client.query(`
        INSERT INTO categories (shop_id, name, icon, color) VALUES
          ($1, 'T-shirt', '👕', '#3B82F6'),
          ($1, 'Pantalon', '👖', '#10B981'),
          ($1, 'Robe', '👗', '#EC4899'),
          ($1, 'Veste', '🧥', '#F59E0B'),
          ($1, 'Chaussures', '👟', '#8B5CF6'),
          ($1, 'Accessoires', '👜', '#EF4444')
        ON CONFLICT (shop_id, name) DO NOTHING
      `, [shop.id]);

      // Couleurs par défaut de la boutique
      await client.query(`
        INSERT INTO colors (shop_id, name, hex_code) VALUES
          ($1, 'Noir', '#000000'),
          ($1, 'Blanc', '#FFFFFF'),
          ($1, 'Rouge', '#FF0000'),
          ($1, 'Bleu', '#0000FF'),
          ($1, 'Vert', '#00FF00'),
          ($1, 'Jaune', '#FFFF00'),
          ($1, 'Rose', '#FFC0CB'),
          ($1, 'Gris', '#808080'),
          ($1, 'Marron', '#8B4513'),
          ($1, 'Orange', '#FFA500')
        ON CONFLICT (shop_id, name) DO NOTHING
      `, [shop.id]);

      await client.query('COMMIT');

      const token = generateToken({ ...newUser, shop_id: shop.id });

      res.status(201).json({
        message: 'Boutique créée avec succès',
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          shop_id: shop.id,
          shop_name: shop.name
        },
        token
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'inscription.' });
  }
};

// Connexion : boutique + nom d'utilisateur + mot de passe
export const login = async (req, res) => {
  const { shopName, username, password } = req.body;

  try {
    if (!shopName || !username || !password) {
      return res.status(400).json({ error: 'Nom de boutique, nom d\'utilisateur et mot de passe requis.' });
    }

    const shopResult = await pool.query('SELECT id, name FROM shops WHERE LOWER(name) = LOWER($1)', [shopName.trim()]);

    if (shopResult.rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    const shop = shopResult.rows[0];

    const result = await pool.query(
      'SELECT * FROM users WHERE shop_id = $1 AND username = $2',
      [shop.id, username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    const user = result.rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    const prefsResult = await pool.query(
      'SELECT theme FROM user_preferences WHERE user_id = $1',
      [user.id]
    );

    const theme = prefsResult.rows[0]?.theme || 'light';

    const token = generateToken({ ...user, shop_id: shop.id });

    res.json({
      message: 'Connexion réussie',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        theme,
        shop_id: shop.id,
        shop_name: shop.name
      },
      token
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la connexion.' });
  }
};

// Obtenir le profil de l'utilisateur connecté
export const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.role, u.created_at, u.shop_id,
              s.name as shop_name, up.theme
       FROM users u
       JOIN shops s ON u.shop_id = s.id
       LEFT JOIN user_preferences up ON u.id = up.user_id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Mettre à jour les préférences utilisateur
export const updatePreferences = async (req, res) => {
  const { theme } = req.body;

  try {
    await pool.query(
      `INSERT INTO user_preferences (user_id, theme) 
       VALUES ($1, $2)
       ON CONFLICT (user_id) 
       DO UPDATE SET theme = $2, updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, theme]
    );

    res.json({ message: 'Préférences mises à jour', theme });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des préférences:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Changer le mot de passe
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    // Récupérer l'utilisateur
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    const user = result.rows[0];

    // Vérifier le mot de passe actuel
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });
    }

    // Valider le nouveau mot de passe
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' });
    }

    // Hasher le nouveau mot de passe
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Mettre à jour le mot de passe
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, req.user.id]
    );

    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Demander une réinitialisation de mot de passe (génère un token)
export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    // Vérifier si l'utilisateur existe
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      // Ne pas révéler si l'email existe ou non pour des raisons de sécurité
      return res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
    }

    const user = result.rows[0];

    // Générer un code à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 3600000); // 1 heure

    // Supprimer les anciens tokens de réinitialisation
    await pool.query(
      'DELETE FROM verification_tokens WHERE user_id = $1 AND type = $2',
      [user.id, 'password_reset']
    );

    // Créer un nouveau code
    await pool.query(
      'INSERT INTO verification_tokens (user_id, token, type, expires_at) VALUES ($1, $2, $3, $4)',
      [user.id, code, 'password_reset', expiresAt]
    );

    // En développement, retourner le code immédiatement (pas d'attente email)
    // En production, l'email sera envoyé de manière asynchrone
    res.json({ 
      message: 'Si cet email existe, un code de réinitialisation a été envoyé par email.',
      // SÉCURITÉ: Le code n'est visible qu'en développement
      code: process.env.NODE_ENV === 'development' ? code : undefined
    });

    // Envoyer l'email de manière asynchrone (ne bloque pas la réponse)
    sendPasswordResetEmail(email, code)
      .then(() => {
        console.log(`✅ Email de réinitialisation envoyé à ${email}`);
        console.log(`🔑 Code de réinitialisation: ${code}`);
      })
      .catch((emailError) => {
        console.error('❌ Erreur lors de l\'envoi de l\'email:', emailError);
      });
  } catch (error) {
    console.error('Erreur lors de la demande de réinitialisation:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Réinitialiser le mot de passe avec le code
export const resetPasswordWithCode = async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, code et nouveau mot de passe requis.' });
  }

  try {
    // Vérifier si l'utilisateur existe
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Code invalide ou expiré.' });
    }

    const user = userResult.rows[0];

    // Vérifier le code
    const tokenResult = await pool.query(
      'SELECT * FROM verification_tokens WHERE user_id = $1 AND token = $2 AND type = $3 AND expires_at > NOW()',
      [user.id, code, 'password_reset']
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Code invalide ou expiré.' });
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, user.id]
    );

    // Supprimer le code utilisé
    await pool.query(
      'DELETE FROM verification_tokens WHERE user_id = $1 AND type = $2',
      [user.id, 'password_reset']
    );

    res.json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
