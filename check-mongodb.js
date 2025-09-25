const { MongoClient, ObjectId } = require('mongodb');

const uri = "mongodb+srv://choco_db_user:g4gDnTJh7GO2DHpY@cluster0.rtburip.mongodb.net/contractor-crm?retryWrites=true&w=majority&appName=Cluster0&ssl=true&tls=true&tlsAllowInvalidCertificates=false";

async function checkMongoDB() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('contractor-crm');
    const collection = db.collection('projects');
    
    // Find the specific project
    const project = await collection.findOne({ _id: new ObjectId('68bd7488690387dac0eb69c0') });
    
    if (project) {
      console.log('📊 Project found:');
      console.log('  - garmoshka:', JSON.stringify(project.garmoshka, null, 2));
      console.log('  - garmoshkaFile:', project.garmoshkaFile);
      console.log('  - garmoshkaFileCreationDate:', project.garmoshkaFileCreationDate);
      console.log('  - siteOrganizationPlan:', JSON.stringify(project.siteOrganizationPlan, null, 2));
    } else {
      console.log('❌ Project not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkMongoDB();
