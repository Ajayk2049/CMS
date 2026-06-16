const jwt = require('jsonwebtoken');
const config = require('../config/config');

/**
 * Middleware to authenticate requests via JWT
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).send({ success: false, message: 'Authorization token missing or malformed' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);
    
    req.user = decoded; // Contains { uid, phone, role, isDemo }
    next();
  } catch (error) {
    console.error('JWT Verification Error:', error.message);
    return res.status(401).send({ success: false, message: 'Invalid or expired authorization token' });
  }
}

/**
 * Middleware to enforce role-based access control (RBAC)
 * @param {string[]} roles Allowed roles
 */
function authorize(roles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).send({ success: false, message: 'Unauthenticated request' });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).send({ success: false, message: 'Access denied: Insufficient privileges' });
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorize
};
