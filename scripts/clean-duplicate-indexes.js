#!/usr/bin/env node

/**
 * Script to clean duplicate indexes from MongoDB
 * This script removes the manually created indexes that are duplicates of unique indexes
 */

const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config();

async function cleanDuplicateIndexes() {
    try {
        console.log('🔗 Connecting to MongoDB...');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/contractor-crm');
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const contractorsCollection = db.collection('contractors');

        console.log('🔍 Checking current indexes...');

        // Get current indexes
        const indexes = await contractorsCollection.indexes();
        console.log('Current indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key })));

        // Find duplicate indexes
        const duplicateIndexes = [];

        for (const index of indexes) {
            // Skip the default _id index
            if (index.name === '_id_') continue;

            // Check for contractorId index that's not the unique one
            if (JSON.stringify(index.key) === '{"contractorId":1}' && !index.unique) {
                duplicateIndexes.push(index.name);
            }

            // Check for companyId index that's not the unique one
            if (JSON.stringify(index.key) === '{"companyId":1}' && !index.unique) {
                duplicateIndexes.push(index.name);
            }
        }

        if (duplicateIndexes.length === 0) {
            console.log('✅ No duplicate indexes found');
        } else {
            console.log('🗑️  Found duplicate indexes:', duplicateIndexes);

            // Drop duplicate indexes
            for (const indexName of duplicateIndexes) {
                try {
                    await contractorsCollection.dropIndex(indexName);
                    console.log(`✅ Dropped duplicate index: ${indexName}`);
                } catch (error) {
                    console.log(`⚠️  Could not drop index ${indexName}:`, error.message);
                }
            }
        }

        console.log('🔍 Final indexes after cleanup:');
        const finalIndexes = await contractorsCollection.indexes();
        console.log(finalIndexes.map(idx => ({ name: idx.name, key: idx.key, unique: idx.unique })));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the script
cleanDuplicateIndexes();
