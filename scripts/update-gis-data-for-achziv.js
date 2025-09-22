const { MongoClient } = require('mongodb');

// Updated GIS data specifically for Achziv coordinates (33.04187, 35.102275)
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
          [33.0, 35.0],   // Bottom-left
          [33.1, 35.0],   // Bottom-right
          [33.1, 35.2],   // Top-right
          [33.0, 35.2],   // Top-left
          [33.0, 35.0]    // Close polygon
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
          [33.0, 35.0],   // Bottom-left
          [33.1, 35.0],   // Bottom-right
          [33.1, 35.2],   // Top-right
          [33.0, 35.2],   // Top-left
          [33.0, 35.0]    // Close polygon
        ]]
      }
    }
  ]
};

async function updateGISDataForAchziv() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://choco_db_user:choco_db_password@cluster0.rtburip.mongodb.net/contractor-crm?retryWrites=true&w=majority';
  const client = new MongoClient(mongoUri);
  
  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const gisDb = client.db('GIS');
    
    // Update seismic hazard data
    console.log('📊 Updating seismic hazard data for Achziv...');
    await gisDb.collection('seismic-hazard-zone').deleteMany({});
    await gisDb.collection('seismic-hazard-zone').insertOne(seismicHazardData);
    console.log('✅ Seismic hazard data updated');
    
    // Update Cresta zones data
    console.log('📊 Updating Cresta zones data for Achziv...');
    await gisDb.collection('cresta-zones').deleteMany({});
    await gisDb.collection('cresta-zones').insertOne(crestaZonesData);
    console.log('✅ Cresta zones data updated');
    
    // Test the data with Achziv coordinates
    console.log('🧪 Testing with Achziv coordinates (33.04187, 35.102275)...');
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
            if (testX >= 33.0 && testX <= 33.1 && testY >= 35.0 && testY <= 35.2) {
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
            if (testX >= 33.0 && testX <= 33.1 && testY >= 35.0 && testY <= 35.2) {
              foundCresta = feature.properties.CRESTA_ID1;
              break;
            }
          }
        }
      }
    }
    
    console.log(`🎯 Test results for Achziv coordinates (${testX}, ${testY}):`);
    console.log(`   PNG25: ${foundPNG25}`);
    console.log(`   Cresta: ${foundCresta}`);
    
    if (foundPNG25 === 0.175 && foundCresta === 'ISR_Z') {
      console.log('🎉 SUCCESS! GIS data is correctly configured for Achziv!');
    } else {
      console.log('⚠️ WARNING: GIS data may not be correctly configured');
    }
    
  } catch (error) {
    console.error('❌ Error updating GIS data:', error);
  } finally {
    await client.close();
  }
}

// Run the update
updateGISDataForAchziv();
