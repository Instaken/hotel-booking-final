const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// GET /api/v1/price/predict - Get price prediction
// This calls the ML service internally
router.get('/predict', async (req, res, next) => {
  try {
    const { 
      city,
      star_rating,
      room_type,
      date,
      weekend,
      holiday
    } = req.query;

    if (!city || !star_rating || !room_type || !date) {
      return res.status(400).json({ 
        error: 'city, star_rating, room_type, and date are required' 
      });
    }

    // Call ML service
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://ml-service:8080';
    
    const response = await fetch(`${mlServiceUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: city,
        star_rating: parseInt(star_rating),
        room_type: room_type,
        date: date,
        weekend: weekend === 'true' || weekend === '1',
        holiday: holiday === 'true' || holiday === '1'
      })
    });

    if (!response.ok) {
      throw new Error('ML service unavailable');
    }

    const prediction = await response.json();
    
    res.json({
      predicted_price: prediction.predicted_price,
      confidence: prediction.confidence,
      factors: prediction.factors
    });
  } catch (error) {
    logger.error('Price prediction error:', error);
    
    // Fallback to base price calculation
    const basePrice = 100;
    const starMultiplier = parseFloat(req.query.star_rating) || 3;
    const fallbackPrice = basePrice * (1 + (starMultiplier - 1) * 0.3);
    
    res.json({
      predicted_price: Math.round(fallbackPrice * 100) / 100,
      confidence: 0.5,
      factors: { note: 'Fallback calculation used' }
    });
  }
});

// POST /api/v1/price/batch-predict - Batch price prediction
router.post('/batch-predict',
  [
    body('predictions').isArray({ min: 1 }),
    body('predictions.*.city').notEmpty(),
    body('predictions.*.star_rating').isInt({ min: 1, max: 5 }),
    body('predictions.*.room_type').notEmpty(),
    body('predictions.*.date').isISO8601()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { predictions } = req.body;
      const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://ml-service:8080';

      try {
        const response = await fetch(`${mlServiceUrl}/batch-predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ predictions })
        });

        if (!response.ok) {
          throw new Error('ML service unavailable');
        }

        const results = await response.json();
        res.json(results);
      } catch (error) {
        // Fallback calculations
        const results = predictions.map(p => ({
          ...p,
          predicted_price: 100 * (1 + (p.star_rating - 1) * 0.3),
          confidence: 0.5
        }));
        res.json({ predictions: results });
      }
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
