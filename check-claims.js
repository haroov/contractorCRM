const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://choco_db_user:g4gDnTJh7GO2DHpY@cluster0.rtburip.mongodb.net/contractor-crm?retryWrites=true&w=majority';

async function checkClaims() {
    const client = new MongoClient(MONGODB_URI);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('contractor-crm');
        const claimsCollection = db.collection('claims');
        
        // Find all claims for the project
        const projectId = '68bd7488690387dac0eb69c0';
        const claims = await claimsCollection.find({ projectId }).toArray();
        
        console.log('Claims for project:', projectId);
        console.log('Number of claims:', claims.length);
        
        claims.forEach((claim, index) => {
            console.log(`Claim ${index + 1}:`);
            console.log('  _id:', claim._id.toString());
            console.log('  description:', claim.description);
            console.log('  createdAt:', claim.createdAt);
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkClaims();
