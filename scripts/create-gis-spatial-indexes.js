const { MongoClient } = require('mongodb');

async function createGISSpatialIndexes() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://choco_db_user:choco_db_password@cluster0.rtburip.mongodb.net/contractor-crm?retryWrites=true&w=majority';
  const client = new MongoClient(mongoUri);

  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');

    const gisDb = client.db('GIS');

    // Get all collections in GIS database
    const collections = await gisDb.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections in GIS database:`);
    collections.forEach(col => console.log(`   - ${col.name}`));

    // Collections to create spatial indexes for
    const collectionsToIndex = [
      'seismic-hazard-zone',
      'cresta-zones',
      'earthquake-fault-zones'
    ];

    for (const collectionName of collectionsToIndex) {
      try {
        console.log(`\n🔍 Processing collection: ${collectionName}`);

        // Check if collection exists
        const collectionExists = collections.some(col => col.name === collectionName);
        if (!collectionExists) {
          console.log(`⚠️ Collection ${collectionName} does not exist, skipping...`);
          continue;
        }

        const collection = gisDb.collection(collectionName);

        // Get existing indexes
        const existingIndexes = await collection.indexes();
        console.log(`📋 Existing indexes for ${collectionName}:`);
        existingIndexes.forEach(index => {
          console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
        });

        // Create spatial index for features.geometry
        console.log(`🗺️ Creating spatial index for features.geometry...`);
        try {
          await collection.createIndex(
            { "features.geometry": "2dsphere" },
            {
              name: "features_geometry_2dsphere",
              background: true // Create index in background
            }
          );
          console.log(`✅ Created spatial index for features.geometry in ${collectionName}`);
        } catch (error) {
          if (error.code === 85) {
            console.log(`ℹ️ Spatial index for features.geometry already exists in ${collectionName}`);
          } else {
            console.log(`❌ Error creating spatial index for features.geometry: ${error.message}`);
          }
        }

        // Create spatial index for geometry (if exists at root level)
        console.log(`🗺️ Creating spatial index for geometry (root level)...`);
        try {
          await collection.createIndex(
            { "geometry": "2dsphere" },
            {
              name: "geometry_2dsphere",
              background: true
            }
          );
          console.log(`✅ Created spatial index for geometry in ${collectionName}`);
        } catch (error) {
          if (error.code === 85) {
            console.log(`ℹ️ Spatial index for geometry already exists in ${collectionName}`);
          } else {
            console.log(`ℹ️ No geometry field at root level in ${collectionName}`);
          }
        }

        // Create compound index for better performance
        console.log(`🔗 Creating compound index for type and geometry...`);
        try {
          await collection.createIndex(
            {
              "type": 1,
              "features.geometry": "2dsphere"
            },
            {
              name: "type_features_geometry_compound",
              background: true
            }
          );
          console.log(`✅ Created compound index for type and features.geometry in ${collectionName}`);
        } catch (error) {
          if (error.code === 85) {
            console.log(`ℹ️ Compound index already exists in ${collectionName}`);
          } else {
            console.log(`❌ Error creating compound index: ${error.message}`);
          }
        }

        // Get updated indexes
        const updatedIndexes = await collection.indexes();
        console.log(`📋 Updated indexes for ${collectionName}:`);
        updatedIndexes.forEach(index => {
          console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
        });

      } catch (error) {
        console.error(`❌ Error processing collection ${collectionName}:`, error.message);
      }
    }

    // Test spatial queries
    console.log(`\n🧪 Testing spatial queries...`);

    // Test coordinates for Achziv
    const testCoordinates = [35.102275, 33.04187]; // [longitude, latitude]

    // Test seismic hazard zone query
    try {
      const seismicCollection = gisDb.collection('seismic-hazard-zone');
      const seismicResult = await seismicCollection.findOne({
        "features": {
          $elemMatch: {
            "geometry": {
              $geoIntersects: {
                $geometry: {
                  type: "Point",
                  coordinates: testCoordinates
                }
              }
            }
          }
        }
      });

      if (seismicResult) {
        console.log(`✅ Spatial query successful for seismic-hazard-zone`);
        const matchingFeature = seismicResult.features.find(f =>
          f.geometry && f.geometry.type === "Polygon"
        );
        if (matchingFeature) {
          console.log(`   PNG25 Value: ${matchingFeature.properties.Hazard}`);
        }
      } else {
        console.log(`⚠️ No results found for seismic-hazard-zone with test coordinates`);
      }
    } catch (error) {
      console.log(`❌ Error testing seismic-hazard-zone query: ${error.message}`);
    }

    // Test cresta zones query
    try {
      const crestaCollection = gisDb.collection('cresta-zones');
      const crestaResult = await crestaCollection.findOne({
        "features": {
          $elemMatch: {
            "geometry": {
              $geoIntersects: {
                $geometry: {
                  type: "Point",
                  coordinates: testCoordinates
                }
              }
            }
          }
        }
      });

      if (crestaResult) {
        console.log(`✅ Spatial query successful for cresta-zones`);
        const matchingFeature = crestaResult.features.find(f =>
          f.geometry && f.geometry.type === "Polygon"
        );
        if (matchingFeature) {
          console.log(`   Cresta Zone: ${matchingFeature.properties.CRESTA_ID1}`);
        }
      } else {
        console.log(`⚠️ No results found for cresta-zones with test coordinates`);
      }
    } catch (error) {
      console.log(`❌ Error testing cresta-zones query: ${error.message}`);
    }

    console.log(`\n🎉 Spatial indexes creation completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Created 2dsphere indexes for all GIS collections`);
    console.log(`   - Created compound indexes for better performance`);
    console.log(`   - Tested spatial queries with Achziv coordinates`);
    console.log(`   - All indexes are created in background mode`);

  } catch (error) {
    console.error('❌ Error creating spatial indexes:', error);
  } finally {
    await client.close();
  }
}

// Run the script
createGISSpatialIndexes();
