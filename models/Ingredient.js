const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  stock: {
    type: Number,
    required: true,
    default: 50
  },
  threshold: {
    type: Number,
    required: true,
    default: 5
  },
  unit: {
    type: String,
    enum: ['kg', 'liters', 'units', 'grams'],
    default: 'units'
  },
  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Ingredient', ingredientSchema);
