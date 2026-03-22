/* ============================================
   SpiceRoute - WorkloadMetric Model
   Stores periodic snapshots of kitchen workload
   data for analytics and historical tracking.
   The workload engine writes to this collection
   to enable the manager analytics dashboard.
   ============================================ */

const mongoose = require('mongoose');

const workloadMetricSchema = new mongoose.Schema({
  // Reference to restaurant
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },

  // Timestamp of this metric snapshot
  timestamp: {
    type: Date,
    default: Date.now
  },

  // Number of active orders at this point in time
  activeOrders: {
    type: Number,
    required: true,
    default: 0
  },

  // Kitchen load percentage (0-100)
  loadPercentage: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    max: 100
  },

  // Load level classification
  loadLevel: {
    type: String,
    enum: ['low', 'moderate', 'high', 'critical'],
    default: 'low'
  },

  // Average wait time in minutes at this snapshot
  avgWaitTime: {
    type: Number,
    default: 0
  },

  // Number of staff on duty
  staffOnDuty: {
    type: Number,
    default: 0
  },

  // Recommended staff count by workload engine
  recommendedStaff: {
    type: Number,
    default: 0
  },

  // Number of orders completed in the last hour
  ordersCompletedLastHour: {
    type: Number,
    default: 0
  },

  // Average preparation time in minutes for completed orders
  avgPrepTime: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for time-series queries
workloadMetricSchema.index({ restaurant: 1, timestamp: -1 });

// Auto-delete metrics older than 30 days (archival strategy)
workloadMetricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('WorkloadMetric', workloadMetricSchema);
