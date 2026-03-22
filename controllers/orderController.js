/* ============================================
   SpiceRoute - Order Controller (v2)
   Full order lifecycle with:
   - Demo Mode (₹0 checkout)
   - ETA recalculation on every status change
   - Persistent thread (Customer ↔ Kitchen chat)
   - Status log
   ============================================ */

const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const Ingredient = require('../models/Ingredient');
const { estimateWaitTime, calculateKitchenLoad } = require('../utils/workloadEngine');

/* ---- Generate Unique Order Token ---- */
const generateToken = async () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const letter = letters[Math.floor(Math.random() * letters.length)];
  const number = Math.floor(Math.random() * 900) + 100;
  return `#${letter}-${number}`;
};

/* ---- Place New Order (Customer) ---- */
// POST /api/orders
const placeOrder = async (req, res) => {
  try {
    const { restaurantId, tableNumber, items, paymentMethod, orderType, specialInstructions, demoMode } = req.body;

    if (!restaurantId || !tableNumber || !items || items.length === 0) {
      return res.status(400).json({ message: 'Restaurant ID, table number, and items are required' });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem) continue;

      if (!menuItem.isAvailable || menuItem.isLockedBySystem) {
        return res.status(400).json({ message: `${menuItem.name} is currently unavailable` });
      }

      orderItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
        notes: item.notes || '',
        station: menuItem.station
      });

      subtotal += menuItem.price * item.quantity;

      menuItem.orderCount += item.quantity;
      await menuItem.save();

      // Deduct inventory stock
      if (menuItem.ingredient) {
        const updatedIng = await Ingredient.findByIdAndUpdate(
          menuItem.ingredient,
          { $inc: { stock: -item.quantity } },
          { new: true }
        );
        if (updatedIng && updatedIng.stock < updatedIng.threshold) {
          const io = req.app.get('io');
          if (io) {
            io.emit('inventory-alert', {
              ingredientId: updatedIng._id,
              name: updatedIng.name,
              stock: updatedIng.stock,
              threshold: updatedIng.threshold
            });
          }
        }
      }
    }

    // Demo Mode: ₹0 checkout (no real payment)
    const isDemoOrder = demoMode === true;
    const tax = isDemoOrder ? 0 : Math.round(subtotal * (restaurant.taxRate / 100));
    const total = isDemoOrder ? 0 : subtotal + tax;

    const waitTimeData = await estimateWaitTime(restaurantId, orderItems);
    const tokenNumber = await generateToken();

    const order = await Order.create({
      restaurant: restaurantId,
      tokenNumber,
      tableNumber,
      orderType: orderType || 'Dine-In',
      items: orderItems,
      specialInstructions: specialInstructions || '',
      status: 'placed',
      statusLog: [{ status: 'placed', note: 'Order received', timestamp: new Date() }],
      thread: specialInstructions
        ? [{ sender: 'Customer', role: 'customer', message: specialInstructions, timestamp: new Date() }]
        : [],
      subtotal,
      tax,
      total,
      isDemoOrder,
      estimatedWaitTime: waitTimeData.estimatedMinutes,
      paymentMethod: isDemoOrder ? 'Demo' : (paymentMethod || 'Cash'),
      kitchenNote: 'Order received, waiting for kitchen confirmation'
    });

    // Emit real-time event to kitchen and manager
    const io = req.app.get('io');
    if (io) {
      const orderPayload = {
        orderId: order._id,
        tokenNumber: order.tokenNumber,
        tableNumber: order.tableNumber,
        orderType: order.orderType,
        items: order.items,
        specialInstructions: order.specialInstructions,
        isDemoOrder: order.isDemoOrder,
        placedAt: order.placedAt,
        estimatedWaitTime: order.estimatedWaitTime
      };
      io.to(`kitchen:${restaurantId}`).emit('newOrder', orderPayload);
      io.to(`manager:${restaurantId}`).emit('newOrder', orderPayload);
    }

    res.status(201).json({ success: true, order, waitTime: waitTimeData });
  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({ message: 'Error placing order' });
  }
};

/* ---- Get Order by Token (Customer Tracking) ---- */
// GET /api/orders/track/:tokenNumber
const trackOrder = async (req, res) => {
  try {
    const { tokenNumber } = req.params;
    const order = await Order.findOne({ tokenNumber })
      .populate('restaurant', 'name currency');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    const loadData = await calculateKitchenLoad(order.restaurant._id);

    res.json({
      success: true,
      order,
      kitchenPulse: {
        loadLevel: loadData.loadLevel,
        loadPercentage: loadData.loadPercentage
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error tracking order' });
  }
};

/* ---- Get All Orders for Kitchen Display ---- */
// GET /api/orders/kitchen/:restaurantId
const getKitchenOrders = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { status } = req.query;

    let query = {
      restaurant: restaurantId,
      status: { $in: ['placed', 'confirmed', 'preparing'] }
    };

    if (status && status !== 'all') {
      query.status = status;
    }

    const orders = await Order.find(query)
      .sort({ priority: -1, placedAt: 1 })
      .populate('restaurant', 'name');

    const enrichedOrders = orders.map(order => {
      const orderObj = order.toObject();
      const minutesAgo = Math.round((Date.now() - new Date(order.placedAt).getTime()) / 60000);
      orderObj.minutesAgo = minutesAgo;
      orderObj.isLate = minutesAgo > order.estimatedWaitTime;
      return orderObj;
    });

    const loadData = await calculateKitchenLoad(restaurantId);

    res.json({
      success: true,
      orders: enrichedOrders,
      workload: loadData,
      stats: {
        total: enrichedOrders.length,
        new: enrichedOrders.filter(o => o.status === 'placed').length,
        inPrep: enrichedOrders.filter(o => o.status === 'preparing').length,
        late: enrichedOrders.filter(o => o.isLate).length
      }
    });
  } catch (error) {
    console.error('Get kitchen orders error:', error);
    res.status(500).json({ message: 'Error fetching kitchen orders' });
  }
};

/* ---- Update Order Status (Kitchen Staff) ---- */
// PATCH /api/orders/:id/status
const updateOrderStatus = async (req, res) => {
  try {
    const { status, kitchenProgress, kitchenNote, priority } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (status) {
      order.status = status;

      // Push to persistent status log
      order.statusLog.push({
        status,
        note: kitchenNote || `Status changed to ${status}`,
        timestamp: new Date()
      });

      if (status === 'preparing') {
        order.preparingAt = new Date();
        order.kitchenProgress = 25;
        order.kitchenNote = 'Chef has started preparing your order';
        // Recalculate ETA based on current kitchen load
        const waitTimeData = await estimateWaitTime(order.restaurant, order.items);
        order.estimatedWaitTime = waitTimeData.estimatedMinutes;
      } else if (status === 'ready') {
        order.readyAt = new Date();
        order.kitchenProgress = 100;
        order.kitchenNote = 'Your order is ready for pickup!';
      } else if (status === 'served') {
        order.servedAt = new Date();
      } else if (status === 'confirmed') {
        order.kitchenProgress = 10;
        order.kitchenNote = 'Order confirmed by kitchen';
        const waitTimeData = await estimateWaitTime(order.restaurant, order.items);
        order.estimatedWaitTime = waitTimeData.estimatedMinutes;
      }
    }

    if (kitchenProgress !== undefined) order.kitchenProgress = kitchenProgress;
    if (kitchenNote) order.kitchenNote = kitchenNote;
    if (priority) order.priority = priority;

    await order.save();

    const io = req.app.get('io');
    if (io) {
      const statusPayload = {
        orderId: order._id,
        tokenNumber: order.tokenNumber,
        status: order.status,
        kitchenProgress: order.kitchenProgress,
        kitchenNote: order.kitchenNote,
        estimatedWaitTime: order.estimatedWaitTime
      };
      io.to(`order:${order.tokenNumber}`).emit('update_status', statusPayload);
      io.to(`manager:${order.restaurant}`).emit('update_status', statusPayload);
    }

    res.json({ success: true, order });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Error updating order status' });
  }
};

/* ---- Add Customer Instruction to Order Thread ---- */
// POST /api/orders/:id/instruction
const addOrderInstruction = async (req, res) => {
  try {
    const { message, sender } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const threadEntry = {
      sender: sender || 'Customer',
      role: 'customer',
      message,
      timestamp: new Date()
    };
    order.thread.push(threadEntry);
    await order.save();

    // Relay to kitchen
    const io = req.app.get('io');
    if (io) {
      io.to(`kitchen:${order.restaurant}`).emit('order_instruction', {
        orderId: order._id,
        tokenNumber: order.tokenNumber,
        ...threadEntry
      });
      io.to(`manager:${order.restaurant}`).emit('order_instruction', {
        orderId: order._id,
        tokenNumber: order.tokenNumber,
        ...threadEntry
      });
    }

    res.json({ success: true, thread: order.thread });
  } catch (error) {
    res.status(500).json({ message: 'Error adding instruction' });
  }
};

/* ---- Add Kitchen Shout to Order Thread ---- */
// POST /api/orders/:id/shout
const addKitchenShout = async (req, res) => {
  try {
    const { message, senderName } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const threadEntry = {
      sender: senderName || 'Kitchen',
      role: 'kitchen',
      message,
      timestamp: new Date()
    };
    order.thread.push(threadEntry);
    await order.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`order:${order.tokenNumber}`).emit('kitchen_shout', {
        orderId: order._id,
        tokenNumber: order.tokenNumber,
        ...threadEntry
      });
      io.to(`manager:${order.restaurant}`).emit('kitchen_shout', {
        orderId: order._id,
        tokenNumber: order.tokenNumber,
        ...threadEntry
      });
    }

    res.json({ success: true, thread: order.thread });
  } catch (error) {
    res.status(500).json({ message: 'Error adding shout' });
  }
};

/* ---- Get Order by ID ---- */
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('restaurant', 'name currency');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order' });
  }
};

/* ---- Get Orders by Table (Customer) ---- */
const getTableOrders = async (req, res) => {
  try {
    const { restaurantId, tableNumber } = req.params;
    const orders = await Order.find({
      restaurant: restaurantId,
      tableNumber,
      status: { $nin: ['served', 'cancelled'] }
    }).sort({ placedAt: -1 });

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching table orders' });
  }
};

module.exports = {
  placeOrder,
  trackOrder,
  getKitchenOrders,
  updateOrderStatus,
  addOrderInstruction,
  addKitchenShout,
  getOrder,
  getTableOrders
};
