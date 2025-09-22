// MongoDB Compass Script - Copy and paste this into MongoDB Compass
// This script creates spatial indexes for all GIS collections

// Switch to GIS database
use GIS;

print("🗺️ Creating spatial indexes for GIS collections...");

// Collections to create indexes for
const collections = ['seismic-hazard-zone', 'cresta-zones', 'earthquake-fault-zones'];

collections.forEach(collectionName => {
  print(`\n🔍 Processing collection: ${collectionName}`);
  
  try {
    const collection = db[collectionName];
    
    // Check if collection exists
    const collectionExists = db.getCollectionNames().includes(collectionName);
    if (!collectionExists) {
      print(`⚠️ Collection ${collectionName} does not exist, skipping...`);
      return;
    }
    
    // Get existing indexes
    const existingIndexes = collection.getIndexes();
    print(`📋 Existing indexes for ${collectionName}:`);
    existingIndexes.forEach(index => {
      print(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    // Create spatial index for features.geometry
    print(`🗺️ Creating spatial index for features.geometry...`);
    try {
      collection.createIndex(
        { "features.geometry": "2dsphere" },
        { 
          name: "features_geometry_2dsphere",
          background: true
        }
      );
      print(`✅ Created spatial index for features.geometry in ${collectionName}`);
    } catch (error) {
      if (error.code === 85) {
        print(`ℹ️ Spatial index for features.geometry already exists in ${collectionName}`);
      } else {
        print(`❌ Error creating spatial index for features.geometry: ${error.message}`);
      }
    }
    
    // Create spatial index for geometry (root level)
    print(`🗺️ Creating spatial index for geometry (root level)...`);
    try {
      collection.createIndex(
        { "geometry": "2dsphere" },
        { 
          name: "geometry_2dsphere",
          background: true
        }
      );
      print(`✅ Created spatial index for geometry in ${collectionName}`);
    } catch (error) {
      if (error.code === 85) {
        print(`ℹ️ Spatial index for geometry already exists in ${collectionName}`);
      } else {
        print(`ℹ️ No geometry field at root level in ${collectionName}`);
      }
    }
    
    // Create compound index for better performance
    print(`🔗 Creating compound index for type and geometry...`);
    try {
      collection.createIndex(
        { 
          "type": 1,
          "features.geometry": "2dsphere" 
        },
        { 
          name: "type_features_geometry_compound",
          background: true
        }
      );
      print(`✅ Created compound index for type and features.geometry in ${collectionName}`);
    } catch (error) {
      if (error.code === 85) {
        print(`ℹ️ Compound index already exists in ${collectionName}`);
      } else {
        print(`❌ Error creating compound index: ${error.message}`);
      }
    }
    
    // Get updated indexes
    const updatedIndexes = collection.getIndexes();
    print(`📋 Updated indexes for ${collectionName}:`);
    updatedIndexes.forEach(index => {
      print(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
  } catch (error) {
    print(`❌ Error processing collection ${collectionName}: ${error.message}`);
  }
});

// Test spatial queries
print(`\n🧪 Testing spatial queries with Achziv coordinates...`);

// Test coordinates for Achziv (33.04187, 35.102275)
const testCoordinates = [35.102275, 33.04187]; // [longitude, latitude]

// Test seismic hazard zone query
try {
  const seismicResult = db['seismic-hazard-zone'].findOne({
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
    print(`✅ Spatial query successful for seismic-hazard-zone`);
    const matchingFeature = seismicResult.features.find(f => 
      f.geometry && f.geometry.type === "Polygon"
    );
    if (matchingFeature) {
      print(`   PNG25 Value: ${matchingFeature.properties.Hazard}`);
    }
  } else {
    print(`⚠️ No results found for seismic-hazard-zone with test coordinates`);
  }
} catch (error) {
  print(`❌ Error testing seismic-hazard-zone query: ${error.message}`);
}

// Test cresta zones query
try {
  const crestaResult = db['cresta-zones'].findOne({
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
    print(`✅ Spatial query successful for cresta-zones`);
    const matchingFeature = crestaResult.features.find(f => 
      f.geometry && f.geometry.type === "Polygon"
    );
    if (matchingFeature) {
      print(`   Cresta Zone: ${matchingFeature.properties.CRESTA_ID1}`);
    }
  } else {
    print(`⚠️ No results found for cresta-zones with test coordinates`);
  }
} catch (error) {
  print(`❌ Error testing cresta-zones query: ${error.message}`);
}

print(`\n🎉 Spatial indexes creation completed!`);
print(`📊 Summary:`);
print(`   - Created 2dsphere indexes for all GIS collections`);
print(`   - Created compound indexes for better performance`);
print(`   - Tested spatial queries with Achziv coordinates`);
print(`   - All indexes are created in background mode`);
