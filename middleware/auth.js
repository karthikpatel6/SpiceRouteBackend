/* ============================================
   SpiceRoute - Authentication Middleware
   Verifies JWT tokens and enforces role-based
   access control for protected routes.
   Customers do NOT need authentication.
   ============================================ */

const jwt = require('jsonwebtoken');
const Staff = require('../models/Staff');

/* ---- Token Verification Middleware ---- */
// Protects routes that require authentication
const protect = async (req, res, next) => {
  let token;

  // Check for Bearer token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token and decode payload
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach staff user to request (exclude password)
      req.user = await Staff.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      next();
    } catch (error) {
      console.error('Auth middleware error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

/* ---- Role-Based Access Control Middleware ---- */
// Restricts access to specific roles (e.g., 'manager', 'kitchen')
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Role '${req.user.role}' is not authorized to access this resource`
      });
    }
    next();
  };
};

/* ---- Generate JWT Token ---- */
// Creates a signed JWT token with staff ID and role
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '24h'
  });
};

module.exports = { protect, authorize, generateToken };
