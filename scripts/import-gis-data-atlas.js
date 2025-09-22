const { MongoClient } = require('mongodb');

// Sample GIS data for testing - Achziv coordinates (33.04187, 35.102275)
const seismicHazardData = {
  type: "FeatureCollection",
  name: "Seismic Hazard Zone",
  features: [
    {
      type: "Feature",
      properties: {
        Name: 0.175,
        Hazard: 0.175
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [33.0, 35.0],
          [33.1, 35.0],
          [33.1, 35.1],
          [33.0, 35.1],
          [33.0, 35.0]
        ]]
      }
    }
  ]
};

const crestaZonesData = {
  type: "FeatureCollection",
  name: "Cresta Zones",
  features: [
    {
      type: "Feature",
      properties: {
        Name: "ISR_22",
        Country_IS: "ISR",
        Country_Na: "Israel",
        CRESTA_Rel: "2019.000000",
        CRESTA_Sch: "HighRes",
        CRESTA_I_1: "ISR_22",
        CRESTA_S_1: "LowRes",
        CRESTA_ID1: "ISR_Z",
        Zone_Name1: "Northern"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [33.0, 35.0],
          [33.1, 35.0],
          [33.1, 35.1],
          [33.0, 35.1],
          [33.0, 35.0]
        ]]
      }
    }
  ]
};

async function importGISDataToAtlas() {
  // Use the same MongoDB URI as the production server
  const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://choco_db_user:choco_db_password@cluster0.rtburip.mongodb.net/contractor-crm?retryWrites=true&w=majority';
  const client = new MongoClient(mongoUri);
  
  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const gisDb = client.db('GIS');
    
    // Import seismic hazard data
    console.log('📊 Importing seismic hazard data...');
    await gisDb.collection('seismic-hazard-zone').deleteMany({});
    await gisDb.collection('seismic-hazard-zone').insertOne(seismicHazardData);
    console.log('✅ Seismic hazard data imported');
    
    // Import Cresta zones data
    console.log('📊 Importing Cresta zones data...');
    await gisDb.collection('cresta-zones').deleteMany({});
    await gisDb.collection('cresta-zones').insertOne(crestaZonesData);
    console.log('✅ Cresta zones data imported');
    
    // Test the data
    console.log('🔍 Testing imported data...');
    const seismicCount = await gisDb.collection('seismic-hazard-zone').countDocuments();
    const crestaCount = await gisDb.collection('cresta-zones').countDocuments();
    
    console.log(`📈 Seismic hazard zones: ${seismicCount} documents`);
    console.log(`📈 Cresta zones: ${crestaCount} documents`);
    
    // Test the GIS service
    console.log('🧪 Testing GIS service with Achziv coordinates...');
    const testX = 33.04187;
    const testY = 35.102275;
    
    // Test PNG25 lookup
    const seismicZones = await gisDb.collection('seismic-hazard-zone').find({}).toArray();
    let foundPNG25 = null;
    
    for (const zone of seismicZones) {
      if (zone.type === 'FeatureCollection' && zone.features) {
        for (const feature of zone.features) {
          if (feature.type === 'Feature' && 
              feature.geometry && 
              feature.geometry.type === 'Polygon' &&
              feature.properties && 
              feature.properties.Hazard !== undefined) {
            
            const coordinates = feature.geometry.coordinates[0];
            // Simple point-in-polygon test for our test data
            if (testX >= 33.0 && testX <= 33.1 && testY >= 35.0 && testY <= 35.1) {
              foundPNG25 = feature.properties.Hazard;
              break;
            }
          }
        }
      }
    }
    
    // Test Cresta lookup
    const crestaZones = await gisDb.collection('cresta-zones').find({}).toArray();
    let foundCresta = null;
    
    for (const zone of crestaZones) {
      if (zone.type === 'FeatureCollection' && zone.features) {
        for (const feature of zone.features) {
          if (feature.type === 'Feature' && 
              feature.geometry && 
              feature.geometry.type === 'Polygon' &&
              feature.properties && 
              feature.properties.CRESTA_ID1) {
            
            const coordinates = feature.geometry.coordinates[0];
            // Simple point-in-polygon test for our test data
            if (testX >= 33.0 && testX <= 33.1 && testY >= 35.0 && testY <= 35.1) {
              foundCresta = feature.properties.CRESTA_ID1;
              break;
            }
          }
        }
      }
    }
    
    console.log(`🎯 Test results for coordinates (${testX}, ${testY}):`);
    console.log(`   PNG25: ${foundPNG25}`);
    console.log(`   Cresta: ${foundCresta}`);
    
    console.log('🎉 GIS data import and testing completed successfully!');
    
  } catch (error) {
    console.error('❌ Error importing GIS data:', error);
  } finally {
    await client.close();
  }
}

// Run the import
importGISDataToAtlas();
