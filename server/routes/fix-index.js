const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Route to fix the googleId index
router.post('/fix-googleid-index', async (req, res) => {
  try {
    console.log('🔧 Starting googleId index fix...');
    
    const db = mongoose.connection.db;
    const collection = db.collection('users');

    // Get current indexes
    const indexes = await collection.indexes();
    console.log('📋 Current indexes:', indexes.map(idx => ({
      name: idx.name,
      key: idx.key,
      unique: idx.unique,
      sparse: idx.sparse
    })));

    // Drop the problematic googleId_1 index if it exists
    try {
      await collection.dropIndex('googleId_1');
      console.log('✅ Dropped googleId_1 index');
    } catch (error) {
      console.log('ℹ️  googleId_1 index not found or already dropped:', error.message);
    }

    // Create a new sparse index on googleId (allows multiple null values)
    await collection.createIndex({ googleId: 1 }, { 
      unique: false, 
      sparse: true,
      name: 'googleId_1_sparse'
    });
    console.log('✅ Created new sparse index on googleId');

    // Verify the fix
    const newIndexes = await collection.indexes();
    console.log('📋 New indexes:', newIndexes.map(idx => ({
      name: idx.name,
      key: idx.key,
      unique: idx.unique,
      sparse: idx.sparse
    })));

    res.json({
      success: true,
      message: 'googleId index fixed successfully',
      indexes: newIndexes.map(idx => ({
        name: idx.name,
        key: idx.key,
        unique: idx.unique,
        sparse: idx.sparse
      }))
    });

  } catch (error) {
    console.error('❌ Error fixing googleId index:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
