const { MongoClient } = require('mongodb');

// Load environment variables
require('dotenv').config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI;

async function migrateFieldNames() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('contractor-crm');
        const contractorsCollection = db.collection('contractors');
        
        // Get all contractors
        const contractors = await contractorsCollection.find({}).toArray();
        console.log(`Found ${contractors.length} contractors to migrate`);
        
        let updatedCount = 0;
        
        for (const contractor of contractors) {
            const updateFields = {};
            let needsUpdate = false;
            
            // Check if contractor_id exists and needs to be renamed to contractorId
            if (contractor.contractor_id && !contractor.contractorId) {
                updateFields.contractorId = contractor.contractor_id;
                needsUpdate = true;
            }
            
            // Check if company_id exists and needs to be renamed to companyId
            if (contractor.company_id && !contractor.companyId) {
                updateFields.companyId = contractor.company_id;
                needsUpdate = true;
            }
            
            if (needsUpdate) {
                // Remove old fields
                const unsetFields = {};
                if (contractor.contractor_id && !contractor.contractorId) {
                    unsetFields.contractor_id = "";
                }
                if (contractor.company_id && !contractor.companyId) {
                    unsetFields.company_id = "";
                }
                
                await contractorsCollection.updateOne(
                    { _id: contractor._id },
                    { 
                        $set: updateFields,
                        $unset: unsetFields
                    }
                );
                
                updatedCount++;
                console.log(`Updated contractor ${contractor._id}: ${JSON.stringify(updateFields)}`);
            }
        }
        
        console.log(`Migration completed. Updated ${updatedCount} contractors.`);
        
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

async function updateIndexes() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB for index update');
        
        const db = client.db('contractor-crm');
        const contractorsCollection = db.collection('contractors');
        
        // Update indexes
        console.log('Updating indexes...');
        
        try {
            // Drop old indexes
            await contractorsCollection.dropIndex('contractor_id_1');
            console.log('Dropped old contractor_id index');
        } catch (error) {
            console.log('contractor_id index not found or already dropped');
        }
        
        try {
            await contractorsCollection.dropIndex('company_id_1');
            console.log('Dropped old company_id index');
        } catch (error) {
            console.log('company_id index not found or already dropped');
        }
        
        // Create new indexes
        await contractorsCollection.createIndex({ contractorId: 1 }, { unique: true });
        console.log('Created new contractorId index');
        
        await contractorsCollection.createIndex({ companyId: 1 }, { unique: true });
        console.log('Created new companyId index');
        
        console.log('Index migration completed successfully!');
        
    } catch (error) {
        console.error('Index update failed:', error);
        throw error;
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

// Run migration if this script is executed directly
if (require.main === module) {
    // First drop old indexes to avoid duplicate key errors
    updateIndexes()
        .then(() => {
            console.log('Indexes updated, now running data migration...');
            return migrateFieldNames();
        })
        .then(() => {
            console.log('Migration completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateFieldNames };
