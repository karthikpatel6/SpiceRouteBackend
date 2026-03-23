/* ============================================
   SpiceRoute - Main Server Entry Point (v2)
   Express server with Socket.IO for real-time
   order updates with full bidirectional chat,
   menu versioning, and manager comms.

   Socket.IO Event Map:
   - join_table       Customer → Server
   - menu_update      Manager → All Customers
   - place_order      Customer → Kitchen/Manager
   - update_status    Kitchen → Customer/Manager
   - order_instruction Customer → Kitchen
   - kitchen_shout    Kitchen → Customer
   - manager_alert    Kitchen → Manager
   - workload_sync    Engine → Everyone (60s)
   ============================================ */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const seedDatabase = require('./seed');
const Restaurant = require('./models/Restaurant');
const { calculateKitchenLoad } = require('./utils/workloadEngine');

// Import routes
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const managerRoutes = require('./routes/manager');
const inventoryRoutes = require('./routes/inventory');
const internalCommRoutes = require('./routes/internalComm');

// Initialize Express app
const app = express();
const server = http.createServer(app);

/* ---- Socket.IO Setup ---- */
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173', 
      'http://localhost:3000', 
      'https://spice-route-front-end.vercel.app',
      'https://spice-route-front-end.vercel.app/' // Sometimes trailing slash causes issues, good to have both or use regex, but exact match is fine
    ],
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  }
});

// Make io accessible to route handlers
app.set('io', io);

/* ---- Middleware ---- */
const allowedOrigins = [
  'http://localhost:5173', 
  'http://localhost:3000', 
  'https://spice-route-front-end.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow if no origin (like mobile apps/curl) or if it's from localhost or vercel
    if (!origin || 
        allowedOrigins.some(o => origin.startsWith(o)) || 
        origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---- API Routes ---- */
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/comms', internalCommRoutes);

/* ---- Health Check Endpoint ---- */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'SpiceRoute API v2',
    timestamp: new Date().toISOString()
  });
});

/* ---- Socket.IO Connection Handler ---- */
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  /* -- Room Joins -- */

  // Customer joins a restaurant-level room
  socket.on('joinRestaurant', (restaurantId) => {
    socket.join(`restaurant:${restaurantId}`);
    console.log(`📡 Socket ${socket.id} joined restaurant: ${restaurantId}`);
  });

  // Customer joins their specific table room (for menu_update events)
  socket.on('join_table', ({ restaurantId, tableNumber }) => {
    socket.join(`table:${restaurantId}:${tableNumber}`);
    console.log(`🪑 Socket ${socket.id} joined table: ${restaurantId}/${tableNumber}`);
  });

  // Customer joins order-specific room for tracking
  socket.on('trackOrder', (tokenNumber) => {
    socket.join(`order:${tokenNumber}`);
    console.log(`📡 Socket ${socket.id} tracking order: ${tokenNumber}`);
  });

  // Kitchen staff joins kitchen room
  socket.on('joinKitchen', (restaurantId) => {
    socket.join(`kitchen:${restaurantId}`);
    console.log(`👨‍🍳 Socket ${socket.id} joined kitchen: ${restaurantId}`);
  });

  // Manager joins manager room for alerts
  socket.on('joinManager', (restaurantId) => {
    socket.join(`manager:${restaurantId}`);
    console.log(`👔 Socket ${socket.id} joined manager: ${restaurantId}`);
  });

  /* -- Bidirectional Order Chat -- */

  // Customer sends instruction to kitchen (e.g. "extra spicy")
  // The controller persists this; socket just relays instantly
  socket.on('order_instruction', ({ restaurantId, tokenNumber, orderId, message, sender }) => {
    const payload = { orderId, tokenNumber, message, sender, role: 'customer', timestamp: new Date() };
    // Relay to kitchen room immediately
    io.to(`kitchen:${restaurantId}`).emit('order_instruction', payload);
    // Also relay to manager for Global Log
    io.to(`manager:${restaurantId}`).emit('order_instruction', payload);
    console.log(`💬 Customer instruction for order ${tokenNumber}: ${message}`);
  });

  // Kitchen sends shout to customer (e.g. "5 min delay")
  socket.on('kitchen_shout', ({ restaurantId, tokenNumber, orderId, message, senderName }) => {
    const payload = { orderId, tokenNumber, message, senderName, role: 'kitchen', timestamp: new Date() };
    // Relay to the specific customer tracking that order
    io.to(`order:${tokenNumber}`).emit('kitchen_shout', payload);
    // Also relay to manager for Global Log
    io.to(`manager:${restaurantId}`).emit('kitchen_shout', payload);
    console.log(`📢 Kitchen shout for order ${tokenNumber}: ${message}`);
  });

  // Kitchen sends alert to manager (e.g. "Low on Chicken")
  socket.on('manager_alert', ({ restaurantId, message, type, senderName, orderId }) => {
    const payload = { message, type: type || 'alert', senderName, restaurantId, orderId, timestamp: new Date() };
    io.to(`manager:${restaurantId}`).emit('manager_alert', payload);
    console.log(`🚨 Manager alert from kitchen: ${message}`);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

/* ---- Workload Sync Broadcast (every 60s) ---- */
// Broadcasts kitchen pulse to all connected clients
setInterval(async () => {
  try {
    const restaurants = await Restaurant.find({}, '_id').lean();
    for (const r of restaurants) {
      const loadData = await calculateKitchenLoad(r._id);
      io.to(`restaurant:${r._id}`).emit('workload_sync', {
        restaurantId: r._id,
        loadLevel: loadData.loadLevel,
        loadPercentage: loadData.loadPercentage,
        activeOrders: loadData.activeOrders,
        timestamp: new Date()
      });
    }
  } catch (err) {
    console.error('Workload sync error:', err.message);
  }
}, 60000);

/* ---- Start Server ---- */
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  try {
    const count = await Restaurant.countDocuments();
    if (count === 0) {
      console.log('📦 Empty database detected. Seeding initial data...');
      await seedDatabase();
    }
  } catch (err) {
    console.log('⚠️ Error checking database count:', err.message);
  }

  server.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════╗
    ║                                          ║
    ║   🍛 SpiceRoute Server v2 Running        ║
    ║   📡 Port: ${PORT}                        ║
    ║   🔌 Socket.IO: Enabled (6 events)       ║
    ║   🗄️  MongoDB: Connected                  ║
    ║   💬 Bidirectional Chat: Active          ║
    ║                                          ║
    ╚══════════════════════════════════════════╝
    `);
  });
};

startServer().catch(console.error);
