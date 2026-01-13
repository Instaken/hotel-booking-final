require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const redis = require('redis');
const logger = require('./utils/logger');
const authMiddleware = require('./middleware/auth');
const adminMiddleware = require('./middleware/adminCheck');

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

// Make db and redis available to routes
app.use((req, res, next) => {
  req.db = pool;
  req.redis = redisClient;
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'admin-service' });
});

// API Routes
const hotelRoutes = require('./routes/hotels');
const roomRoutes = require('./routes/rooms');
const availabilityRoutes = require('./routes/availability');
const priceRoutes = require('./routes/price');

// Public routes
app.use('/api/v1/hotels', hotelRoutes);

// Protected admin routes
app.use('/api/v1/rooms', authMiddleware, adminMiddleware, roomRoutes);
app.use('/api/v1/availability', authMiddleware, adminMiddleware, availabilityRoutes);
app.use('/api/v1/price', priceRoutes);

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
  
  app.listen(PORT, () => {
    logger.info(`Admin Service running on port ${PORT}`);
  });
};

startServer();
