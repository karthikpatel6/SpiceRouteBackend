/* ============================================
   SpiceRoute - Database Seeder
   Populates MongoDB with sample data for
   development and demonstration:
   - 1 Restaurant (Royal Indian Cuisine)
   - 15+ Menu Items across categories
   - Manager & Kitchen staff accounts
   
   Run: node seed.js
   ============================================ */

require('dotenv').config();
const mongoose = require('mongoose');
const Restaurant = require('./models/Restaurant');
const MenuItem = require('./models/MenuItem');
const Staff = require('./models/Staff');
const Order = require('./models/Order');
const Ingredient = require('./models/Ingredient');
const connectDB = require('./config/db');

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('🌱 Starting database seed...');

    // Clear existing data
    await Restaurant.deleteMany({});
    await MenuItem.deleteMany({});
    await Staff.deleteMany({});
    await Order.deleteMany({});
    await Ingredient.deleteMany({});
    console.log('🗑️  Cleared existing data');

    /* ---- Create Restaurant ---- */
    const restaurant = await Restaurant.create({
      name: 'Royal Indian Cuisine',
      description: 'Authentic Indian flavors with a modern twist. Serving the finest cuisine since 1995.',
      logo: '',
      totalTables: 20,
      kitchenCapacity: 15,
      workloadThresholds: { low: 5, moderate: 10, high: 15 },
      basePreparationTime: 12,
      operatingHours: { open: '09:00', close: '23:00' },
      currency: '₹',
      taxRate: 5
    });
    console.log(`🍛 Created restaurant: ${restaurant.name}`);

    /* ---- Create Staff Accounts ---- */
    const manager = await Staff.create({
      name: 'Rajesh Kumar',
      email: 'manager@spiceroute.com',
      password: 'manager123',
      role: 'manager',
      restaurant: restaurant._id,
      isOnDuty: true,
      assignedStation: 'All'
    });
    console.log(`👔 Created manager: ${manager.email} / manager123`);

    const kitchenStaff = await Staff.create([
      {
        name: 'Arun Chef',
        email: 'kitchen@spiceroute.com',
        password: 'kitchen123',
        role: 'kitchen',
        restaurant: restaurant._id,
        isOnDuty: true,
        assignedStation: 'All'
      },
      {
        name: 'Priya Cook',
        email: 'kitchen2@spiceroute.com',
        password: 'kitchen123',
        role: 'kitchen',
        restaurant: restaurant._id,
        isOnDuty: true,
        assignedStation: 'Grill'
      },
      {
        name: 'Suresh Tandoor',
        email: 'kitchen3@spiceroute.com',
        password: 'kitchen123',
        role: 'kitchen',
        restaurant: restaurant._id,
        isOnDuty: false,
        assignedStation: 'Oven'
      }
    ]);
    console.log(`👨‍🍳 Created ${kitchenStaff.length} kitchen staff accounts`);

    
    /* ---- Create Ingredients ---- */
    const ingredients = await Ingredient.create([
      { name: 'Rice Batter', stock: 50, threshold: 5, unit: 'liters', restaurant: restaurant._id },
      { name: 'Chicken', stock: 50, threshold: 5, unit: 'kg', restaurant: restaurant._id },
      { name: 'Paneer', stock: 50, threshold: 5, unit: 'kg', restaurant: restaurant._id },
      { name: 'Coffee Powder', stock: 50, threshold: 5, unit: 'grams', restaurant: restaurant._id },
      { name: 'Semolina (Rava)', stock: 50, threshold: 5, unit: 'kg', restaurant: restaurant._id }
    ]);
    console.log(`📦 Created ${ingredients.length} ingredients`);

    /* ---- Create Menu Items ---- */

    const menuItems = await MenuItem.create([
      // === BREAKFAST / QUICK PREP ===
      {
        name: 'Steamed Idli',
        ingredient: ingredients[0]._id,
        description: 'Fluffy rice cakes with coconut chutney and sambar',
        price: 30,
        image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400',
        category: 'Breakfast',
        prepTime: 5,
        complexity: 'LOW',
        isQuickPrep: true,
        station: 'Prep',
        isVeg: true,
        isBestseller: true,
        restaurant: restaurant._id
      },
      {
        name: 'Medhu Vada (2 pcs)',
        description: 'Crispy lentil donuts served with sambar and chutney',
        price: 40,
        image: 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400',
        category: 'Breakfast',
        prepTime: 8,
        complexity: 'LOW',
        isQuickPrep: true,
        station: 'Fryer',
        isVeg: true,
        isBestseller: true,
        restaurant: restaurant._id
      },
      {
        name: 'Rava Idli',
        description: 'Semolina idli with cashews and curry leaves',
        price: 35,
        image: 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400',
        category: 'Breakfast',
        prepTime: 7,
        complexity: 'LOW',
        isQuickPrep: true,
        station: 'Prep',
        isVeg: true,
        restaurant: restaurant._id
      },
      {
        name: 'Masala Dosa',
        ingredient: ingredients[0]._id,
        description: 'Crispy crepe filled with spiced potato masala',
        price: 60,
        image: 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400',
        category: 'Breakfast',
        prepTime: 10,
        complexity: 'MEDIUM',
        isQuickPrep: false,
        station: 'Sauté',
        isVeg: true,
        isBestseller: true,
        restaurant: restaurant._id
      },
      // === STARTERS ===
      {
        name: 'Paneer Tikka',
        description: 'Marinated cottage cheese grilled in tandoor',
        price: 120,
        image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400',
        category: 'Starters',
        prepTime: 15,
        complexity: 'MEDIUM',
        isQuickPrep: false,
        station: 'Oven',
        isVeg: true,
        restaurant: restaurant._id
      },
      {
        name: 'Chicken 65',
        description: 'Spicy deep-fried chicken bites with curry leaves',
        price: 150,
        image: 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?w=400',
        category: 'Starters',
        prepTime: 12,
        complexity: 'MEDIUM',
        isQuickPrep: false,
        station: 'Fryer',
        isVeg: false,
        isBestseller: true,
        restaurant: restaurant._id
      },
      // === MAIN COURSE ===
      {
        name: 'Paneer Butter Masala',
        ingredient: ingredients[2]._id,
        description: 'Cottage cheese in rich tomato gravy',
        price: 160,
        image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400',
        category: 'Main Course',
        prepTime: 15,
        complexity: 'MEDIUM',
        isQuickPrep: false,
        station: 'Sauté',
        isVeg: true,
        isBestseller: true,
        restaurant: restaurant._id
      },
      {
        name: 'Butter Chicken',
        ingredient: ingredients[1]._id,
        description: 'Tender chicken in creamy tomato-butter sauce',
        price: 200,
        image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400',
        category: 'Main Course',
        prepTime: 20,
        complexity: 'HIGH',
        isQuickPrep: false,
        station: 'Sauté',
        isVeg: false,
        isBestseller: true,
        restaurant: restaurant._id
      },
      {
        name: 'Maharaja Special Thali',
        description: 'Full platter with 12 traditional items',
        price: 180,
        image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400',
        category: 'Specials',
        prepTime: 30,
        complexity: 'HIGH',
        isQuickPrep: false,
        station: 'Prep',
        isVeg: true,
        restaurant: restaurant._id
      },
      {
        name: 'Biryani (Chicken)',
        description: 'Slow-cooked aromatic basmati rice with chicken',
        price: 180,
        image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400',
        category: 'Specials',
        prepTime: 25,
        complexity: 'HIGH',
        isQuickPrep: false,
        station: 'Oven',
        isVeg: false,
        restaurant: restaurant._id
      },
      {
        name: 'Sambar Vada',
        description: 'Crispy vada soaked in hot sambar',
        price: 45,
        image: 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400',
        category: 'Breakfast',
        prepTime: 8,
        complexity: 'LOW',
        isQuickPrep: true,
        station: 'Fryer',
        isVeg: true,
        restaurant: restaurant._id
      },
      {
        name: 'Ghee Podi Idli',
        description: 'Idli tossed in ghee and spicy podi powder',
        price: 50,
        image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400',
        category: 'Breakfast',
        prepTime: 6,
        complexity: 'LOW',
        isQuickPrep: true,
        station: 'Fryer',
        isVeg: true,
        restaurant: restaurant._id
      },
      {
        name: 'Kesari Bath',
        ingredient: ingredients[4]._id,
        description: 'Sweet semolina dessert with saffron and nuts',
        price: 40,
        image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400',
        category: 'Desserts',
        prepTime: 10,
        complexity: 'MEDIUM',
        isQuickPrep: false,
        station: 'Grill',
        isVeg: true,
        restaurant: restaurant._id
      },
      {
        name: 'Pongal',
        description: 'Comfort food - rice and lentil porridge with ghee',
        price: 50,
        image: 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400',
        category: 'Breakfast',
        prepTime: 12,
        complexity: 'MEDIUM',
        isQuickPrep: false,
        station: 'Prep',
        isVeg: true,
        restaurant: restaurant._id
      },
      // === BEVERAGES ===
      {
        name: 'Filter Coffee',
        ingredient: ingredients[3]._id,
        description: 'Traditional South Indian filter coffee',
        price: 20,
        image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
        category: 'Beverages',
        prepTime: 3,
        complexity: 'LOW',
        isQuickPrep: true,
        station: 'Cold',
        isVeg: true,
        isBestseller: true,
        restaurant: restaurant._id
      },
      {
        name: 'Mango Lassi',
        description: 'Creamy yogurt smoothie with fresh mango pulp',
        price: 50,
        image: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=400',
        category: 'Beverages',
        prepTime: 5,
        complexity: 'LOW',
        isQuickPrep: true,
        station: 'Cold',
        isVeg: true,
        restaurant: restaurant._id
      },
      {
        name: 'Paper Roast',
        description: 'Extra thin and crispy dosa - a South Indian classic',
        price: 70,
        image: 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400',
        category: 'Breakfast',
        prepTime: 12,
        complexity: 'MEDIUM',
        isQuickPrep: false,
        station: 'Sauté',
        isVeg: true,
        restaurant: restaurant._id
      },
      {
        name: 'Onion Uttapam',
        description: 'Thick pancake topped with onions and vegetables',
        price: 55,
        image: 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400',
        category: 'Breakfast',
        prepTime: 10,
        complexity: 'LOW',
        isQuickPrep: true,
        station: 'Prep',
        isVeg: true,
        restaurant: restaurant._id
      }
    ]);
    console.log(`🍽️  Created ${menuItems.length} menu items`);

    /* ---- Create Sample Orders (for demo) ---- */
    const sampleOrders = await Order.create([
      {
        restaurant: restaurant._id, tokenNumber: '#T-101', tableNumber: 3, orderType: 'Dine-In', status: 'ready', priority: 'normal',
        items: [{ menuItem: menuItems[3]._id, name: 'Masala Dosa', price: 60, quantity: 2, station: 'Sauté' }], subtotal: 120, tax: 6, total: 126, estimatedWaitTime: 10, placedAt: new Date(Date.now() - 60*60000)
      },
      {
        restaurant: restaurant._id, tokenNumber: '#T-102', tableNumber: 4, orderType: 'Takeout', status: 'placed', priority: 'normal',
        items: [{ menuItem: menuItems[0]._id, name: 'Steamed Idli', price: 30, quantity: 1, station: 'Prep' }], subtotal: 30, tax: 1, total: 31, estimatedWaitTime: 5
      },
      {
        restaurant: restaurant._id, tokenNumber: '#T-103', tableNumber: 1, orderType: 'Dine-In', status: 'preparing', priority: 'rush',
        items: [{ menuItem: menuItems[1]._id, name: 'Medhu Vada', price: 40, quantity: 2, station: 'Fryer' }], subtotal: 80, tax: 4, total: 84, estimatedWaitTime: 8, preparingAt: new Date(Date.now() - 5*60000)
      },
      {
        restaurant: restaurant._id, tokenNumber: '#T-104', tableNumber: 12, orderType: 'Dine-In', status: 'ready', priority: 'priority',
        items: [{ menuItem: menuItems[7]._id, name: 'Butter Chicken', price: 200, quantity: 1, station: 'Sauté' }], subtotal: 200, tax: 10, total: 210, estimatedWaitTime: 20, placedAt: new Date(Date.now() - 120*60000)
      },
      {
        restaurant: restaurant._id, tokenNumber: '#T-105', tableNumber: 7, orderType: 'Takeout', status: 'preparing', priority: 'normal',
        items: [{ menuItem: menuItems[14]._id, name: 'Filter Coffee', price: 20, quantity: 3, station: 'Cold' }], subtotal: 60, tax: 3, total: 63, estimatedWaitTime: 3, preparingAt: new Date(Date.now() - 2*60000)
      },
      {
        restaurant: restaurant._id, tokenNumber: '#T-106', tableNumber: 8, orderType: 'Dine-In', status: 'placed', priority: 'normal',
        items: [{ menuItem: menuItems[6]._id, name: 'Paneer Butter Masala', price: 160, quantity: 1, station: 'Sauté' }], subtotal: 160, tax: 8, total: 168, estimatedWaitTime: 15
      },
      {
        restaurant: restaurant._id, tokenNumber: '#T-107', tableNumber: 2, orderType: 'Takeout', status: 'ready', priority: 'priority',
        items: [{ menuItem: menuItems[4]._id, name: 'Paneer Tikka', price: 120, quantity: 2, station: 'Oven' }], subtotal: 240, tax: 12, total: 252, estimatedWaitTime: 15, placedAt: new Date(Date.now() - 200*60000)
      },
      {
        restaurant: restaurant._id, tokenNumber: '#T-108', tableNumber: 5, orderType: 'Dine-In', status: 'preparing', priority: 'rush',
        items: [{ menuItem: menuItems[5]._id, name: 'Chicken 65', price: 150, quantity: 1, station: 'Fryer' }], subtotal: 150, tax: 7, total: 157, estimatedWaitTime: 12, preparingAt: new Date(Date.now() - 15*60000)
      },
      {
        restaurant: restaurant._id, tokenNumber: '#T-109', tableNumber: 9, orderType: 'Dine-In', status: 'placed', priority: 'normal',
        items: [{ menuItem: menuItems[2]._id, name: 'Rava Idli', price: 35, quantity: 3, station: 'Prep' }], subtotal: 105, tax: 5, total: 110, estimatedWaitTime: 7
      },
      {
        restaurant: restaurant._id, tokenNumber: '#T-110', tableNumber: 10, orderType: 'Dine-In', status: 'ready', priority: 'normal',
        items: [{ menuItem: menuItems[12]._id, name: 'Kesari Bath', price: 40, quantity: 1, station: 'Grill' }], subtotal: 40, tax: 2, total: 42, estimatedWaitTime: 10, placedAt: new Date(Date.now() - 300*60000)
      }
    ]);
    console.log(`📋 Created ${sampleOrders.length} sample orders`);

    console.log(`
    ✅ Database seeded successfully!
    
    📌 Restaurant ID: ${restaurant._id}
    
    🔑 Login Credentials:
    ─────────────────────
    Manager:  manager@spiceroute.com / manager123
    Kitchen:  kitchen@spiceroute.com / kitchen123
    
    🌐 Customer Menu URL:
    http://localhost:5173/menu/${restaurant._id}?table=1
    `);

  } catch (error) {
    console.error('❌ Seed error:', error);
  }
};

module.exports = seedDatabase;
