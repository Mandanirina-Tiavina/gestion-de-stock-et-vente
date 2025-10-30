import express from 'express';
import { 
  register, 
  login, 
  getProfile, 
  updatePreferences,
  changePassword,
  requestPasswordReset
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Routes publiques
router.post('/register', register);
router.post('/login', login);
router.post('/request-password-reset', requestPasswordReset);

// Routes protégées
router.get('/profile', authenticateToken, getProfile);
router.put('/preferences', authenticateToken, updatePreferences);
router.post('/change-password', authenticateToken, changePassword);

export default router;
