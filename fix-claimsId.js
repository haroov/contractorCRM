const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://choco_db_user:g4gDnTJh7GO2DHpY@cluster0.rtburip.mongodb.net/contractor-crm?retryWrites=true&w=majority';

async function fixClaimsId() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('contractor-crm');
        const projectsCollection = db.collection('projects');
        
        // Find the project with the specific ID
        const projectId = '68bd7488690387dac0eb69c0';
        const project = await projectsCollection.findOne({ _id: new ObjectId(projectId) });
        
        if (!project) {
            console.log('Project not found');
            return;
        }
        
        console.log('Current project claimsId:', project.claimsId);
        console.log('Type:', typeof project.claimsId);
        
        // Convert string to array if needed
        let claimsIdArray = [];
        if (project.claimsId) {
            if (Array.isArray(project.claimsId)) {
                claimsIdArray = project.claimsId;
            } else if (typeof project.claimsId === 'string' && project.claimsId.trim() !== '') {
                claimsIdArray = [project.claimsId];
            }
        }
        
        console.log('New claimsId array:', claimsIdArray);
        
        // Update the project
        const result = await projectsCollection.updateOne(
            { _id: new ObjectId(projectId) },
            { $set: { claimsId: claimsIdArray } }
        );
        
        console.log('Update result:', result);
        console.log('✅ Fixed claimsId for project:', projectId);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

// Import ObjectId
const { ObjectId } = require('mongodb');

fixClaimsId();
