/**
 * Script to test $geoNear aggregation queries for GIS data
 * 
 * This script tests the new $geoNear-based queries that are more efficient
 * than the previous point-in-polygon approach.
 * 
 * Usage: Run this script in MongoDB Compass shell
 */

// Test coordinates for Achziv
const testCoordinates = {
    x: 35.1, // longitude
    y: 33.0  // latitude
};

// Function to test PNG25 query with $geoNear
function testPNG25GeoNearQuery() {
    print("🧪 Testing PNG25 query with $geoNear...");

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
                hazard: 1,
                "properties.Hazard": 1,
                distance_m: 1,
                name: 1
            }
        }
    ];

    try {
        const results = db.getCollection('seismic-hazard-zone').aggregate(pipeline).toArray();

        if (results && results.length > 0) {
            const result = results[0];
            print(`✅ Found nearest seismic hazard zone:`);
            print(`   Document ID: ${result._id}`);
            print(`   Distance: ${result.distance_m}m`);
            print(`   Name: ${result.name || 'N/A'}`);

            // Check for hazard value
            if (result.hazard !== undefined) {
                print(`   Hazard (flattened): ${result.hazard}`);
            } else if (result.properties && result.properties.Hazard !== undefined) {
                print(`   Hazard (nested): ${result.properties.Hazard}`);
            } else {
                print(`   ⚠️ No hazard value found in document`);
            }

            return result;
        } else {
            print("❌ No seismic hazard zones found");
            return null;
        }
    } catch (error) {
        print(`❌ Error in PNG25 query: ${error.message}`);
        return null;
    }
}

// Function to test Cresta query with $geoNear
function testCrestaGeoNearQuery() {
    print("🧪 Testing Cresta query with $geoNear...");

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
                crestaId: 1,
                "properties.CRESTA_ID1": 1,
                distance_m: 1,
                name: 1
            }
        }
    ];

    try {
        const results = db.getCollection('cresta-zones').aggregate(pipeline).toArray();

        if (results && results.length > 0) {
            const result = results[0];
            print(`✅ Found nearest Cresta zone:`);
            print(`   Document ID: ${result._id}`);
            print(`   Distance: ${result.distance_m}m`);
            print(`   Name: ${result.name || 'N/A'}`);

            // Check for Cresta ID
            if (result.crestaId !== undefined) {
                print(`   Cresta ID (flattened): ${result.crestaId}`);
            } else if (result.properties && result.properties.CRESTA_ID1 !== undefined) {
                print(`   Cresta ID (nested): ${result.properties.CRESTA_ID1}`);
            } else {
                print(`   ⚠️ No Cresta ID found in document`);
            }

            return result;
        } else {
            print("❌ No Cresta zones found");
            return null;
        }
    } catch (error) {
        print(`❌ Error in Cresta query: ${error.message}`);
        return null;
    }
}

// Function to test performance comparison
function testPerformanceComparison() {
    print("🧪 Testing performance comparison...");

    const iterations = 10;
    const coordinates = [testCoordinates.x, testCoordinates.y];

    // Test $geoNear query performance
    const startTime = new Date();
    for (let i = 0; i < iterations; i++) {
        db.getCollection('seismic-hazard-zone').aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates: coordinates },
                    key: "geometry",
                    spherical: true,
                    distanceField: "distance_m"
                }
            },
            { $limit: 1 }
        ]).toArray();
    }
    const geoNearTime = new Date() - startTime;
    print(`📊 $geoNear query (${iterations} iterations): ${geoNearTime}ms`);

    // Test traditional find query performance
    const startTime2 = new Date();
    for (let i = 0; i < iterations; i++) {
        db.getCollection('seismic-hazard-zone').find({}).toArray();
    }
    const findTime = new Date() - startTime2;
    print(`📊 Traditional find query (${iterations} iterations): ${findTime}ms`);

    const improvement = ((findTime - geoNearTime) / findTime * 100).toFixed(1);
    print(`📊 Performance improvement: ${improvement}%`);
}

// Function to test with different coordinates
function testWithDifferentCoordinates() {
    print("🧪 Testing with different coordinates...");

    const testPoints = [
        { name: "Achziv", x: 35.1, y: 33.0 },
        { name: "Tel Aviv", x: 34.8, y: 32.1 },
        { name: "Jerusalem", x: 35.2, y: 31.8 },
        { name: "Haifa", x: 35.0, y: 32.8 }
    ];

    testPoints.forEach(point => {
        print(`\n📍 Testing ${point.name} (${point.x}, ${point.y}):`);

        // Test PNG25
        const png25Pipeline = [
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [point.x, point.y] },
                    key: "geometry",
                    spherical: true,
                    distanceField: "distance_m"
                }
            },
            { $limit: 1 },
            { $project: { hazard: 1, "properties.Hazard": 1, distance_m: 1 } }
        ];

        const png25Result = db.getCollection('seismic-hazard-zone').aggregate(png25Pipeline).toArray();
        if (png25Result && png25Result.length > 0) {
            const hazard = png25Result[0].hazard || png25Result[0].properties?.Hazard;
            print(`   PNG25: ${hazard || 'N/A'} (${png25Result[0].distance_m}m)`);
        } else {
            print(`   PNG25: Not found`);
        }

        // Test Cresta
        const crestaPipeline = [
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [point.x, point.y] },
                    key: "geometry",
                    spherical: true,
                    distanceField: "distance_m"
                }
            },
            { $limit: 1 },
            { $project: { crestaId: 1, "properties.CRESTA_ID1": 1, distance_m: 1 } }
        ];

        const crestaResult = db.getCollection('cresta-zones').aggregate(crestaPipeline).toArray();
        if (crestaResult && crestaResult.length > 0) {
            const cresta = crestaResult[0].crestaId || crestaResult[0].properties?.CRESTA_ID1;
            print(`   Cresta: ${cresta || 'N/A'} (${crestaResult[0].distance_m}m)`);
        } else {
            print(`   Cresta: Not found`);
        }
    });
}

// Function to check spatial indexes
function checkSpatialIndexes() {
    print("🧪 Checking spatial indexes...");

    // Check seismic hazard zone indexes
    const seismicIndexes = db.getCollection('seismic-hazard-zone').getIndexes();
    print("📊 Seismic hazard zone indexes:");
    seismicIndexes.forEach(index => {
        const isSpatial = Object.values(index.key).includes("2dsphere");
        print(`   - ${index.name}: ${JSON.stringify(index.key)} ${isSpatial ? '🌍' : ''}`);
    });

    // Check Cresta zones indexes
    const crestaIndexes = db.getCollection('cresta-zones').getIndexes();
    print("📊 Cresta zones indexes:");
    crestaIndexes.forEach(index => {
        const isSpatial = Object.values(index.key).includes("2dsphere");
        print(`   - ${index.name}: ${JSON.stringify(index.key)} ${isSpatial ? '🌍' : ''}`);
    });
}

// Main execution function
function main() {
    print("🚀 Starting $geoNear query testing...");
    print("=" * 50);

    try {
        // Test 1: PNG25 query
        testPNG25GeoNearQuery();
        print("");

        // Test 2: Cresta query
        testCrestaGeoNearQuery();
        print("");

        // Test 3: Performance comparison
        testPerformanceComparison();
        print("");

        // Test 4: Different coordinates
        testWithDifferentCoordinates();
        print("");

        // Test 5: Check indexes
        checkSpatialIndexes();
        print("");

        print("🎉 $geoNear query testing completed!");
        print("=" * 50);

    } catch (error) {
        print(`❌ Error during testing: ${error.message}`);
        print(error.stack);
    }
}

// Run the main function
main();
