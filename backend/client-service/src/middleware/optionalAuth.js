const { OAuth2Client } = require('google-auth-library');
const logger = require('../utils/logger');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Optional auth - doesn't require authentication but will attach user if token provided
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];

    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      
      const userResult = await req.db.query(
        `SELECT * FROM users WHERE google_id = $1`,
        [payload.sub]
      );

      if (userResult.rows.length > 0) {
        req.user = userResult.rows[0];
      } else {
        // Create new user
        const insertResult = await req.db.query(
          `INSERT INTO users (google_id, email, name, picture, role) 
           VALUES ($1, $2, $3, $4, 'USER') 
           RETURNING *`,
          [payload.sub, payload.email, payload.name, payload.picture]
        );
        req.user = insertResult.rows[0];
      }
    } catch (tokenError) {
      logger.warn('Invalid token provided, continuing as guest');
      req.user = null;
    }
    
    next();
  } catch (error) {
    logger.error('Optional auth error:', error);
    req.user = null;
    next();
  }
};

module.exports = optionalAuthMiddleware;
