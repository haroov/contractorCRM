/**
 * URGENT: Create spatial indexes for GIS collections
 * 
 * This script creates the required 2dsphere indexes for $geoNear queries
 * to work properly.
 * 
 * Usage: Run this script in MongoDB Compass shell
 */

// Function to create spatial index for seismic hazard zones
function createSeismicHazardIndex() {
    print("🔄 Creating spatial index for seismic-hazard-zone...");
    
    try {
        const result = db.getCollection('seismic-hazard-zone').createIndex(
            { "geometry": "2dsphere" },
            { 
                name: "geometry_2dsphere",
                background: true
            }
        );
        print(`✅ Created spatial index for seismic-hazard-zone: ${result}`);
    } catch (error) {
        if (error.message.includes("already exists")) {
            print("✅ Spatial index for seismic-hazard-zone already exists");
        } else {
            print(`❌ Error creating spatial index for seismic-hazard-zone: ${error.message}`);
        }
    }
}

// Function to create spatial index for Cresta zones
function createCrestaZonesIndex() {
    print("🔄 Creating spatial index for cresta-zones...");
    
    try {
        const result = db.getCollection('cresta-zones').createIndex(
            { "geometry": "2dsphere" },
            { 
                name: "geometry_2dsphere",
                background: true
            }
        );
        print(`✅ Created spatial index for cresta-zones: ${result}`);
    } catch (error) {
        if (error.message.includes("already exists")) {
            print("✅ Spatial index for cresta-zones already exists");
        } else {
            print(`❌ Error creating spatial index for cresta-zones: ${error.message}`);
        }
    }
}

// Function to create spatial index for earthquake fault zones
function createEarthquakeFaultZonesIndex() {
    print("🔄 Creating spatial index for earthquake-fault-zones...");
    
    try {
        const result = db.getCollection('earthquake-fault-zones').createIndex(
            { "geometry": "2dsphere" },
            { 
                name: "geometry_2dsphere",
                background: true
            }
        );
        print(`✅ Created spatial index for earthquake-fault-zones: ${result}`);
    } catch (error) {
        if (error.message.includes("already exists")) {
            print("✅ Spatial index for earthquake-fault-zones already exists");
        } else {
            print(`❌ Error creating spatial index for earthquake-fault-zones: ${error.message}`);
        }
    }
}

// Function to create spatial index for earthquake fault zone 2
function createEarthquakeFaultZone2Index() {
    print("🔄 Creating spatial index for earthquake-fault-zone-2...");
    
    try {
        const result = db.getCollection('earthquake-fault-zone-2').createIndex(
            { "geometry": "2dsphere" },
            { 
                name: "geometry_2dsphere",
                background: true
            }
        );
        print(`✅ Created spatial index for earthquake-fault-zone-2: ${result}`);
    } catch (error) {
        if (error.message.includes("already exists")) {
            print("✅ Spatial index for earthquake-fault-zone-2 already exists");
        } else {
            print(`❌ Error creating spatial index for earthquake-fault-zone-2: ${error.message}`);
        }
    }
}

// Function to list all indexes
function listAllIndexes() {
    print("📊 Listing all indexes...");
    
    const collections = ['seismic-hazard-zone', 'cresta-zones', 'earthquake-fault-zones', 'earthquake-fault-zone-2'];
    
    collections.forEach(collectionName => {
        print(`\n📋 Indexes for ${collectionName}:`);
        try {
            const indexes = db.getCollection(collectionName).getIndexes();
            indexes.forEach(index => {
                if (index.key.geometry) {
                    print(`   ✅ Spatial: ${index.name} - ${JSON.stringify(index.key)}`);
                } else {
                    print(`   📋 Regular: ${index.name} - ${JSON.stringify(index.key)}`);
                }
            });
        } catch (error) {
            print(`   ❌ Error listing indexes for ${collectionName}: ${error.message}`);
        }
    });
}

// Function to test $geoNear after creating indexes
function testGeoNearAfterIndexes() {
    print("🧪 Testing $geoNear after creating indexes...");
    
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
        } else {
            print("⚠️ PNG25 query returned no results");
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
        } else {
            print("⚠️ Cresta query returned no results");
        }
    } catch (error) {
        print(`❌ Cresta query failed: ${error.message}`);
    }
}

// Main execution function
function main() {
    print("🚀 URGENT: Creating spatial indexes for GIS collections...");
    print("=" * 60);
    
    try {
        // Step 1: Create spatial indexes
        createSeismicHazardIndex();
        print("");
        
        createCrestaZonesIndex();
        print("");
        
        createEarthquakeFaultZonesIndex();
        print("");
        
        createEarthquakeFaultZone2Index();
        print("");
        
        // Step 2: List all indexes
        listAllIndexes();
        print("");
        
        // Step 3: Test $geoNear queries
        testGeoNearAfterIndexes();
        print("");
        
        print("🎉 Spatial indexes creation completed!");
        print("=" * 60);
        
    } catch (error) {
        print(`❌ Error during spatial index creation: ${error.message}`);
        print(error.stack);
    }
}

// Run the main function
main();
