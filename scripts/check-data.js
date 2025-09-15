const { MongoClient } = require('mongodb');

// Load environment variables
require('dotenv').config();

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI;

async function checkData() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('contractor-crm');
        const contractorsCollection = db.collection('contractors');
        
        // Check all contractors
        const contractors = await contractorsCollection.find({}).toArray();
        console.log(`Found ${contractors.length} contractors`);
        
        for (const contractor of contractors) {
            console.log(`Contractor ${contractor._id}:`);
            console.log(`  contractor_id: ${contractor.contractor_id}`);
            console.log(`  contractorId: ${contractor.contractorId}`);
            console.log(`  company_id: ${contractor.company_id}`);
            console.log(`  companyId: ${contractor.companyId}`);
            console.log('---');
        }
        
    } catch (error) {
        console.error('Check failed:', error);
        throw error;
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

// Run check if this script is executed directly
if (require.main === module) {
    checkData()
        .then(() => {
            console.log('Check completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Check failed:', error);
            process.exit(1);
        });
}

module.exports = { checkData };
