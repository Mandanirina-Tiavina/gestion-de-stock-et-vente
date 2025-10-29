import express from 'express';
import {
  getAllSales,
  getSalesTotal,
  getSalesStats
} from '../controllers/salesController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authenticateToken);

router.get('/', getAllSales);
router.get('/total', getSalesTotal);
router.get('/stats', getSalesStats);

export default router;
