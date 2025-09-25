const { MongoClient, ObjectId } = require('mongodb');

const uri = "mongodb+srv://choco_db_user:g4gDnTJh7GO2DHpY@cluster0.rtburip.mongodb.net/contractor-crm?retryWrites=true&w=majority&appName=Cluster0&ssl=true&tls=true&tlsAllowInvalidCertificates=false";

async function cleanupDuplicateFields() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('contractor-crm');
    const collection = db.collection('projects');
    
    // Find all projects with garmoshkaFile field
    const projects = await collection.find({ garmoshkaFile: { $exists: true } }).toArray();
    console.log(`📊 Found ${projects.length} projects with garmoshkaFile field`);
    
    for (const project of projects) {
      console.log(`\n🔍 Processing project: ${project._id}`);
      console.log('  📁 garmoshkaFile:', project.garmoshkaFile);
      console.log('  📁 garmoshka.file:', project.garmoshka?.file);
      
      // Remove the duplicate garmoshkaFile field
      const result = await collection.updateOne(
        { _id: project._id },
        { $unset: { garmoshkaFile: 1 } }
      );
      
      console.log(`  ✅ Removed garmoshkaFile field: ${result.modifiedCount} document(s) modified`);
    }
    
    console.log('\n🎉 Cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

cleanupDuplicateFields();
