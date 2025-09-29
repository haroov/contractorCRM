const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://choco_db_user:g4gDnTJh7GO2DHpY@cluster0.rtburip.mongodb.net/contractor-crm?retryWrites=true&w=majority';

async function checkProject() {
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
        
        console.log('Project claimsId:', project.claimsId);
        console.log('Type:', typeof project.claimsId);
        console.log('Is Array:', Array.isArray(project.claimsId));
        console.log('Length:', project.claimsId ? project.claimsId.length : 'N/A');
        
        if (Array.isArray(project.claimsId)) {
            console.log('Array contents:', project.claimsId);
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

// Import ObjectId
const { ObjectId } = require('mongodb');

checkProject();
