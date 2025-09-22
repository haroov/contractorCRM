/**
 * Script to flatten GIS data structure in MongoDB Atlas
 * 
 * This script converts the nested GeoJSON structure to a flattened structure
 * where each document represents a single feature with properties at the root level.
 * 
 * Usage: Run this script in MongoDB Compass shell
 */

// Function to flatten seismic hazard zone data
function flattenSeismicHazardZones() {
    print("🔄 Starting to flatten seismic hazard zone data...");

    const collection = db.getCollection('seismic-hazard-zone');
    const documents = collection.find({}).toArray();

    let flattenedCount = 0;

    documents.forEach(doc => {
        if (doc.type === 'FeatureCollection' && doc.features && doc.features.length > 0) {
            // Process each feature in the collection
            doc.features.forEach((feature, index) => {
                if (feature.type === 'Feature' &&
                    feature.geometry &&
                    feature.geometry.type === 'Polygon' &&
                    feature.properties &&
                    feature.properties.Hazard !== undefined) {

                    // Create flattened document
                    const flattenedDoc = {
                        _id: new ObjectId(),
                        name: doc.name || `Seismic Hazard Zone ${index + 1}`,
                        geometry: feature.geometry,
                        hazard: feature.properties.Hazard,
                        description: feature.properties.Description || null,
                        createdAt: new Date(),
                        originalDocId: doc._id
                    };

                    // Insert flattened document
                    collection.insertOne(flattenedDoc);
                    flattenedCount++;

                    print(`✅ Flattened seismic hazard zone: ${feature.properties.Hazard}`);
                }
            });

            // Remove original nested document
            collection.deleteOne({ _id: doc._id });
            print(`🗑️ Removed original nested document: ${doc._id}`);
        }
    });

    print(`🎉 Flattened ${flattenedCount} seismic hazard zones`);
}

// Function to flatten Cresta zones data
function flattenCrestaZones() {
    print("🔄 Starting to flatten Cresta zones data...");

    const collection = db.getCollection('cresta-zones');
    const documents = collection.find({}).toArray();

    let flattenedCount = 0;

    documents.forEach(doc => {
        if (doc.type === 'FeatureCollection' && doc.features && doc.features.length > 0) {
            // Process each feature in the collection
            doc.features.forEach((feature, index) => {
                if (feature.type === 'Feature' &&
                    feature.geometry &&
                    feature.geometry.type === 'Polygon' &&
                    feature.properties &&
                    feature.properties.CRESTA_ID1) {

                    // Create flattened document
                    const flattenedDoc = {
                        _id: new ObjectId(),
                        name: doc.name || `Cresta Zone ${index + 1}`,
                        geometry: feature.geometry,
                        crestaId: feature.properties.CRESTA_ID1,
                        crestaName: feature.properties.CRESTA_NAME || null,
                        country: feature.properties.COUNTRY || null,
                        createdAt: new Date(),
                        originalDocId: doc._id
                    };

                    // Insert flattened document
                    collection.insertOne(flattenedDoc);
                    flattenedCount++;

                    print(`✅ Flattened Cresta zone: ${feature.properties.CRESTA_ID1}`);
                }
            });

            // Remove original nested document
            collection.deleteOne({ _id: doc._id });
            print(`🗑️ Removed original nested document: ${doc._id}`);
        }
    });

    print(`🎉 Flattened ${flattenedCount} Cresta zones`);
}

// Function to create spatial indexes for flattened data
function createSpatialIndexes() {
    print("🔄 Creating spatial indexes for flattened data...");

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

// Function to add sample data for Achziv area
function addAchzivSampleData() {
    print("🔄 Adding sample data for Achziv area...");

    // Achziv coordinates (approximate)
    const achzivX = 35.1; // longitude
    const achzivY = 33.0; // latitude

    // Create a small polygon around Achziv
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

    seismicCollection.insertOne(seismicDoc);
    print("✅ Added seismic hazard zone for Achziv");

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

    crestaCollection.insertOne(crestaDoc);
    print("✅ Added Cresta zone for Achziv");
}

// Main execution function
function main() {
    print("🚀 Starting GIS data flattening process...");
    print("=" * 50);

    try {
        // Step 1: Flatten seismic hazard zones
        flattenSeismicHazardZones();
        print("");

        // Step 2: Flatten Cresta zones
        flattenCrestaZones();
        print("");

        // Step 3: Create spatial indexes
        createSpatialIndexes();
        print("");

        // Step 4: Add sample data for Achziv
        addAchzivSampleData();
        print("");

        print("🎉 GIS data flattening completed successfully!");
        print("=" * 50);

    } catch (error) {
        print(`❌ Error during flattening process: ${error.message}`);
        print(error.stack);
    }
}

// Run the main function
main();

