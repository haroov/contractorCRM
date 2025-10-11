/**
 * Script to add sample GIS data for testing
 * 
 * This script adds sample data for Achziv and other locations
 * to test the $geoNear queries.
 * 
 * Usage: Run this script in MongoDB Compass shell
 */

// Function to add sample seismic hazard zones
function addSampleSeismicHazardZones() {
    print("🔄 Adding sample seismic hazard zones...");

    const collection = db.getCollection('seismic-hazard-zone');

    // Sample data for different locations
    const sampleZones = [
        {
            name: "Achziv Seismic Hazard Zone",
            geometry: {
                type: "Polygon",
                coordinates: [[
                    [35.09, 32.99], // southwest
                    [35.11, 32.99], // southeast
                    [35.11, 33.01], // northeast
                    [35.09, 33.01], // northwest
                    [35.09, 32.99]  // close polygon
                ]]
            },
            hazard: 0.175,
            description: "Seismic hazard zone for Achziv area",
            createdAt: new Date()
        },
        {
            name: "Tel Aviv Seismic Hazard Zone",
            geometry: {
                type: "Polygon",
                coordinates: [[
                    [34.79, 32.09], // southwest
                    [34.81, 32.09], // southeast
                    [34.81, 32.11], // northeast
                    [34.79, 32.11], // northwest
                    [34.79, 32.09]  // close polygon
                ]]
            },
            hazard: 0.15,
            description: "Seismic hazard zone for Tel Aviv area",
            createdAt: new Date()
        },
        {
            name: "Jerusalem Seismic Hazard Zone",
            geometry: {
                type: "Polygon",
                coordinates: [[
                    [35.19, 31.79], // southwest
                    [35.21, 31.79], // southeast
                    [35.21, 31.81], // northeast
                    [35.19, 31.81], // northwest
                    [35.19, 31.79]  // close polygon
                ]]
            },
            hazard: 0.12,
            description: "Seismic hazard zone for Jerusalem area",
            createdAt: new Date()
        },
        {
            name: "Haifa Seismic Hazard Zone",
            geometry: {
                type: "Polygon",
                coordinates: [[
                    [34.99, 32.79], // southwest
                    [35.01, 32.79], // southeast
                    [35.01, 32.81], // northeast
                    [34.99, 32.81], // northwest
                    [34.99, 32.79]  // close polygon
                ]]
            },
            hazard: 0.18,
            description: "Seismic hazard zone for Haifa area",
            createdAt: new Date()
        }
    ];

    let addedCount = 0;

    sampleZones.forEach(zone => {
        try {
            collection.insertOne(zone);
            addedCount++;
            print(`✅ Added seismic hazard zone: ${zone.name} (hazard: ${zone.hazard})`);
        } catch (error) {
            print(`❌ Error adding ${zone.name}: ${error.message}`);
        }
    });

    print(`🎉 Added ${addedCount} seismic hazard zones`);
}

// Function to add sample Cresta zones
function addSampleCrestaZones() {
    print("🔄 Adding sample Cresta zones...");

    const collection = db.getCollection('cresta-zones');

    // Sample data for different locations
    const sampleZones = [
        {
            name: "Achziv Cresta Zone",
            geometry: {
                type: "Polygon",
                coordinates: [[
                    [35.09, 32.99], // southwest
                    [35.11, 32.99], // southeast
                    [35.11, 33.01], // northeast
                    [35.09, 33.01], // northwest
                    [35.09, 32.99]  // close polygon
                ]]
            },
            crestaId: "ISR_Z (ISR_22) Northern",
            crestaName: "Northern Israel",
            country: "Israel",
            createdAt: new Date()
        },
        {
            name: "Tel Aviv Cresta Zone",
            geometry: {
                type: "Polygon",
                coordinates: [[
                    [34.79, 32.09], // southwest
                    [34.81, 32.09], // southeast
                    [34.81, 32.11], // northeast
                    [34.79, 32.11], // northwest
                    [34.79, 32.09]  // close polygon
                ]]
            },
            crestaId: "ISR_Z (ISR_11) Central",
            crestaName: "Central Israel",
            country: "Israel",
            createdAt: new Date()
        },
        {
            name: "Jerusalem Cresta Zone",
            geometry: {
                type: "Polygon",
                coordinates: [[
                    [35.19, 31.79], // southwest
                    [35.21, 31.79], // southeast
                    [35.21, 31.81], // northeast
                    [35.19, 31.81], // northwest
                    [35.19, 31.79]  // close polygon
                ]]
            },
            crestaId: "ISR_Z (ISR_33) Southern",
            crestaName: "Southern Israel",
            country: "Israel",
            createdAt: new Date()
        },
        {
            name: "Haifa Cresta Zone",
            geometry: {
                type: "Polygon",
                coordinates: [[
                    [34.99, 32.79], // southwest
                    [35.01, 32.79], // southeast
                    [35.01, 32.81], // northeast
                    [34.99, 32.81], // northwest
                    [34.99, 32.79]  // close polygon
                ]]
            },
            crestaId: "ISR_Z (ISR_22) Northern",
            crestaName: "Northern Israel",
            country: "Israel",
            createdAt: new Date()
        }
    ];

    let addedCount = 0;

    sampleZones.forEach(zone => {
        try {
            collection.insertOne(zone);
            addedCount++;
            print(`✅ Added Cresta zone: ${zone.name} (ID: ${zone.crestaId})`);
        } catch (error) {
            print(`❌ Error adding ${zone.name}: ${error.message}`);
        }
    });

    print(`🎉 Added ${addedCount} Cresta zones`);
}

// Function to create spatial indexes
function createSpatialIndexes() {
    print("🔄 Creating spatial indexes...");

    // Create index for seismic hazard zones
    try {
        db.getCollection('seismic-hazard-zone').createIndex(
            { "geometry": "2dsphere" },
            { name: "geometry_2dsphere" }
        );
        print("✅ Created spatial index for seismic-hazard-zone");
    } catch (error) {
        print(`⚠️ Error creating spatial index for seismic-hazard-zone: ${error.message}`);
    }

    // Create index for Cresta zones
    try {
        db.getCollection('cresta-zones').createIndex(
            { "geometry": "2dsphere" },
            { name: "geometry_2dsphere" }
        );
        print("✅ Created spatial index for cresta-zones");
    } catch (error) {
        print(`⚠️ Error creating spatial index for cresta-zones: ${error.message}`);
    }
}

// Function to test the added data
function testAddedData() {
    print("🧪 Testing added sample data...");

    const testCoordinates = [
        { name: "Achziv", x: 35.1, y: 33.0 },
        { name: "Tel Aviv", x: 34.8, y: 32.1 },
        { name: "Jerusalem", x: 35.2, y: 31.8 },
        { name: "Haifa", x: 35.0, y: 32.8 }
    ];

    testCoordinates.forEach(point => {
        print(`\n📍 Testing ${point.name} (${point.x}, ${point.y}):`);

        // Test PNG25
        const png25Result = db.getCollection('seismic-hazard-zone').aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [point.x, point.y] },
                    key: "geometry",
                    spherical: true,
                    distanceField: "distance_m"
                }
            },
            { $limit: 1 },
            { $project: { hazard: 1, distance_m: 1, name: 1 } }
        ]).toArray();

        if (png25Result && png25Result.length > 0) {
            print(`   PNG25: ${png25Result[0].hazard} (${png25Result[0].distance_m}m) - ${png25Result[0].name}`);
        } else {
            print(`   PNG25: Not found`);
        }

        // Test Cresta
        const crestaResult = db.getCollection('cresta-zones').aggregate([
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [point.x, point.y] },
                    key: "geometry",
                    spherical: true,
                    distanceField: "distance_m"
                }
            },
            { $limit: 1 },
            { $project: { crestaId: 1, distance_m: 1, name: 1 } }
        ]).toArray();

        if (crestaResult && crestaResult.length > 0) {
            print(`   Cresta: ${crestaResult[0].crestaId} (${crestaResult[0].distance_m}m) - ${crestaResult[0].name}`);
        } else {
            print(`   Cresta: Not found`);
        }
    });
}

// Main execution function
function main() {
    print("🚀 Starting sample GIS data addition...");
    print("=" * 50);

    try {
        // Step 1: Add sample seismic hazard zones
        addSampleSeismicHazardZones();
        print("");

        // Step 2: Add sample Cresta zones
        addSampleCrestaZones();
        print("");

        // Step 3: Create spatial indexes
        createSpatialIndexes();
        print("");

        // Step 4: Test the added data
        testAddedData();
        print("");

        print("🎉 Sample GIS data addition completed successfully!");
        print("=" * 50);

    } catch (error) {
        print(`❌ Error during data addition: ${error.message}`);
        print(error.stack);
    }
}

// Run the main function
main();
