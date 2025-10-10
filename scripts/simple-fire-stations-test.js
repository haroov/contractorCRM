/**
 * Simple test for fire stations data
 * 
 * Usage: Run this script in MongoDB Compass shell
 */

// Simple test function
function testFireStations() {
    print("🔍 Testing fire stations data...");
    
    const collection = db.getCollection('fireStations');
    
    // Check total count
    const totalCount = collection.countDocuments();
    print(`📊 Total fire stations: ${totalCount}`);
    
    if (totalCount === 0) {
        print("❌ No fire stations found in database!");
        return;
    }
    
    // Get first few stations
    const stations = collection.find({}).limit(3).toArray();
    print("\n📋 Sample stations:");
    stations.forEach((station, index) => {
        print(`${index + 1}. ${station.properties?.Name || 'N/A'}`);
        print(`   Coordinates: ${JSON.stringify(station.geometry?.coordinates || 'N/A')}`);
        print(`   Phone: ${station.properties?.EmergencyPhoneNumber || 'N/A'}`);
        print("");
    });
    
    // Test with Achziv coordinates
    const achzivLon = 35.102275;
    const achzivLat = 33.04187;
    
    print(`📍 Testing Achziv coordinates (${achzivLon}, ${achzivLat}):`);
    
    try {
        const result = collection.aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [achzivLon, achzivLat] },
                    key: "geometry",
                    spherical: true,
                    distanceField: "distance_m"
                }
            },
            { $limit: 1 },
            {
                $project: {
                    name: "$properties.Name",
                    address: "$properties.address",
                    phone: "$properties.EmergencyPhoneNumber",
                    distance_km: { $divide: ["$distance_m", 1000] }
                }
            }
        ]).toArray();
        
        if (result.length > 0) {
            const station = result[0];
            print(`✅ Found: ${station.name}`);
            print(`📍 Distance: ${station.distance_km.toFixed(2)}km`);
            print(`📞 Phone: ${station.phone}`);
            print(`🏠 Address: ${station.address}`);
        } else {
            print("❌ No stations found near Achziv");
        }
    } catch (error) {
        print(`❌ Error: ${error.message}`);
    }
}

// Run the test
testFireStations();
