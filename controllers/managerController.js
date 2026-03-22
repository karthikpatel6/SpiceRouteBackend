/* ============================================
   SpiceRoute - Manager Controller
   Provides dashboard data, analytics, and
   management capabilities for restaurant managers.
   Includes workload analytics, staff recommendations,
   and order history insights.
   ============================================ */

const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Staff = require('../models/Staff');
const Restaurant = require('../models/Restaurant');
const WorkloadMetric = require('../models/WorkloadMetric');
const {
  calculateKitchenLoad,
  getStaffRecommendation,
  getSmartMenuFilter
} = require('../utils/workloadEngine');

/* ---- Get Manager Dashboard Data ---- */
// GET /api/manager/dashboard
// Returns comprehensive overview: workload, orders, staff, revenue
const getDashboard = async (req, res) => {
  try {
    const restaurantId = req.user.restaurant;

    // Get current kitchen workload
    const workload = await calculateKitchenLoad(restaurantId);

    // Get staff recommendation
    const staffRec = await getStaffRecommendation(restaurantId);

    // Get smart menu filter status
    const menuFilter = await getSmartMenuFilter(restaurantId);

    // Today's order stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await Order.find({
      restaurant: restaurantId,
      placedAt: { $gte: today }
    });

    const totalRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
    const completedOrders = todayOrders.filter(o => ['ready', 'served'].includes(o.status));
    const avgPrepTime = completedOrders.length > 0
      ? Math.round(completedOrders.reduce((sum, o) => {
          const prep = o.readyAt && o.preparingAt
            ? (new Date(o.readyAt) - new Date(o.preparingAt)) / 60000
            : o.estimatedWaitTime;
          return sum + prep;
        }, 0) / completedOrders.length)
      : 0;

    // Active orders by status
    const activeOrders = await Order.find({
      restaurant: restaurantId,
      status: { $in: ['placed', 'confirmed', 'preparing'] }
    }).sort({ placedAt: -1 });

    // Top selling items today
    const topItems = await MenuItem.find({ restaurant: restaurantId })
      .sort({ orderCount: -1 })
      .limit(5)
      .select('name orderCount price category');

    res.json({
      success: true,
      dashboard: {
        workload,
        staffRecommendation: staffRec,
        menuFilter: {
          isFiltering: menuFilter.shouldFilter,
          lockedCount: menuFilter.lockedItems.length,
          message: menuFilter.message
        },
        todayStats: {
          totalOrders: todayOrders.length,
          completedOrders: completedOrders.length,
          activeOrders: activeOrders.length,
          totalRevenue,
          avgPrepTime
        },
        activeOrders,
        topItems
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
};

/* ---- Get Analytics Data ---- */
// GET /api/manager/analytics
// Returns historical workload metrics and order analytics
const getAnalytics = async (req, res) => {
  try {
    const restaurantId = req.user.restaurant;
    const { period } = req.query; // 'today', 'week', 'month'

    let startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setDate(startDate.getDate() - 30);
    } else {
      startDate.setHours(0, 0, 0, 0);
    }

    // Get workload metrics history
    const metrics = await WorkloadMetric.find({
      restaurant: restaurantId,
      timestamp: { $gte: startDate }
    }).sort({ timestamp: 1 });

    // Order volume by hour (for today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = await Order.find({
      restaurant: restaurantId,
      placedAt: { $gte: today }
    });

    // Group orders by hour
    const ordersByHour = {};
    for (let i = 0; i < 24; i++) {
      ordersByHour[i] = 0;
    }
    todayOrders.forEach(order => {
      const hour = new Date(order.placedAt).getHours();
      ordersByHour[hour]++;
    });

    // Revenue by category
    const allOrders = await Order.find({
      restaurant: restaurantId,
      placedAt: { $gte: startDate },
      status: { $nin: ['cancelled'] }
    });

    const categorySales = {};
    for (const order of allOrders) {
      for (const item of order.items) {
        const menuItem = await MenuItem.findById(item.menuItem).select('category');
        if (menuItem) {
          const cat = menuItem.category;
          categorySales[cat] = (categorySales[cat] || 0) + (item.price * item.quantity);
        }
      }
    }

    // Average orders per hour over the period
    const totalHours = Math.max(1, (Date.now() - startDate.getTime()) / 3600000);
    const avgOrdersPerHour = Math.round((allOrders.length / totalHours) * 10) / 10;

    res.json({
      success: true,
      analytics: {
        metrics,
        ordersByHour,
        categorySales,
        summary: {
          totalOrders: allOrders.length,
          totalRevenue: allOrders.reduce((sum, o) => sum + o.total, 0),
          avgOrdersPerHour,
          peakHour: Object.entries(ordersByHour).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
        }
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Error fetching analytics' });
  }
};

/* ---- Get All Menu Items (Manager View) ---- */
// GET /api/manager/menu
const getManagerMenu = async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ restaurant: req.user.restaurant })
      .sort({ category: 1, name: 1 });
    res.json({ success: true, menuItems });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching menu' });
  }
};

/* ---- Get All Staff ---- */
// GET /api/manager/staff
const getStaff = async (req, res) => {
  try {
    const staff = await Staff.find({ restaurant: req.user.restaurant })
      .select('-password')
      .sort({ role: 1, name: 1 });
    res.json({ success: true, staff });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching staff' });
  }
};

/* ---- Update Restaurant Settings ---- */
// PUT /api/manager/settings
const updateSettings = async (req, res) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.user.restaurant,
      req.body,
      { new: true, runValidators: true }
    );
    res.json({ success: true, restaurant });
  } catch (error) {
    res.status(500).json({ message: 'Error updating settings' });
  }
};

/* ---- Get All Orders with Filters ---- */
// GET /api/manager/orders
const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    let query = { restaurant: req.user.restaurant };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .sort({ placedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      orders,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders' });
  }
};

module.exports = {
  getDashboard,
  getAnalytics,
  getManagerMenu,
  getStaff,
  updateSettings,
  getAllOrders
};
