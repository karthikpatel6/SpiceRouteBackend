/* ============================================
   SpiceRoute - Menu Controller
   Handles menu CRUD operations and smart
   filtering based on kitchen workload.
   Customers see filtered menus during peak hours.
   ============================================ */

const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const { getSmartMenuFilter, calculateKitchenLoad, estimateWaitTime } = require('../utils/workloadEngine');

/* ---- Get Menu Items (Customer View) ---- */
// GET /api/menu/:restaurantId
// Returns menu with smart filtering applied based on kitchen load
const getMenu = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { category } = req.query;

    // Get current workload data and smart filter status
    const smartFilter = await getSmartMenuFilter(restaurantId);
    const waitTimeData = await estimateWaitTime(restaurantId);

    // Build query
    let query = {
      restaurant: restaurantId,
      isAvailable: true
    };

    // Filter by category if provided
    if (category && category !== 'All Items') {
      query.category = category;
    }

    // If high load and category is "Quick Prep", show only quick prep items
    if (category === 'Quick Prep') {
      query.isQuickPrep = true;
    }

    const menuItems = await MenuItem.find(query).sort({ isQuickPrep: -1, category: 1, name: 1 });

    // Add smart badges to items based on workload
    const enrichedItems = menuItems.map(item => {
      const itemObj = item.toObject();

      // Mark quick prep items
      if (item.isQuickPrep) {
        itemObj.badge = 'QUICK PREP';
        itemObj.badgeColor = 'green';
      }

      // Mark items locked by system during high load
      if (smartFilter.shouldFilter && smartFilter.lockedItems.includes(item._id.toString())) {
        itemObj.isLocked = true;
        itemObj.badge = 'HIGH WAIT';
        itemObj.badgeColor = 'red';
      }

      // Add prep time label
      if (item.prepTime > 15) {
        itemObj.prepTimeLabel = `${item.prepTime} min prep`;
      }

      return itemObj;
    });

    // Get restaurant info
    const restaurant = await Restaurant.findById(restaurantId).select('name currency taxRate');

    res.json({
      success: true,
      restaurant,
      menuItems: enrichedItems,
      workload: {
        loadLevel: smartFilter.loadLevel,
        loadPercentage: smartFilter.loadPercentage,
        activeOrders: smartFilter.activeOrders,
        message: smartFilter.message
      },
      waitTime: waitTimeData,
      categories: ['All Items', 'Quick Prep', 'Breakfast', 'Starters', 'Main Course', 'Beverages', 'Desserts', 'Specials']
    });
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({ message: 'Error fetching menu' });
  }
};

/* ---- Get Single Menu Item ---- */
// GET /api/menu/item/:id
const getMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Menu item not found' });
    res.json({ success: true, menuItem: item });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching menu item' });
  }
};

/* ---- Emit menu_update helper ---- */
const emitMenuUpdate = (req, restaurantId, itemId, changeType) => {
  const io = req.app.get('io');
  if (io) {
    io.to(`restaurant:${restaurantId}`).emit('menu_update', {
      restaurantId,
      itemId,
      changeType,
      timestamp: new Date()
    });
  }
};

/* ---- Create Menu Item (Manager only) ---- */
// POST /api/menu
const createMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.create({
      ...req.body,
      restaurant: req.user.restaurant
    });
    emitMenuUpdate(req, req.user.restaurant, menuItem._id, 'created');
    res.status(201).json({ success: true, menuItem });
  } catch (error) {
    console.error('Create menu item error:', error);
    res.status(500).json({ message: 'Error creating menu item' });
  }
};

/* ---- Update Menu Item (Manager only) ---- */
// PUT /api/menu/:id
const updateMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!menuItem) return res.status(404).json({ message: 'Menu item not found' });
    emitMenuUpdate(req, menuItem.restaurant, menuItem._id, 'updated');
    res.json({ success: true, menuItem });
  } catch (error) {
    res.status(500).json({ message: 'Error updating menu item' });
  }
};

/* ---- Delete Menu Item (Manager only) ---- */
// DELETE /api/menu/:id
const deleteMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndDelete(req.params.id);
    if (!menuItem) return res.status(404).json({ message: 'Menu item not found' });
    emitMenuUpdate(req, menuItem.restaurant, menuItem._id, 'deleted');
    res.json({ success: true, message: 'Menu item deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting menu item' });
  }
};

/* ---- Toggle Menu Item Availability (Manager only) ---- */
// PATCH /api/menu/:id/toggle
const toggleAvailability = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) return res.status(404).json({ message: 'Menu item not found' });

    menuItem.isAvailable = !menuItem.isAvailable;
    menuItem.isLockedBySystem = false; // Manager override
    await menuItem.save();

    emitMenuUpdate(req, menuItem.restaurant, menuItem._id, menuItem.isAvailable ? 'available' : 'unavailable');
    res.json({ success: true, menuItem });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling availability' });
  }
};

module.exports = {
  getMenu,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability
};
