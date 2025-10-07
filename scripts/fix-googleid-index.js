const mongoose = require('mongoose');
require('dotenv').config();

async function fixGoogleIdIndex() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('users');

        // Drop the existing unique index on googleId
        try {
            await collection.dropIndex('googleId_1');
            console.log('✅ Dropped existing googleId_1 index');
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

        // Verify the index was created
        const indexes = await collection.indexes();
        console.log('📋 Current indexes:');
        indexes.forEach(index => {
            console.log(`  - ${index.name}: ${JSON.stringify(index.key)} (unique: ${index.unique}, sparse: ${index.sparse})`);
        });

        console.log('✅ Index fix completed successfully!');

    } catch (error) {
        console.error('❌ Error fixing googleId index:', error);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    }
}

fixGoogleIdIndex();
