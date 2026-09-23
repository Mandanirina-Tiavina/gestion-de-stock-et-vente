import express from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts
} from '../controllers/productController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authenticateToken);

router.get('/', getAllProducts);
router.get('/low-stock', getLowStockProducts);
router.get('/:id', getProductById);
router.post('/', authorizeRoles('admin', 'vendeur'), createProduct);
router.put('/:id', authorizeRoles('admin', 'vendeur'), updateProduct);
router.delete('/:id', authorizeRoles('admin', 'vendeur'), deleteProduct);

export default router;
