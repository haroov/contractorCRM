#!/usr/bin/env node

/**
 * Script to remove duplicate garmoshkaFileCreationDate fields from MongoDB
 * 
 * This script removes the duplicate garmoshkaFileCreationDate field from the root level
 * of projects, keeping only the nested version in engineeringQuestionnaire.buildingPlan
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/contractor-crm';

async function removeDuplicateGarmoshkaFields() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('🔗 Connected to MongoDB');

        const db = client.db('contractor-crm');
        const projectsCollection = db.collection('projects');

        console.log('🔍 Finding projects with duplicate garmoshkaFileCreationDate fields...');

        // Find projects that have both root-level and nested garmoshkaFileCreationDate
        const projectsWithDuplicates = await projectsCollection.find({
            $and: [
                { garmoshkaFileCreationDate: { $exists: true } },
                { 'engineeringQuestionnaire.buildingPlan.garmoshkaFileCreationDate': { $exists: true } }
            ]
        }).toArray();

        console.log(`📊 Found ${projectsWithDuplicates.length} projects with duplicate garmoshkaFileCreationDate fields`);

        if (projectsWithDuplicates.length === 0) {
            console.log('✅ No duplicate fields found');
            return;
        }

        // Remove the root-level garmoshkaFileCreationDate field from all projects
        console.log('🗑️ Removing duplicate garmoshkaFileCreationDate fields...');
        
        const result = await projectsCollection.updateMany(
            { garmoshkaFileCreationDate: { $exists: true } },
            { $unset: { garmoshkaFileCreationDate: "" } }
        );

        console.log(`✅ Removed duplicate garmoshkaFileCreationDate from ${result.modifiedCount} projects`);

        // Also remove any other duplicate garmoshka fields if they exist
        console.log('🔍 Checking for other duplicate garmoshka fields...');
        
        const garmoshkaFieldsToRemove = [
            'garmoshkaFile',
            'garmoshkaThumbnailUrl',
            'garmoshkaFileCreationDate'
        ];

        for (const field of garmoshkaFieldsToRemove) {
            const fieldResult = await projectsCollection.updateMany(
                { [field]: { $exists: true } },
                { $unset: { [field]: "" } }
            );
            
            if (fieldResult.modifiedCount > 0) {
                console.log(`✅ Removed duplicate ${field} from ${fieldResult.modifiedCount} projects`);
            }
        }

        console.log('🎉 Cleanup completed successfully!');

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    } finally {
        await client.close();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the script
if (require.main === module) {
    removeDuplicateGarmoshkaFields()
        .then(() => {
            console.log('✅ Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script failed:', error);
            process.exit(1);
        });
}

module.exports = { removeDuplicateGarmoshkaFields };
