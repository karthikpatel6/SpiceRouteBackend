/* ============================================
   SpiceRoute - Authentication Routes
   POST /api/auth/login  - Staff login
   GET  /api/auth/me     - Get current user
   POST /api/auth/logout - Logout (set off-duty)
   ============================================ */

const express = require('express');
const router = express.Router();
const { login, getMe, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public route - Staff login
router.post('/login', login);

// Protected routes - Require authentication
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
