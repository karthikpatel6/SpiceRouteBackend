/* ============================================
   SpiceRoute - Restaurant Model
   Stores restaurant information including
   name, capacity settings, and workload thresholds
   ============================================ */

const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  // Restaurant basic information
  name: {
    type: String,
    required: [true, 'Restaurant name is required'],
    trim: true
  },

  // Restaurant description for branding
  description: {
    type: String,
    default: ''
  },

  // Logo URL for branding
  logo: {
    type: String,
    default: ''
  },

  // Total number of tables in the restaurant
  totalTables: {
    type: Number,
    required: true,
    default: 20
  },

  /* ---- Kitchen Capacity & Workload Settings ---- */

  // Maximum number of orders kitchen can handle simultaneously
  kitchenCapacity: {
    type: Number,
    required: true,
    default: 15
  },

  // Workload threshold levels for intelligent load management
  workloadThresholds: {
    // Below this = Low load (green zone)
    low: { type: Number, default: 5 },
    // Between low and moderate = Moderate load (yellow zone)
    moderate: { type: Number, default: 10 },
    // Above moderate = High load (red zone) - triggers smart filtering
    high: { type: Number, default: 15 }
  },

  // Base preparation time in minutes (used for wait time calculation)
  basePreparationTime: {
    type: Number,
    default: 12
  },

  // Operating hours
  operatingHours: {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '23:00' }
  },

  // Currency symbol for display
  currency: {
    type: String,
    default: '₹'
  },

  // Tax percentage
  taxRate: {
    type: Number,
    default: 5
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Restaurant', restaurantSchema);
