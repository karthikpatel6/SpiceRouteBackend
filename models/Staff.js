/* ============================================
   SpiceRoute - Staff Model
   Stores staff accounts with role-based access.
   Roles: manager, kitchen
   Used for authentication and workload
   staff-requirement suggestions.
   ============================================ */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const staffSchema = new mongoose.Schema({
  // Staff member's full name
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },

  // Login email (unique)
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },

  // Hashed password
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false // Don't include password in queries by default
  },

  // Staff role for access control
  role: {
    type: String,
    enum: ['manager', 'kitchen'],
    required: true,
    default: 'kitchen'
  },

  // Reference to restaurant
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },

  // Whether this staff member is currently on duty
  isOnDuty: {
    type: Boolean,
    default: false
  },

  // Kitchen station assignment (for kitchen staff)
  assignedStation: {
    type: String,
    enum: ['Grill', 'Fryer', 'Sauté', 'Oven', 'Cold', 'Prep', 'Bar', 'All'],
    default: 'All'
  },

  // Last login timestamp
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

/* ---- Password Hashing Middleware ---- */
// Hash password before saving to database
staffSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/* ---- Password Comparison Method ---- */
// Compare entered password with hashed password in database
staffSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Staff', staffSchema);
