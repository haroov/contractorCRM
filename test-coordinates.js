// Test script to verify coordinate extraction logic
const testData = {
  geometry: {
    coordinates: [35.102275, 33.04187]
  },
  name: "נהריה",
  address: "דרך יחיעם 1 נהריה",
  phone: "102",
  stationType: "משנה",
  distanceKM: 3.776
};

// Simulate the coordinate extraction logic from our GIS service
const fireStationData = {
  name: testData.name || 'תחנת כיבוי אש',
  address: testData.address || '',
  phone: testData.phone || '102',
  stationType: testData.stationType || '',
  distance: testData.distanceKM.toFixed(3),
  travelTime: Math.ceil(parseFloat(testData.distanceKM.toFixed(3)) * 1.2),
  distance_m: testData.distanceKM * 1000,
  coordinates: {
    longitude: testData.geometry?.coordinates?.[0] || null,
    latitude: testData.geometry?.coordinates?.[1] || null
  }
};

console.log('✅ Test Result:');
console.log(JSON.stringify(fireStationData, null, 2));
console.log('\n📍 Coordinates extracted:');
console.log(`Longitude: ${fireStationData.coordinates.longitude}`);
console.log(`Latitude: ${fireStationData.coordinates.latitude}`);
