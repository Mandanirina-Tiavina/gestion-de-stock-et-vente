import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

// Générer un token JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Inscription d'un nouvel utilisateur
export const register = async (req, res) => {
  const { username, email, password, role = 'vendeur' } = req.body;

  try {
    // Validation des données
    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Le nom d\'utilisateur doit contenir au moins 3 caractères.' });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Email invalide.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    // Vérifier si l'utilisateur existe déjà
    const userExists = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Nom d\'utilisateur ou email déjà utilisé.' });
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insérer le nouvel utilisateur
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, username, email, role, created_at`,
      [username, email, passwordHash, role]
    );

    const newUser = result.rows[0];

    // Créer les préférences par défaut
    await pool.query(
      'INSERT INTO user_preferences (user_id, theme) VALUES ($1, $2)',
      [newUser.id, 'light']
    );

    // Générer le token
    const token = generateToken(newUser);

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      },
      token
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'inscription.' });
  }
};

// Connexion
export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Vérifier si l'utilisateur existe
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    const user = result.rows[0];

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    // Récupérer les préférences utilisateur
    const prefsResult = await pool.query(
      'SELECT theme FROM user_preferences WHERE user_id = $1',
      [user.id]
    );

    const theme = prefsResult.rows[0]?.theme || 'light';

    // Générer le token
    const token = generateToken(user);

    res.json({
      message: 'Connexion réussie',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        theme
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
      `SELECT u.id, u.username, u.email, u.role, u.created_at, up.theme
       FROM users u
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
