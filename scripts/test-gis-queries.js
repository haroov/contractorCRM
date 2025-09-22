// MongoDB Compass Script - Test GIS queries for Achziv coordinates
// Copy and paste this into MongoDB Compass

use GIS;

print("🧪 Testing GIS queries for Achziv coordinates...");
print("📍 Achziv coordinates: (33.04187, 35.102275)");

// Test coordinates for Achziv (33.04187, 35.102275)
const testCoordinates = [35.102275, 33.04187]; // [longitude, latitude]

// 1. Check what data exists in seismic-hazard-zone
print("\n1️⃣ Checking seismic-hazard-zone data...");
const seismicData = db['seismic-hazard-zone'].findOne();
if (seismicData) {
  print("✅ Found seismic-hazard-zone data");
  print(`   Type: ${seismicData.type}`);
  print(`   Features count: ${seismicData.features ? seismicData.features.length : 0}`);
  
  if (seismicData.features && seismicData.features.length > 0) {
    print("   Sample feature properties:");
    seismicData.features.slice(0, 3).forEach((feature, index) => {
      if (feature.properties) {
        print(`     Feature ${index}: ${JSON.stringify(feature.properties)}`);
      }
    });
  }
} else {
  print("❌ No data found in seismic-hazard-zone");
}

// 2. Check what data exists in cresta-zones
print("\n2️⃣ Checking cresta-zones data...");
const crestaData = db['cresta-zones'].findOne();
if (crestaData) {
  print("✅ Found cresta-zones data");
  print(`   Type: ${crestaData.type}`);
  print(`   Features count: ${crestaData.features ? crestaData.features.length : 0}`);
  
  if (crestaData.features && crestaData.features.length > 0) {
    print("   Sample feature properties:");
    crestaData.features.slice(0, 3).forEach((feature, index) => {
      if (feature.properties) {
        print(`     Feature ${index}: ${JSON.stringify(feature.properties)}`);
      }
    });
  }
} else {
  print("❌ No data found in cresta-zones");
}

// 3. Test spatial query for seismic-hazard-zone
print("\n3️⃣ Testing spatial query for seismic-hazard-zone...");
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
    print("✅ Spatial query successful for seismic-hazard-zone");
    const matchingFeature = seismicResult.features.find(f => 
      f.geometry && f.geometry.type === "Polygon"
    );
    if (matchingFeature) {
      print(`   PNG25 Value: ${matchingFeature.properties.Hazard}`);
    }
  } else {
    print("⚠️ No results found for seismic-hazard-zone with test coordinates");
  }
} catch (error) {
  print(`❌ Error testing seismic-hazard-zone query: ${error.message}`);
}

// 4. Test spatial query for cresta-zones
print("\n4️⃣ Testing spatial query for cresta-zones...");
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
    print("✅ Spatial query successful for cresta-zones");
    const matchingFeature = crestaResult.features.find(f => 
      f.geometry && f.geometry.type === "Polygon"
    );
    if (matchingFeature) {
      print(`   Cresta Zone: ${matchingFeature.properties.CRESTA_ID1}`);
    }
  } else {
    print("⚠️ No results found for cresta-zones with test coordinates");
  }
} catch (error) {
  print(`❌ Error testing cresta-zones query: ${error.message}`);
}

// 5. Check polygon coordinates to see what area they cover
print("\n5️⃣ Checking polygon coverage...");
if (seismicData && seismicData.features) {
  seismicData.features.forEach((feature, index) => {
    if (feature.geometry && feature.geometry.type === "Polygon") {
      const coords = feature.geometry.coordinates[0];
      if (coords && coords.length > 0) {
        const minLon = Math.min(...coords.map(c => c[0]));
        const maxLon = Math.max(...coords.map(c => c[0]));
        const minLat = Math.min(...coords.map(c => c[1]));
        const maxLat = Math.max(...coords.map(c => c[1]));
        
        print(`   Feature ${index} coverage:`);
        print(`     Longitude: ${minLon} to ${maxLon}`);
        print(`     Latitude: ${minLat} to ${maxLat}`);
        print(`     Test point: (${testCoordinates[0]}, ${testCoordinates[1]})`);
        
        const isInside = testCoordinates[0] >= minLon && testCoordinates[0] <= maxLon && 
                        testCoordinates[1] >= minLat && testCoordinates[1] <= maxLat;
        print(`     Is test point inside? ${isInside ? 'YES' : 'NO'}`);
      }
    }
  });
}

print("\n🎯 Summary:");
print("   - Checked existing data in both collections");
print("   - Tested spatial queries with Achziv coordinates");
print("   - Analyzed polygon coverage areas");
print("   - If no results found, the polygons don't cover Achziv area");
print("   - Need to update data to include Achziv coordinates");
