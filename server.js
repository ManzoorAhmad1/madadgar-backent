import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

// Load environment variables
dotenv.config();

// Import database connection
import { testConnection } from './config/database.js';

// Import routes
import apiRoutes from './routes/index.js';

// Import middleware
import errorHandler from './middleware/errorHandler.js';

// Import utilities
import { ensureUploadDir } from './utils/fileUpload.js';
import seedAdminUser from './utils/seedAdmin.js';

// Initialize Express app
const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: "*",
  credentials: true,
}));

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
const uploadPath = process.env.UPLOAD_PATH || 'uploads/';
app.use('/uploads', express.static(uploadPath));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Debug endpoint
app.get('/debug', (req, res) => {
  res.json({
    server: 'running',
    timestamp: new Date().toISOString(),
    env: {
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
      DB_HOST: process.env.DB_HOST ? 'Set' : 'Not set',
    },
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Madadgar API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      debug: '/debug',
      api: '/api',
    },
  });
});

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error Handler
app.use(errorHandler);

// Initialize server
const PORT = process.env.PORT || 8080;

const initializeServer = async () => {
  try {
    console.log('🚀 Initializing Madadgar API Server...');
    console.log(`📍 Environment: ${process.env.NODE_ENV}`);
    console.log(`📍 Port: ${PORT}`);

    // Test database connection
    try {
      await testConnection();
      console.log('✅ Database connected');
    } catch (error) {
      console.error('⚠️  Database connection failed:', error.message);
    }

    // Setup upload directory
    try {
      ensureUploadDir();
      console.log('✅ Upload directory ready');
    } catch (error) {
      console.warn('⚠️  Upload directory setup failed:', error.message);
    }

    // Seed admin user
    try {
      await seedAdminUser();
      console.log('✅ Admin user seeded');
    } catch (error) {
      console.warn('⚠️  Admin seeding failed:', error.message);
    }

    // Always start the server - Passenger will manage the port
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ Environment: ${process.env.NODE_ENV}`);
      console.log(`✅ Health check available at /health`);
    });

  } catch (error) {
    console.error('❌ Initialization error:', error);
  }
};

// Start initialization
initializeServer();

// Handle errors
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

// For ES modules compatibility
export default app;
