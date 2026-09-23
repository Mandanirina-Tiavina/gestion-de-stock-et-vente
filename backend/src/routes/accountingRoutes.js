import express from 'express';
import {
  getAllTransactions,
  createTransaction,
  deleteTransaction,
  getAccountingSummary
} from '../controllers/accountingController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authenticateToken);

// Accès réservé aux admin et comptable
router.get('/transactions', authorizeRoles('admin', 'comptable'), getAllTransactions);
router.post('/transactions', authorizeRoles('admin', 'comptable'), createTransaction);
router.delete('/transactions/:id', authorizeRoles('admin', 'comptable'), deleteTransaction);
router.get('/summary', authorizeRoles('admin', 'comptable'), getAccountingSummary);

export default router;
