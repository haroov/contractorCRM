const { MongoClient } = require('mongodb');

/**
 * Script to check fuel stations data in MongoDB
 * This helps debug why fuel station search might not be working
 */

async function checkFuelStationsData() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/contractor-crm';
  const client = new MongoClient(mongoUri);

  try {
    console.log('🔗 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    // Connect to the GIS database
    const gisDb = client.db('GIS');
    const fuelStationCollection = gisDb.collection('fuelStation');

    // Get collection count
    const count = await fuelStationCollection.countDocuments();
    console.log(`📊 Total fuel stations in collection: ${count}`);

    if (count === 0) {
      console.log('⚠️ No fuel stations found in collection!');
      return;
    }

    // Get sample documents
    console.log('🔍 Sample fuel station documents:');
    const sampleDocs = await fuelStationCollection.find({}).limit(3).toArray();
    
    sampleDocs.forEach((doc, index) => {
      console.log(`\n📄 Document ${index + 1}:`);
      console.log(`  _id: ${doc._id}`);
      console.log(`  type: ${doc.type}`);
      
      if (doc.properties) {
        console.log(`  properties:`, JSON.stringify(doc.properties, null, 2));
      }
      
      if (doc.geometry) {
        console.log(`  geometry:`, JSON.stringify(doc.geometry, null, 2));
      }
    });

    // Check for documents near test coordinates (Achziv area)
    const testCoordinates = [35.102275, 33.04187]; // [longitude, latitude]
    console.log(`\n🔍 Checking for fuel stations near test coordinates: ${testCoordinates}`);

    // Try a simple find query first
    const nearbyQuery = {
      geometry: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: testCoordinates
          },
          $maxDistance: 50000 // 50km radius
        }
      }
    };

    try {
      const nearbyStations = await fuelStationCollection.find(nearbyQuery).limit(5).toArray();
      console.log(`📍 Found ${nearbyStations.length} fuel stations within 50km:`);
      
      nearbyStations.forEach((station, index) => {
        console.log(`  ${index + 1}. ${station.properties?.Name || station.properties?.name || 'Unknown'}`);
        console.log(`     Coordinates: ${station.geometry?.coordinates}`);
        if (station.properties?.Address || station.properties?.address) {
          console.log(`     Address: ${station.properties.Address || station.properties.address}`);
        }
      });
    } catch (error) {
      console.log('⚠️ $near query failed (might need spatial index):', error.message);
    }

    // Check indexes
    console.log('\n🔍 Checking indexes on fuelStation collection:');
    const indexes = await fuelStationCollection.indexes();
    indexes.forEach((index, i) => {
      console.log(`  ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Check if 2dsphere index exists
    const has2dsphereIndex = indexes.some(index => 
      index.key && index.key.geometry === '2dsphere'
    );

    if (!has2dsphereIndex) {
      console.log('⚠️ No 2dsphere index found! This is required for $geoNear queries.');
      console.log('💡 Run: node scripts/create-fuel-stations-index.js');
    } else {
      console.log('✅ 2dsphere index found');
    }

    // Test aggregation pipeline
    console.log('\n🧪 Testing aggregation pipeline:');
    try {
      const pipeline = [
        {
          $geoNear: {
            near: { type: "Point", coordinates: testCoordinates },
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
            address: { $ifNull: ["$properties.Address", "$address", "$properties.address"] },
            distanceKM: { $round: ["$distanceKM", 3] }
          }
        }
      ];

      const results = await fuelStationCollection.aggregate(pipeline).toArray();
      console.log('✅ Aggregation test results:', results);
    } catch (error) {
      console.log('❌ Aggregation test failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Error checking fuel stations data:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  checkFuelStationsData()
    .then(() => {
      console.log('🎉 Fuel stations data check completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fuel stations data check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkFuelStationsData };
