/**
 * Quick check for fire stations data
 * 
 * Usage: Run this script in MongoDB Compass shell
 */

// Quick check for fire stations near Achziv
function quickCheck() {
    print("🔍 Quick check for fire stations near Achziv...");
    
    const collection = db.getCollection('fireStations');
    
    // Test coordinates for Achziv area
    const testCoords = [
        { name: "Achziv (user input)", lon: 35.102275, lat: 33.04187 },
        { name: "Achziv (corrected)", lon: 33.04187, lat: 35.102275 },
        { name: "Nahariya station", lon: 35.10789, lat: 33.00828 }
    ];
    
    testCoords.forEach(coord => {
        print(`\n📍 Testing ${coord.name} (${coord.lon}, ${coord.lat}):`);
        
        try {
            const result = collection.aggregate([
                {
                    $geoNear: {
                        near: { type: "Point", coordinates: [coord.lon, coord.lat] },
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
                print(`   ✅ Found: ${station.name}`);
                print(`   📍 Distance: ${station.distance_km.toFixed(2)}km`);
                print(`   📞 Phone: ${station.phone}`);
                print(`   🏠 Address: ${station.address}`);
            } else {
                print(`   ❌ No stations found`);
            }
        } catch (error) {
            print(`   ❌ Error: ${error.message}`);
        }
    });
    
    // Check total count and sample data
    const totalCount = collection.countDocuments();
    print(`\n📊 Total fire stations in database: ${totalCount}`);
    
    if (totalCount > 0) {
        const sample = collection.findOne({});
        print(`📋 Sample station:`);
        print(`   Name: ${sample.properties?.Name || 'N/A'}`);
        print(`   Coordinates: ${JSON.stringify(sample.geometry?.coordinates || 'N/A')}`);
        print(`   Phone: ${sample.properties?.EmergencyPhoneNumber || 'N/A'}`);
    }
}

// Run the check
quickCheck();
