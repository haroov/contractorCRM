/**
 * Script to test flattened GIS data structure
 * 
 * This script tests the flattened GIS data to ensure it works correctly
 * with the updated GIS service.
 * 
 * Usage: Run this script in MongoDB Compass shell
 */

// Test coordinates for Achziv
const testCoordinates = {
    x: 35.1, // longitude
    y: 33.0  // latitude
};

// Function to test seismic hazard zone queries
function testSeismicHazardZones() {
    print("🧪 Testing seismic hazard zone queries...");

    const collection = db.getCollection('seismic-hazard-zone');

    // Test 1: Count documents
    const count = collection.countDocuments();
    print(`📊 Total seismic hazard zone documents: ${count}`);

    // Test 2: Find documents with hazard values
    const hazardDocs = collection.find({ hazard: { $exists: true } }).toArray();
    print(`📊 Documents with hazard values: ${hazardDocs.length}`);

    // Test 3: Test point-in-polygon for Achziv
    const achzivQuery = {
        geometry: {
            $geoIntersects: {
                $geometry: {
                    type: "Point",
                    coordinates: [testCoordinates.x, testCoordinates.y]
                }
            }
        }
    };

    const achzivResult = collection.findOne(achzivQuery);
    if (achzivResult) {
        print(`✅ Found seismic hazard zone for Achziv: ${achzivResult.hazard}`);
        print(`   Document ID: ${achzivResult._id}`);
        print(`   Name: ${achzivResult.name}`);
    } else {
        print("❌ No seismic hazard zone found for Achziv coordinates");
    }

    // Test 4: List all hazard values
    const hazardValues = collection.distinct("hazard");
    print(`📊 Available hazard values: ${hazardValues.join(", ")}`);

    print("");
}

// Function to test Cresta zones queries
function testCrestaZones() {
    print("🧪 Testing Cresta zones queries...");

    const collection = db.getCollection('cresta-zones');

    // Test 1: Count documents
    const count = collection.countDocuments();
    print(`📊 Total Cresta zone documents: ${count}`);

    // Test 2: Find documents with crestaId values
    const crestaDocs = collection.find({ crestaId: { $exists: true } }).toArray();
    print(`📊 Documents with crestaId values: ${crestaDocs.length}`);

    // Test 3: Test point-in-polygon for Achziv
    const achzivQuery = {
        geometry: {
            $geoIntersects: {
                $geometry: {
                    type: "Point",
                    coordinates: [testCoordinates.x, testCoordinates.y]
                }
            }
        }
    };

    const achzivResult = collection.findOne(achzivQuery);
    if (achzivResult) {
        print(`✅ Found Cresta zone for Achziv: ${achzivResult.crestaId}`);
        print(`   Document ID: ${achzivResult._id}`);
        print(`   Name: ${achzivResult.name}`);
    } else {
        print("❌ No Cresta zone found for Achziv coordinates");
    }

    // Test 4: List all Cresta IDs
    const crestaIds = collection.distinct("crestaId");
    print(`📊 Available Cresta IDs: ${crestaIds.join(", ")}`);

    print("");
}

// Function to test spatial indexes
function testSpatialIndexes() {
    print("🧪 Testing spatial indexes...");

    // Test seismic hazard zone indexes
    const seismicIndexes = db.getCollection('seismic-hazard-zone').getIndexes();
    print("📊 Seismic hazard zone indexes:");
    seismicIndexes.forEach(index => {
        print(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Test Cresta zones indexes
    const crestaIndexes = db.getCollection('cresta-zones').getIndexes();
    print("📊 Cresta zones indexes:");
    crestaIndexes.forEach(index => {
        print(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    print("");
}

// Function to test performance
function testPerformance() {
    print("🧪 Testing query performance...");

    const iterations = 100;
    const coordinates = [testCoordinates.x, testCoordinates.y];

    // Test seismic hazard zone query performance
    const startTime = new Date();
    for (let i = 0; i < iterations; i++) {
        db.getCollection('seismic-hazard-zone').findOne({
            geometry: {
                $geoIntersects: {
                    $geometry: {
                        type: "Point",
                        coordinates: coordinates
                    }
                }
            }
        });
    }
    const seismicTime = new Date() - startTime;
    print(`📊 Seismic hazard zone query (${iterations} iterations): ${seismicTime}ms`);

    // Test Cresta zones query performance
    const startTime2 = new Date();
    for (let i = 0; i < iterations; i++) {
        db.getCollection('cresta-zones').findOne({
            geometry: {
                $geoIntersects: {
                    $geometry: {
                        type: "Point",
                        coordinates: coordinates
                    }
                }
            }
        });
    }
    const crestaTime = new Date() - startTime2;
    print(`📊 Cresta zones query (${iterations} iterations): ${crestaTime}ms`);

    print("");
}

// Function to show sample documents
function showSampleDocuments() {
    print("🧪 Sample documents structure...");

    // Show seismic hazard zone sample
    const seismicSample = db.getCollection('seismic-hazard-zone').findOne();
    if (seismicSample) {
        print("📊 Seismic hazard zone sample document:");
        print(JSON.stringify(seismicSample, null, 2));
    }

    print("");

    // Show Cresta zones sample
    const crestaSample = db.getCollection('cresta-zones').findOne();
    if (crestaSample) {
        print("📊 Cresta zones sample document:");
        print(JSON.stringify(crestaSample, null, 2));
    }

    print("");
}

// Main execution function
function main() {
    print("🚀 Starting flattened GIS data testing...");
    print("=" * 50);

    try {
        // Test 1: Seismic hazard zones
        testSeismicHazardZones();

        // Test 2: Cresta zones
        testCrestaZones();

        // Test 3: Spatial indexes
        testSpatialIndexes();

        // Test 4: Performance
        testPerformance();

        // Test 5: Sample documents
        showSampleDocuments();

        print("🎉 Flattened GIS data testing completed!");
        print("=" * 50);

    } catch (error) {
        print(`❌ Error during testing: ${error.message}`);
        print(error.stack);
    }
}

// Run the main function
main();
