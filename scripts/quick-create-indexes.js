/**
 * QUICK: Create spatial indexes for GIS collections
 * 
 * This is a minimal script to quickly create the required indexes.
 * 
 * Usage: Run this script in MongoDB Compass shell
 */

// Create spatial index for seismic hazard zones
db.getCollection('seismic-hazard-zone').createIndex(
    { "geometry": "2dsphere" },
    { name: "geometry_2dsphere" }
);
print("✅ Created spatial index for seismic-hazard-zone");

// Create spatial index for Cresta zones
db.getCollection('cresta-zones').createIndex(
    { "geometry": "2dsphere" },
    { name: "geometry_2dsphere" }
);
print("✅ Created spatial index for cresta-zones");

// Create spatial index for earthquake fault zones
db.getCollection('earthquake-fault-zones').createIndex(
    { "geometry": "2dsphere" },
    { name: "geometry_2dsphere" }
);
print("✅ Created spatial index for earthquake-fault-zones");

// Create spatial index for earthquake fault zone 2
db.getCollection('earthquake-fault-zone-2').createIndex(
    { "geometry": "2dsphere" },
    { name: "geometry_2dsphere" }
);
print("✅ Created spatial index for earthquake-fault-zone-2");

print("🎉 All spatial indexes created successfully!");
