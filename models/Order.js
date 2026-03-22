/* ============================================
   SpiceRoute - Order Model (v2 - Dynamic Upgrade)
   Supports full order lifecycle, bidirectional
   chat threads, persistent status logs, and
   special customer instructions.
   ============================================ */

const mongoose = require('mongoose');

// Sub-schema for individual items in an order
const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  notes: { type: String, default: '' },
  station: { type: String, default: 'Prep' }
}, { _id: false });

// Sub-schema for bidirectional order thread (Customer ↔ Kitchen)
const threadMessageSchema = new mongoose.Schema({
  sender: { type: String, required: true },     // e.g. "Customer" or staff name
  role: {
    type: String,
    enum: ['customer', 'kitchen', 'manager'],
    required: true
  },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
}, { _id: true });

// Sub-schema for persistent status change log
const statusLogSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['placed', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'],
    required: true
  },
  note: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  // Reference to restaurant
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },

  // Unique order token for customer display (e.g., #A-582)
  tokenNumber: {
    type: String,
    required: true
  },

  // Table number from QR code scan
  tableNumber: {
    type: Number,
    required: true
  },

  // Order type
  orderType: {
    type: String,
    enum: ['Dine-In', 'Takeout'],
    default: 'Dine-In'
  },

  // Items in this order
  items: [orderItemSchema],

  // Special instructions from customer at order time
  specialInstructions: { type: String, default: '' },

  /* ---- Bidirectional Chat Thread ---- */
  // Customer → Kitchen: "Extra spicy please"
  // Kitchen → Customer: "Sorry, 5 mins delay"
  thread: [threadMessageSchema],

  /* ---- Order Status Tracking ---- */

  status: {
    type: String,
    enum: ['placed', 'confirmed', 'preparing', 'ready', 'served', 'cancelled'],
    default: 'placed'
  },

  // Persistent log of all status changes
  statusLog: [statusLogSchema],

  // Priority flag set by kitchen staff
  priority: {
    type: String,
    enum: ['normal', 'priority', 'rush'],
    default: 'normal'
  },

  /* ---- Timing Information ---- */

  // When the order was placed
  placedAt: {
    type: Date,
    default: Date.now
  },

  // Estimated wait time in minutes (recalculated on each status change)
  estimatedWaitTime: {
    type: Number,
    default: 15
  },

  // When kitchen started preparing
  preparingAt: { type: Date },

  // When order was marked ready
  readyAt: { type: Date },

  // When order was served/completed
  servedAt: { type: Date },

  /* ---- Financial Information ---- */

  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },

  // Payment method chosen
  paymentMethod: {
    type: String,
    enum: ['GPay', 'PhonePe', 'Paytm', 'Cash', 'Card', 'Demo'],
    default: 'Cash'
  },

  // Is this a demo/simulation order (₹0 checkout)
  isDemoOrder: { type: Boolean, default: false },

  // Kitchen progress percentage (0-100)
  kitchenProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // Chef's current activity note
  kitchenNote: { type: String, default: '' }
}, {
  timestamps: true
});

// Indexes for efficient order queries
orderSchema.index({ restaurant: 1, status: 1 });
orderSchema.index({ tokenNumber: 1 });
orderSchema.index({ tableNumber: 1, status: 1 });
orderSchema.index({ placedAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
