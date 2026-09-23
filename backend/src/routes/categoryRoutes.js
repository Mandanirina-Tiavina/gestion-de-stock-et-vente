import express from 'express';
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllColors,
  createColor,
  deleteColor
} from '../controllers/categoryController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authenticateToken);

// Routes catégories
router.get('/', getAllCategories);
router.post('/', authorizeRoles('admin'), createCategory);
router.put('/:id', authorizeRoles('admin'), updateCategory);
router.delete('/:id', authorizeRoles('admin'), deleteCategory);

// Routes couleurs
router.get('/colors', getAllColors);
router.post('/colors', authorizeRoles('admin'), createColor);
router.delete('/colors/:id', authorizeRoles('admin'), deleteColor);

export default router;
