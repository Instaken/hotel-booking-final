require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const redis = require('redis');
const { PubSub } = require('@google-cloud/pubsub');
const logger = require('./utils/logger');
const authMiddleware = require('./middleware/auth');
const optionalAuthMiddleware = require('./middleware/optionalAuth');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// PostgreSQL Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Redis Client
let redisClient;
const initRedis = async () => {
  try {
    redisClient = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || '10.203.231.43',
        port: process.env.REDIS_PORT || 6379
      },
      password: process.env.REDIS_PASSWORD || '9810b277-79dc-47e7-a7bb-e8617afb813a'
    });
    
    redisClient.on('error', (err) => logger.error('Redis Client Error', err));
    await redisClient.connect();
    logger.info('Redis connected successfully');
  } catch (error) {
    logger.error('Redis connection failed:', error);
  }
};

// Pub/Sub Client
let pubSubClient;
const initPubSub = () => {
  try {
    pubSubClient = new PubSub({
      projectId: process.env.GOOGLE_PROJECT_ID
    });
    logger.info('Pub/Sub client initialized');
  } catch (error) {
    logger.error('Pub/Sub initialization failed:', error);
  }
};

// Make db, redis, pubsub available to routes
app.use((req, res, next) => {
  req.db = pool;
  req.redis = redisClient;
  req.pubsub = pubSubClient;
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'client-service' });
});

// API Routes
const searchRoutes = require('./routes/search');
const bookingRoutes = require('./routes/booking');
const userRoutes = require('./routes/user');

// Search is public but shows discount for logged in users
app.use('/api/v1/search', optionalAuthMiddleware, searchRoutes);

// Booking requires authentication
app.use('/api/v1/bookings', authMiddleware, bookingRoutes);

// User profile
app.use('/api/v1/user', authMiddleware, userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// Start server
const startServer = async () => {
  await initRedis();
  initPubSub();
  
  app.listen(PORT, () => {
    logger.info(`Client Service running on port ${PORT}`);
  });
};

startServer();
