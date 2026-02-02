import ChatMessage from '../models/ChatMessage.js';
import Booking from '../models/Booking.js';

// Send chat message
export const sendMessage = async (req, res, next) => {
  try {
    const { bookingId, message, messageType, fileUrl } = req.body;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    // Verify user is part of this booking
    const isClient = booking.client_id === req.user.id;
    const isProvider = booking.provider_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isClient && !isProvider && !isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized to access this chat'
      });
    }

    const senderType = isAdmin ? 'admin' : (isClient ? 'client' : 'provider');

    const chatMessage = await ChatMessage.create({
      booking_id: bookingId,
      sender_id: req.user.id,
      sender_type: senderType,
      message: message || '',
      message_type: messageType || 'text',
      file_url: fileUrl || null
    });

    // Update booking last message time
    await Booking.updateById(bookingId, {
      last_message_at: new Date()
    });

    const io = req.app.get('io');
    
    // Send to both participants and admin
    const recipients = [booking.client_id.toString(), booking.provider_id.toString()];
    
    recipients.forEach(recipientId => {
      if (recipientId !== req.user.id.toString()) {
        io.to(recipientId).emit('new-message', {
          bookingId,
          message: chatMessage
        });
      }
    });

    // Notify all admins
    io.to('admin-room').emit('new-message', {
      bookingId,
      message: chatMessage
    });

    res.status(201).json({
      status: 'success',
      data: chatMessage
    });
  } catch (error) {
    next(error);
  }
};

// Get chat messages
export const getMessages = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }

    // Verify access
    const isClient = booking.client_id === req.user.id;
    const isProvider = booking.provider_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isClient && !isProvider && !isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized to access this chat'
      });
    }

    const messages = await ChatMessage.findByBookingId(bookingId, limit);

    res.status(200).json({
      status: 'success',
      data: messages
    });
  } catch (error) {
    next(error);
  }
};

// Mark messages as read
export const markAsRead = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    await ChatMessage.markAsRead(bookingId, req.user.id);

    const io = req.app.get('io');
    
    // Notify sender that messages were read
    const booking = await Booking.findById(bookingId);
    const otherUserId = booking.client_id === req.user.id 
      ? booking.provider_id 
      : booking.client_id;

    io.to(otherUserId.toString()).emit('messages-read', {
      bookingId,
      readBy: req.user.id
    });

    res.status(200).json({
      status: 'success',
      message: 'Messages marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// Get unread count
export const getUnreadCount = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const count = await ChatMessage.getUnreadCount(bookingId, req.user.id);

    res.status(200).json({
      status: 'success',
      data: { unreadCount: count }
    });
  } catch (error) {
    next(error);
  }
};

// Typing indicator (via socket only, no DB storage needed)
export const handleTyping = (socket, io) => {
  socket.on('typing', (data) => {
    const { bookingId, userId, isTyping } = data;
    
    // Broadcast to other user in the chat
    socket.to(bookingId).emit('user-typing', {
      bookingId,
      userId,
      isTyping
    });
  });
};

export default {
  sendMessage,
  getMessages,
  markAsRead,
  getUnreadCount,
  handleTyping
};
