import os
import re

seed_path = r'd:\PW_END_SEM\server\seed.js'
with open(seed_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Ingredient import
content = content.replace("const Order = require('./models/Order');", "const Order = require('./models/Order');\nconst Ingredient = require('./models/Ingredient');")

# 2. Delete existing ingredients
content = content.replace("await Order.deleteMany({});", "await Order.deleteMany({});\n    await Ingredient.deleteMany({});")

# 3. Create Ingredients before Menu Items
ingredients_code = """
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
"""
content = content.replace("/* ---- Create Menu Items ---- */", ingredients_code)

# 4. Attach ingredients to menu items
content = content.replace("name: 'Steamed Idli',", "name: 'Steamed Idli',\n        ingredient: ingredients[0]._id,")
content = content.replace("name: 'Masala Dosa',", "name: 'Masala Dosa',\n        ingredient: ingredients[0]._id,")
content = content.replace("name: 'Butter Chicken',", "name: 'Butter Chicken',\n        ingredient: ingredients[1]._id,")
content = content.replace("name: 'Paneer Butter Masala',", "name: 'Paneer Butter Masala',\n        ingredient: ingredients[2]._id,")
content = content.replace("name: 'Filter Coffee',", "name: 'Filter Coffee',\n        ingredient: ingredients[3]._id,")
content = content.replace("name: 'Kesari Bath',", "name: 'Kesari Bath',\n        ingredient: ingredients[4]._id,")

# 5. Expand sample orders to 10
new_orders = """const sampleOrders = await Order.create([
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
    ]);"""

content = re.sub(r'const sampleOrders = await Order\.create\(\[.*?\]\);', new_orders, content, flags=re.DOTALL)

with open(seed_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated seed.js")
