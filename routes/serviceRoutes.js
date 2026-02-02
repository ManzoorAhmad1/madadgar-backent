import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getCategories,
  getCategoryById,
  searchServices,
  findNearbyProviders,
  calculatePrice,
  createCategory,
  updateCategory,
  deleteCategory,
  updateCommission
} from '../controllers/serviceController.js';

const router = express.Router();

// Public routes
router.get('/categories', getCategories);
router.get('/categories/:id', getCategoryById);
router.get('/search', searchServices);
router.get('/nearby', findNearbyProviders);
router.post('/calculate-price', calculatePrice);

// Admin only routes
router.post('/categories', protect, authorize('admin'), createCategory);
router.put('/categories/:id', protect, authorize('admin'), updateCategory);
router.delete('/categories/:id', protect, authorize('admin'), deleteCategory);
router.patch('/categories/:id/commission', protect, authorize('admin'), updateCommission);

export default router;
