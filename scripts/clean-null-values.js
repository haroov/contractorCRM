const { MongoClient } = require('mongodb');

// Load environment variables
require('dotenv').config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI;

async function cleanNullValues() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('contractor-crm');
        const contractorsCollection = db.collection('contractors');
        
        // Find documents with null values in company_id or contractor_id
        const nullCompanyIdDocs = await contractorsCollection.find({ company_id: null }).toArray();
        const nullContractorIdDocs = await contractorsCollection.find({ contractor_id: null }).toArray();
        
        console.log(`Found ${nullCompanyIdDocs.length} documents with null company_id`);
        console.log(`Found ${nullContractorIdDocs.length} documents with null contractor_id`);
        
        // Remove null values
        if (nullCompanyIdDocs.length > 0) {
            await contractorsCollection.updateMany(
                { company_id: null },
                { $unset: { company_id: "" } }
            );
            console.log('Removed null company_id values');
        }
        
        if (nullContractorIdDocs.length > 0) {
            await contractorsCollection.updateMany(
                { contractor_id: null },
                { $unset: { contractor_id: "" } }
            );
            console.log('Removed null contractor_id values');
        }
        
        console.log('Null values cleanup completed!');
        
    } catch (error) {
        console.error('Cleanup failed:', error);
        throw error;
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
    cleanNullValues()
        .then(() => {
            console.log('Cleanup completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Cleanup failed:', error);
            process.exit(1);
        });
}

module.exports = { cleanNullValues };
