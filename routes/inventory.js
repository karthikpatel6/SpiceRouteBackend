const express = require('express');
const router = express.Router();
const Ingredient = require('../models/Ingredient');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/inventory/low-stock
// @desc    Get ingredients below their threshold
// @access  Private/Manager
router.get('/low-stock', protect, authorize('manager'), async (req, res) => {
  try {
    const ingredients = await Ingredient.find({ 
      restaurant: req.user.restaurant,
      $expr: { $lt: ["$stock", "$threshold"] }
    });
    res.json({ success: true, ingredients });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// @route   PATCH /api/inventory/:id/restock
// @desc    Restock ingredient to 50
// @access  Private/Manager
router.patch('/:id/restock', protect, authorize('manager'), async (req, res) => {
  try {
    const ingredient = await Ingredient.findByIdAndUpdate(
      req.params.id,
      { stock: 50 },
      { new: true }
    );
    if (!ingredient) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, ingredient });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

module.exports = router;
