import pool from '../config/database.js';
import bcrypt from 'bcrypt';

// Lister les membres de la boutique
export const getMembers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, role, email_verified, created_at
       FROM users
       WHERE shop_id = $1
       ORDER BY created_at ASC`,
      [req.user.shopId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des membres:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Créer un membre
export const createMember = async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Le nom d\'utilisateur doit contenir au moins 3 caractères.' });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Email invalide.' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    const memberRole = ['admin', 'vendeur', 'comptable'].includes(role) ? role : 'vendeur';

    const usernameExists = await pool.query(
      'SELECT id FROM users WHERE shop_id = $1 AND username = $2',
      [req.user.shopId, username]
    );
    if (usernameExists.rows.length > 0) {
      return res.status(400).json({ error: 'Ce nom d\'utilisateur est déjà pris dans cette boutique.' });
    }

    const emailExists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (emailExists.rows.length > 0) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        `INSERT INTO users (shop_id, username, email, password_hash, role, email_verified)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         RETURNING id, username, email, role, created_at`,
        [req.user.shopId, username, email, passwordHash, memberRole]
      );
      const newUser = userResult.rows[0];

      await client.query(
        'INSERT INTO user_preferences (user_id, theme) VALUES ($1, $2)',
        [newUser.id, 'light']
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Membre créé avec succès',
        member: newUser
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erreur lors de la création du membre:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Réinitialiser le mot de passe d'un membre
export const resetMemberPassword = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  try {
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND shop_id = $3 RETURNING id',
      [passwordHash, id, req.user.shopId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Membre non trouvé.' });
    }

    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Changer le rôle d'un membre
export const updateMemberRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  try {
    if (!['admin', 'vendeur', 'comptable'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide.' });
    }

    if (Number(id) === req.user.id && role !== 'admin') {
      const adminCount = await pool.query(
        'SELECT COUNT(*) FROM users WHERE shop_id = $1 AND role = $2',
        [req.user.shopId, 'admin']
      );
      if (parseInt(adminCount.rows[0].count) <= 1) {
        return res.status(400).json({ error: 'Impossible de rétrograder le dernier admin de la boutique.' });
      }
    }

    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND shop_id = $3 RETURNING id, username, role',
      [role, id, req.user.shopId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Membre non trouvé.' });
    }

    res.json({ message: 'Rôle mis à jour avec succès', member: result.rows[0] });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du rôle:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// Supprimer un membre
export const deleteMember = async (req, res) => {
  const { id } = req.params;

  try {
    if (Number(id) === req.user.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' });
    }

    const targetResult = await pool.query(
      'SELECT id, role FROM users WHERE id = $1 AND shop_id = $2',
      [id, req.user.shopId]
    );

    if (targetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Membre non trouvé.' });
    }

    if (targetResult.rows[0].role === 'admin') {
      const adminCount = await pool.query(
        'SELECT COUNT(*) FROM users WHERE shop_id = $1 AND role = $2',
        [req.user.shopId, 'admin']
      );
      if (parseInt(adminCount.rows[0].count) <= 1) {
        return res.status(400).json({ error: 'Impossible de supprimer le dernier admin de la boutique.' });
      }
    }

    await pool.query('DELETE FROM users WHERE id = $1 AND shop_id = $2', [id, req.user.shopId]);

    res.json({ message: 'Membre supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du membre:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};
