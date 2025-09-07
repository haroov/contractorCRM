const { MongoClient, ObjectId } = require('mongodb');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://liav:liav123@cluster0.rtburip.mongodb.net/contractor-crm?retryWrites=true&w=majority';

async function fixMainContractorField() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('contractor-crm');
        const contractorsCollection = db.collection('contractors');
        const projectsCollection = db.collection('projects');
        
        // Get all contractors to create a mapping from contractor_id to _id
        const contractors = await contractorsCollection.find({}).toArray();
        const contractorMapping = {};
        
        contractors.forEach(contractor => {
            contractorMapping[contractor.contractor_id] = contractor._id.toString();
        });
        
        console.log('Contractor mapping:', contractorMapping);
        
        // Get all projects that need fixing
        const projects = await projectsCollection.find({
            mainContractor: { $type: "string" } // Find projects where mainContractor is a string (contractor_id)
        }).toArray();
        
        console.log(`Found ${projects.length} projects to fix`);
        
        // Update each project
        for (const project of projects) {
            const contractorId = project.mainContractor;
            const contractorObjectId = contractorMapping[contractorId];
            
            if (contractorObjectId) {
                console.log(`Updating project ${project.projectName} (${project._id}):`);
                console.log(`  - mainContractor: "${contractorId}" -> "${contractorObjectId}"`);
                
                const result = await projectsCollection.updateOne(
                    { _id: project._id },
                    { 
                        $set: { 
                            mainContractor: contractorObjectId,
                            updatedAt: new Date()
                        } 
                    }
                );
                
                console.log(`  - Update result: ${result.modifiedCount} document(s) modified`);
            } else {
                console.log(`Warning: No contractor found for contractor_id: ${contractorId}`);
            }
        }
        
        console.log('✅ MainContractor field fix completed!');
        
    } catch (error) {
        console.error('❌ Error fixing mainContractor field:', error);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

// Run the fix
fixMainContractorField();
