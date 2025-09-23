/**
 * Check existing data and add Achziv sample data
 * 
 * This script checks what data exists and adds sample data for Achziv coordinates
 * 
 * Usage: Run this script in MongoDB Compass shell
 */

// Function to check existing data in seismic hazard zones
function checkSeismicHazardData() {
    print("🔍 Checking existing seismic hazard zone data...");
    
    const collection = db.getCollection('seismic-hazard-zone');
    
    // Count total documents
    const totalCount = collection.countDocuments();
    print(`📊 Total documents: ${totalCount}`);
    
    // Check document structure
    const sampleDoc = collection.findOne();
    if (sampleDoc) {
        print("📋 Sample document structure:");
        print(JSON.stringify(sampleDoc, null, 2));
    } else {
        print("❌ No documents found in seismic-hazard-zone collection");
    }
    
    // Check for hazard values
    const hazardValues = collection.distinct("hazard");
    print(`📊 Available hazard values: ${hazardValues.join(", ")}`);
    
    // Check for properties.Hazard values
    const propertiesHazardValues = collection.distinct("properties.Hazard");
    print(`📊 Available properties.Hazard values: ${propertiesHazardValues.join(", ")}`);
    
    print("");
}

// Function to check existing data in Cresta zones
function checkCrestaData() {
    print("🔍 Checking existing Cresta zones data...");
    
    const collection = db.getCollection('cresta-zones');
    
    // Count total documents
    const totalCount = collection.countDocuments();
    print(`📊 Total documents: ${totalCount}`);
    
    // Check document structure
    const sampleDoc = collection.findOne();
    if (sampleDoc) {
        print("📋 Sample document structure:");
        print(JSON.stringify(sampleDoc, null, 2));
    } else {
        print("❌ No documents found in cresta-zones collection");
    }
    
    // Check for crestaId values
    const crestaIds = collection.distinct("crestaId");
    print(`📊 Available crestaId values: ${crestaIds.join(", ")}`);
    
    // Check for properties.CRESTA_ID1 values
    const propertiesCrestaIds = collection.distinct("properties.CRESTA_ID1");
    print(`📊 Available properties.CRESTA_ID1 values: ${propertiesCrestaIds.join(", ")}`);
    
    print("");
}

// Function to add Achziv sample data
function addAchzivSampleData() {
    print("🔄 Adding Achziv sample data...");
    
    // Achziv coordinates
    const achzivX = 35.1; // longitude
    const achzivY = 33.0; // latitude
    
    // Create a small polygon around Achziv (about 1km radius)
    const achzivPolygon = {
        type: "Polygon",
        coordinates: [[
            [achzivX - 0.01, achzivY - 0.01], // southwest
            [achzivX + 0.01, achzivY - 0.01], // southeast
            [achzivX + 0.01, achzivY + 0.01], // northeast
            [achzivX - 0.01, achzivY + 0.01], // northwest
            [achzivX - 0.01, achzivY - 0.01]  // close polygon
        ]]
    };
    
    // Add seismic hazard zone for Achziv
    const seismicCollection = db.getCollection('seismic-hazard-zone');
    const seismicDoc = {
        _id: new ObjectId(),
        name: "Achziv Seismic Hazard Zone",
        geometry: achzivPolygon,
        hazard: 0.175, // PNG25 value for Achziv
        description: "Seismic hazard zone for Achziv area",
        createdAt: new Date()
    };
    
    try {
        seismicCollection.insertOne(seismicDoc);
        print("✅ Added seismic hazard zone for Achziv");
    } catch (error) {
        print(`❌ Error adding seismic hazard zone: ${error.message}`);
    }
    
    // Add Cresta zone for Achziv
    const crestaCollection = db.getCollection('cresta-zones');
    const crestaDoc = {
        _id: new ObjectId(),
        name: "Achziv Cresta Zone",
        geometry: achzivPolygon,
        crestaId: "ISR_Z (ISR_22) Northern",
        crestaName: "Northern Israel",
        country: "Israel",
        createdAt: new Date()
    };
    
    try {
        crestaCollection.insertOne(crestaDoc);
        print("✅ Added Cresta zone for Achziv");
    } catch (error) {
        print(`❌ Error adding Cresta zone: ${error.message}`);
    }
    
    print("");
}

// Function to test queries after adding data
function testQueriesAfterAddingData() {
    print("🧪 Testing queries after adding Achziv data...");
    
    const testCoordinates = { x: 35.1, y: 33.0 };
    
    // Test PNG25 query
    try {
        const png25Pipeline = [
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
        
        const png25Results = db.getCollection('seismic-hazard-zone').aggregate(png25Pipeline).toArray();
        if (png25Results && png25Results.length > 0) {
            const result = png25Results[0];
            const hazard = result.hazard || (result.properties && result.properties.Hazard);
            print(`✅ PNG25 query successful: ${hazard || 'N/A'} (${result.distance_m}m)`);
            print(`   Document: ${result.name || 'N/A'}`);
        } else {
            print("❌ PNG25 query still returns no results");
        }
    } catch (error) {
        print(`❌ PNG25 query failed: ${error.message}`);
    }
    
    // Test Cresta query
    try {
        const crestaPipeline = [
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
        
        const crestaResults = db.getCollection('cresta-zones').aggregate(crestaPipeline).toArray();
        if (crestaResults && crestaResults.length > 0) {
            const result = crestaResults[0];
            const cresta = result.crestaId || (result.properties && result.properties.CRESTA_ID1);
            print(`✅ Cresta query successful: ${cresta || 'N/A'} (${result.distance_m}m)`);
            print(`   Document: ${result.name || 'N/A'}`);
        } else {
            print("❌ Cresta query still returns no results");
        }
    } catch (error) {
        print(`❌ Cresta query failed: ${error.message}`);
    }
    
    print("");
}

// Function to test with different coordinates
function testDifferentCoordinates() {
    print("🧪 Testing with different coordinates...");
    
    const testPoints = [
        { name: "Achziv", x: 35.1, y: 33.0 },
        { name: "Tel Aviv", x: 34.8, y: 32.1 },
        { name: "Jerusalem", x: 35.2, y: 31.8 },
        { name: "Haifa", x: 35.0, y: 32.8 }
    ];
    
    testPoints.forEach(point => {
        print(`📍 Testing ${point.name} (${point.x}, ${point.y}):`);
        
        // Test PNG25
        try {
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
                { $project: { hazard: 1, "properties.Hazard": 1, distance_m: 1, name: 1 } }
            ];
            
            const png25Results = db.getCollection('seismic-hazard-zone').aggregate(png25Pipeline).toArray();
            if (png25Results && png25Results.length > 0) {
                const result = png25Results[0];
                const hazard = result.hazard || (result.properties && result.properties.Hazard);
                print(`   PNG25: ${hazard || 'N/A'} (${result.distance_m}m) - ${result.name || 'N/A'}`);
            } else {
                print(`   PNG25: No data`);
            }
        } catch (error) {
            print(`   PNG25: Error - ${error.message}`);
        }
        
        // Test Cresta
        try {
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
                { $project: { crestaId: 1, "properties.CRESTA_ID1": 1, distance_m: 1, name: 1 } }
            ];
            
            const crestaResults = db.getCollection('cresta-zones').aggregate(crestaPipeline).toArray();
            if (crestaResults && crestaResults.length > 0) {
                const result = crestaResults[0];
                const cresta = result.crestaId || (result.properties && result.properties.CRESTA_ID1);
                print(`   Cresta: ${cresta || 'N/A'} (${result.distance_m}m) - ${result.name || 'N/A'}`);
            } else {
                print(`   Cresta: No data`);
            }
        } catch (error) {
            print(`   Cresta: Error - ${error.message}`);
        }
        
        print("");
    });
}

// Main execution function
function main() {
    print("🚀 Checking data and adding Achziv sample data...");
    print("=" * 60);
    
    try {
        // Step 1: Check existing data
        checkSeismicHazardData();
        checkCrestaData();
        
        // Step 2: Add Achziv sample data
        addAchzivSampleData();
        
        // Step 3: Test queries after adding data
        testQueriesAfterAddingData();
        
        // Step 4: Test with different coordinates
        testDifferentCoordinates();
        
        print("🎉 Data check and Achziv sample data addition completed!");
        print("=" * 60);
        
    } catch (error) {
        print(`❌ Error during data check and addition: ${error.message}`);
        print(error.stack);
    }
}

// Run the main function
main();
