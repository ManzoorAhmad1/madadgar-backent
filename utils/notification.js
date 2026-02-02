import Notification from '../models/Notification.js';

// Create notification
export const createNotification = async (userId, title, message, type, relatedId = null, relatedModel = null, data = {}) => {
  try {
    const notification = await Notification.create({
      user_id: userId,
      title,
      message,
      type,
      related_id: relatedId,
      related_model: relatedModel,
      data
    });

    // Emit real-time notification via Socket.io
    // Note: io is attached to app in server.js, not exported from server
    // This will be handled by controllers that have access to req.app
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Create booking notification
export const createBookingNotification = async (userId, bookingId, status) => {
  let title, message;
  
  switch (status) {
    case 'pending':
      title = 'New Booking Request';
      message = 'You have received a new booking request';
      break;
    case 'accepted':
      title = 'Booking Accepted';
      message = 'Your booking has been accepted';
      break;
    case 'rejected':
      title = 'Booking Rejected';
      message = 'Your booking request was rejected';
      break;
    case 'en_route':
      title = 'Provider En Route';
      message = 'Your service provider is on the way';
      break;
    case 'arrived':
      title = 'Provider Arrived';
      message = 'Your service provider has arrived';
      break;
    case 'in_progress':
      title = 'Service In Progress';
      message = 'Your service is now in progress';
      break;
    case 'completed':
      title = 'Service Completed';
      message = 'Your service has been completed. Please confirm payment';
      break;
    case 'cancelled':
      title = 'Booking Cancelled';
      message = 'Your booking has been cancelled';
      break;
    default:
      title = 'Booking Update';
      message = `Your booking status: ${status}`;
  }

  return await createNotification(
    userId,
    title,
    message,
    'booking_' + status.replace('_', ''),
    bookingId,
    'Booking'
  );
};
