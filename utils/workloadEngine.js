/* ============================================
   SpiceRoute - Workload Engine
   Core intelligence module that monitors kitchen
   load and provides smart recommendations:
   - Calculates kitchen load percentage
   - Estimates wait times based on active orders
   - Suggests menu filtering during peak hours
   - Recommends staff requirements
   ============================================ */

const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Staff = require('../models/Staff');

/* ---- Calculate Current Kitchen Load ---- */
// Returns load percentage, level, and active order count
const calculateKitchenLoad = async (restaurantId) => {
  try {
    // Count orders that are currently being processed
    const activeOrders = await Order.countDocuments({
      restaurant: restaurantId,
      status: { $in: ['placed', 'confirmed', 'preparing'] }
    });

    // Get restaurant capacity settings
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) throw new Error('Restaurant not found');

    const { kitchenCapacity, workloadThresholds } = restaurant;

    // Calculate load percentage
    const loadPercentage = Math.min(Math.round((activeOrders / kitchenCapacity) * 100), 100);

    // Determine load level based on thresholds
    let loadLevel = 'low';
    if (activeOrders >= workloadThresholds.high) {
      loadLevel = 'critical';
    } else if (activeOrders >= workloadThresholds.moderate) {
      loadLevel = 'high';
    } else if (activeOrders >= workloadThresholds.low) {
      loadLevel = 'moderate';
    }

    return {
      activeOrders,
      kitchenCapacity,
      loadPercentage,
      loadLevel,
      thresholds: workloadThresholds
    };
  } catch (error) {
    console.error('Workload calculation error:', error);
    return {
      activeOrders: 0,
      kitchenCapacity: 15,
      loadPercentage: 0,
      loadLevel: 'low',
      thresholds: { low: 5, moderate: 10, high: 15 }
    };
  }
};

/* ---- Estimate Wait Time ---- */
// Calculates estimated waiting time based on current kitchen load
// Uses: base prep time × load multiplier + queue position factor
const estimateWaitTime = async (restaurantId, orderItems = []) => {
  try {
    const loadData = await calculateKitchenLoad(restaurantId);
    const restaurant = await Restaurant.findById(restaurantId);

    const baseTime = restaurant.basePreparationTime || 12;

    // Load multiplier increases wait time as kitchen gets busier
    let loadMultiplier = 1.0;
    switch (loadData.loadLevel) {
      case 'low':
        loadMultiplier = 1.0;
        break;
      case 'moderate':
        loadMultiplier = 1.3;
        break;
      case 'high':
        loadMultiplier = 1.7;
        break;
      case 'critical':
        loadMultiplier = 2.2;
        break;
    }

    // Factor in the max prep time of items being ordered
    let maxItemPrepTime = baseTime;
    if (orderItems.length > 0) {
      const menuItems = await MenuItem.find({ _id: { $in: orderItems.map(i => i.menuItem || i._id) } });
      maxItemPrepTime = Math.max(...menuItems.map(i => i.prepTime), baseTime);
    }

    // Calculate estimated wait time
    const estimatedMinutes = Math.round(maxItemPrepTime * loadMultiplier);

    // Return a range (min-max)
    const minWait = Math.max(estimatedMinutes - 3, 5);
    const maxWait = estimatedMinutes + 5;

    return {
      estimatedMinutes,
      range: `${minWait}-${maxWait}`,
      loadLevel: loadData.loadLevel,
      loadPercentage: loadData.loadPercentage
    };
  } catch (error) {
    console.error('Wait time estimation error:', error);
    return { estimatedMinutes: 15, range: '12-18', loadLevel: 'moderate', loadPercentage: 50 };
  }
};

/* ---- Get Smart Menu Recommendations ---- */
// During high kitchen load, this function determines which items
// should be promoted (quick prep) and which should be hidden (complex)
const getSmartMenuFilter = async (restaurantId) => {
  try {
    const loadData = await calculateKitchenLoad(restaurantId);

    let filter = {
      shouldFilter: false,
      promotedItems: [],    // Quick prep items to highlight
      lockedItems: [],      // Complex items to lock/hide
      message: ''
    };

    // Only apply smart filtering when load is high or critical
    if (loadData.loadLevel === 'high' || loadData.loadLevel === 'critical') {
      filter.shouldFilter = true;

      // Lock high-complexity items during peak
      const complexItems = await MenuItem.find({
        restaurant: restaurantId,
        complexity: 'HIGH',
        isAvailable: true
      }).select('_id name');

      filter.lockedItems = complexItems.map(i => i._id);

      // Promote quick prep items
      const quickItems = await MenuItem.find({
        restaurant: restaurantId,
        isQuickPrep: true,
        isAvailable: true
      }).select('_id name');

      filter.promotedItems = quickItems.map(i => i._id);

      filter.message = loadData.loadLevel === 'critical'
        ? 'Kitchen is at maximum capacity. Showing quick-prep items only.'
        : 'High demand! Quick-prep items recommended for faster service.';

      // Auto-lock complex items in the database
      await MenuItem.updateMany(
        { _id: { $in: filter.lockedItems } },
        { isLockedBySystem: true }
      );
    } else {
      // Unlock any previously locked items
      await MenuItem.updateMany(
        { restaurant: restaurantId, isLockedBySystem: true },
        { isLockedBySystem: false }
      );
    }

    return { ...filter, ...loadData };
  } catch (error) {
    console.error('Smart menu filter error:', error);
    return { shouldFilter: false, promotedItems: [], lockedItems: [], message: '' };
  }
};

/* ---- Staff Recommendation Engine ---- */
// Suggests optimal staff count based on current kitchen load
const getStaffRecommendation = async (restaurantId) => {
  try {
    const loadData = await calculateKitchenLoad(restaurantId);

    // Count staff currently on duty
    const onDutyStaff = await Staff.countDocuments({
      restaurant: restaurantId,
      role: 'kitchen',
      isOnDuty: true
    });

    const totalKitchenStaff = await Staff.countDocuments({
      restaurant: restaurantId,
      role: 'kitchen'
    });

    // Calculate recommended staff based on load
    let recommendedStaff = 2; // Minimum
    if (loadData.loadLevel === 'moderate') recommendedStaff = 3;
    if (loadData.loadLevel === 'high') recommendedStaff = 4;
    if (loadData.loadLevel === 'critical') recommendedStaff = 5;

    // Cap at total available staff
    recommendedStaff = Math.min(recommendedStaff, totalKitchenStaff);

    const needMoreStaff = onDutyStaff < recommendedStaff;

    return {
      onDutyStaff,
      totalKitchenStaff,
      recommendedStaff,
      needMoreStaff,
      message: needMoreStaff
        ? `⚠️ Recommended ${recommendedStaff} staff for current load. Currently ${onDutyStaff} on duty.`
        : `✅ Staff level adequate. ${onDutyStaff} on duty.`,
      loadData
    };
  } catch (error) {
    console.error('Staff recommendation error:', error);
    return { onDutyStaff: 0, recommendedStaff: 2, needMoreStaff: true, message: 'Unable to calculate' };
  }
};

module.exports = {
  calculateKitchenLoad,
  estimateWaitTime,
  getSmartMenuFilter,
  getStaffRecommendation
};
