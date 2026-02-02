import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createBooking,
  getBookings,
  getBookingById,
  acceptBooking,
  rejectBooking,
  updateBookingStatus,
  confirmPayment,
  cancelBooking,
  getLiveTracking,
  updateProviderLocation,
  saveReceivedPayment
} from '../controllers/bookingController.js';
import {
  proposeServiceCharges,
  respondToProposal,
  respondToCounterOffer
} from '../controllers/negotiationController.js';
import {
  completeService,
  makePayment,
  getPaymentSummary
} from '../controllers/paymentController.js';

const router = express.Router();

router.post('/', protect, authorize('client'), createBooking);
router.get('/', protect, getBookings);
router.get('/my-bookings', protect, getBookings); // Client's own bookings
router.get('/provider/requests', protect, authorize('provider'), getBookings); // Provider view
router.get('/:id', protect, getBookingById);
router.post('/:id/accept', protect, authorize('provider'), acceptBooking);
router.post('/:id/reject', protect, authorize('provider'), rejectBooking);
router.patch('/:id/status', protect, updateBookingStatus);
router.put('/:id/received-payment', protect, authorize('provider'), saveReceivedPayment);
router.post('/:id/confirm-payment', protect, authorize('client'), confirmPayment);
router.post('/:id/cancel', protect, cancelBooking);
router.put('/:id/cancel', protect, cancelBooking); // Also support PUT for backward compatibility
router.get('/:id/tracking', protect, getLiveTracking);
router.post('/update-location', protect, authorize('provider'), updateProviderLocation);

// Price Negotiation Routes
router.post('/:bookingId/propose-charges', protect, authorize('provider'), proposeServiceCharges);
router.post('/:bookingId/respond-proposal', protect, authorize('client'), respondToProposal);
router.post('/:bookingId/respond-counter', protect, authorize('provider'), respondToCounterOffer);

// Payment Routes
router.post('/:id/complete', protect, authorize('provider'), completeService);
router.post('/:id/payment', protect, authorize('client'), makePayment);
router.get('/:id/payment-summary', protect, getPaymentSummary);

export default router;
