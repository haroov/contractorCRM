/**
 * QUICK: Add Achziv sample data
 * 
 * This script quickly adds sample data for Achziv coordinates
 * 
 * Usage: Run this script in MongoDB Compass shell
 */

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
const seismicDoc = {
    _id: new ObjectId(),
    name: "Achziv Seismic Hazard Zone",
    geometry: achzivPolygon,
    hazard: 0.175, // PNG25 value for Achziv
    description: "Seismic hazard zone for Achziv area",
    createdAt: new Date()
};

db.getCollection('seismic-hazard-zone').insertOne(seismicDoc);
print("✅ Added seismic hazard zone for Achziv");

// Add Cresta zone for Achziv
const crestaDoc = {
    _id: new ObjectId(),
    name: "Achziv Cresta Zone",
    geometry: achzivPolygon,
    crestaId: "ISR_Z (ISR_22) Northern",
    crestaName: "Northern Israel",
    country: "Israel",
    createdAt: new Date()
};

db.getCollection('cresta-zones').insertOne(crestaDoc);
print("✅ Added Cresta zone for Achziv");

print("🎉 Achziv sample data added successfully!");

// Test the queries
print("\n🧪 Testing queries...");

// Test PNG25 query
const png25Pipeline = [
    {
        $geoNear: {
            near: { type: "Point", coordinates: [achzivX, achzivY] },
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
    print("❌ PNG25 query still returns no results");
}

// Test Cresta query
const crestaPipeline = [
    {
        $geoNear: {
            near: { type: "Point", coordinates: [achzivX, achzivY] },
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
    print("❌ Cresta query still returns no results");
}


