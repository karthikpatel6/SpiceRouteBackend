/* ============================================
   SpiceRoute - Menu Routes
   GET    /api/menu/:restaurantId  - Get menu (customer, workload-filtered)
   GET    /api/menu/item/:id       - Get single item
   POST   /api/menu                - Create item (manager)
   PUT    /api/menu/:id            - Update item (manager)
   DELETE /api/menu/:id            - Delete item (manager)
   PATCH  /api/menu/:id/toggle     - Toggle availability (manager)
   ============================================ */

const express = require('express');
const router = express.Router();
const {
  getMenu,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability
} = require('../controllers/menuController');
const { protect, authorize } = require('../middleware/auth');

// Public routes - Customer can browse menu without login
router.get('/:restaurantId', getMenu);
router.get('/item/:id', getMenuItem);

// Protected routes - Manager only
router.post('/', protect, authorize('manager'), createMenuItem);
router.put('/:id', protect, authorize('manager'), updateMenuItem);
router.delete('/:id', protect, authorize('manager'), deleteMenuItem);
router.patch('/:id/toggle', protect, authorize('manager'), toggleAvailability);

module.exports = router;
