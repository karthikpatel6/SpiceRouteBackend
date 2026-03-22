/* ============================================
   SpiceRoute - Order Routes (v2)
   POST  /api/orders                        - Place order (customer)
   GET   /api/orders/track/:tokenNumber     - Track order (customer)
   GET   /api/orders/kitchen/:restaurantId  - Kitchen order queue
   PATCH /api/orders/:id/status             - Update order status (kitchen)
   POST  /api/orders/:id/instruction        - Customer sends instruction to kitchen
   POST  /api/orders/:id/shout              - Kitchen sends shout to customer
   GET   /api/orders/:id                    - Get single order
   GET   /api/orders/table/:restaurantId/:tableNumber - Table orders
   ============================================ */

const express = require('express');
const router = express.Router();
const {
  placeOrder,
  trackOrder,
  getKitchenOrders,
  updateOrderStatus,
  addOrderInstruction,
  addKitchenShout,
  getOrder,
  getTableOrders
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

// Public routes - Customers can place and track orders without login
router.post('/', placeOrder);
router.get('/track/:tokenNumber', trackOrder);
router.get('/table/:restaurantId/:tableNumber', getTableOrders);

// Customer instruction to kitchen (public - no auth needed)
router.post('/:id/instruction', addOrderInstruction);

// Protected routes - Kitchen and manager staff
router.get('/kitchen/:restaurantId', protect, authorize('kitchen', 'manager'), getKitchenOrders);
router.patch('/:id/status', protect, authorize('kitchen', 'manager'), updateOrderStatus);
router.post('/:id/shout', protect, authorize('kitchen', 'manager'), addKitchenShout);
router.get('/:id', getOrder);

module.exports = router;
