const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// GET /api/v1/availability - Get room availability
router.get('/', async (req, res, next) => {
  try {
    const { room_id, start_date, end_date } = req.query;

    if (!room_id) {
      return res.status(400).json({ error: 'room_id is required' });
    }

    let query = `
      SELECT ra.*, r.name as room_name, r.base_price
      FROM room_availability ra
      JOIN rooms r ON ra.room_id = r.id
      WHERE ra.room_id = $1
    `;
    const params = [room_id];

    if (start_date) {
      query += ` AND ra.date >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND ra.date <= $${params.length + 1}`;
      params.push(end_date);
    }

    query += ` ORDER BY ra.date ASC`;

    const result = await req.db.query(query, params);

    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/availability - Set room availability for date range
router.post('/',
  [
    body('room_id').matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).withMessage('room_id must be a valid UUID format'),
    body('start_date').isDate().withMessage('start_date must be a valid date (YYYY-MM-DD)'),
    body('end_date').isDate().withMessage('end_date must be a valid date (YYYY-MM-DD)'),
    body('available_count').isInt({ min: 0 }).withMessage('available_count must be a non-negative integer'),
    body('price_override').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('price_override must be a positive number')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.error('Validation errors:', { errors: errors.array(), body: req.body });
        return res.status(400).json({ errors: errors.array() });
      }

      const { room_id, start_date, end_date, available_count, price_override } = req.body;

      // Verify room exists and user is ADMIN
      // ADMIN users can manage all rooms
      const roomCheck = await req.db.query(
        `SELECT r.id, r.hotel_id, r.base_price FROM rooms r
         JOIN hotels h ON r.hotel_id = h.id
         WHERE r.id = $1`,
        [room_id]
      );

      if (roomCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'Room not found'
        });
      }

      const room = roomCheck.rows[0];
      const priceToUse = price_override || room.base_price;

      // Generate dates between start and end
      const startD = new Date(start_date);
      const endD = new Date(end_date);
      
      if (startD > endD) {
        return res.status(400).json({ error: 'start_date must be before end_date' });
      }

      const insertedRows = [];
      const currentDate = new Date(startD);

      while (currentDate <= endD) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Upsert availability
        const result = await req.db.query(
          `INSERT INTO room_availability (room_id, date, available_count, price)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (room_id, date) 
           DO UPDATE SET 
             available_count = EXCLUDED.available_count,
             price = EXCLUDED.price,
             updated_at = NOW()
           RETURNING *`,
          [room_id, dateStr, available_count, priceToUse]
        );
        
        insertedRows.push(result.rows[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Invalidate cache
      if (req.redis) {
        await req.redis.del(`hotel:${room.hotel_id}`);
        // Clear search cache as availability changed
        const searchKeys = await req.redis.keys('search:*');
        if (searchKeys.length > 0) {
          await req.redis.del(searchKeys);
        }
      }

      logger.info(`Availability updated for room ${room_id}: ${insertedRows.length} days`);

      res.status(201).json({
        message: `Availability set for ${insertedRows.length} days`,
        data: insertedRows
      });
    } catch (error) {
      next(error);
    }
  }
);

// UUID regex pattern for validation
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PUT /api/v1/availability/bulk - Bulk update availability
router.put('/bulk',
  [
    body('updates').isArray({ min: 1 }),
    body('updates.*.room_id').matches(UUID_PATTERN).withMessage('room_id must be a valid UUID format'),
    body('updates.*.date').isDate(),
    body('updates.*.available_count').isInt({ min: 0 }),
    body('updates.*.price').optional().isFloat({ min: 0 })
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { updates } = req.body;
      const results = [];

      for (const update of updates) {
        // Verify ownership for each room
        const roomCheck = await req.db.query(
          `SELECT r.id FROM rooms r
           JOIN hotels h ON r.hotel_id = h.id
           WHERE r.id = $1 AND h.admin_id = $2`,
          [update.room_id, req.user.id]
        );

        if (roomCheck.rows.length === 0) {
          results.push({
            room_id: update.room_id,
            date: update.date,
            success: false,
            error: 'Permission denied'
          });
          continue;
        }

        const result = await req.db.query(
          `INSERT INTO room_availability (room_id, date, available_count, price)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (room_id, date) 
           DO UPDATE SET 
             available_count = EXCLUDED.available_count,
             price = COALESCE(EXCLUDED.price, room_availability.price),
             updated_at = NOW()
           RETURNING *`,
          [update.room_id, update.date, update.available_count, update.price]
        );

        results.push({
          ...result.rows[0],
          success: true
        });
      }

      res.json({ data: results });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/availability/calendar/:room_id - Get calendar view
router.get('/calendar/:room_id', async (req, res, next) => {
  try {
    const { room_id } = req.params;
    const { month, year } = req.query;

    const targetMonth = parseInt(month) || new Date().getMonth() + 1;
    const targetYear = parseInt(year) || new Date().getFullYear();

    const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];

    const result = await req.db.query(
      `SELECT date, available_count, price
       FROM room_availability
       WHERE room_id = $1 AND date >= $2 AND date <= $3
       ORDER BY date ASC`,
      [room_id, startDate, endDate]
    );

    // Create calendar map
    const calendar = {};
    result.rows.forEach(row => {
      calendar[row.date.toISOString().split('T')[0]] = {
        available_count: row.available_count,
        price: row.price
      };
    });

    res.json({
      room_id,
      month: targetMonth,
      year: targetYear,
      availability: calendar
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
