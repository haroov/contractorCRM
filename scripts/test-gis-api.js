const fetch = require('node-fetch');

async function testGISAPI() {
  const baseUrl = 'https://contractor-crm-api.onrender.com'; // Update with actual Render URL
  const testCoordinates = { x: 33.04187, y: 35.102275 };
  
  console.log('🧪 Testing GIS API with Achziv coordinates...');
  console.log(`📍 Coordinates: (${testCoordinates.x}, ${testCoordinates.y})`);
  
  try {
    // Test health endpoint
    console.log('\n1️⃣ Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/api/gis/health`);
    const healthData = await healthResponse.json();
    console.log('Health check result:', healthData);
    
    // Test calculate endpoint
    console.log('\n2️⃣ Testing calculate endpoint...');
    const calculateResponse = await fetch(`${baseUrl}/api/gis/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCoordinates),
    });
    
    const calculateData = await calculateResponse.json();
    console.log('Calculate result:', calculateData);
    
    // Test PNG25 endpoint
    console.log('\n3️⃣ Testing PNG25 endpoint...');
    const png25Response = await fetch(`${baseUrl}/api/gis/png25?x=${testCoordinates.x}&y=${testCoordinates.y}`);
    const png25Data = await png25Response.json();
    console.log('PNG25 result:', png25Data);
    
    // Test Cresta endpoint
    console.log('\n4️⃣ Testing Cresta endpoint...');
    const crestaResponse = await fetch(`${baseUrl}/api/gis/cresta?x=${testCoordinates.x}&y=${testCoordinates.y}`);
    const crestaData = await crestaResponse.json();
    console.log('Cresta result:', crestaData);
    
    console.log('\n🎉 GIS API testing completed!');
    
  } catch (error) {
    console.error('❌ Error testing GIS API:', error);
  }
}

// Run the test
testGISAPI();
