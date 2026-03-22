/* ============================================
   SpiceRoute - Database Connection Configuration
   Connects to MongoDB using Mongoose ODM
   ============================================ */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI;
    
    try {
      const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return;
    } catch (e) {
      console.log(`⚠️ Primary MongoDB Connection Failed: ${e.message}`);
      console.log('🔄 Spinning up in-memory MongoDB server for testing...');
      
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
      const conn = await mongoose.connect(uri);
      console.log(`✅ In-Memory MongoDB Connected: ${conn.connection.host}`);
    }
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
