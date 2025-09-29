const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://choco_db_user:g4gDnTJh7GO2DHpY@cluster0.rtburip.mongodb.net/contractor-crm?retryWrites=true&w=majority';

async function fixClaimProjectLink() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('contractor-crm');
        const claimsCollection = db.collection('claims');
        const projectsCollection = db.collection('projects');
        
        // Find the new claim
        const claimId = '68da611b7dcd67209a9113bc';
        const claim = await claimsCollection.findOne({ _id: new ObjectId(claimId) });
        
        if (!claim) {
            console.log('Claim not found');
            return;
        }
        
        console.log('Found claim:', claim);
        console.log('Claim projectId:', claim.projectId);
        
        // Find the project we want to link it to
        const targetProjectId = '68bd7488690387dac0eb69c0';
        const project = await projectsCollection.findOne({ _id: new ObjectId(targetProjectId) });
        
        if (!project) {
            console.log('Target project not found');
            return;
        }
        
        console.log('Found target project:', project.projectName);
        console.log('Current claimsId:', project.claimsId);
        
        // Update the claim to point to the correct project
        await claimsCollection.updateOne(
            { _id: new ObjectId(claimId) },
            { 
                $set: { 
                    projectId: targetProjectId,
                    projectName: project.projectName || 'אכזיב 3001'
                }
            }
        );
        
        console.log('✅ Updated claim to point to correct project');
        
        // Add claim ID to project's claimsId array
        let claimsIdArray = [];
        if (project.claimsId) {
            if (Array.isArray(project.claimsId)) {
                claimsIdArray = project.claimsId;
            } else if (typeof project.claimsId === 'string' && project.claimsId.trim() !== '') {
                claimsIdArray = [project.claimsId];
            }
        }
        
        // Add the new claim ID if it's not already in the array
        if (!claimsIdArray.includes(claimId)) {
            claimsIdArray.push(claimId);
        }
        
        // Update the project with the claimsId array
        await projectsCollection.updateOne(
            { _id: new ObjectId(targetProjectId) },
            { $set: { claimsId: claimsIdArray } }
        );
        
        console.log('✅ Updated project with claimsId array:', claimsIdArray);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

// Import ObjectId
const { ObjectId } = require('mongodb');

fixClaimProjectLink();
