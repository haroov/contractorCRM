/**
 * Script to check police stations data coverage
 * 
 * This script checks what police stations data exists
 * and their geographic coverage.
 * 
 * Usage: Run this script in MongoDB Compass shell
 */

// Function to check police stations data
function checkPoliceStationsData() {
    print("🔍 Checking policeStations data...");
    
    const collection = db.getCollection('policeStations');
    
    // Count total documents
    const totalCount = collection.countDocuments();
    print(`📊 Total police stations: ${totalCount}`);
    
    // Get sample documents
    const sampleDocs = collection.find({}).limit(3).toArray();
    print("📊 Sample documents:");
    sampleDocs.forEach((doc, index) => {
        print(`   ${index + 1}. Name: ${doc.properties?.Name || 'N/A'}`);
        print(`      Address: ${doc.properties?.Address || 'N/A'}`);
        print(`      Coordinates: ${JSON.stringify(doc.geometry?.coordinates || 'N/A')}`);
        print(`      Phone: ${doc.properties?.Phone || 'N/A'}`);
        print("");
    });
    
    // Check coordinate ranges
    const coordinateStats = collection.aggregate([
        {
            $group: {
                _id: null,
                minLon: { $min: "$geometry.coordinates.0" },
                maxLon: { $max: "$geometry.coordinates.0" },
                minLat: { $min: "$geometry.coordinates.1" },
                maxLat: { $max: "$geometry.coordinates.1" }
            }
        }
    ]).toArray();
    
    if (coordinateStats.length > 0) {
        const stats = coordinateStats[0];
        print("📊 Coordinate coverage:");
        print(`   Longitude range: ${stats.minLon} to ${stats.maxLon}`);
        print(`   Latitude range: ${stats.minLat} to ${stats.maxLat}`);
    }
    
    // Check for stations near Achziv (approximate coordinates)
    const achzivLon = 35.102275;
    const achzivLat = 33.04187;
    
    print(`\n🔍 Checking for stations near Achziv (${achzivLon}, ${achzivLat}):`);
    
    // Find stations within 50km of Achziv
    const nearbyStations = collection.aggregate([
        {
            $geoNear: {
                near: { type: "Point", coordinates: [achzivLon, achzivLat] },
                key: "geometry",
                spherical: true,
                distanceField: "distance_m",
                maxDistance: 50000 // 50km in meters
            }
        },
        { $limit: 5 },
        {
            $project: {
                name: "$properties.Name",
                address: "$properties.Address",
                phone: "$properties.Phone",
                distance_m: 1,
                distance_km: { $divide: ["$distance_m", 1000] }
            }
        }
    ]).toArray();
    
    if (nearbyStations.length > 0) {
        print(`✅ Found ${nearbyStations.length} stations within 50km:`);
        nearbyStations.forEach((station, index) => {
            print(`   ${index + 1}. ${station.name} - ${station.distance_km.toFixed(2)}km`);
            print(`      Address: ${station.address}`);
            print(`      Phone: ${station.phone}`);
        });
    } else {
        print("❌ No stations found within 50km of Achziv");
        
        // Find the closest station regardless of distance
        const closestStation = collection.aggregate([
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
                    address: "$properties.Address",
                    phone: "$properties.Phone",
                    distance_m: 1,
                    distance_km: { $divide: ["$distance_m", 1000] }
                }
            }
        ]).toArray();
        
        if (closestStation.length > 0) {
            const station = closestStation[0];
            print(`📍 Closest station: ${station.name} - ${station.distance_km.toFixed(2)}km away`);
            print(`   Address: ${station.address}`);
            print(`   Phone: ${station.phone}`);
        }
    }
}

// Function to test different coordinate formats
function testCoordinateFormats() {
    print("\n🧪 Testing different coordinate formats...");
    
    const testPoints = [
        { name: "Achziv (Lon, Lat)", lon: 35.102275, lat: 33.04187 },
        { name: "Achziv (Lat, Lon)", lon: 33.04187, lat: 35.102275 },
        { name: "Tel Aviv", lon: 34.7818, lat: 32.0853 },
        { name: "Jerusalem", lon: 35.2137, lat: 31.7683 }
    ];
    
    testPoints.forEach(point => {
        print(`\n📍 Testing ${point.name} (${point.lon}, ${point.lat}):`);
        
        const result = db.getCollection('policeStations').aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [point.lon, point.lat] },
                    key: "geometry",
                    spherical: true,
                    distanceField: "distance_m"
                }
            },
            { $limit: 1 },
            {
                $project: {
                    name: "$properties.Name",
                    distance_km: { $divide: ["$distance_m", 1000] }
                }
            }
        ]).toArray();
        
        if (result.length > 0) {
            print(`   ✅ Found: ${result[0].name} (${result[0].distance_km.toFixed(2)}km)`);
        } else {
            print(`   ❌ No stations found`);
        }
    });
}

// Main execution function
function main() {
    print("🚀 Starting policeStations data analysis...");
    print("=" * 50);
    
    try {
        checkPoliceStationsData();
        testCoordinateFormats();
        
        print("\n🎉 PoliceStations data analysis completed!");
        print("=" * 50);
        
    } catch (error) {
        print(`❌ Error during analysis: ${error.message}`);
        print(error.stack);
    }
}

// Run the main function
main();
