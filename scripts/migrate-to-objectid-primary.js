#!/usr/bin/env node

/**
 * Migration script to standardize on ObjectId as primary identifier
 * 
 * This script:
 * 1. Updates project references to use contractor ObjectId instead of contractor_id
 * 2. Ensures all contractor lookups use _id as primary identifier
 * 3. Maintains backward compatibility with external identifiers
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/contractor-crm';

async function migrateToObjectIdPrimary() {
    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        console.log('🔗 Connected to MongoDB');

        const db = client.db('contractor-crm');
        const contractorsCollection = db.collection('contractors');
        const projectsCollection = db.collection('projects');

        // Step 1: Get all contractors
        console.log('📋 Fetching all contractors...');
        const contractors = await contractorsCollection.find({}).toArray();
        console.log(`✅ Found ${contractors.length} contractors`);

        // Step 2: Create a mapping from contractor_id to ObjectId
        const contractorIdToObjectId = new Map();
        const companyIdToObjectId = new Map();

        for (const contractor of contractors) {
            if (contractor.contractor_id) {
                contractorIdToObjectId.set(contractor.contractor_id, contractor._id.toString());
            }
            if (contractor.companyId || contractor.company_id) {
                const companyId = contractor.companyId || contractor.company_id;
                companyIdToObjectId.set(companyId, contractor._id.toString());
            }
        }

        console.log(`📊 Created mapping for ${contractorIdToObjectId.size} contractor_ids`);
        console.log(`📊 Created mapping for ${companyIdToObjectId.size} company_ids`);

        // Step 3: Update projects to use ObjectId references
        console.log('🔄 Updating project contractor references...');
        const projects = await projectsCollection.find({}).toArray();
        let updatedProjects = 0;

        for (const project of projects) {
            let needsUpdate = false;
            const updateFields = {};

            // Update contractorId field if it references contractor_id instead of ObjectId
            if (project.contractorId && !ObjectId.isValid(project.contractorId)) {
                const objectId = contractorIdToObjectId.get(project.contractorId);
                if (objectId) {
                    updateFields.contractorId = objectId;
                    updateFields.contractorRegistryId = project.contractorId; // Keep original for reference
                    needsUpdate = true;
                    console.log(`🔄 Project ${project.projectName}: contractorId ${project.contractorId} -> ${objectId}`);
                }
            }

            // Update mainContractor field if it references contractor_id instead of ObjectId
            if (project.mainContractor && !ObjectId.isValid(project.mainContractor)) {
                const objectId = contractorIdToObjectId.get(project.mainContractor);
                if (objectId) {
                    updateFields.mainContractor = objectId;
                    updateFields.mainContractorRegistryId = project.mainContractor; // Keep original for reference
                    needsUpdate = true;
                    console.log(`🔄 Project ${project.projectName}: mainContractor ${project.mainContractor} -> ${objectId}`);
                }
            }

            if (needsUpdate) {
                await projectsCollection.updateOne(
                    { _id: project._id },
                    { $set: updateFields }
                );
                updatedProjects++;
            }
        }

        console.log(`✅ Updated ${updatedProjects} projects`);

        // Step 4: Update contractor projectIds to use ObjectId references
        console.log('🔄 Updating contractor projectIds references...');
        let updatedContractors = 0;

        for (const contractor of contractors) {
            if (contractor.projectIds && contractor.projectIds.length > 0) {
                const updatedProjectIds = contractor.projectIds.map(projectId => {
                    // If it's already an ObjectId, keep it
                    if (ObjectId.isValid(projectId)) {
                        return projectId;
                    }
                    // If it's a string, try to convert to ObjectId
                    try {
                        return new ObjectId(projectId);
                    } catch (error) {
                        console.warn(`⚠️ Invalid projectId in contractor ${contractor.name}: ${projectId}`);
                        return projectId; // Keep as is if conversion fails
                    }
                });

                // Only update if there were changes
                if (JSON.stringify(updatedProjectIds) !== JSON.stringify(contractor.projectIds)) {
                    await contractorsCollection.updateOne(
                        { _id: contractor._id },
                        { $set: { projectIds: updatedProjectIds } }
                    );
                    updatedContractors++;
                    console.log(`🔄 Contractor ${contractor.name}: updated projectIds`);
                }
            }
        }

        console.log(`✅ Updated ${updatedContractors} contractors`);

        // Step 5: Add indexes for better performance
        console.log('📊 Creating indexes...');
        try {
            await contractorsCollection.createIndex({ contractor_id: 1 }, { sparse: true });
            await contractorsCollection.createIndex({ companyId: 1 }, { sparse: true });
            await projectsCollection.createIndex({ contractorId: 1 });
            await projectsCollection.createIndex({ mainContractor: 1 });
            console.log('✅ Indexes created successfully');
        } catch (error) {
            console.log('ℹ️ Some indexes may already exist:', error.message);
        }

        // Step 6: Summary
        console.log('\n📊 Migration Summary:');
        console.log(`- Contractors processed: ${contractors.length}`);
        console.log(`- Projects updated: ${updatedProjects}`);
        console.log(`- Contractors updated: ${updatedContractors}`);
        console.log(`- contractor_id mappings: ${contractorIdToObjectId.size}`);
        console.log(`- companyId mappings: ${companyIdToObjectId.size}`);

        console.log('\n✅ Migration completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('1. Test the application to ensure all contractor lookups work correctly');
        console.log('2. Verify that projects are properly linked to contractors');
        console.log('3. Check that external identifiers (contractor_id, companyId) are still displayed correctly');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await client.close();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateToObjectIdPrimary()
        .then(() => {
            console.log('🎉 Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateToObjectIdPrimary };

