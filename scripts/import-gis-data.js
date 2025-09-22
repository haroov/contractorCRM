const { MongoClient } = require('mongodb');

// Sample GIS data for testing
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

async function importGISData() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/contractor-crm';
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
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
    
    console.log('🎉 GIS data import completed successfully!');
    
  } catch (error) {
    console.error('❌ Error importing GIS data:', error);
  } finally {
    await client.close();
  }
}

// Run the import
importGISData();
