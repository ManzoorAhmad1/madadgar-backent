import Booking from '../models/Booking.js';
import User from '../models/User.js';
import ServiceCategory from '../models/ServiceCategory.js';
import ChatMessage from '../models/ChatMessage.js';
import { createBookingNotification } from '../utils/notification.js';
import { sendBookingNotificationSMS } from '../utils/sms.js';
import { sendEmail, bookingConfirmationEmail } from '../utils/email.js';

export const createBooking = async (req, res, next) => {
  try {
    const {
      providerId,
      serviceCategoryId,
      serviceDescription = 'Service requested', // Optional with default
      location,
      scheduledTime,
      paymentMethod
    } = req.body;

    // Validate required fields
    if (!location || !location.coordinates || !location.address) {
      return res.status(400).json({
        status: 'error',
        message: 'Location with coordinates and address is required'
      });
    }

    // Get provider and category
    const provider = await User.findById(providerId);
    if (provider && provider.role !== 'provider') {
      return res.status(404).json({
        status: 'error',
        message: 'Provider not found'
      });
    }
    const category = await ServiceCategory.findById(serviceCategoryId);

    if (!provider || !category) {
      return res.status(404).json({
        status: 'error',
        message: 'Provider or category not found'
      });
    }

    if (!provider.providerDetails.approved) {
      return res.status(400).json({
        status: 'error',
        message: 'Provider is not approved'
      });
    }

    // Calculate distance - convert location objects to coordinate arrays
    const clientLocation = location.coordinates || location;
    const providerLocation = provider.providerDetails.location;
    
    // Handle different coordinate formats
    let clientCoords, providerCoords;
    
    if (Array.isArray(clientLocation)) {
      clientCoords = clientLocation; // [lng, lat]
    } else if (clientLocation.lng && clientLocation.lat) {
      clientCoords = [clientLocation.lng, clientLocation.lat];
    } else if (clientLocation.coordinates) {
      clientCoords = clientLocation.coordinates;
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid client location format'
      });
    }
    
    if (Array.isArray(providerLocation)) {
      providerCoords = providerLocation;
    } else if (providerLocation.lng && providerLocation.lat) {
      providerCoords = [providerLocation.lng, providerLocation.lat];
    } else if (providerLocation.coordinates) {
      providerCoords = providerLocation.coordinates;
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Provider location not properly configured'
      });
    }

    const distance = calculateDistance(clientCoords, providerCoords);

    // Calculate pricing
    const pricing = Booking.calculatePricing(category.basePrice, distance, category.slug);

    // Create booking
    const booking = await Booking.create({
      client_id: req.user.id,
      provider_id: providerId,
      service_category_id: serviceCategoryId,
      service_description: serviceDescription,
      location_address: location.address,
      location_coordinates: location.coordinates,
      scheduled_time: scheduledTime,
      payment: {
        method: paymentMethod,
        status: 'pending'
      },
      pricing: pricing
    });

    // Send notifications
    await createBookingNotification(providerId, booking.id, 'pending');
    
    // Send SMS to provider
    try {
      await sendBookingNotificationSMS(
        provider.phone,
        booking.bookingId,
        'new booking request'
      );
    } catch (error) {
      console.error('SMS Error:', error);
    }

    // Send email to client
    try {
      await sendEmail({
        to: req.user.email,
        subject: 'Booking Confirmation',
        html: bookingConfirmationEmail(
          req.user.name,
          booking.booking_id,
          category.name,
          new Date(scheduledTime).toLocaleString()
        )
      });
    } catch (error) {
      console.error('Email Error:', error);
    }

    // Emit Socket.io event with full booking details
    const io = req.app.get('io');
    const bookingWithDetails = await Booking.findById(booking.id);
    
    const providerRoomId = providerId.toString();
    console.log('📬 New booking created:', {
      bookingId: booking.id,
      booking_id: booking.booking_id,
      clientId: req.user.id,
      providerId: providerId,
      providerRoomId: providerRoomId,
      status: booking.status
    });
    
    // Notify provider of new booking request
    console.log(`📡 Emitting to provider room: ${providerRoomId}`);
    io.to(providerRoomId).emit('new-booking-request', {
      bookingId: booking.id,
      booking: bookingWithDetails,
      distance: distance,
      distanceUnit: 'km',
      message: 'New booking request received!',
      timestamp: new Date()
    });
    
    console.log(`📬 New booking notification sent to provider ${providerId}`);

    res.status(201).json({
      status: 'success',
      data: bookingWithDetails,
      message: 'Booking created successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10, category, maxDistance = 50 } = req.query;

    const filters = { status, page: parseInt(page), limit: parseInt(limit) };
    
    console.log(`📋 Fetching bookings for user ${req.user.id}, role: ${req.user.role}`);
    
    let bookings, total;
    if (req.user.role === 'client') {
      const result = await Booking.findByClientId(req.user.id, filters);
      bookings = result.bookings;
      total = result.total;
      console.log(`✅ Found ${bookings.length} bookings for client ${req.user.id}`);
      console.log('Bookings data:', JSON.stringify(bookings, null, 2));
    } else if (req.user.role === 'provider') {
      // Get provider's location
      const provider = await User.findById(req.user.id);
      const providerLocation = provider.providerDetails?.location?.coordinates || [73.0479, 33.6844];
      
      // Get all bookings for provider or pending bookings within range
      let result;
      if (req.path.includes('/provider/requests')) {
        // Fetch pending bookings and filter by distance
        result = await Booking.findPendingBookingsNearby(
          req.user.id, 
          providerLocation, 
          parseFloat(maxDistance),
          category,
          filters
        );
      } else {
        result = await Booking.findByProviderId(req.user.id, filters);
      }
      bookings = result.bookings;
      total = result.total;
    } else {
      const result = await Booking.findAll(filters);
      bookings = result.bookings;
      total = result.total;
    }

    res.status(200).json({
      status: 'success',
      data: bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error fetching bookings:', error);
    next(error);
  }
};

export const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    // Check authorization
    if (
      req.user.role !== 'admin' &&
      booking.client_id !== req.user.id &&
      booking.provider_id !== req.user.id
    ) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized'
      });
    }

    res.status(200).json({
      status: 'success',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

export const acceptBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    if (booking.provider_id !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized'
      });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'Booking cannot be accepted'
      });
    }

    await Booking.updateById(booking.id, { status: 'accepted' });
    
    // Get the updated booking with all details (client, provider, serviceCategory)
    const updatedBooking = await Booking.findById(booking.id);

    // Notify client
    await createBookingNotification(updatedBooking.client_id, updatedBooking.id, 'accepted');

    // Socket.io notifications
    const io = req.app.get('io');
    
    console.log(`✅ Booking ${updatedBooking.booking_id} accepted by provider ${req.user.id}`);
    console.log(`📡 Notifying client ${updatedBooking.client_id} in room: ${updatedBooking.client_id.toString()}`);
    
    // Notify client in their room with FULL booking data
    io.to(updatedBooking.client_id.toString()).emit('booking-status-updated', {
      bookingId: updatedBooking.booking_id,  // Use booking_id string
      booking: updatedBooking,
      status: 'accepted',
      message: 'Provider accepted your booking'
    });
    
    // Notify in booking room
    io.to(`booking-${updatedBooking.booking_id}`).emit('booking-status-updated', {
      bookingId: updatedBooking.booking_id,  // Use booking_id string
      booking: updatedBooking,
      status: 'accepted',
      timestamp: new Date()
    });

    res.status(200).json({
      status: 'success',
      data: updatedBooking
    });
  } catch (error) {
    next(error);
  }
};

export const rejectBooking = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking || booking.provider_id !== req.user.id) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    await Booking.updateById(booking.id, {
      status: 'rejected',
      cancelled_by: 'provider',
      cancellation_reason: reason,
      cancelled_at: new Date()
    });

    booking.status = 'rejected';

    await createBookingNotification(booking.client_id, booking.id, 'rejected');

    res.status(200).json({
      status: 'success',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

export const updateBookingStatus = async (req, res, next) => {
  try {
    const { status, location } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    // Only provider can update to certain statuses
    // Exception: Client can update to 'completed' when submitting review
    if (['en_route', 'arrived', 'in_progress'].includes(status)) {
      if (booking.provider_id !== req.user.id) {
        return res.status(403).json({
          status: 'error',
          message: 'Not authorized'
        });
      }
    }
    
    // For 'completed' status: allow provider OR client (when submitting review)
    if (status === 'completed') {
      if (booking.provider_id !== req.user.id && booking.client_id !== req.user.id) {
        return res.status(403).json({
          status: 'error',
          message: 'Not authorized'
        });
      }
    }

    const updates = { status };

    // Track timing
    if (status === 'arrived') {
      updates.actual_arrival = new Date();
    } else if (status === 'in_progress') {
      updates.start_time = new Date();
    } else if (status === 'completed') {
      updates.end_time = new Date();
      
      // Delete chat messages when booking is completed
      try {
        await ChatMessage.deleteByBookingId(booking.booking_id);
        console.log(`🗑️ Deleted chat messages for completed booking ${booking.booking_id}`);
      } catch (error) {
        console.error('Error deleting chat messages:', error);
      }
    }

    // Update location if provided
    if (location && ['en_route', 'arrived'].includes(status)) {
      updates.provider_location = JSON.stringify(location);
    }

    await Booking.updateById(booking.id, updates);
    
    // Get updated booking with booking_id
    const updatedBooking = await Booking.findById(booking.id);

    // Notify client
    await createBookingNotification(updatedBooking.client_id, updatedBooking.id, status);

    const io = req.app.get('io');
    
    console.log(`📡 Status updated to ${status} for booking ${updatedBooking.booking_id}`);
    console.log(`📡 Notifying client ${updatedBooking.client_id} in room: ${updatedBooking.client_id.toString()}`);
    
    io.to(updatedBooking.client_id.toString()).emit('booking-status-changed', {
      bookingId: updatedBooking.booking_id,  // Use booking_id string
      status
    });

    res.status(200).json({
      status: 'success',
      data: updatedBooking
    });
  } catch (error) {
    next(error);
  }
};

export const confirmPayment = async (req, res, next) => {
  try {
    const { paidAmount } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking || booking.client_id !== req.user.id) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Service must be completed first'
      });
    }

    await Booking.updateById(booking.id, {
      paid_amount: paidAmount,
      payment_status: 'paid',
      paid_at: new Date()
    });

    // Update provider earnings
    const provider = await User.findById(booking.provider_id);
    await User.updateById(booking.provider_id, {
      total_earnings: (provider.total_earnings || 0) + (booking.provider_earning || 0),
      completed_jobs: (provider.completed_jobs || 0) + 1
    });

    // Update client spending
    await User.updateById(req.user.id, {
      total_spent: (req.user.total_spent || 0) + paidAmount,
      bookings_count: (req.user.bookings_count || 0) + 1
    });

    res.status(200).json({
      status: 'success',
      message: 'Payment confirmed',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    // Check if user is authorized (either client or provider)
    if (booking.client_id !== req.user.id && booking.provider_id !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to cancel this booking'
      });
    }

    if (!['pending', 'accepted'].includes(booking.status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Booking cannot be cancelled at this stage'
      });
    }

    await Booking.updateById(booking.id, {
      status: 'cancelled',
      cancelled_by: req.user.role,
      cancellation_reason: reason || 'No reason provided',
      cancelled_at: new Date()
    });

    booking.status = 'cancelled';

    // Notify other party
    const notifyUserId = req.user.role === 'client' ? booking.provider_id : booking.client_id;
    await createBookingNotification(notifyUserId, booking.id, 'cancelled');

    // Socket.io notifications
    const io = req.app.get('io');
    
    // Notify the other party
    io.to(notifyUserId.toString()).emit('booking-status-updated', {
      bookingId: booking.id,
      booking: { status: 'cancelled' },
      message: `Booking cancelled by ${req.user.role}`,
      cancelledBy: req.user.role,
      reason: reason || 'No reason provided'
    });
    
    // Notify in booking room
    io.to(`booking-${booking.id}`).emit('booking-status-updated', {
      bookingId: booking.id,
      booking: { status: 'cancelled' },
      cancelledBy: req.user.role,
      timestamp: new Date()
    });

    res.status(200).json({
      status: 'success',
      message: 'Booking cancelled successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

export const updateProviderLocation = async (req, res, next) => {
  try {
    const { bookingId, latitude, longitude } = req.body;
    const io = req.app.get('io'); // Get socket.io instance
    
    if (!bookingId || !latitude || !longitude) {
      return res.status(400).json({
        status: 'error',
        message: 'Booking ID and location coordinates are required'
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    // Verify the provider owns this booking
    if (booking.provider_id !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized'
      });
    }

    // Update provider's current location in booking
    await Booking.updateProviderLocation(bookingId, { latitude, longitude });

    // Check if provider is near client location (auto-arrived)
    const providerCoords = [longitude, latitude];
    
    // Handle different client coordinate formats
    let clientCoords;
    const clientLocation = booking.location.coordinates || booking.location;
    
    if (Array.isArray(clientLocation)) {
      clientCoords = clientLocation;
    } else if (clientLocation.lng && clientLocation.lat) {
      clientCoords = [clientLocation.lng, clientLocation.lat];
    } else if (clientLocation.longitude && clientLocation.latitude) {
      clientCoords = [clientLocation.longitude, clientLocation.latitude];
    } else {
      console.log('⚠️ Invalid client location format:', clientLocation);
      return res.status(200).json({
        status: 'success',
        message: 'Location updated',
        data: booking
      });
    }
    
    const distance = calculateDistance(providerCoords, clientCoords);
    
    console.log(`📍 Distance check: ${distance.toFixed(3)} km between provider and client`);

    // Auto-arrived if within 100 meters (0.1 km) and status is en_route
    if (distance <= 0.1 && booking.status === 'en_route') {
      console.log('✅ Provider reached client location - Auto status update to ARRIVED');
      
      await Booking.updateById(bookingId, { status: 'arrived' });
      
      // Notify both client and provider
      await createBookingNotification(
        booking.client_id,
        bookingId,
        'arrived',
        'Provider has arrived at your location'
      );

      const updatedBooking = await Booking.findById(bookingId);
      
      // Emit to both client and provider
      io.to(booking.client_id.toString()).emit('booking-status-updated', {
        bookingId,
        booking: updatedBooking,
        status: 'arrived',
        message: 'Provider has arrived at your location'
      });
      
      io.to(booking.provider_id.toString()).emit('booking-status-updated', {
        bookingId,
        booking: updatedBooking,
        status: 'arrived',
        message: 'You have arrived at client location'
      });
    }

    // Emit Socket.io event to client for location update
    if (io) {
      io.to(`booking-${bookingId}`).emit('provider-location-update', {
        bookingId,
        location: { latitude, longitude },
        distance: distance,
        timestamp: new Date()
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Location updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getLiveTracking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to calculate distance between two points
function calculateDistance(coords1, coords2) {
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;

  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// Save received payment amount (Provider only during in_progress)
export const saveReceivedPayment = async (req, res, next) => {
  try {
    const { receivedAmount } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    if (booking.provider_id !== req.user.id) {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized'
      });
    }

    if (booking.status !== 'work_done') {
      return res.status(400).json({
        status: 'error',
        message: 'Can only record payment after work is done (work_done status)'
      });
    }

    if (!receivedAmount || receivedAmount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid received amount'
      });
    }

    // Update booking with received amount - keep status as work_done until client reviews
    await Booking.updateById(booking.id, {
      received_amount: receivedAmount
      // Do NOT change status to completed yet - wait for client review
    });

    // Get updated booking
    const updatedBooking = await Booking.findById(booking.id);

    // Notify client via socket
    const io = req.app.get('io');
    
    // Notify both client and provider that payment is recorded (NOT completed yet)
    io.to(booking.client_id.toString()).emit('payment-received', {
      bookingId: booking.booking_id,
      receivedAmount,
      message: `Provider received ₨${receivedAmount}. Please submit your review to complete.`
    });

    io.to(booking.provider_id.toString()).emit('payment-received', {
      bookingId: booking.booking_id,
      receivedAmount,
      message: `Payment recorded successfully! Waiting for client review.`
    });

    // Notify booking room - status still work_done
    io.to(`booking-${booking.booking_id}`).emit('payment-received', {
      bookingId: booking.booking_id,
      booking: { booking_id: booking.booking_id, status: 'work_done', receivedAmount },
      message: 'Payment recorded! Awaiting review.',
      timestamp: new Date()
    });

    console.log(`💵 Provider recorded payment: ₨${receivedAmount} for ${booking.booking_id} - awaiting review`);

    res.status(200).json({
      status: 'success',
      data: updatedBooking
    });
  } catch (error) {
    next(error);
  }
};
