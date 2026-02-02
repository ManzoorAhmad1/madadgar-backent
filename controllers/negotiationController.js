import Booking from '../models/Booking.js';
import { createBookingNotification } from '../utils/notification.js';

// Provider proposes service charges when arrived
export const proposeServiceCharges = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { serviceCharges, description } = req.body;

    const booking = await Booking.findById(bookingId);

    if (!booking || booking.provider_id !== req.user.id) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found or unauthorized'
      });
    }

    if (booking.status !== 'arrived') {
      return res.status(400).json({
        status: 'error',
        message: 'Can only propose charges when arrived at location'
      });
    }

    const negotiation = {
      status: 'pending',
      providerProposedAmount: parseFloat(serviceCharges),
      description: description || '',
      history: [{
        by: 'provider',
        amount: parseFloat(serviceCharges),
        description,
        timestamp: new Date()
      }]
    };

    await Booking.updateById(bookingId, {
      service_charges: parseFloat(serviceCharges),
      negotiation: JSON.stringify(negotiation),
      negotiated_amount: parseFloat(serviceCharges),
      proposed_by: 'provider'
    });

    // Notify client
    await createBookingNotification(
      booking.client_id,
      bookingId,
      'price_proposed',
      `Provider proposed service charges: Rs.${serviceCharges}`
    );

    // Socket notification
    const io = req.app.get('io');
    const updatedBooking = await Booking.findById(bookingId);
    
    io.to(booking.client_id.toString()).emit('price-proposed', {
      bookingId,
      booking: updatedBooking,
      amount: parseFloat(serviceCharges),
      message: `Provider proposed Rs.${serviceCharges} for the service`
    });

    res.status(200).json({
      status: 'success',
      message: 'Service charges proposed successfully',
      data: updatedBooking
    });
  } catch (error) {
    next(error);
  }
};

// Client responds to proposed charges
export const respondToProposal = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { action, counterAmount } = req.body; // action: 'accept' | 'counter'

    const booking = await Booking.findById(bookingId);

    if (!booking || booking.client_id !== req.user.id) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found or unauthorized'
      });
    }

    let negotiation = booking.negotiation ? JSON.parse(booking.negotiation) : {};

    if (action === 'accept') {
      // Client accepts provider's proposal
      negotiation.status = 'accepted';
      negotiation.clientResponse = 'accepted';
      negotiation.history.push({
        by: 'client',
        action: 'accepted',
        amount: negotiation.providerProposedAmount,
        timestamp: new Date()
      });

      await Booking.updateById(bookingId, {
        negotiation: JSON.stringify(negotiation),
        final_agreed_amount: negotiation.providerProposedAmount,
        negotiated_amount: negotiation.providerProposedAmount,
        payment_accepted: 1,
        status: 'in_progress' // Move to in progress
      });

      // Notify provider
      await createBookingNotification(
        booking.provider_id,
        bookingId,
        'price_accepted',
        `Client accepted your proposed amount: Rs.${negotiation.providerProposedAmount}`
      );

      const io = req.app.get('io');
      const updatedBooking = await Booking.findById(bookingId);
      
      io.to(booking.provider_id.toString()).emit('price-accepted', {
        bookingId,
        booking: updatedBooking,
        message: 'Client accepted your proposed amount'
      });

      return res.status(200).json({
        status: 'success',
        message: 'Proposal accepted. Booking moved to in progress.',
        data: updatedBooking
      });
    }

    if (action === 'counter') {
      // Client counters with different amount
      negotiation.status = 'counter_offered';
      negotiation.clientCounterAmount = parseFloat(counterAmount);
      negotiation.history.push({
        by: 'client',
        action: 'counter_offer',
        amount: parseFloat(counterAmount),
        timestamp: new Date()
      });

      await Booking.updateById(bookingId, {
        negotiation: JSON.stringify(negotiation)
      });

      // Notify provider
      await createBookingNotification(
        booking.provider_id,
        bookingId,
        'price_counter',
        `Client counter-offered: Rs.${counterAmount}`
      );

      const io = req.app.get('io');
      const updatedBooking = await Booking.findById(bookingId);
      
      io.to(booking.provider_id.toString()).emit('price-counter-offered', {
        bookingId,
        booking: updatedBooking,
        amount: parseFloat(counterAmount),
        message: `Client counter-offered Rs.${counterAmount}`
      });

      return res.status(200).json({
        status: 'success',
        message: 'Counter offer sent to provider',
        data: updatedBooking
      });
    }

    return res.status(400).json({
      status: 'error',
      message: 'Invalid action'
    });
  } catch (error) {
    next(error);
  }
};

// Provider responds to client's counter offer
export const respondToCounterOffer = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { action } = req.body; // action: 'accept' | 'decline'

    const booking = await Booking.findById(bookingId);

    if (!booking || booking.provider_id !== req.user.id) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found or unauthorized'
      });
    }

    let negotiation = booking.negotiation ? JSON.parse(booking.negotiation) : {};

    if (action === 'accept') {
      // Provider accepts client's counter offer
      negotiation.status = 'accepted';
      negotiation.providerResponse = 'accepted';
      negotiation.history.push({
        by: 'provider',
        action: 'accepted_counter',
        amount: negotiation.clientCounterAmount,
        timestamp: new Date()
      });

      await Booking.updateById(bookingId, {
        negotiation: JSON.stringify(negotiation),
        final_agreed_amount: negotiation.clientCounterAmount,
        service_charges: negotiation.clientCounterAmount,
        negotiated_amount: negotiation.clientCounterAmount,
        payment_accepted: 1,
        status: 'in_progress'
      });

      // Notify client
      await createBookingNotification(
        booking.client_id,
        bookingId,
        'price_accepted',
        `Provider accepted your counter offer: Rs.${negotiation.clientCounterAmount}`
      );

      const io = req.app.get('io');
      const updatedBooking = await Booking.findById(bookingId);
      
      io.to(booking.client_id.toString()).emit('counter-accepted', {
        bookingId,
        booking: updatedBooking,
        message: 'Provider accepted your counter offer'
      });

      return res.status(200).json({
        status: 'success',
        message: 'Counter offer accepted. Booking moved to in progress.',
        data: updatedBooking
      });
    }

    if (action === 'decline') {
      // Provider declines - negotiation failed
      negotiation.status = 'rejected';
      negotiation.providerResponse = 'declined';
      negotiation.history.push({
        by: 'provider',
        action: 'declined_counter',
        timestamp: new Date()
      });

      await Booking.updateById(bookingId, {
        negotiation: JSON.stringify(negotiation)
      });

      // Notify client
      await createBookingNotification(
        booking.client_id,
        bookingId,
        'price_rejected',
        'Provider declined your counter offer'
      );

      const io = req.app.get('io');
      const updatedBooking = await Booking.findById(bookingId);
      
      io.to(booking.client_id.toString()).emit('counter-declined', {
        bookingId,
        booking: updatedBooking,
        message: 'Provider declined your counter offer'
      });

      return res.status(200).json({
        status: 'success',
        message: 'Counter offer declined',
        data: updatedBooking
      });
    }

    return res.status(400).json({
      status: 'error',
      message: 'Invalid action'
    });
  } catch (error) {
    next(error);
  }
};
