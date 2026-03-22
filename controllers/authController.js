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

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find staff by email (include password for comparison)
    const staff = await Staff.findOne({ email }).select('+password');

    if (!staff) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare passwords
    const isMatch = await staff.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login and on-duty status
    staff.lastLogin = new Date();
    staff.isOnDuty = true;
    await staff.save();

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

module.exports = { login, getMe, logout };
