const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/adminCheck');

// GET /api/v1/hotels - List all hotels with pagination
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Try cache first
    const cacheKey = `hotels:list:${page}:${limit}`;
    if (req.redis) {
      const cached = await req.redis.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    }

    const countResult = await req.db.query('SELECT COUNT(*) FROM hotels');
    const totalCount = parseInt(countResult.rows[0].count);

    const result = await req.db.query(
      `SELECT h.*, 
              COALESCE(AVG(r.base_price), 0) as avg_price,
              COUNT(DISTINCT r.id) as room_count
       FROM hotels h
       LEFT JOIN rooms r ON h.id = r.hotel_id
       GROUP BY h.id
       ORDER BY h.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const response = {
      data: result.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };

    // Cache for 5 minutes
    if (req.redis) {
      await req.redis.setEx(cacheKey, 300, JSON.stringify(response));
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/hotels/:id - Get hotel details
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const cacheKey = `hotel:${id}`;
    if (req.redis) {
      const cached = await req.redis.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    }

    const hotelResult = await req.db.query(
      `SELECT * FROM hotels WHERE id = $1`,
      [id]
    );

    if (hotelResult.rows.length === 0) {
      return res.status(404).json({ error: 'Hotel not found' });
    }

    const roomsResult = await req.db.query(
      `SELECT r.*, 
              COALESCE(
                (SELECT MIN(ra.available_count) 
                 FROM room_availability ra 
                 WHERE ra.room_id = r.id 
                 AND ra.date >= CURRENT_DATE), 0
              ) as current_availability
       FROM rooms r 
       WHERE r.hotel_id = $1
       ORDER BY r.base_price ASC`,
      [id]
    );

    const response = {
      ...hotelResult.rows[0],
      rooms: roomsResult.rows
    };

    if (req.redis) {
      await req.redis.setEx(cacheKey, 300, JSON.stringify(response));
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/hotels - Create new hotel (Admin only)
router.post('/',
  authMiddleware,
  adminMiddleware,
  [
    body('name').notEmpty().trim(),
    body('description').optional().trim(),
    body('address').notEmpty().trim(),
    body('city').notEmpty().trim(),
    body('country').notEmpty().trim(),
    body('latitude').isFloat({ min: -90, max: 90 }),
    body('longitude').isFloat({ min: -180, max: 180 }),
    body('star_rating').isInt({ min: 1, max: 5 }),
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
        name, description, address, city, country,
        latitude, longitude, star_rating, amenities, images
      } = req.body;

      const result = await req.db.query(
        `INSERT INTO hotels (
          name, description, address, city, country,
          latitude, longitude, star_rating, amenities, images, admin_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          name, description, address, city, country,
          latitude, longitude, star_rating,
          JSON.stringify(amenities || []),
          JSON.stringify(images || []),
          req.user.id
        ]
      );

      // Invalidate cache
      if (req.redis) {
        const keys = await req.redis.keys('hotels:*');
        if (keys.length > 0) {
          await req.redis.del(keys);
        }
      }

      res.status(201).json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/v1/hotels/:id - Update hotel (Admin only)
router.put('/:id',
  authMiddleware,
  adminMiddleware,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const {
        name, description, address, city, country,
        latitude, longitude, star_rating, amenities, images
      } = req.body;

      const result = await req.db.query(
        `UPDATE hotels SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          address = COALESCE($3, address),
          city = COALESCE($4, city),
          country = COALESCE($5, country),
          latitude = COALESCE($6, latitude),
          longitude = COALESCE($7, longitude),
          star_rating = COALESCE($8, star_rating),
          amenities = COALESCE($9, amenities),
          images = COALESCE($10, images),
          updated_at = NOW()
        WHERE id = $11
        RETURNING *`,
        [
          name, description, address, city, country,
          latitude, longitude, star_rating,
          amenities ? JSON.stringify(amenities) : null,
          images ? JSON.stringify(images) : null,
          id
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Hotel not found' });
      }

      // Invalidate cache
      if (req.redis) {
        await req.redis.del(`hotel:${id}`);
        const keys = await req.redis.keys('hotels:*');
        if (keys.length > 0) {
          await req.redis.del(keys);
        }
      }

      res.json(result.rows[0]);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/hotels/:id - Delete hotel (Admin only)
router.delete('/:id',
  authMiddleware,
  adminMiddleware,
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const result = await req.db.query(
        'DELETE FROM hotels WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Hotel not found' });
      }

      // Invalidate cache
      if (req.redis) {
        await req.redis.del(`hotel:${id}`);
        const keys = await req.redis.keys('hotels:*');
        if (keys.length > 0) {
          await req.redis.del(keys);
        }
      }

      res.json({ message: 'Hotel deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
