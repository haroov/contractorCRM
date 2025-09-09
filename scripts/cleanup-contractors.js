const { MongoClient } = require('mongodb');

async function cleanupContractors() {
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/contractor-crm');
    
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');
        
        const db = client.db('contractor-crm');
        const contractorsCollection = db.collection('contractors');
        
        // Get all contractors
        const allContractors = await contractorsCollection.find({}).toArray();
        console.log(`📊 Found ${allContractors.length} contractors in database`);
        
        // Find contractors without names or with empty names
        const invalidContractors = allContractors.filter(contractor => 
            !contractor.name || 
            contractor.name.trim() === '' || 
            contractor.name === 'undefined' ||
            contractor.name === 'null'
        );
        
        console.log(`🗑️ Found ${invalidContractors.length} invalid contractors to delete:`);
        invalidContractors.forEach(contractor => {
            console.log(`  - ID: ${contractor._id}, Name: "${contractor.name}", Company ID: ${contractor.company_id}`);
        });
        
        if (invalidContractors.length > 0) {
            // Delete invalid contractors
            const deleteResult = await contractorsCollection.deleteMany({
                _id: { $in: invalidContractors.map(c => c._id) }
            });
            
            console.log(`✅ Deleted ${deleteResult.deletedCount} invalid contractors`);
        }
        
        // Get remaining contractors
        const remainingContractors = await contractorsCollection.find({}).toArray();
        console.log(`📊 Remaining contractors: ${remainingContractors.length}`);
        
        // Show remaining contractors
        remainingContractors.forEach((contractor, index) => {
            console.log(`${index + 1}. ${contractor.name} (${contractor.company_id})`);
        });
        
        // If we have more than 15 contractors, keep only the first 15
        if (remainingContractors.length > 15) {
            console.log(`⚠️ More than 15 contractors found. Keeping only the first 15.`);
            
            const contractorsToDelete = remainingContractors.slice(15);
            const deleteResult = await contractorsCollection.deleteMany({
                _id: { $in: contractorsToDelete.map(c => c._id) }
            });
            
            console.log(`✅ Deleted ${deleteResult.deletedCount} excess contractors`);
            
            // Show final contractors
            const finalContractors = await contractorsCollection.find({}).toArray();
            console.log(`📊 Final contractors count: ${finalContractors.length}`);
            finalContractors.forEach((contractor, index) => {
                console.log(`${index + 1}. ${contractor.name} (${contractor.company_id})`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error cleaning up contractors:', error);
    } finally {
        await client.close();
        console.log('✅ Database connection closed');
    }
}

// Run the cleanup
cleanupContractors();
