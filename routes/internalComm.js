/* ============================================
   SpiceRoute - Internal Comm Routes
   POST  /api/comms           - Post a message
   GET   /api/comms/:restaurantId - Get recent comms
   PATCH /api/comms/:id/ack   - Acknowledge message
   ============================================ */

const express = require('express');
const router = express.Router();
const { getComms, postComm, ackComm } = require('../controllers/internalCommController');
const { protect, authorize } = require('../middleware/auth');

// Kitchen or manager can post and get comms
router.get('/:restaurantId', protect, authorize('kitchen', 'manager'), getComms);
router.post('/', protect, authorize('kitchen', 'manager'), postComm);
router.patch('/:id/ack', protect, authorize('manager'), ackComm);

module.exports = router;
