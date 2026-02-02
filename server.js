import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import database connection
import { testConnection } from './config/database.js';

// Import routes
import apiRoutes from './routes/index.js';

// Import middleware
import errorHandler from './middleware/errorHandler.js';
import rateLimiter from './middleware/rateLimiter.js';

// Import utilities
import { ensureUploadDir } from './utils/fileUpload.js';
import seedAdminUser from './utils/seedAdmin.js';

// Import models
import ChatMessage from './models/ChatMessage.js';
import Booking from './models/Booking.js';
import User from './models/User.js';

// Load environment variables
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const server = createServer(app);

// Trust proxy - Required for Render and other reverse proxies
// This fixes the X-Forwarded-For header error
app.set('trust proxy', 1);

// Initialize Socket.io (only if not on Passenger/Hostinger)
const isPassenger = typeof(PhusionPassenger) !== 'undefined';
let io;

if (!isPassenger) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  // Make io accessible to our router
  app.set('io', io);
  console.log('✅ Socket.io initialized');
} else {
  console.log('⚠️  Socket.io disabled on Passenger/Hostinger');
  // Provide dummy io for routes that might use it
  app.set('io', null);
}

// Middleware
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
// Only use morgan in development
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files from Hostinger path
const uploadPath = process.env.UPLOAD_PATH || 'uploads/';
app.use('/uploads', express.static(uploadPath));
console.log(`📁 Serving static files from: ${uploadPath}`);

// Apply rate limiting
// app.use('/api/', rateLimiter);

// Socket.io Connection Handler (only if Socket.io is initialized)
if (io) {
  io.on('connection', (socket) => {
    console.log('🔌 New client connected:', socket.id);

    // Error handler for socket
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    // Join room based on user ID
    socket.on('join', (userId) => {
      try {
        const roomId = userId.toString();
        socket.join(roomId);
        console.log(`👤 User ${userId} joined room: ${roomId}`);
      } catch (error) {
        console.error('❌ Error joining room:', error);
      }
    });

  // Join booking room for real-time updates
  socket.on('join-booking-room', (bookingId) => {
    try {
      socket.join(`booking-${bookingId}`);
      console.log(`📦 Socket ${socket.id} joined booking room: ${bookingId}`);
    } catch (error) {
      console.error('❌ Error joining booking room:', error);
    }
  });

  // Provider availability changed - broadcast to all clients
  socket.on('provider-availability-changed', async (data) => {
    const { providerId, isAvailable, timestamp } = data;
    console.log(`🔔 Provider ${providerId} availability changed to: ${isAvailable}`);

    try {
      // Get provider details to check location and categories
      const provider = await User.findById(providerId);
      
      if (provider) {
        const providerDetails = typeof provider.provider_details === 'string'
          ? JSON.parse(provider.provider_details)
          : provider.provider_details;

        // Broadcast to all connected clients (they will filter based on their location and filters)
        socket.broadcast.emit('provider-availability-changed', {
          providerId,
          isAvailable,
          provider: {
            id: provider.id,
            name: provider.name,
            location: providerDetails?.location,
            category: providerDetails?.category,
            rating: providerDetails?.rating,
          },
          timestamp,
        });

        console.log(`✅ Broadcasted availability change for provider ${providerId} to all clients`);
      }
    } catch (error) {
      console.error('❌ Error broadcasting provider availability:', error);
    }
  });

  // Provider location update
  socket.on('provider-location-update', (data) => {
    const { bookingId, location, speed } = data;
    console.log(`📍 Provider location update for booking ${bookingId}:`, location);

    // Broadcast to all users in this booking room
    io.to(`booking-${bookingId}`).emit('provider-location-update', {
      bookingId,
      location,
      speed,
      timestamp: new Date()
    });

    // Also broadcast to admin
    io.to('admin-room').emit('provider-location-update', { bookingId, location, speed });
  });

  // Client location update (for provider to see)
  socket.on('client-location-update', (data) => {
    const { bookingId, location } = data;
    console.log(`📍 Client location update for booking ${bookingId}:`, location);

    // Broadcast to all users in this booking room (especially provider)
    socket.to(`booking-${bookingId}`).emit('client-location-update', {
      bookingId,
      location,
      timestamp: new Date()
    });
  });

  // Booking status update
  socket.on('booking-status-update', (data) => {
    const { bookingId, status, userId } = data;
    console.log(`📝 Booking ${bookingId} status updated to: ${status}`);

    io.to(`booking-${bookingId}`).emit('booking-status-updated', {
      bookingId,
      booking: { status },
      timestamp: new Date()
    });
    io.to(userId).emit('booking-status-updated', { bookingId, booking: { status } });
    io.to('admin-room').emit('booking-status-updated', { bookingId, booking: { status } });
  });

  // Join admin room
  socket.on('join-admin', () => {
    socket.join('admin-room');
    console.log('👨‍💼 Admin joined monitoring room');
  });

  // Provider started drive - notify client
  socket.on('provider-started-drive', async (data) => {
    const { bookingId, providerId, timestamp } = data;
    console.log(`🚗 Provider ${providerId} started drive for booking ${bookingId}`);

    try {
      // Get booking details to find client
      const booking = await Booking.findByBookingId(bookingId);
      
      if (booking) {
        // Notify client
        io.to(booking.client_id.toString()).emit('provider-started-drive', {
          bookingId,
          providerId,
          message: 'Your provider is on the way!',
          timestamp,
        });

        // Notify admin
        io.to('admin-room').emit('provider-started-drive', {
          bookingId,
          providerId,
          timestamp,
        });

        console.log(`✅ Notified client ${booking.client_id} about provider starting drive`);
      }
    } catch (error) {
      console.error('❌ Error broadcasting provider drive start:', error);
    }
  });

  // Provider arrived at client location (auto-triggered by proximity)
  socket.on('provider-arrived', async (data) => {
    const { bookingId } = data;
    console.log(`🎯 Provider arrived at booking ${bookingId} location`);

    try {
      // Update booking status to arrived
      const booking = await Booking.findByBookingId(bookingId);
      
      if (booking && booking.status === 'en_route') {
        // Update status using updateById method
        await Booking.updateById(booking.id, { status: 'arrived' });

        // Broadcast to all relevant parties
        io.to(`booking-${bookingId}`).emit('booking-status-updated', {
          bookingId,
          booking: { booking_id: bookingId, status: 'arrived' },
          message: 'Provider has arrived!',
          timestamp: new Date()
        });

        io.to(booking.client_id.toString()).emit('booking-status-updated', {
          bookingId,
          booking: { booking_id: bookingId, status: 'arrived' },
          message: 'Provider has arrived!'
        });

        io.to(booking.provider_id.toString()).emit('booking-status-updated', {
          bookingId,
          booking: { booking_id: bookingId, status: 'arrived' },
          message: 'You have arrived at client location'
        });

        io.to('admin-room').emit('booking-status-updated', {
          bookingId,
          booking: { booking_id: bookingId, status: 'arrived' }
        });

        console.log(`✅ Booking ${bookingId} status updated to 'arrived'`);
      }
    } catch (error) {
      console.error('❌ Error updating booking to arrived:', error);
    }
  });

  // Payment negotiation: Propose amount
  socket.on('payment-propose', async (data) => {
    const { bookingId, amount, proposedBy } = data;
    console.log(`💰 Payment proposed for booking ${bookingId}: ₨${amount} by ${proposedBy}`);

    try {
      const booking = await Booking.findByBookingId(bookingId);
      
      if (booking) {
        console.log(`📋 Booking found: ${booking.id}, Client: ${booking.client_id}, Provider: ${booking.provider_id}`);
        
        // Update booking with negotiated amount using updateById
        await Booking.updateById(booking.id, {
          negotiated_amount: amount,
          proposed_by: proposedBy
        });

        // Notify the other party
        const recipientId = proposedBy === 'provider' ? booking.client_id : booking.provider_id;
        console.log(`📤 Sending payment proposal to user ${recipientId}`);
        
        // Emit with booking_id (the string ID) not booking.id (database ID)
        io.to(recipientId.toString()).emit('payment-proposed', {
          bookingId: booking.booking_id,
          amount,
          proposedBy,
          timestamp: new Date()
        });

        io.to(`booking-${bookingId}`).emit('payment-proposed', {
          bookingId: booking.booking_id,
          amount,
          proposedBy
        });

        // Notify admin
        io.to('admin-room').emit('payment-proposed', {
          bookingId: booking.id,
          amount,
          proposedBy,
          clientId: booking.client_id,
          providerId: booking.provider_id,
          timestamp: new Date()
        });

        console.log(`✅ Payment proposal sent to ${proposedBy === 'provider' ? 'client' : 'provider'} (ID: ${recipientId}) and admin`);
      }
    } catch (error) {
      console.error('❌ Error proposing payment:', error);
    }
  });

  // Payment negotiation: Accept amount
  socket.on('payment-accept', async (data) => {
    const { bookingId } = data;
    console.log(`✅ Payment accept received for booking ${bookingId}`);

    try {
      const booking = await Booking.findByBookingId(bookingId);
      
      if (!booking) {
        console.log(`❌ Booking not found: ${bookingId}`);
        return;
      }
      
      console.log(`📊 Current booking status: ${booking.status}`);
      
      if (booking.status === 'arrived') {
        console.log(`🔄 Updating booking ${bookingId} to in_progress...`);
        
        // Update booking status and payment accepted flag
        await Booking.updateById(booking.id, {
          status: 'in_progress',
          payment_accepted: true
        });

        const updatedBooking = await Booking.findByBookingId(bookingId);
        console.log(`✅ Booking updated. New status: ${updatedBooking.status}`);

        // Notify both parties that work has started
        console.log(`📡 Emitting to booking-${bookingId} room`);
        io.to(`booking-${bookingId}`).emit('booking-status-updated', {
          bookingId,
          booking: { 
            booking_id: bookingId,
            id: bookingId, 
            status: 'in_progress', 
            negotiatedAmount: updatedBooking.negotiatedAmount 
          },
          message: 'Work in progress',
          timestamp: new Date()
        });

        console.log(`📡 Emitting to client ${booking.client_id}`);
        io.to(booking.client_id.toString()).emit('booking-status-updated', {
          bookingId,
          booking: { booking_id: bookingId, id: bookingId, status: 'in_progress' },
          message: 'Provider has started working!'
        });

        console.log(`📡 Emitting to provider ${booking.provider_id}`);
        io.to(booking.provider_id.toString()).emit('booking-status-updated', {
          bookingId,
          booking: { booking_id: bookingId, id: bookingId, status: 'in_progress' },
          message: 'Work started - Payment agreed'
        });

        io.to('admin-room').emit('booking-status-updated', {
          bookingId,
          booking: { booking_id: bookingId, id: bookingId, status: 'in_progress', negotiatedAmount: updatedBooking.negotiatedAmount }
        });

        console.log(`✅ All notifications sent for booking ${bookingId}`);
      } else {
        console.log(`⚠️ Cannot accept payment - booking status is ${booking.status}, expected 'arrived'`);
      }
    } catch (error) {
      console.error('❌ Error accepting payment:', error);
    }
  });

  // Payment negotiation: Decline amount
  socket.on('payment-decline', async (data) => {
    const { bookingId, declinedBy } = data;
    console.log(`❌ Payment declined for booking ${bookingId} by ${declinedBy}`);

    try {
      const booking = await Booking.findByBookingId(bookingId);
      
      if (booking) {
        // Notify the other party that payment was declined
        const recipientId = declinedBy === 'provider' ? booking.client_id : booking.provider_id;
        
        io.to(recipientId.toString()).emit('payment-declined', {
          bookingId,
          declinedBy,
          message: `${declinedBy === 'provider' ? 'Provider' : 'Client'} declined the payment amount`,
          timestamp: new Date()
        });

        io.to(`booking-${bookingId}`).emit('payment-declined', {
          bookingId,
          declinedBy
        });

        console.log(`✅ Payment decline notification sent`);
      }
    } catch (error) {
      console.error('❌ Error declining payment:', error);
    }
  });

  // Mark work as completed (both parties must confirm)
  socket.on('mark-complete', async (data) => {
    const { bookingId, userId, role } = data;
    console.log(`✅ ${role} marked booking ${bookingId} as complete`);

    try {
      const booking = await Booking.findByBookingId(bookingId);
      
      // Accept 'in_progress' or empty status (empty status sometimes happens after 'arrived')
      if (booking && (booking.status === 'in_progress' || booking.status === '')) {
        // Parse existing completedBy
        let completedBy = [];
        if (booking.completedBy) {
          try {
            completedBy = typeof booking.completedBy === 'string' 
              ? JSON.parse(booking.completedBy) 
              : booking.completedBy;
          } catch (e) {
            completedBy = [];
          }
        }
        
        // Add role if not already present
        if (!completedBy.includes(role)) {
          completedBy.push(role);
          await Booking.updateById(booking.id, {
            completed_by: completedBy
          });
        }

        // If both parties confirmed, mark as work_done (waiting for payment confirmation)
        if (completedBy.includes('provider') && completedBy.includes('client')) {
          await Booking.updateById(booking.id, {
            status: 'work_done'
          });

          // Notify both parties - provider needs to confirm payment received
          io.to(`booking-${bookingId}`).emit('booking-status-updated', {
            bookingId,
            booking: { booking_id: bookingId, status: 'work_done' },
            message: 'Work completed! Awaiting payment confirmation.',
            timestamp: new Date()
          });

          io.to(booking.provider_id.toString()).emit('payment-pending', {
            bookingId,
            message: 'Please confirm payment received from client'
          });

          io.to(booking.client_id.toString()).emit('booking-status-updated', {
            bookingId,
            booking: { booking_id: bookingId, status: 'work_done' },
            message: 'Work done! Provider will confirm payment receipt.'
          });

          console.log(`✅ Booking ${bookingId} work done, awaiting payment confirmation`);
        } else {
          // Notify other party that one person has marked complete
          const otherRole = role === 'provider' ? 'client' : 'provider';
          const otherUserId = role === 'provider' ? booking.client_id : booking.provider_id;
          
          io.to(otherUserId.toString()).emit('completion-pending', {
            bookingId,
            markedBy: role,
            message: `${role === 'provider' ? 'Provider' : 'Client'} has marked the work as complete`
          });

          console.log(`⏳ Waiting for ${otherRole} to mark booking ${bookingId} as complete`);
        }
      }
    } catch (error) {
      console.error('❌ Error marking booking as complete:', error);
    }
  });

  // Confirm payment received (provider only)
  socket.on('confirm-payment-received', async (data) => {
    const { bookingId } = data;
    console.log(`💵 Provider confirmed payment received for booking ${bookingId}`);

    try {
      const booking = await Booking.findByBookingId(bookingId);
      
      if (booking && booking.status === 'work_done') {
        // Parse payment object
        let payment = {};
        try {
          payment = typeof booking.payment === 'string' ? JSON.parse(booking.payment) : (booking.payment || {});
        } catch (e) {
          payment = {};
        }

        // Update payment status
        payment.status = 'paid';
        payment.paidAt = new Date();

        await Booking.updateById(booking.id, {
          status: 'completed',
          completed_at: new Date(),
          payment: payment
        });

        // Notify all parties
        io.to(`booking-${bookingId}`).emit('booking-status-updated', {
          bookingId,
          booking: { booking_id: bookingId, status: 'completed' },
          message: 'Payment confirmed! Service completed.',
          timestamp: new Date()
        });

        io.to(booking.client_id.toString()).emit('booking-status-updated', {
          bookingId,
          booking: { booking_id: bookingId, status: 'completed' },
          message: 'Payment confirmed! Please leave a review.'
        });

        io.to(booking.provider_id.toString()).emit('booking-status-updated', {
          bookingId,
          booking: { booking_id: bookingId, status: 'completed' },
          message: 'Payment confirmed! Service completed successfully.'
        });

        io.to('admin-room').emit('booking-status-updated', {
          bookingId,
          booking: { booking_id: bookingId, status: 'completed' }
        });

        console.log(`✅ Booking ${bookingId} completed with payment confirmation`);
      }
    } catch (error) {
      console.error('❌ Error confirming payment:', error);
    }
  });

  // Review submitted - notify provider
  socket.on('review-submitted', async (data) => {
    const { bookingId, review } = data;
    console.log(`⭐ Review submitted for booking ${bookingId}`);

    try {
      const booking = await Booking.findByBookingId(bookingId);
      
      if (booking) {
        // Notify provider about the review
        io.to(booking.provider_id.toString()).emit('review-received', {
          bookingId,
          review,
          message: 'Client has submitted a review for your service'
        });

        // Notify booking room
        io.to(`booking-${bookingId}`).emit('review-updated', {
          bookingId,
          review
        });

        console.log(`✅ Notified provider ${booking.provider_id} about review for ${bookingId}`);
      }
    } catch (error) {
      console.error('❌ Error broadcasting review:', error);
    }
  });

  // Chat: Send message
  socket.on('send-message', async (data) => {
    const { bookingId, senderId, senderName, senderRole, message, messageType, fileUrl, timestamp } = data;

    console.log('📨 Received send-message event:', {
      bookingId,
      senderId,
      senderName,
      senderRole,
      messageLength: message?.length
    });

    try {
      // Save message to database (sender_id will be NULL for admin)
      const savedMessage = await ChatMessage.create({
        booking_id: bookingId,
        sender_id: senderId,
        sender_type: senderRole,
        message: message,
        message_type: messageType || 'text',
        file_url: fileUrl || null
      });

      console.log('💾 Message saved to database:', savedMessage.id, 'sender_name:', savedMessage.sender_name);

      const messageData = {
        id: savedMessage.id,
        bookingId,
        senderId: savedMessage.sender_id,
        senderName: savedMessage.sender_name || senderName,
        senderRole: savedMessage.sender_type,
        message,
        messageType: messageType || 'text',
        fileUrl,
        timestamp: savedMessage.created_at || timestamp || new Date().toISOString(),
        read: false,
      };

      console.log(`💬 Broadcasting message to booking-${bookingId}`, messageData);

      // Broadcast to booking room (including sender for their other devices)
      io.to(`booking-${bookingId}`).emit('new-message', messageData);

      // Also send to admin room
      io.to('admin-room').emit('new-message', messageData);

      // Get booking details to send to individual user rooms
      const booking = await Booking.findByBookingId(bookingId);
      if (booking) {
        // If admin is sending, notify both client and provider
        if (senderRole === 'admin') {
          io.to(booking.client_id.toString()).emit('new-message', messageData);
          console.log(`📤 Sent notification to client ${booking.client_id}`);
          if (booking.provider_id) {
            io.to(booking.provider_id.toString()).emit('new-message', messageData);
            console.log(`📤 Sent notification to provider ${booking.provider_id}`);
          }
        } else {
          // For regular users, send to the OTHER party only (not the sender)
          if (senderId !== booking.client_id) {
            io.to(booking.client_id.toString()).emit('new-message', messageData);
            console.log(`📤 Sent notification to client ${booking.client_id}`);
          }
          if (booking.provider_id && senderId !== booking.provider_id) {
            io.to(booking.provider_id.toString()).emit('new-message', messageData);
            console.log(`📤 Sent notification to provider ${booking.provider_id}`);
          }
        }
      }

      console.log('✅ Message broadcast completed');
    } catch (error) {
      console.error('❌ Error saving chat message:', error);
      socket.emit('message-error', { error: error.message });
    }
  });

  // Get messages for a booking
  socket.on('get-messages', async (data, callback) => {
    const { bookingId } = data;

    try {
      const messages = await ChatMessage.findByBookingId(bookingId);
      console.log(`📨 Retrieving ${messages.length} messages for booking ${bookingId}`);

      if (callback) {
        callback({ messages });
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      if (callback) {
        callback({ messages: [] });
      }
    }
  });

  // Typing indicator
  socket.on('typing', (data) => {
    const { bookingId, userId, isTyping } = data;
    console.log(`⌨️ User ${userId} is ${isTyping ? 'typing' : 'stopped typing'} in booking ${bookingId}`);

    // Broadcast to booking room except sender
    socket.to(`booking-${bookingId}`).emit('user-typing', { bookingId, userId, isTyping });
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
  });
} else {
  console.log('⚠️  Socket.io handlers skipped (running on Passenger)');
}

// API Routes
app.use('/api', apiRoutes);
console.log('✅ API routes mounted at /api');
console.log('   Available routes:');
console.log('   - /api/users/providers (GET)');
console.log('   - /api/users/providers/:id (GET)');
console.log('   - /api/auth/*');
console.log('   - /api/bookings/*');

// Root route
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Madadgar API Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      services: '/api/services',
      bookings: '/api/bookings',
    },
  });
});
// Add this route to debug environment variables
app.get('/debug', (req, res) => {
  res.json({
    server: 'running',
    timestamp: new Date().toISOString(),
    env: {
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
      DB_HOST: process.env.DB_HOST ? 'Set' : 'Not set',
      // Add other important env variables
    },
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

// Handle 404 routes (must be AFTER all route definitions)
app.use('*', (req, res) => {
  console.log('❌ 404 Route not found:', req.originalUrl);
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error Handler (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    console.log('🔄 Starting server initialization...');

    // Check if running on Passenger (Hostinger)
    const isPassenger = typeof(PhusionPassenger) !== 'undefined';
    
    if (isPassenger) {
      console.log('🚀 Running on Passenger (Hostinger)');
      console.log(`✅ Server ready on Passenger`);
    } else {
      // Start server normally (development)
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Server running on port ${PORT}`);
        console.log(`✅ Environment: ${process.env.NODE_ENV}`);
        console.log(`✅ Socket.io ready for real-time connections`);
        console.log(`✅ Health check: http://0.0.0.0:${PORT}/health`);
      });
    }

    // Test database connection (non-blocking)
    console.log('🔄 Testing database connection...');
    testConnection().then(() => {
      console.log('✅ Database connection successful');
      
      // Ensure upload directory exists
      console.log('🔄 Checking upload directory...');
      try {
        ensureUploadDir();
        console.log('✅ Upload directory ready');
      } catch (err) {
        console.warn('⚠️  Upload directory setup failed:', err.message);
      }

      // Seed default admin user
      console.log('🔄 Seeding admin user...');
      seedAdminUser().then(() => {
        console.log('✅ Admin user seeded');
      }).catch(err => {
        console.warn('⚠️  Admin seeding failed:', err.message);
      });
    }).catch(err => {
      console.error('⚠️  Database connection failed:', err.message);
    });

  } catch (error) {
    console.error('❌ Server startup error:', error.message);
    console.error('❌ Stack trace:', error.stack);
    // Don't exit, let server try to run
  }
};

// یہ بھی شامل کریں
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

startServer();

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

export default app;