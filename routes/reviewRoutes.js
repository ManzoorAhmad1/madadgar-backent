import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createReview,
  getProviderReviews,
  updateReview,
  deleteReview,
  respondToReview
} from '../controllers/reviewController.js';

const router = express.Router();

router.post('/', protect, authorize('client'), createReview);
router.get('/provider/:id', getProviderReviews);
router.put('/:id', protect, authorize('client'), updateReview);
router.delete('/:id', protect, authorize('client'), deleteReview);
router.post('/:id/response', protect, authorize('provider'), respondToReview);

export default router;
