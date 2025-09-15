const { MongoClient } = require('mongodb');

// Load environment variables
require('dotenv').config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI;

async function simpleMigration() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('contractor-crm');
        const contractorsCollection = db.collection('contractors');
        
        // Find contractors that still have old field names
        const contractorsToMigrate = await contractorsCollection.find({
            $and: [
                { contractor_id: { $exists: true, $ne: null } },
                { contractorId: { $exists: false } }
            ]
        }).toArray();
        
        console.log(`Found ${contractorsToMigrate.length} contractors to migrate`);
        
        let updatedCount = 0;
        
        for (const contractor of contractorsToMigrate) {
            const updateFields = {};
            
            // Add new field names
            if (contractor.contractor_id) {
                updateFields.contractorId = contractor.contractor_id;
            }
            if (contractor.company_id) {
                updateFields.companyId = contractor.company_id;
            }
            
            // Remove old fields
            const unsetFields = {};
            if (contractor.contractor_id) {
                unsetFields.contractor_id = "";
            }
            if (contractor.company_id) {
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
        
        console.log(`Migration completed. Updated ${updatedCount} contractors.`);
        
        // Now create indexes
        console.log('Creating indexes...');
        
        try {
            await contractorsCollection.createIndex({ contractorId: 1 }, { unique: true, sparse: true });
            console.log('Created contractorId index');
        } catch (error) {
            console.log('contractorId index already exists or failed:', error.message);
        }
        
        try {
            await contractorsCollection.createIndex({ companyId: 1 }, { unique: true, sparse: true });
            console.log('Created companyId index');
        } catch (error) {
            console.log('companyId index already exists or failed:', error.message);
        }
        
        console.log('Migration completed successfully!');
        
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

// Run migration if this script is executed directly
if (require.main === module) {
    simpleMigration()
        .then(() => {
            console.log('Migration completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { simpleMigration };
