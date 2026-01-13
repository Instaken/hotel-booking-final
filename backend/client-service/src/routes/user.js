const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// GET /api/v1/user/profile - Get user profile
router.get('/profile', async (req, res, next) => {
  try {
    res.json({
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      picture: req.user.picture,
      role: req.user.role,
      created_at: req.user.created_at
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/user/stats - Get user booking stats
router.get('/stats', async (req, res, next) => {
  try {
    const statsResult = await req.db.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'CONFIRMED') as confirmed_bookings,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_bookings,
        COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled_bookings,
        COALESCE(SUM(total_price) FILTER (WHERE status IN ('CONFIRMED', 'COMPLETED')), 0) as total_spent,
        COALESCE(SUM(original_price - total_price) FILTER (WHERE status IN ('CONFIRMED', 'COMPLETED')), 0) as total_saved
      FROM bookings
      WHERE user_id = $1`,
      [req.user.id]
    );

    const stats = statsResult.rows[0];

    res.json({
      confirmed_bookings: parseInt(stats.confirmed_bookings),
      completed_bookings: parseInt(stats.completed_bookings),
      cancelled_bookings: parseInt(stats.cancelled_bookings),
      total_spent: parseFloat(stats.total_spent),
      total_saved: parseFloat(stats.total_saved)
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/user/profile - Update user profile
router.put('/profile', async (req, res, next) => {
  try {
    const { name, phone } = req.body;

    const result = await req.db.query(
      `UPDATE users SET 
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, name, phone, picture, role`,
      [name, phone, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
