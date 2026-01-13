const { OAuth2Client } = require('google-auth-library');
const logger = require('../utils/logger');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify Google ID token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    
    // Get user from database or create
    const userResult = await req.db.query(
      `SELECT * FROM users WHERE google_id = $1`,
      [payload.sub]
    );

    let user;
    if (userResult.rows.length === 0) {
      // Create new user
      const insertResult = await req.db.query(
        `INSERT INTO users (google_id, email, name, picture, role) 
         VALUES ($1, $2, $3, $4, 'USER') 
         RETURNING *`,
        [payload.sub, payload.email, payload.name, payload.picture]
      );
      user = insertResult.rows[0];
    } else {
      user = userResult.rows[0];
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;
