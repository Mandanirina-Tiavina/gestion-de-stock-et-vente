import express from 'express';
import {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder
} from '../controllers/orderControllerV2.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authenticateToken);

router.get('/', getAllOrders);
router.get('/:id', getOrderById);
router.post('/', authorizeRoles('admin', 'vendeur'), createOrder);
router.put('/:id', authorizeRoles('admin', 'vendeur'), updateOrder);
router.patch('/:id/status', authorizeRoles('admin', 'vendeur'), updateOrderStatus);
router.delete('/:id', authorizeRoles('admin', 'vendeur'), deleteOrder);

export default router;
