// Initialize Stripe only if secret key is provided
let stripe = null;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (stripeSecretKey && stripeSecretKey.startsWith('sk_') && !stripeSecretKey.includes('your_stripe')) {
  const Stripe = await import('stripe');
  stripe = Stripe.default(stripeSecretKey);
  console.log('✅ Stripe initialized successfully');
} else {
  console.warn('⚠️  Stripe credentials not configured. Payment functionality will be disabled.');
}

import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { createBookingNotification } from '../utils/notification.js';

// Provider marks service as completed
export const completeService = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId);

    if (!booking || booking.provider_id !== req.user.id) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found or unauthorized'
      });
    }

    if (booking.status !== 'in_progress') {
      return res.status(400).json({
        status: 'error',
        message: 'Service must be in progress to complete'
      });
    }

    // Update booking status to work_done (NOT completed until payment is made)
    await Booking.updateById(bookingId, {
      status: 'work_done',
      completed_at: new Date(),
      notes: notes || booking.notes,
      payment: {
        method: 'cash', // Default to cash, can be changed by client
        status: 'pending'
      }
    });

    // Notify client
    await createBookingNotification(
      booking.client_id,
      bookingId,
      'completed',
      'Service has been completed. Please make payment.'
    );

    const io = req.app.get('io');
    const updatedBooking = await Booking.findById(bookingId);
    
    console.log('📋 Service Completed - Booking Details:', {
      id: updatedBooking.id,
      status: updatedBooking.status,
      payment: updatedBooking.payment,
      providerId: booking.provider_id,
      clientId: booking.client_id
    });
    
    // Notify client - payment required (single event)
    io.to(booking.client_id.toString()).emit('service-completed', {
      bookingId,
      booking: updatedBooking,
      message: 'Service completed. Please proceed with payment.',
      requiresPayment: true
    });

    // Notify provider - awaiting payment (single event)
    io.to(booking.provider_id.toString()).emit('service-completed', {
      bookingId,
      booking: updatedBooking,
      status: 'work_done',
      message: 'Service marked as completed. Waiting for client payment.'
    });

    console.log(`✅ Service work_done for booking ${bookingId}, waiting for payment`);

    res.status(200).json({
      status: 'success',
      message: 'Service marked as completed. Waiting for payment.',
      data: updatedBooking
    });
  } catch (error) {
    next(error);
  }
};

// Client makes payment after service completion
export const makePayment = async (req, res, next) => {
  try {
    const { paymentMethod, transactionId, amount } = req.body;
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId);

    if (!booking || booking.client_id !== req.user.id) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found or unauthorized'
      });
    }

    if (booking.status !== 'work_done') {
      return res.status(400).json({
        status: 'error',
        message: 'Service must be marked as completed (work_done) before payment'
      });
    }

    // Get final agreed amount
    const finalAmount = booking.final_agreed_amount || booking.pricing?.totalAmount || amount;
    
    const paymentData = {
      method: paymentMethod,
      amount: finalAmount,
      status: 'paid',
      paid_at: new Date()
    };

    if (paymentMethod === 'online' && transactionId) {
      paymentData.transaction_id = transactionId;
      paymentData.transaction_ref = `TXN-${Date.now()}`;
    }

    // Update booking payment AND status to completed
    await Booking.updateById(bookingId, {
      payment: paymentData,
      status: 'completed'  // ✅ NOW mark as completed after payment
    });

    // Update provider earnings
    const provider = await User.findById(booking.provider_id);
    const providerEarning = booking.pricing?.providerEarning || finalAmount;
    
    const updatedProviderDetails = {
      ...provider.providerDetails,
      totalEarnings: (provider.providerDetails?.totalEarnings || 0) + providerEarning,
      completedJobs: (provider.providerDetails?.completedJobs || 0) + 1
    };
    
    await User.updateById(booking.provider_id, {
      providerDetails: updatedProviderDetails
    });

    // Notify provider
    await createBookingNotification(
      booking.provider_id,
      bookingId,
      'payment_received',
      `Payment received: Rs.${finalAmount} via ${paymentMethod}`
    );

    const io = req.app.get('io');
    const updatedBooking = await Booking.findById(bookingId);
    
    // Notify provider about payment (single event)
    io.to(booking.provider_id.toString()).emit('payment-received', {
      bookingId,
      booking: updatedBooking,
      amount: finalAmount,
      method: paymentMethod,
      message: `Payment received: Rs.${finalAmount}`
    });

    // Notify client about payment success (single event)
    io.to(booking.client_id.toString()).emit('payment-received', {
      bookingId,
      booking: updatedBooking,
      amount: finalAmount,
      message: 'Payment completed successfully!'
    });

    console.log(`✅ Payment completed for booking ${bookingId}, amount: Rs.${finalAmount}`);

    res.status(200).json({
      status: 'success',
      message: 'Payment completed successfully',
      data: updatedBooking
    });
  } catch (error) {
    next(error);
  }
};

// Get payment summary
export const getPaymentSummary = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    const finalAmount = booking.final_agreed_amount || booking.pricing?.totalAmount || 0;
    const driverCharges = 300;
    const serviceCharges = finalAmount - driverCharges;
    
    res.status(200).json({
      status: 'success',
      data: {
        bookingId: booking.booking_id,
        serviceCategory: booking.serviceCategory?.name,
        providerName: booking.provider?.name,
        breakdown: {
          serviceCharges: serviceCharges,
          driverCharges: driverCharges,
          total: finalAmount
        },
        paymentMethods: ['cash', 'online'],
        currency: 'PKR'
      }
    });
  } catch (error) {
    next(error);
  }
};

export default Booking;

export const createPaymentIntent = async (req, res, next) => {
  try {
    if (!stripe) {
      return res.status(503).json({ 
        status: 'error', 
        message: 'Payment service not configured' 
      });
    }

    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.total_amount * 100), // Convert to cents
      currency: 'pkr',
      metadata: { bookingId: booking.id.toString() }
    });

    res.status(200).json({
      status: 'success',
      data: {
        clientSecret: paymentIntent.client_secret
      }
    });
  } catch (error) {
    next(error);
  }
};

export const confirmPayment = async (req, res, next) => {
  try {
    if (!stripe) {
      return res.status(503).json({ 
        status: 'error', 
        message: 'Payment service not configured' 
      });
    }

    const { bookingId, paymentIntentId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      await Booking.updateById(bookingId, {
        payment_status: 'paid',
        transaction_id: paymentIntentId,
        paid_amount: booking.total_amount,
        paid_at: new Date()
      });
      
      booking.payment_status = 'paid';
    }

    res.status(200).json({ status: 'success', data: booking });
  } catch (error) {
    next(error);
  }
};

export const getPaymentHistory = async (req, res, next) => {
  try {
    const filters = { paymentStatus: 'paid' };
    let bookings;
    
    if (req.user.role === 'client') {
      const result = await Booking.findByClientId(req.user.id, filters);
      bookings = result.bookings || result;
    } else {
      const result = await Booking.findByProviderId(req.user.id, filters);
      bookings = result.bookings || result;
    }

    res.status(200).json({ status: 'success', data: bookings });
  } catch (error) {
    next(error);
  }
};

export const getReceipt = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking || booking.payment_status !== 'paid') {
      return res.status(404).json({ status: 'error', message: 'Receipt not found' });
    }

    res.status(200).json({ status: 'success', data: booking });
  } catch (error) {
    next(error);
  }
};
