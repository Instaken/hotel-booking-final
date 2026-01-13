require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const { PubSub } = require('@google-cloud/pubsub');
const logger = require('./utils/logger');
const emailService = require('./services/emailService');

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

// Pub/Sub setup
let pubSubClient;
let reservationSubscription;

const initPubSub = async () => {
  try {
    pubSubClient = new PubSub({
      projectId: process.env.GOOGLE_PROJECT_ID
    });

    // Subscribe to new-reservations topic
    const subscriptionName = 'new-reservations-sub';
    reservationSubscription = pubSubClient.subscription(subscriptionName);

    reservationSubscription.on('message', async (message) => {
      try {
        const data = JSON.parse(message.data.toString());
        logger.info('Received reservation message:', data);

        // Process the reservation notification
        await processReservationNotification(data);

        // Acknowledge the message
        message.ack();
        logger.info(`Message ${message.id} acknowledged`);
      } catch (error) {
        logger.error('Error processing message:', error);
        // Nack to retry later
        message.nack();
      }
    });

    reservationSubscription.on('error', (error) => {
      logger.error('Subscription error:', error);
    });

    logger.info('Pub/Sub subscription initialized');
  } catch (error) {
    logger.error('Pub/Sub initialization failed:', error);
  }
};

// Process reservation notification
const processReservationNotification = async (data) => {
  try {
    // Save notification to database
    await pool.query(
      `INSERT INTO notifications (
        type, recipient_email, recipient_name, subject, body, 
        metadata, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        'BOOKING_CONFIRMATION',
        data.guest_email,
        data.guest_name,
        `Booking Confirmation - ${data.booking_reference}`,
        generateBookingEmailBody(data),
        JSON.stringify(data),
        'PENDING'
      ]
    );

    // Send email
    await emailService.sendBookingConfirmation(data);

    // Update notification status
    await pool.query(
      `UPDATE notifications SET status = 'SENT', sent_at = NOW() 
       WHERE metadata->>'booking_id' = $1`,
      [data.booking_id]
    );

    logger.info(`Booking confirmation sent to ${data.guest_email}`);
  } catch (error) {
    logger.error('Error processing reservation notification:', error);
    throw error;
  }
};

// Generate booking email body
const generateBookingEmailBody = (data) => {
  return `
Dear ${data.guest_name},

Your booking has been confirmed!

Booking Reference: ${data.booking_reference}
Hotel: ${data.hotel_name}
Room: ${data.room_name}
Check-in: ${new Date(data.check_in).toLocaleDateString()}
Check-out: ${new Date(data.check_out).toLocaleDateString()}
Guests: ${data.guests}
Total Price: €${data.total_price}

Thank you for choosing our service!

Best regards,
Hotel Booking Team
  `.trim();
};

// Make db available to routes
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'notification-service' });
});

// Manual trigger endpoints (for testing)
app.post('/api/v1/notifications/test-email', async (req, res) => {
  try {
    const { email, subject, body } = req.body;
    await emailService.sendEmail(email, subject, body);
    res.json({ message: 'Test email sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get notifications history
app.get('/api/v1/notifications', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM notifications WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (type) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// HTTP endpoint for Cloud Scheduler to trigger nightly tasks
app.post('/api/v1/scheduler/capacity-check', async (req, res) => {
  try {
    logger.info('Running capacity check task...');
    await runCapacityCheck();
    res.json({ message: 'Capacity check completed' });
  } catch (error) {
    logger.error('Capacity check failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Capacity check function
const runCapacityCheck = async () => {
  try {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthEnd = new Date(nextMonth);
    nextMonthEnd.setMonth(nextMonthEnd.getMonth() + 1);

    // Find rooms with less than 20% capacity for next month
    const result = await pool.query(`
      SELECT 
        h.id as hotel_id,
        h.name as hotel_name,
        r.id as room_id,
        r.name as room_name,
        u.email as admin_email,
        u.name as admin_name,
        AVG(ra.available_count) as avg_availability,
        MAX(r.capacity) as total_capacity
      FROM hotels h
      JOIN rooms r ON h.id = r.hotel_id
      JOIN room_availability ra ON r.id = ra.room_id
      JOIN users u ON h.admin_id = u.id
      WHERE ra.date >= $1 AND ra.date < $2
      GROUP BY h.id, h.name, r.id, r.name, u.email, u.name
      HAVING AVG(ra.available_count) < (MAX(r.capacity) * 0.2)
    `, [nextMonth.toISOString().split('T')[0], nextMonthEnd.toISOString().split('T')[0]]);

    logger.info(`Found ${result.rows.length} rooms with low capacity`);

    // Group by admin and send notifications
    const adminNotifications = {};
    for (const row of result.rows) {
      if (!adminNotifications[row.admin_email]) {
        adminNotifications[row.admin_email] = {
          admin_name: row.admin_name,
          rooms: []
        };
      }
      adminNotifications[row.admin_email].rooms.push({
        hotel_name: row.hotel_name,
        room_name: row.room_name,
        avg_availability: Math.round(row.avg_availability * 100) / 100,
        capacity_percentage: Math.round((row.avg_availability / row.total_capacity) * 100)
      });
    }

    // Send notifications
    for (const [email, data] of Object.entries(adminNotifications)) {
      const roomsList = data.rooms.map(r => 
        `- ${r.hotel_name} / ${r.room_name}: ${r.capacity_percentage}% capacity remaining`
      ).join('\n');

      const body = `
Dear ${data.admin_name},

This is an automated notification to inform you that the following rooms have less than 20% capacity available for the next month:

${roomsList}

Please consider adjusting availability or taking promotional actions.

Best regards,
Hotel Booking System
      `.trim();

      // Save notification
      await pool.query(
        `INSERT INTO notifications (type, recipient_email, recipient_name, subject, body, metadata, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          'LOW_CAPACITY_ALERT',
          email,
          data.admin_name,
          'Low Capacity Alert - Action Required',
          body,
          JSON.stringify({ rooms: data.rooms }),
          'PENDING'
        ]
      );

      // Send email
      try {
        await emailService.sendEmail(email, 'Low Capacity Alert - Action Required', body);
        await pool.query(
          `UPDATE notifications SET status = 'SENT', sent_at = NOW() 
           WHERE recipient_email = $1 AND type = 'LOW_CAPACITY_ALERT' AND status = 'PENDING'`,
          [email]
        );
      } catch (emailError) {
        logger.error(`Failed to send email to ${email}:`, emailError);
      }
    }

    logger.info('Capacity check completed');
  } catch (error) {
    logger.error('Capacity check error:', error);
    throw error;
  }
};

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
  await initPubSub();
  
  app.listen(PORT, () => {
    logger.info(`Notification Service running on port ${PORT}`);
  });
};

startServer();
