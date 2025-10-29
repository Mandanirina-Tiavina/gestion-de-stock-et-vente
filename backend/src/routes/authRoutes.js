import express from 'express';
import { register, login, getProfile, updatePreferences } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Routes publiques
router.post('/register', register);
router.post('/login', login);

// Routes protégées
router.get('/profile', authenticateToken, getProfile);
router.put('/preferences', authenticateToken, updatePreferences);

export default router;
