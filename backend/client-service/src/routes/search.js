const express = require('express');
const router = express.Router();
const { query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

const DISCOUNT_PERCENTAGE = 0.10; // 10% discount for logged in users

// GET /api/v1/search/hotels - Search hotels
router.get('/hotels',
  [
    query('destination').optional().trim(),
    query('city').optional().trim(),
    query('check_in').optional().isISO8601(),
    query('check_out').optional().isISO8601(),
    query('guests').optional().isInt({ min: 1 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('min_price').optional().isFloat({ min: 0 }),
    query('max_price').optional().isFloat({ min: 0 }),
    query('star_rating').optional().isInt({ min: 1, max: 5 }),
    query('sort_by').optional().isIn(['price', 'rating', 'name', 'distance']),
    query('sort_order').optional().isIn(['asc', 'desc'])
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        destination,
        city,
        check_in,
        check_out,
        guests = 1,
        page = 1,
        limit = 10,
        min_price,
        max_price,
        star_rating,
        sort_by = 'price',
        sort_order = 'asc'
      } = req.query;

      const isLoggedIn = !!req.user;
      const offset = (page - 1) * limit;

      // Build cache key
      const cacheKey = `search:${JSON.stringify({
        destination, city, check_in, check_out, guests,
        page, limit, min_price, max_price, star_rating, sort_by, sort_order
      })}:${isLoggedIn ? 'auth' : 'guest'}`;

      // Try cache
      if (req.redis) {
        try {
          const cached = await req.redis.get(cacheKey);
          if (cached) {
            logger.info('Search cache hit');
            return res.json(JSON.parse(cached));
          }
        } catch (cacheErr) {
          logger.warn('Cache read error:', cacheErr);
        }
      }

      // Build query
      let queryText = `
        SELECT DISTINCT ON (h.id)
          h.id,
          h.name,
          h.description,
          h.address,
          h.city,
          h.country,
          h.latitude,
          h.longitude,
          h.star_rating,
          h.amenities,
          h.images,
          MIN(ra.price) as min_price,
          MAX(r.capacity) as max_capacity
        FROM hotels h
        JOIN rooms r ON h.id = r.hotel_id
        LEFT JOIN room_availability ra ON r.id = ra.room_id
        WHERE 1=1
      `;
      
      const params = [];
      let paramIndex = 1;

      // Destination search (city or country)
      if (destination) {
        queryText += ` AND (LOWER(h.city) LIKE LOWER($${paramIndex}) OR LOWER(h.country) LIKE LOWER($${paramIndex}) OR LOWER(h.name) LIKE LOWER($${paramIndex}))`;
        params.push(`%${destination}%`);
        paramIndex++;
      }

      if (city) {
        queryText += ` AND LOWER(h.city) = LOWER($${paramIndex})`;
        params.push(city);
        paramIndex++;
      }

      // Date availability check
      if (check_in && check_out) {
        queryText += ` AND ra.date >= $${paramIndex} AND ra.date < $${paramIndex + 1} AND ra.available_count > 0`;
        params.push(check_in, check_out);
        paramIndex += 2;
      }

      // Guest capacity
      if (guests) {
        queryText += ` AND r.capacity >= $${paramIndex}`;
        params.push(parseInt(guests));
        paramIndex++;
      }

      // Star rating filter
      if (star_rating) {
        queryText += ` AND h.star_rating >= $${paramIndex}`;
        params.push(parseInt(star_rating));
        paramIndex++;
      }

      queryText += ` GROUP BY h.id`;

      // Price filters (after grouping)
      if (min_price || max_price) {
        queryText += ` HAVING 1=1`;
        if (min_price) {
          queryText += ` AND MIN(ra.price) >= $${paramIndex}`;
          params.push(parseFloat(min_price));
          paramIndex++;
        }
        if (max_price) {
          queryText += ` AND MIN(ra.price) <= $${paramIndex}`;
          params.push(parseFloat(max_price));
          paramIndex++;
        }
      }

      // Sorting
      const sortColumn = {
        'price': 'min_price',
        'rating': 'h.star_rating',
        'name': 'h.name',
        'distance': 'h.latitude' // Simplified, would need user location
      }[sort_by] || 'min_price';

      queryText += ` ORDER BY h.id, ${sortColumn} ${sort_order.toUpperCase()}`;
      queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit), offset);

      const result = await req.db.query(queryText, params);

      // Apply discount for logged in users
      const hotels = result.rows.map(hotel => {
        const originalPrice = parseFloat(hotel.min_price) || 0;
        let displayPrice = originalPrice;
        let discount = null;

        if (isLoggedIn && originalPrice > 0) {
          displayPrice = originalPrice * (1 - DISCOUNT_PERCENTAGE);
          discount = {
            percentage: DISCOUNT_PERCENTAGE * 100,
            original_price: originalPrice,
            discounted_price: Math.round(displayPrice * 100) / 100
          };
        }

        return {
          ...hotel,
          display_price: Math.round(displayPrice * 100) / 100,
          discount,
          amenities: typeof hotel.amenities === 'string' ? JSON.parse(hotel.amenities) : hotel.amenities,
          images: typeof hotel.images === 'string' ? JSON.parse(hotel.images) : hotel.images
        };
      });

      // Count total for pagination
      let countQuery = `
        SELECT COUNT(DISTINCT h.id) as total
        FROM hotels h
        JOIN rooms r ON h.id = r.hotel_id
        LEFT JOIN room_availability ra ON r.id = ra.room_id
        WHERE 1=1
      `;
      
      // Rebuild count query with same filters (simplified)
      const countParams = [];
      let countParamIndex = 1;
      
      if (destination) {
        countQuery += ` AND (LOWER(h.city) LIKE LOWER($${countParamIndex}) OR LOWER(h.country) LIKE LOWER($${countParamIndex}))`;
        countParams.push(`%${destination}%`);
        countParamIndex++;
      }

      if (guests) {
        countQuery += ` AND r.capacity >= $${countParamIndex}`;
        countParams.push(parseInt(guests));
        countParamIndex++;
      }

      const countResult = await req.db.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0]?.total || 0);

      const response = {
        data: hotels,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total_count: totalCount,
          total_pages: Math.ceil(totalCount / limit)
        },
        filters_applied: {
          destination,
          city,
          check_in,
          check_out,
          guests: parseInt(guests),
          min_price,
          max_price,
          star_rating
        },
        user_discount_applied: isLoggedIn
      };

      // Cache for 5 minutes
      if (req.redis) {
        try {
          await req.redis.setEx(cacheKey, 300, JSON.stringify(response));
        } catch (cacheErr) {
          logger.warn('Cache write error:', cacheErr);
        }
      }

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/search/hotels/:id - Get hotel details
router.get('/hotels/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { check_in, check_out, guests } = req.query;
    const isLoggedIn = !!req.user;

    const cacheKey = `hotel:detail:${id}:${check_in}:${check_out}:${guests}:${isLoggedIn ? 'auth' : 'guest'}`;

    if (req.redis) {
      try {
        const cached = await req.redis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
      } catch (cacheErr) {
        logger.warn('Cache read error:', cacheErr);
      }
    }

    // Get hotel info
    const hotelResult = await req.db.query(
      `SELECT * FROM hotels WHERE id = $1`,
      [id]
    );

    if (hotelResult.rows.length === 0) {
      return res.status(404).json({ error: 'Hotel not found' });
    }

    const hotel = hotelResult.rows[0];

    // Get rooms with availability
    let roomsQuery = `
      SELECT r.*,
             COALESCE(MIN(ra.available_count), 0) as min_availability,
             COALESCE(AVG(ra.price), r.base_price) as avg_price
      FROM rooms r
      LEFT JOIN room_availability ra ON r.id = ra.room_id
    `;
    
    const roomParams = [id];
    let roomParamIndex = 2;

    if (check_in && check_out) {
      roomsQuery += ` AND ra.date >= $${roomParamIndex} AND ra.date < $${roomParamIndex + 1}`;
      roomParams.push(check_in, check_out);
      roomParamIndex += 2;
    }

    roomsQuery = `
      SELECT r.*,
             COALESCE(MIN(ra.available_count), 0) as min_availability,
             COALESCE(AVG(ra.price), r.base_price) as avg_price
      FROM rooms r
      LEFT JOIN room_availability ra ON r.id = ra.room_id
      ${check_in && check_out ? `AND ra.date >= $2 AND ra.date < $3` : ''}
      WHERE r.hotel_id = $1
      ${guests ? `AND r.capacity >= $${roomParamIndex}` : ''}
      GROUP BY r.id
      ORDER BY avg_price ASC
    `;

    if (guests) {
      roomParams.push(parseInt(guests));
    }

    const roomsResult = await req.db.query(roomsQuery, roomParams);

    // Apply discount for logged in users
    const rooms = roomsResult.rows.map(room => {
      const originalPrice = parseFloat(room.avg_price) || parseFloat(room.base_price);
      let displayPrice = originalPrice;
      let discount = null;

      if (isLoggedIn && originalPrice > 0) {
        displayPrice = originalPrice * (1 - DISCOUNT_PERCENTAGE);
        discount = {
          percentage: DISCOUNT_PERCENTAGE * 100,
          original_price: originalPrice,
          discounted_price: Math.round(displayPrice * 100) / 100
        };
      }

      return {
        ...room,
        display_price: Math.round(displayPrice * 100) / 100,
        discount,
        is_available: room.min_availability > 0,
        amenities: typeof room.amenities === 'string' ? JSON.parse(room.amenities) : room.amenities,
        images: typeof room.images === 'string' ? JSON.parse(room.images) : room.images
      };
    });

    const response = {
      ...hotel,
      amenities: typeof hotel.amenities === 'string' ? JSON.parse(hotel.amenities) : hotel.amenities,
      images: typeof hotel.images === 'string' ? JSON.parse(hotel.images) : hotel.images,
      rooms,
      user_discount_applied: isLoggedIn
    };

    if (req.redis) {
      try {
        await req.redis.setEx(cacheKey, 300, JSON.stringify(response));
      } catch (cacheErr) {
        logger.warn('Cache write error:', cacheErr);
      }
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/search/destinations - Get popular destinations (for autocomplete)
router.get('/destinations', async (req, res, next) => {
  try {
    const { q } = req.query;

    const cacheKey = `destinations:${q || 'all'}`;

    if (req.redis) {
      try {
        const cached = await req.redis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
      } catch (cacheErr) {
        logger.warn('Cache read error:', cacheErr);
      }
    }

    let queryText = `
      SELECT city, country, COUNT(*) as hotel_count
      FROM hotels
    `;
    
    const params = [];
    
    if (q) {
      queryText += ` WHERE LOWER(city) LIKE LOWER($1) OR LOWER(country) LIKE LOWER($1)`;
      params.push(`%${q}%`);
    }
    
    queryText += ` GROUP BY city, country ORDER BY hotel_count DESC LIMIT 20`;

    const result = await req.db.query(queryText, params);

    const response = {
      data: result.rows.map(row => ({
        city: row.city,
        country: row.country,
        hotel_count: parseInt(row.hotel_count),
        display: `${row.city}, ${row.country}`
      }))
    };

    if (req.redis) {
      try {
        await req.redis.setEx(cacheKey, 3600, JSON.stringify(response)); // Cache 1 hour
      } catch (cacheErr) {
        logger.warn('Cache write error:', cacheErr);
      }
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/search/map - Get hotels for map view
router.get('/map', async (req, res, next) => {
  try {
    const { 
      north, south, east, west, // Bounding box
      check_in, check_out, guests
    } = req.query;

    const isLoggedIn = !!req.user;

    let queryText = `
      SELECT 
        h.id,
        h.name,
        h.latitude,
        h.longitude,
        h.star_rating,
        h.city,
        MIN(ra.price) as min_price,
        (SELECT images->0 FROM hotels WHERE id = h.id) as thumbnail
      FROM hotels h
      JOIN rooms r ON h.id = r.hotel_id
      LEFT JOIN room_availability ra ON r.id = ra.room_id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Bounding box filter
    if (north && south && east && west) {
      queryText += ` AND h.latitude BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      queryText += ` AND h.longitude BETWEEN $${paramIndex + 2} AND $${paramIndex + 3}`;
      params.push(parseFloat(south), parseFloat(north), parseFloat(west), parseFloat(east));
      paramIndex += 4;
    }

    // Date availability
    if (check_in && check_out) {
      queryText += ` AND ra.date >= $${paramIndex} AND ra.date < $${paramIndex + 1} AND ra.available_count > 0`;
      params.push(check_in, check_out);
      paramIndex += 2;
    }

    // Guest capacity
    if (guests) {
      queryText += ` AND r.capacity >= $${paramIndex}`;
      params.push(parseInt(guests));
      paramIndex++;
    }

    queryText += ` GROUP BY h.id LIMIT 100`;

    const result = await req.db.query(queryText, params);

    const hotels = result.rows.map(hotel => {
      const originalPrice = parseFloat(hotel.min_price) || 0;
      let displayPrice = originalPrice;

      if (isLoggedIn && originalPrice > 0) {
        displayPrice = originalPrice * (1 - DISCOUNT_PERCENTAGE);
      }

      return {
        id: hotel.id,
        name: hotel.name,
        latitude: parseFloat(hotel.latitude),
        longitude: parseFloat(hotel.longitude),
        star_rating: hotel.star_rating,
        city: hotel.city,
        display_price: Math.round(displayPrice * 100) / 100,
        thumbnail: hotel.thumbnail
      };
    });

    res.json({ data: hotels });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
