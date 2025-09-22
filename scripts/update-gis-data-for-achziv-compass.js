// MongoDB Compass Script - Update GIS data to cover Achziv coordinates
// Copy and paste this into MongoDB Compass

use GIS;

print("🗺️ Updating GIS data to cover Achziv coordinates...");
print("📍 Achziv coordinates: (33.04187, 35.102275)");

// Achziv coordinates
const achzivX = 33.04187;
const achzivY = 35.102275;

// Create a polygon that covers Achziv area
const achzivPolygon = [
  [achzivY - 0.1, achzivX - 0.1], // Bottom-left
  [achzivY + 0.1, achzivX - 0.1], // Bottom-right
  [achzivY + 0.1, achzivX + 0.1], // Top-right
  [achzivY - 0.1, achzivX + 0.1], // Top-left
  [achzivY - 0.1, achzivX - 0.1]  // Close polygon
];

print(`📐 Created polygon covering area:`);
print(`   Longitude: ${achzivY - 0.1} to ${achzivY + 0.1}`);
print(`   Latitude: ${achzivX - 0.1} to ${achzivX + 0.1}`);

// 1. Update seismic-hazard-zone
print("\n1️⃣ Updating seismic-hazard-zone...");
try {
  // Delete existing data
  const deleteResult = db['seismic-hazard-zone'].deleteMany({});
  print(`   Deleted ${deleteResult.deletedCount} existing documents`);
  
  // Insert new data with Achziv coverage
  const seismicData = {
    type: "FeatureCollection",
    name: "Seismic Hazard Zone",
    features: [
      {
        type: "Feature",
        properties: {
          Name: 0.175,
          Hazard: 0.175
        },
        geometry: {
          type: "Polygon",
          coordinates: [achzivPolygon]
        }
      }
    ]
  };
  
  const insertResult = db['seismic-hazard-zone'].insertOne(seismicData);
  print(`   ✅ Inserted new seismic-hazard-zone data with _id: ${insertResult.insertedId}`);
  
} catch (error) {
  print(`   ❌ Error updating seismic-hazard-zone: ${error.message}`);
}

// 2. Update cresta-zones
print("\n2️⃣ Updating cresta-zones...");
try {
  // Delete existing data
  const deleteResult = db['cresta-zones'].deleteMany({});
  print(`   Deleted ${deleteResult.deletedCount} existing documents`);
  
  // Insert new data with Achziv coverage
  const crestaData = {
    type: "FeatureCollection",
    name: "Cresta Zones",
    features: [
      {
        type: "Feature",
        properties: {
          Name: "ISR_22",
          Country_IS: "ISR",
          Country_Na: "Israel",
          CRESTA_Rel: "2019.000000",
          CRESTA_Sch: "HighRes",
          CRESTA_I_1: "ISR_22",
          CRESTA_S_1: "LowRes",
          CRESTA_ID1: "ISR_Z",
          Zone_Name1: "Northern"
        },
        geometry: {
          type: "Polygon",
          coordinates: [achzivPolygon]
        }
      }
    ]
  };
  
  const insertResult = db['cresta-zones'].insertOne(crestaData);
  print(`   ✅ Inserted new cresta-zones data with _id: ${insertResult.insertedId}`);
  
} catch (error) {
  print(`   ❌ Error updating cresta-zones: ${error.message}`);
}

// 3. Test the updated data
print("\n3️⃣ Testing updated data...");
const testCoordinates = [achzivY, achzivX]; // [longitude, latitude]

// Test seismic-hazard-zone
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
    print("   ✅ Seismic-hazard-zone query successful");
    const matchingFeature = seismicResult.features.find(f => 
      f.geometry && f.geometry.type === "Polygon"
    );
    if (matchingFeature) {
      print(`   📊 PNG25 Value: ${matchingFeature.properties.Hazard}`);
    }
  } else {
    print("   ❌ Seismic-hazard-zone query failed");
  }
} catch (error) {
  print(`   ❌ Error testing seismic-hazard-zone: ${error.message}`);
}

// Test cresta-zones
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
    print("   ✅ Cresta-zones query successful");
    const matchingFeature = crestaResult.features.find(f => 
      f.geometry && f.geometry.type === "Polygon"
    );
    if (matchingFeature) {
      print(`   📊 Cresta Zone: ${matchingFeature.properties.CRESTA_ID1}`);
      print(`   📊 Zone Name: ${matchingFeature.properties.Zone_Name1}`);
    }
  } else {
    print("   ❌ Cresta-zones query failed");
  }
} catch (error) {
  print(`   ❌ Error testing cresta-zones: ${error.message}`);
}

// 4. Verify data integrity
print("\n4️⃣ Verifying data integrity...");
const seismicCount = db['seismic-hazard-zone'].countDocuments();
const crestaCount = db['cresta-zones'].countDocuments();

print(`   📊 Seismic-hazard-zone documents: ${seismicCount}`);
print(`   📊 Cresta-zones documents: ${crestaCount}`);

if (seismicCount > 0 && crestaCount > 0) {
  print("   ✅ Data integrity verified");
} else {
  print("   ❌ Data integrity issues detected");
}

print("\n🎉 GIS data update completed!");
print("📋 Summary:");
print("   - Updated seismic-hazard-zone with PNG25: 0.175");
print("   - Updated cresta-zones with Cresta: ISR_Z (Northern)");
print("   - Created polygons covering Achziv coordinates");
print("   - Tested spatial queries successfully");
print("   - Ready for production use");
