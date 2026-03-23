/* ============================================
   SpiceRoute - Authentication Controller
   Handles login for manager and kitchen staff.
   Customers do NOT need authentication.
   Issues JWT tokens on successful login.
   ============================================ */

const Staff = require('../models/Staff');
const { generateToken } = require('../middleware/auth');

/* ---- Staff Login ---- */
// POST /api/auth/login
// Authenticates staff (manager or kitchen) and returns JWT
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`🔐 Login attempt for: ${email}`);

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find staff by email (include password for comparison)
    const staff = await Staff.findOne({ email }).select('+password');

    if (!staff) {
      console.log(`❌ No staff found with email: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare passwords
    const isMatch = await staff.comparePassword(password);
    if (!isMatch) {
      console.log(`❌ Password mismatch for: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login and on-duty status
    staff.lastLogin = new Date();
    staff.isOnDuty = true;
    await staff.save();

    console.log(`✅ Login successful for: ${email} (${staff.role})`);

    // Generate JWT token
    const token = generateToken(staff._id, staff.role);

    res.json({
      success: true,
      token,
      user: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        restaurant: staff.restaurant,
        assignedStation: staff.assignedStation
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

/* ---- Rescue Manager (Force Reset) ---- */
// Use this to ensure a manager exists with known credentials
const rescueManager = async (req, res) => {
  try {
    const Restaurant = require('../models/Restaurant');
    let restaurant = await Restaurant.findOne();
    
    if (!restaurant) {
      return res.status(400).json({ message: 'No restaurant found. Run seed first or create a restaurant.' });
    }

    // Force update/create manager
    const managerData = {
      name: 'Rajesh Kumar',
      email: 'manager@spiceroute.com',
      password: 'manager123',
      role: 'manager',
      restaurant: restaurant._id,
      isOnDuty: true
    };

    let manager = await Staff.findOne({ email: 'manager@spiceroute.com' });
    if (manager) {
      manager.password = 'manager123';
      await manager.save();
      console.log('🔄 Manager password force-reset to: manager123');
    } else {
      manager = await Staff.create(managerData);
      console.log('✨ Manager account force-created');
    }

    res.json({
      success: true,
      message: 'Manager account has been reset/created successfully.',
      credentials: {
        email: 'manager@spiceroute.com',
        password: 'manager123'
      }
    });
  } catch (error) {
    console.error('Rescue error:', error);
    res.status(500).json({ message: 'Error during rescue reset' });
  }
};

/* ---- Get Current User Profile ---- */
// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const staff = await Staff.findById(req.user._id).populate('restaurant', 'name logo currency');
    res.json({ success: true, user: staff });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

/* ---- Logout (set off-duty) ---- */
// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    await Staff.findByIdAndUpdate(req.user._id, { isOnDuty: false });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { login, getMe, logout, rescueManager };
