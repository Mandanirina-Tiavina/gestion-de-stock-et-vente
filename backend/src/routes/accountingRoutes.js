import express from 'express';
import {
  getAllTransactions,
  createTransaction,
  deleteTransaction,
  getAccountingSummary
} from '../controllers/accountingController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authenticateToken);

router.get('/transactions', getAllTransactions);
router.post('/transactions', createTransaction);
router.delete('/transactions/:id', deleteTransaction);
router.get('/summary', getAccountingSummary);

export default router;
