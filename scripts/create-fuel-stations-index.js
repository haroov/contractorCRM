const { MongoClient } = require('mongodb');

/**
 * Script to create a 2dsphere spatial index on the fuelStation collection
 * This is required for efficient $geoNear queries
 */

async function createFuelStationsIndex() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/contractor-crm';
  const client = new MongoClient(mongoUri);

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    // Connect to the GIS database
    const gisDb = client.db('GIS');
    const fuelStationCollection = gisDb.collection('fuelStation');

    console.log('🔍 Checking existing indexes on fuelStation collection...');
    const existingIndexes = await fuelStationCollection.indexes();
    console.log('📋 Existing indexes:', existingIndexes.map(idx => idx.name));

    // Check if 2dsphere index already exists
    const has2dsphereIndex = existingIndexes.some(index => 
      index.key && index.key.geometry === '2dsphere'
    );

    if (has2dsphereIndex) {
      console.log('✅ 2dsphere index already exists on fuelStation collection');
    } else {
      console.log('🔨 Creating 2dsphere index on fuelStation collection...');
      
      // Create 2dsphere index on geometry field
      const result = await fuelStationCollection.createIndex(
        { geometry: '2dsphere' },
        { 
          name: 'geometry_2dsphere',
          background: true // Create index in background to avoid blocking operations
        }
      );
      
      console.log('✅ Successfully created 2dsphere index:', result);
    }

    // Test the index with a sample query
    console.log('🧪 Testing the index with a sample query...');
    const testPipeline = [
      {
        $geoNear: {
          near: { type: "Point", coordinates: [35.102275, 33.04187] }, // Test coordinates
          key: "geometry",
          spherical: true,
          distanceField: "distanceKM",
          distanceMultiplier: 0.001
        }
      },
      { $limit: 1 },
      {
        $project: {
          _id: 0,
          name: { $ifNull: ["$properties.Name", "$Name", "$properties.name"] },
          distanceKM: { $round: ["$distanceKM", 3] }
        }
      }
    ];

    const testResults = await fuelStationCollection.aggregate(testPipeline).toArray();
    console.log('🧪 Test query results:', testResults);

    if (testResults.length > 0) {
      console.log(`✅ Index test successful! Found nearest fuel station: ${testResults[0].name} at ${testResults[0].distanceKM}km`);
    } else {
      console.log('⚠️ Index test completed but no results found');
    }

    // Get collection stats
    const stats = await fuelStationCollection.stats();
    console.log('📊 Collection stats:', {
      count: stats.count,
      size: stats.size,
      avgObjSize: stats.avgObjSize,
      indexes: stats.nindexes
    });

  } catch (error) {
    console.error('❌ Error creating fuel stations index:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  createFuelStationsIndex()
    .then(() => {
      console.log('🎉 Fuel stations index creation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fuel stations index creation failed:', error);
      process.exit(1);
    });
}

module.exports = { createFuelStationsIndex };
