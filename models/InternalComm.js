/* ============================================
   SpiceRoute - Internal Communications Model
   Persists Kitchen ↔ Manager messages,
   resource alerts, and staff shouts.
   Auto-expires after 7 days via TTL index.
   ============================================ */

const mongoose = require('mongoose');

const internalCommSchema = new mongoose.Schema({
  // Which restaurant this comm belongs to
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },

  // The staff member who sent the message (optional for system alerts)
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },

  senderName: { type: String, default: 'Kitchen Staff' },

  role: {
    type: String,
    enum: ['kitchen', 'manager', 'system'],
    required: true
  },

  message: { type: String, required: true },

  // Type of communication
  type: {
    type: String,
    enum: ['shout', 'alert', 'reply', 'menu_override'],
    default: 'shout'
  },

  // Optional: link to specific order for context
  relatedOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },

  // Whether the manager has acknowledged/read this
  acknowledged: { type: Boolean, default: false },

  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// TTL index: auto-delete after 7 days
internalCommSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });
internalCommSchema.index({ restaurant: 1, timestamp: -1 });

module.exports = mongoose.model('InternalComm', internalCommSchema);
