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
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authenticateToken);

// Routes catégories
router.get('/', getAllCategories);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

// Routes couleurs
router.get('/colors', getAllColors);
router.post('/colors', createColor);
router.delete('/colors/:id', deleteColor);

export default router;
