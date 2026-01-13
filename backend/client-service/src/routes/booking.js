const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const DISCOUNT_PERCENTAGE = 0.10;

// GET /api/v1/bookings - Get user's bookings
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status; // PENDING, CONFIRMED, CANCELLED, COMPLETED

    let queryText = `
      SELECT 
        b.*,
        h.name as hotel_name,
        h.city as hotel_city,
        h.images as hotel_images,
        r.name as room_name,
        r.room_type
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      JOIN hotels h ON r.hotel_id = h.id
      WHERE b.user_id = $1
    `;
    
    const params = [req.user.id];
    let paramIndex = 2;

    if (status) {
      queryText += ` AND b.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    queryText += ` ORDER BY b.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await req.db.query(queryText, params);

    // Count total
    const countResult = await req.db.query(
      `SELECT COUNT(*) FROM bookings WHERE user_id = $1 ${status ? 'AND status = $2' : ''}`,
      status ? [req.user.id, status] : [req.user.id]
    );

    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      data: result.rows.map(booking => ({
        ...booking,
        hotel_images: typeof booking.hotel_images === 'string' ? 
          JSON.parse(booking.hotel_images) : booking.hotel_images
      })),
      pagination: {
        page,
        limit,
        total_count: totalCount,
        total_pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/bookings/:id - Get booking details
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await req.db.query(
      `SELECT 
        b.*,
        h.id as hotel_id,
        h.name as hotel_name,
        h.address as hotel_address,
        h.city as hotel_city,
        h.country as hotel_country,
        h.images as hotel_images,
        h.latitude,
        h.longitude,
        r.name as room_name,
        r.room_type,
        r.capacity,
        r.amenities as room_amenities
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      JOIN hotels h ON r.hotel_id = h.id
      WHERE b.id = $1 AND b.user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = result.rows[0];
    
    res.json({
      ...booking,
      hotel_images: typeof booking.hotel_images === 'string' ? 
        JSON.parse(booking.hotel_images) : booking.hotel_images,
      room_amenities: typeof booking.room_amenities === 'string' ? 
        JSON.parse(booking.room_amenities) : booking.room_amenities
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/bookings - Create new booking
router.post('/',
  [
    body('room_id').isUUID(),
    body('check_in').isISO8601(),
    body('check_out').isISO8601(),
    body('guests').isInt({ min: 1 }),
    body('guest_name').notEmpty().trim(),
    body('guest_email').isEmail(),
    body('guest_phone').optional().trim(),
    body('special_requests').optional().trim()
  ],
  async (req, res, next) => {
    const client = await req.db.connect();
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        room_id,
        check_in,
        check_out,
        guests,
        guest_name,
        guest_email,
        guest_phone,
        special_requests
      } = req.body;

      await client.query('BEGIN');

      // Check room exists and get details
      const roomResult = await client.query(
        `SELECT r.*, h.name as hotel_name, h.id as hotel_id
         FROM rooms r
         JOIN hotels h ON r.hotel_id = h.id
         WHERE r.id = $1`,
        [room_id]
      );

      if (roomResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Room not found' });
      }

      const room = roomResult.rows[0];

      // Check capacity
      if (guests > room.capacity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Room capacity is ${room.capacity}, but ${guests} guests requested` 
        });
      }

      // Check availability for all dates
      const checkInDate = new Date(check_in);
      const checkOutDate = new Date(check_out);
      
      if (checkInDate >= checkOutDate) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Check-out must be after check-in' });
      }

      const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

      // Get availability and calculate price
      const availabilityResult = await client.query(
        `SELECT date, available_count, price
         FROM room_availability
         WHERE room_id = $1 AND date >= $2 AND date < $3
         ORDER BY date ASC
         FOR UPDATE`,
        [room_id, check_in, check_out]
      );

      // Check if all dates are available
      const availableDates = availabilityResult.rows;
      
      if (availableDates.length < nights) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Room is not available for all requested dates' 
        });
      }

      // Check availability count for all dates
      const unavailableDates = availableDates.filter(d => d.available_count < 1);
      if (unavailableDates.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Room is fully booked for some dates',
          unavailable_dates: unavailableDates.map(d => d.date)
        });
      }

      // Calculate total price
      let totalPrice = availableDates.reduce((sum, day) => sum + parseFloat(day.price), 0);
      
      // Apply 10% discount for logged-in users
      const discountApplied = DISCOUNT_PERCENTAGE;
      const originalPrice = totalPrice;
      totalPrice = totalPrice * (1 - discountApplied);

      // Create booking
      const bookingId = uuidv4();
      const bookingResult = await client.query(
        `INSERT INTO bookings (
          id, user_id, room_id, check_in, check_out,
          guests, guest_name, guest_email, guest_phone,
          special_requests, total_price, original_price,
          discount_percentage, status, booking_reference
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          bookingId,
          req.user.id,
          room_id,
          check_in,
          check_out,
          guests,
          guest_name,
          guest_email,
          guest_phone,
          special_requests,
          Math.round(totalPrice * 100) / 100,
          Math.round(originalPrice * 100) / 100,
          discountApplied * 100,
          'CONFIRMED',
          `HB${Date.now().toString(36).toUpperCase()}`
        ]
      );

      // Decrease availability for all dates
      for (const day of availableDates) {
        await client.query(
          `UPDATE room_availability
           SET available_count = available_count - 1,
               updated_at = NOW()
           WHERE room_id = $1 AND date = $2`,
          [room_id, day.date]
        );
      }

      await client.query('COMMIT');

      const booking = bookingResult.rows[0];

      // Publish to Pub/Sub for notification service
      if (req.pubsub) {
        try {
          const topicName = 'new-reservations';
          const topic = req.pubsub.topic(topicName);
          
          const messageData = JSON.stringify({
            booking_id: booking.id,
            booking_reference: booking.booking_reference,
            hotel_name: room.hotel_name,
            hotel_id: room.hotel_id,
            room_name: room.name,
            guest_name: guest_name,
            guest_email: guest_email,
            check_in: check_in,
            check_out: check_out,
            guests: guests,
            total_price: booking.total_price,
            created_at: new Date().toISOString()
          });

          await topic.publishMessage({ data: Buffer.from(messageData) });
          logger.info(`Published booking ${booking.id} to Pub/Sub`);
        } catch (pubsubError) {
          logger.error('Failed to publish to Pub/Sub:', pubsubError);
          // Don't fail the booking if pub/sub fails
        }
      }

      // Invalidate cache
      if (req.redis) {
        try {
          const keys = await req.redis.keys('search:*');
          if (keys.length > 0) {
            await req.redis.del(keys);
          }
          await req.redis.del(`hotel:${room.hotel_id}`);
        } catch (cacheErr) {
          logger.warn('Cache invalidation error:', cacheErr);
        }
      }

      res.status(201).json({
        message: 'Booking confirmed successfully',
        booking: {
          ...booking,
          hotel_name: room.hotel_name,
          room_name: room.name,
          nights
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      next(error);
    } finally {
      client.release();
    }
  }
);

// PUT /api/v1/bookings/:id/cancel - Cancel booking
router.put('/:id/cancel', async (req, res, next) => {
  const client = await req.db.connect();
  
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Get booking
    const bookingResult = await client.query(
      `SELECT b.*, r.hotel_id
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       WHERE b.id = $1 AND b.user_id = $2
       FOR UPDATE`,
      [id, req.user.id]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (booking.status === 'CANCELLED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    if (booking.status === 'COMPLETED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot cancel a completed booking' });
    }

    // Update booking status
    await client.query(
      `UPDATE bookings SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    // Restore availability
    await client.query(
      `UPDATE room_availability
       SET available_count = available_count + 1,
           updated_at = NOW()
       WHERE room_id = $1 AND date >= $2 AND date < $3`,
      [booking.room_id, booking.check_in, booking.check_out]
    );

    await client.query('COMMIT');

    // Invalidate cache
    if (req.redis) {
      try {
        const keys = await req.redis.keys('search:*');
        if (keys.length > 0) {
          await req.redis.del(keys);
        }
        await req.redis.del(`hotel:${booking.hotel_id}`);
      } catch (cacheErr) {
        logger.warn('Cache invalidation error:', cacheErr);
      }
    }

    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

module.exports = router;
