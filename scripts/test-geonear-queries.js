/**
 * Script to test $geoNear queries for GIS data
 * 
 * This script tests the new $geoNear aggregation pipeline approach
 * for finding PNG25 and Cresta values based on coordinates.
 * 
 * Usage: Run this script in MongoDB Compass shell
 */

// Test coordinates for Achziv
const testCoordinates = {
    x: 35.1, // longitude
    y: 33.0  // latitude
};

// Function to test PNG25 query with $geoNear
function testPNG25GeoNear() {
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

    const results = db.getCollection('seismic-hazard-zone').aggregate(pipeline).toArray();
    
    if (results && results.length > 0) {
        const result = results[0];
        print(`✅ Found PNG25 result:`);
        print(`   Document ID: ${result._id}`);
        print(`   Distance: ${result.distance_m}m`);
        print(`   Name: ${result.name || 'N/A'}`);
        
        // Check for hazard value
        if (result.hazard !== undefined) {
            print(`   Hazard (flattened): ${result.hazard}`);
        } else if (result.properties && result.properties.Hazard !== undefined) {
            print(`   Hazard (nested): ${result.properties.Hazard}`);
        } else {
            print(`   ⚠️ No hazard value found`);
        }
    } else {
        print("❌ No PNG25 results found");
    }
    
    print("");
}

// Function to test Cresta query with $geoNear
function testCrestaGeoNear() {
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

    const results = db.getCollection('cresta-zones').aggregate(pipeline).toArray();
    
    if (results && results.length > 0) {
        const result = results[0];
        print(`✅ Found Cresta result:`);
        print(`   Document ID: ${result._id}`);
        print(`   Distance: ${result.distance_m}m`);
        print(`   Name: ${result.name || 'N/A'}`);
        
        // Check for Cresta ID
        if (result.crestaId !== undefined) {
            print(`   Cresta ID (flattened): ${result.crestaId}`);
        } else if (result.properties && result.properties.CRESTA_ID1 !== undefined) {
            print(`   Cresta ID (nested): ${result.properties.CRESTA_ID1}`);
        } else {
            print(`   ⚠️ No Cresta ID found`);
        }
    } else {
        print("❌ No Cresta results found");
    }
    
    print("");
}

// Function to test multiple coordinates
function testMultipleCoordinates() {
    print("🧪 Testing multiple coordinates...");
    
    const testPoints = [
        { name: "Achziv", x: 35.1, y: 33.0 },
        { name: "Tel Aviv", x: 34.8, y: 32.1 },
        { name: "Jerusalem", x: 35.2, y: 31.8 },
        { name: "Haifa", x: 35.0, y: 32.8 }
    ];
    
    testPoints.forEach(point => {
        print(`📍 Testing ${point.name} (${point.x}, ${point.y}):`);
        
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
        
        const png25Results = db.getCollection('seismic-hazard-zone').aggregate(png25Pipeline).toArray();
        if (png25Results && png25Results.length > 0) {
            const result = png25Results[0];
            const hazard = result.hazard || (result.properties && result.properties.Hazard);
            print(`   PNG25: ${hazard || 'N/A'} (${result.distance_m}m)`);
        } else {
            print(`   PNG25: No data`);
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
        
        const crestaResults = db.getCollection('cresta-zones').aggregate(crestaPipeline).toArray();
        if (crestaResults && crestaResults.length > 0) {
            const result = crestaResults[0];
            const cresta = result.crestaId || (result.properties && result.properties.CRESTA_ID1);
            print(`   Cresta: ${cresta || 'N/A'} (${result.distance_m}m)`);
        } else {
            print(`   Cresta: No data`);
        }
        
        print("");
    });
}

// Function to test performance
function testPerformance() {
    print("🧪 Testing $geoNear performance...");
    
    const iterations = 100;
    const coordinates = [testCoordinates.x, testCoordinates.y];
    
    // Test PNG25 performance
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
    const png25Time = new Date() - startTime;
    print(`📊 PNG25 $geoNear query (${iterations} iterations): ${png25Time}ms`);
    
    // Test Cresta performance
    const startTime2 = new Date();
    for (let i = 0; i < iterations; i++) {
        db.getCollection('cresta-zones').aggregate([
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
    const crestaTime = new Date() - startTime2;
    print(`📊 Cresta $geoNear query (${iterations} iterations): ${crestaTime}ms`);
    
    print("");
}

// Function to check spatial indexes
function checkSpatialIndexes() {
    print("🧪 Checking spatial indexes...");
    
    // Check seismic hazard zone indexes
    const seismicIndexes = db.getCollection('seismic-hazard-zone').getIndexes();
    print("📊 Seismic hazard zone indexes:");
    seismicIndexes.forEach(index => {
        if (index.key.geometry) {
            print(`   ✅ Spatial index: ${index.name} - ${JSON.stringify(index.key)}`);
        } else {
            print(`   📋 Regular index: ${index.name} - ${JSON.stringify(index.key)}`);
        }
    });
    
    // Check Cresta zones indexes
    const crestaIndexes = db.getCollection('cresta-zones').getIndexes();
    print("📊 Cresta zones indexes:");
    crestaIndexes.forEach(index => {
        if (index.key.geometry) {
            print(`   ✅ Spatial index: ${index.name} - ${JSON.stringify(index.key)}`);
        } else {
            print(`   📋 Regular index: ${index.name} - ${JSON.stringify(index.key)}`);
        }
    });
    
    print("");
}

// Main execution function
function main() {
    print("🚀 Starting $geoNear query testing...");
    print("=" * 50);
    
    try {
        // Test 1: PNG25 query
        testPNG25GeoNear();
        
        // Test 2: Cresta query
        testCrestaGeoNear();
        
        // Test 3: Multiple coordinates
        testMultipleCoordinates();
        
        // Test 4: Performance
        testPerformance();
        
        // Test 5: Spatial indexes
        checkSpatialIndexes();
        
        print("🎉 $geoNear query testing completed!");
        print("=" * 50);
        
    } catch (error) {
        print(`❌ Error during testing: ${error.message}`);
        print(error.stack);
    }
}

// Run the main function
main();
