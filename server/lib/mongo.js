const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB; // אופציונלי אם לא ב-URI
let client;
let isConnected = false;

async function getDb() {
  try {
    if (!client) {
      client = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
    }
    
    if (!isConnected) {
      await client.connect();
      isConnected = true;
      console.log('✅ Connected to MongoDB');
    }
    
    const db = client.db(dbName || undefined);
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    isConnected = false;
    throw error;
  }
}

// Graceful shutdown
async function closeConnection() {
  if (client && isConnected) {
    await client.close();
    isConnected = false;
    console.log('✅ MongoDB connection closed');
  }
}

// Handle process termination
process.on('SIGINT', closeConnection);
process.on('SIGTERM', closeConnection);

module.exports = { getDb, closeConnection };
