const admin = require('firebase-admin');
const logger = require('../utils/logger');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'hotel-booking-system-final';
  
  admin.initializeApp({
    projectId: projectId
  });
  
  logger.info(`Firebase Admin initialized for project: ${projectId}`);
}

const authMiddleware = async (req, res, next) => {
  try {
    // Check for API Gateway's user info header first (when behind API Gateway)
    const apiGatewayUserInfo = req.headers['x-apigateway-api-userinfo'];
    
    if (apiGatewayUserInfo) {
      // API Gateway has already verified the token
      try {
        const userInfoJson = Buffer.from(apiGatewayUserInfo, 'base64').toString('utf-8');
        const payload = JSON.parse(userInfoJson);
        
        logger.info('User info from API Gateway:', {
          uid: payload.sub || payload.user_id,
          email: payload.email
        });
        
        const uid = payload.sub || payload.user_id;
        
        // Get user from database or create
        const userResult = await req.db.query(
          `SELECT * FROM users WHERE google_id = $1`,
          [uid]
        );

        let user;
        if (userResult.rows.length === 0) {
          const insertResult = await req.db.query(
            `INSERT INTO users (google_id, email, name, picture, role) 
             VALUES ($1, $2, $3, $4, 'USER') 
             RETURNING *`,
            [uid, payload.email, payload.name || payload.email, payload.picture || null]
          );
          user = insertResult.rows[0];
          logger.info(`New user created via API Gateway: ${payload.email}`);
        } else {
          user = userResult.rows[0];
        }

        req.user = user;
        return next();
      } catch (parseError) {
        logger.error('Error parsing API Gateway user info:', parseError);
        // Fall through to Firebase verification
      }
    }
    
    // Fallback: Direct Firebase token verification
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token, true);
    
    const uid = decodedToken.uid;
    
    // Get user from database or create
    const userResult = await req.db.query(
      `SELECT * FROM users WHERE google_id = $1`,
      [uid]
    );

    let user;
    if (userResult.rows.length === 0) {
      const insertResult = await req.db.query(
        `INSERT INTO users (google_id, email, name, picture, role) 
         VALUES ($1, $2, $3, $4, 'USER') 
         RETURNING *`,
        [uid, decodedToken.email, decodedToken.name || decodedToken.email, decodedToken.picture || null]
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
