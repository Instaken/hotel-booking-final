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
  let token = null;
  try {
    // Check for API Gateway's user info header first (when behind API Gateway)
    const apiGatewayUserInfo = req.headers['x-apigateway-api-userinfo'];
    
    if (apiGatewayUserInfo) {
      // API Gateway has already verified the token
      // The header contains base64-encoded JSON with user claims
      try {
        const userInfoJson = Buffer.from(apiGatewayUserInfo, 'base64').toString('utf-8');
        const decodedToken = JSON.parse(userInfoJson);
        
        logger.info('User info from API Gateway:', {
          uid: decodedToken.sub || decodedToken.user_id,
          email: decodedToken.email
        });
        
        const uid = decodedToken.sub || decodedToken.user_id;
        const email = decodedToken.email;
        
        if (!uid || !email) {
          throw new Error('API Gateway user info missing required claims');
        }
        
        // Get or create user from database
        const userResult = await req.db.query(
          `SELECT * FROM users WHERE google_id = $1 OR email = $2`,
          [uid, email]
        );

        let user;
        if (userResult.rows.length === 0) {
          const insertResult = await req.db.query(
            `INSERT INTO users (google_id, email, name, picture, role) 
             VALUES ($1, $2, $3, $4, 'USER') 
             RETURNING *`,
            [uid, email, decodedToken.name || email, decodedToken.picture || null]
          );
          user = insertResult.rows[0];
          logger.info(`New user created via API Gateway: ${email} with role USER`);
        } else {
          user = userResult.rows[0];
          logger.info(`User authenticated via API Gateway: ${email} with role ${user.role}`);
        }

        req.user = user;
        return next();
      } catch (parseError) {
        logger.error('Error parsing API Gateway user info:', parseError);
        // Fall through to Firebase verification
      }
    }
    
    // Fallback: Direct Firebase token verification (for local dev or direct access)
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    token = authHeader.split(' ')[1];

    // Verify Firebase ID token using Firebase Admin SDK
    // checkRevoked: true ensures the token hasn't been revoked
    const decodedToken = await admin.auth().verifyIdToken(token, true);
    
    // Log token details for debugging
    logger.info('Token verified successfully:', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      aud: decodedToken.aud,
      iss: decodedToken.iss
    });
    
    const uid = decodedToken.uid;
    const email = decodedToken.email;
    
    if (!uid || !email) {
      throw new Error('Token missing required claims (uid or email)');
    }

    // Get user from database
    const userResult = await req.db.query(
      `SELECT * FROM users WHERE google_id = $1 OR email = $2`,
      [uid, email]
    );

    let user;
    if (userResult.rows.length === 0) {
      // Create new user with USER role
      const insertResult = await req.db.query(
        `INSERT INTO users (google_id, email, name, picture, role) 
         VALUES ($1, $2, $3, $4, 'USER') 
         RETURNING *`,
        [uid, email, decodedToken.name || email, decodedToken.picture || null]
      );
      user = insertResult.rows[0];
      logger.info(`New user created: ${email} with role USER`);
    } else {
      user = userResult.rows[0];
      logger.info(`User authenticated: ${email} with role ${user.role}`);
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Firebase auth error:', {
      message: error.message,
      code: error.code,
      hasToken: !!token
    });
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      message: error.message
    });
  }
};

module.exports = authMiddleware;
