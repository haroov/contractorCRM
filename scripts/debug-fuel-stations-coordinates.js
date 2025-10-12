const { MongoClient } = require('mongodb');

/**
 * Script to debug fuel station coordinates and find the issue
 * This will help identify why fuel stations are not found correctly for Achziv area
 */

async function debugFuelStationsCoordinates() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/contractor-crm';
    const client = new MongoClient(mongoUri);

    try {
        console.log('🔗 Connecting to MongoDB...');
        await client.connect();
        console.log('✅ Connected to MongoDB');

        // Connect to the GIS database
        const gisDb = client.db('GIS');
        const fuelStationCollection = gisDb.collection('fuelStation');

        // Test coordinates for Achziv area
        const achzivCoords = [35.102275, 33.04187]; // [longitude, latitude]
        const achzivCoordsReversed = [33.04187, 35.102275]; // [latitude, longitude]

        console.log(`🔍 Testing coordinates for Achziv area:`);
        console.log(`  Standard: [${achzivCoords.join(', ')}] (longitude, latitude)`);
        console.log(`  Reversed: [${achzivCoordsReversed.join(', ')}] (latitude, longitude)`);

        // Get total count
        const totalCount = await fuelStationCollection.countDocuments();
        console.log(`📊 Total fuel stations: ${totalCount}`);

        if (totalCount === 0) {
            console.log('⚠️ No fuel stations found in collection!');
            return;
        }

        // Test 1: Find fuel stations near Achziv with standard coordinates
        console.log('\n🧪 Test 1: Standard coordinates [longitude, latitude]');
        try {
            const pipeline1 = [
                {
                    $geoNear: {
                        near: { type: "Point", coordinates: achzivCoords },
                        key: "geometry",
                        spherical: true,
                        distanceField: "distanceKM",
                        distanceMultiplier: 0.001
                    }
                },
                { $limit: 3 },
                {
                    $project: {
                        _id: 0,
                        name: { $ifNull: ["$properties.Name", "$Name", "$properties.name"] },
                        coordinates: "$geometry.coordinates",
                        distanceKM: { $round: ["$distanceKM", 3] }
                    }
                }
            ];

            const results1 = await fuelStationCollection.aggregate(pipeline1).toArray();
            console.log(`Found ${results1.length} fuel stations:`);
            results1.forEach((station, i) => {
                console.log(`  ${i + 1}. ${station.name} - Distance: ${station.distanceKM}km - Coords: [${station.coordinates.join(', ')}]`);
            });
        } catch (error) {
            console.log('❌ Test 1 failed:', error.message);
        }

        // Test 2: Find fuel stations near Achziv with reversed coordinates
        console.log('\n🧪 Test 2: Reversed coordinates [latitude, longitude]');
        try {
            const pipeline2 = [
                {
                    $geoNear: {
                        near: { type: "Point", coordinates: achzivCoordsReversed },
                        key: "geometry",
                        spherical: true,
                        distanceField: "distanceKM",
                        distanceMultiplier: 0.001
                    }
                },
                { $limit: 3 },
                {
                    $project: {
                        _id: 0,
                        name: { $ifNull: ["$properties.Name", "$Name", "$properties.name"] },
                        coordinates: "$geometry.coordinates",
                        distanceKM: { $round: ["$distanceKM", 3] }
                    }
                }
            ];

            const results2 = await fuelStationCollection.aggregate(pipeline2).toArray();
            console.log(`Found ${results2.length} fuel stations:`);
            results2.forEach((station, i) => {
                console.log(`  ${i + 1}. ${station.name} - Distance: ${station.distanceKM}km - Coords: [${station.coordinates.join(', ')}]`);
            });
        } catch (error) {
            console.log('❌ Test 2 failed:', error.message);
        }

        // Test 3: Find fuel stations in northern Israel (near Achziv)
        console.log('\n🧪 Test 3: Search in northern Israel area');
        try {
            const northernIsraelCoords = [35.0, 33.0]; // Approximate center of northern Israel
            const pipeline3 = [
                {
                    $geoNear: {
                        near: { type: "Point", coordinates: northernIsraelCoords },
                        key: "geometry",
                        spherical: true,
                        distanceField: "distanceKM",
                        distanceMultiplier: 0.001
                    }
                },
                { $limit: 5 },
                {
                    $project: {
                        _id: 0,
                        name: { $ifNull: ["$properties.Name", "$Name", "$properties.name"] },
                        coordinates: "$geometry.coordinates",
                        distanceKM: { $round: ["$distanceKM", 3] }
                    }
                }
            ];

            const results3 = await fuelStationCollection.aggregate(pipeline3).toArray();
            console.log(`Found ${results3.length} fuel stations in northern Israel:`);
            results3.forEach((station, i) => {
                console.log(`  ${i + 1}. ${station.name} - Distance: ${station.distanceKM}km - Coords: [${station.coordinates.join(', ')}]`);
            });
        } catch (error) {
            console.log('❌ Test 3 failed:', error.message);
        }

        // Test 4: Check sample fuel station coordinates
        console.log('\n🧪 Test 4: Sample fuel station coordinates');
        try {
            const sampleStations = await fuelStationCollection.find({}).limit(5).toArray();
            console.log('Sample fuel stations:');
            sampleStations.forEach((station, i) => {
                const coords = station.geometry?.coordinates;
                const name = station.properties?.Name || station.properties?.name || station.Name || 'Unknown';
                console.log(`  ${i + 1}. ${name} - Coords: [${coords?.join(', ')}]`);
            });
        } catch (error) {
            console.log('❌ Test 4 failed:', error.message);
        }

        // Test 5: Check if there are any fuel stations in the Achziv area
        console.log('\n🧪 Test 5: Check for fuel stations in Achziv area (within 50km)');
        try {
            const pipeline5 = [
                {
                    $geoNear: {
                        near: { type: "Point", coordinates: achzivCoords },
                        key: "geometry",
                        spherical: true,
                        distanceField: "distanceKM",
                        distanceMultiplier: 0.001,
                        maxDistance: 50000 // 50km in meters
                    }
                },
                { $limit: 10 },
                {
                    $project: {
                        _id: 0,
                        name: { $ifNull: ["$properties.Name", "$Name", "$properties.name"] },
                        coordinates: "$geometry.coordinates",
                        distanceKM: { $round: ["$distanceKM", 3] }
                    }
                }
            ];

            const results5 = await fuelStationCollection.aggregate(pipeline5).toArray();
            console.log(`Found ${results5.length} fuel stations within 50km of Achziv:`);
            results5.forEach((station, i) => {
                console.log(`  ${i + 1}. ${station.name} - Distance: ${station.distanceKM}km - Coords: [${station.coordinates.join(', ')}]`);
            });
        } catch (error) {
            console.log('❌ Test 5 failed:', error.message);
        }

    } catch (error) {
        console.error('❌ Error debugging fuel stations:', error);
        throw error;
    } finally {
        await client.close();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the script
if (require.main === module) {
    debugFuelStationsCoordinates()
        .then(() => {
            console.log('🎉 Fuel stations debugging completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Fuel stations debugging failed:', error);
            process.exit(1);
        });
}

module.exports = { debugFuelStationsCoordinates };
