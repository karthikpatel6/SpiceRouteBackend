/* ============================================
   SpiceRoute - Manager Routes
   All routes require manager authentication.
   GET /api/manager/dashboard  - Dashboard overview
   GET /api/manager/analytics  - Analytics data
   GET /api/manager/menu       - All menu items
   GET /api/manager/staff      - Staff list
   PUT /api/manager/settings   - Restaurant settings
   GET /api/manager/orders     - Order history
   ============================================ */

const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getAnalytics,
  getManagerMenu,
  getStaff,
  updateSettings,
  getAllOrders
} = require('../controllers/managerController');
const { protect, authorize } = require('../middleware/auth');

// All routes require manager role
router.use(protect);
router.use(authorize('manager'));

router.get('/dashboard', getDashboard);
router.get('/analytics', getAnalytics);
router.get('/menu', getManagerMenu);
router.get('/staff', getStaff);
router.put('/settings', updateSettings);
router.get('/orders', getAllOrders);

module.exports = router;
