/* ============================================
   SpiceRoute - MenuItem Model
   Stores menu items with preparation complexity,
   category, availability, and pricing info.
   Items can be dynamically shown/hidden based
   on kitchen workload (smart filtering feature).
   ============================================ */

const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  // Reference to the restaurant this item belongs to
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },

  // Item name
  name: {
    type: String,
    required: [true, 'Menu item name is required'],
    trim: true
  },

  // Item description
  description: {
    type: String,
    default: ''
  },

  // Price in restaurant's currency
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0
  },

  // Food image URL
  image: {
    type: String,
    default: ''
  },

  // Menu category for filtering
  category: {
    type: String,
    required: true,
    enum: ['Breakfast', 'Main Course', 'Quick Prep', 'Beverages', 'Desserts', 'Starters', 'Specials'],
    default: 'Main Course'
  },

  // Raw material consumed when ordered
  ingredient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ingredient'
  },

  /* ---- Workload-Aware Properties ---- */

  // Estimated preparation time in minutes
  // Used by workload engine to calculate wait times
  prepTime: {
    type: Number,
    required: true,
    default: 10
  },

  // Preparation complexity level
  // HIGH complexity items get hidden during peak kitchen load
  complexity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'MEDIUM'
  },

  // Whether this item is a "Quick Prep" item
  // Quick prep items are promoted during high kitchen load
  isQuickPrep: {
    type: Boolean,
    default: false
  },

  // Kitchen station this item is prepared at
  // Helps distribute workload across stations
  station: {
    type: String,
    enum: ['Grill', 'Fryer', 'Sauté', 'Oven', 'Cold', 'Prep', 'Bar'],
    default: 'Prep'
  },

  /* ---- Availability Settings ---- */

  // Whether the item is currently available
  // Manager can toggle this manually
  isAvailable: {
    type: Boolean,
    default: true
  },

  // Whether system has auto-locked this item due to high workload
  isLockedBySystem: {
    type: Boolean,
    default: false
  },

  // Whether this item is vegetarian
  isVeg: {
    type: Boolean,
    default: false
  },

  // Whether this item is a bestseller
  isBestseller: {
    type: Boolean,
    default: false
  },

  // Number of times this item has been ordered (for analytics)
  orderCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient menu queries
menuItemSchema.index({ restaurant: 1, category: 1, isAvailable: 1 });
menuItemSchema.index({ restaurant: 1, isQuickPrep: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
