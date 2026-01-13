const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// GET /api/v1/rooms - List rooms for a hotel
router.get('/', async (req, res, next) => {
  try {
    const { hotel_id } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let query = `
      SELECT r.*, h.name as hotel_name
      FROM rooms r
      JOIN hotels h ON r.hotel_id = h.id
    `;
    const params = [];

    if (hotel_id) {
      query += ` WHERE r.hotel_id = $1`;
      params.push(hotel_id);
    }

    query += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await req.db.query(query, params);

    res.json({
      data: result.rows,
      pagination: { page, limit }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/rooms/:id - Get room details
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await req.db.query(
      `SELECT r.*, h.name as hotel_name
       FROM rooms r
       JOIN hotels h ON r.hotel_id = h.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/rooms - Create new room
router.post('/',
  [
    body('hotel_id').isUUID(),
    body('name').notEmpty().trim(),
    body('description').optional().trim(),
    body('room_type').isIn(['SINGLE', 'DOUBLE', 'SUITE', 'DELUXE', 'FAMILY']),
    body('capacity').isInt({ min: 1, max: 10 }),
    body('base_price').isFloat({ min: 0 }),
    body('size_sqm').optional().isFloat({ min: 0 }),
    body('amenities').optional().isArray(),
    body('images').optional().isArray()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        hotel_id, name, description, room_type, capacity,
        base_price, size_sqm, amenities, images
      } = req.body;

      // Verify hotel exists and admin owns it
      const hotelCheck = await req.db.query(
        'SELECT id FROM hotels WHERE id = $1 AND admin_id = $2',
        [hotel_id, req.user.id]
      );

      if (hotelCheck.rows.length === 0) {
        return res.status(403).json({ 
          error: 'Hotel not found or you do not have permission' 
        });
      }

      const result = await req.db.query(
        `INSERT INTO rooms (
          hotel_id, name, description, room_type, capacity,
          base_price, size_sqm, amenities, images
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          hotel_id, name, description, room_type, capacity,
          base_price, size_sqm,
          JSON.stringify(amenities || []),
          JSON.stringify(images || [])
        ]
      );

      // Invalidate hotel cache
      if (req.redis) {
        await req.redis.del(`hotel:${hotel_id}`);
      }

      res.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/v1/rooms/:id - Update room
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name, description, room_type, capacity,
      base_price, size_sqm, amenities, images
    } = req.body;

    // Get room and verify ownership
    const roomCheck = await req.db.query(
      `SELECT r.hotel_id FROM rooms r
       JOIN hotels h ON r.hotel_id = h.id
       WHERE r.id = $1 AND h.admin_id = $2`,
      [id, req.user.id]
    );

    if (roomCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Room not found or you do not have permission'
      });
    }

    const result = await req.db.query(
      `UPDATE rooms SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        room_type = COALESCE($3, room_type),
        capacity = COALESCE($4, capacity),
        base_price = COALESCE($5, base_price),
        size_sqm = COALESCE($6, size_sqm),
        amenities = COALESCE($7, amenities),
        images = COALESCE($8, images),
        updated_at = NOW()
      WHERE id = $9
      RETURNING *`,
      [
        name, description, room_type, capacity,
        base_price, size_sqm,
        amenities ? JSON.stringify(amenities) : null,
        images ? JSON.stringify(images) : null,
        id
      ]
    );

    // Invalidate cache
    if (req.redis) {
      await req.redis.del(`hotel:${roomCheck.rows[0].hotel_id}`);
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/rooms/:id - Delete room
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const roomCheck = await req.db.query(
      `SELECT r.hotel_id FROM rooms r
       JOIN hotels h ON r.hotel_id = h.id
       WHERE r.id = $1 AND h.admin_id = $2`,
      [id, req.user.id]
    );

    if (roomCheck.rows.length === 0) {
      return res.status(403).json({
        error: 'Room not found or you do not have permission'
      });
    }

    await req.db.query('DELETE FROM rooms WHERE id = $1', [id]);

    // Invalidate cache
    if (req.redis) {
      await req.redis.del(`hotel:${roomCheck.rows[0].hotel_id}`);
    }

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
