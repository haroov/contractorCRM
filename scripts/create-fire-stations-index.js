/**
 * Script to create spatial index for fireStations collection
 * 
 * This script creates a 2dsphere index on the geometry field
 * to enable $geoNear queries for fire stations.
 * 
 * Usage: Run this script in MongoDB Compass shell
 */

// Function to create spatial index for fireStations collection
function createFireStationsSpatialIndex() {
    print("🔄 Creating spatial index for fireStations collection...");

    try {
        // Create 2dsphere index on geometry field
        db.getCollection('fireStations').createIndex(
            { "geometry": "2dsphere" },
            {
                name: "geometry_2dsphere",
                background: true
            }
        );
        print("✅ Created spatial index for fireStations collection");
    } catch (error) {
        print(`❌ Error creating spatial index: ${error.message}`);
    }
}

// Function to check existing indexes
function checkFireStationsIndexes() {
    print("🔍 Checking existing indexes for fireStations collection...");

    const indexes = db.getCollection('fireStations').getIndexes();
    print("📊 Current indexes:");
    indexes.forEach(index => {
        const isSpatial = Object.values(index.key).includes("2dsphere");
        print(`   - ${index.name}: ${JSON.stringify(index.key)} ${isSpatial ? '🌍' : ''}`);
    });
}

// Function to test the index with a sample query
function testFireStationsQuery() {
    print("🧪 Testing fireStations query with sample coordinates...");

    const testCoordinates = {
        x: 35.102275, // longitude
        y: 33.04187   // latitude
    };

    try {
        const pipeline = [
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [testCoordinates.x, testCoordinates.y] },
                    key: "geometry",
                    spherical: true,
                    distanceField: "distance_m"
                }
            },
            { $limit: 1 },
            {
                $project: {
                    _id: 1,
                    "properties.Name": 1,
                    "properties.address": 1,
                    "properties.EmergencyPhoneNumber": 1,
                    distance_m: 1
                }
            }
        ];

        const results = db.getCollection('fireStations').aggregate(pipeline).toArray();

        if (results && results.length > 0) {
            const result = results[0];
            print(`✅ Query successful! Found fire station:`);
            print(`   Name: ${result.properties?.Name || 'N/A'}`);
            print(`   Address: ${result.properties?.address || 'N/A'}`);
            print(`   Phone: ${result.properties?.EmergencyPhoneNumber || 'N/A'}`);
            print(`   Distance: ${result.distance_m}m`);
        } else {
            print("⚠️ Query successful but no fire stations found");
        }
    } catch (error) {
        print(`❌ Error testing query: ${error.message}`);
    }
}

// Main execution function
function main() {
    print("🚀 Starting fireStations spatial index creation...");
    print("=" * 50);

    try {
        // Step 1: Check existing indexes
        checkFireStationsIndexes();
        print("");

        // Step 2: Create spatial index
        createFireStationsSpatialIndex();
        print("");

        // Step 3: Check indexes again
        checkFireStationsIndexes();
        print("");

        // Step 4: Test the query
        testFireStationsQuery();
        print("");

        print("🎉 FireStations spatial index creation completed!");
        print("=" * 50);

    } catch (error) {
        print(`❌ Error during index creation: ${error.message}`);
        print(error.stack);
    }
}

// Run the main function
main();
