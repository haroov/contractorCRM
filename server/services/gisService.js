const { MongoClient } = require('mongodb');
const distanceMatrixService = require('./distanceMatrixService');

class GISService {
  constructor() {
    this.client = null;
    this.gisDb = null;
    this.contractorDb = null;
  }

  /**
   * Initialize MongoDB connections for both contractor-crm and GIS databases
   */
  async initialize() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/contractor-crm';

      if (!this.client) {
        this.client = new MongoClient(mongoUri);
        await this.client.connect();
        console.log('✅ GIS Service: Connected to MongoDB');
      }

      // Connect to both databases
      this.contractorDb = this.client.db('contractor-crm');
      this.gisDb = this.client.db('GIS');

      console.log('✅ GIS Service: Connected to contractor-crm and GIS databases');
    } catch (error) {
      console.error('❌ GIS Service: Connection error:', error);
      throw error;
    }
  }

  /**
   * Check if a point is inside a polygon using ray casting algorithm
   * @param {number} x - X coordinate (longitude)
   * @param {number} y - Y coordinate (latitude)
   * @param {Array} polygon - Array of [x, y] coordinates defining the polygon
   * @returns {boolean} - True if point is inside polygon
   */
  isPointInPolygon(x, y, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  /**
   * Find PNG25 value for earthquake hazard based on coordinates
   * @param {number} x - X coordinate (longitude)
   * @param {number} y - Y coordinate (latitude)
   * @returns {number|null} - PNG25 value or null if not found
   */
  async getPNG25Value(x, y) {
    try {
      await this.initialize();

      // Use $geoNear aggregation pipeline for efficient spatial query
      // Note: Data is stored as [X, Y] (Longitude, Latitude) - standard GeoJSON format
      const pipeline = [
        {
          $geoNear: {
            near: { type: "Point", coordinates: [x, y] },
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

      const results = await this.gisDb.collection('seismic-hazard-zone').aggregate(pipeline).toArray();

      if (results && results.length > 0) {
        const result = results[0];

        // Support both flattened and nested structures
        let hazardValue = null;

        if (result.hazard !== undefined) {
          // Flattened structure
          hazardValue = result.hazard;
        } else if (result.properties && result.properties.Hazard !== undefined) {
          // Nested structure
          hazardValue = result.properties.Hazard;
        }

        if (hazardValue !== null) {
          console.log(`✅ GIS Service: Found PNG25 value ${hazardValue} for coordinates (${x}, ${y}) at distance ${result.distance_m}m`);
          return hazardValue;
        }
      }

      console.log(`⚠️ GIS Service: No PNG25 value found for coordinates (${x}, ${y})`);
      return null;
    } catch (error) {
      console.error('❌ GIS Service: Error getting PNG25 value:', error);
      return null;
    }
  }

  /**
   * Find Cresta zone based on coordinates
   * @param {number} x - X coordinate (longitude)
   * @param {number} y - Y coordinate (latitude)
   * @returns {string|null} - Cresta zone name or null if not found
   */
  async getCrestaZone(x, y) {
    try {
      await this.initialize();

      // Use $geoNear aggregation pipeline for efficient spatial query
      // Note: Data is stored as [X, Y] (Longitude, Latitude) - standard GeoJSON format
      const pipeline = [
        {
          $geoNear: {
            near: { type: "Point", coordinates: [x, y] },
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
            "properties.Name": 1,
            "properties.Zone_Name1": 1,
            "properties.CRESTA_S_1": 1,
            "properties.CRESTA_I_1": 1,
            distance_m: 1,
            name: 1
          }
        }
      ];

      const results = await this.gisDb.collection('cresta-zones').aggregate(pipeline).toArray();

      if (results && results.length > 0) {
        const result = results[0];

        // Support both flattened and nested structures
        let crestaData = null;

        if (result.crestaId !== undefined) {
          // Flattened structure
          crestaData = {
            lowRes: result.crestaId,
            highRes: result.name || result.crestaId,
            name: result.name || 'Unknown'
          };
        } else if (result.properties && result.properties.CRESTA_ID1 !== undefined) {
          // Nested structure - return full object with all properties
          crestaData = {
            lowRes: result.properties.CRESTA_ID1, // ISR_Z
            highRes: result.properties.Name, // ISR_22
            name: result.properties.Zone_Name1, // Northern
            resolution: result.properties.CRESTA_S_1, // LowRes
            identifier: result.properties.CRESTA_I_1 // ISR_22
          };
        }

        if (crestaData !== null) {
          console.log(`✅ GIS Service: Found Cresta zone ${crestaData.lowRes} (${crestaData.highRes}) - ${crestaData.name} for coordinates (${x}, ${y}) at distance ${result.distance_m}m`);
          return crestaData;
        }
      }

      console.log(`⚠️ GIS Service: No Cresta zone found for coordinates (${x}, ${y})`);
      return null;
    } catch (error) {
      console.error('❌ GIS Service: Error getting Cresta zone:', error);
      return null;
    }
  }

  /**
   * Find nearest fire station based on coordinates
   * @param {number} x - X coordinate (longitude)
   * @param {number} y - Y coordinate (latitude)
   * @returns {object|null} - Fire station data or null if not found
   */
  async getNearestFireStation(x, y) {
    try {
      console.log(`🔥 GIS Service: getNearestFireStation called with coordinates (${x}, ${y})`);
      await this.initialize();

      // Use $geoNear aggregation pipeline for efficient spatial query
      // Note: Fire stations data is stored as [X, Y] (Longitude, Latitude) - standard GeoJSON format
      const pipeline = [
        {
          $geoNear: {
            near: { type: "Point", coordinates: [x, y] },
            key: "geometry",
            spherical: true,
            distanceField: "distanceKM",
            distanceMultiplier: 0.001
          }
        },
        { $limit: 1 },
        {
          $project: {
            _id: 0,
            name: { $ifNull: ["$properties.Name", "$Name"] },
            address: { $ifNull: ["$properties.address", "$address"] },
            phone: { $ifNull: ["$properties.EmergencyPhoneNumber", "$EmergencyPhoneNumber", "102"] },
            stationType: { $ifNull: ["$properties.Station_Type", "$Station_Type"] },
            distanceKM: { $round: ["$distanceKM", 3] },
            geometry: 1
          }
        }
      ];

      const results = await this.gisDb.collection('fireStations').aggregate(pipeline).toArray();

      if (results && results.length > 0) {
        const result = results[0];
        const airDistanceKm = result.distanceKM.toFixed(3);

        // Get station coordinates
        const stationLng = result.geometry?.coordinates?.[0];
        const stationLat = result.geometry?.coordinates?.[1];

        // Get real road distance and travel time using Google Distance Matrix API ONLY
        if (stationLat && stationLng) {
          console.log(`🚗 GIS Service: FIRE STATION - Getting road distance from project (${y}, ${x}) to fire station (${stationLat}, ${stationLng})`);
          console.log(`🔍 GIS Service: FIRE STATION - Air distance: ${airDistanceKm}km, Station coordinates: lat=${stationLat}, lng=${stationLng}`);

          const distanceData = await distanceMatrixService.calculateDistance(y, x, stationLat, stationLng);

          if (distanceData) {
            const roadDistance = distanceData.distance;
            const travelTime = distanceData.duration;
            console.log(`✅ GIS Service: FIRE STATION - SUCCESS! Road distance: ${distanceData.distanceText}, Travel time: ${distanceData.durationText}`);
            console.log(`📊 GIS Service: FIRE STATION - Using road distance: ${roadDistance}km (was air: ${airDistanceKm}km)`);
            
            const fireStationData = {
              name: result.name || 'תחנת כיבוי אש',
              address: result.address || '',
              phone: result.phone || '102',
              stationType: result.stationType || '',
              distance: roadDistance,
              travelTime: travelTime,
              distance_m: roadDistance * 1000,
              coordinates: {
                longitude: stationLng || null,
                latitude: stationLat || null
              }
            };

            console.log(`✅ GIS Service: Found nearest fire station ${fireStationData.name} at distance ${roadDistance}km for coordinates (${x}, ${y})`);
            console.log(`📍 GIS Service: Fire station coordinates: ${JSON.stringify(fireStationData.coordinates)}`);
            console.log(`🚗 GIS Service: Using Google Distance Matrix API for accurate road distances`);
            return fireStationData;
          } else {
            console.error(`❌ GIS Service: FIRE STATION - Distance Matrix API failed, cannot calculate distance`);
            return null;
          }
        } else {
          console.error(`❌ GIS Service: FIRE STATION - No station coordinates available, cannot calculate distance`);
          return null;
        }
      }

      console.log(`⚠️ GIS Service: No fire station found for coordinates (${x}, ${y})`);
      return null;
    } catch (error) {
      console.error('❌ GIS Service: Error getting nearest fire station:', error);
      return null;
    }
  }

  /**
   * Find nearest police station based on coordinates
   * @param {number} x - X coordinate (longitude)
   * @param {number} y - Y coordinate (latitude)
   * @returns {Object|null} - Police station data or null if not found
   */
  async getNearestPoliceStation(x, y) {
    try {
      console.log(`🚔 GIS Service: getNearestPoliceStation called with coordinates (${x}, ${y})`);
      await this.initialize();

      // Use $geoNear aggregation pipeline for efficient spatial query
      // Note: Police stations data is stored as [X, Y] (Longitude, Latitude) - standard GeoJSON format
      const pipeline = [
        {
          $geoNear: {
            near: { type: "Point", coordinates: [x, y] },
            key: "geometry",
            spherical: true,
            distanceField: "distanceKM",
            distanceMultiplier: 0.001
          }
        },
        { $limit: 1 },
        {
          $project: {
            _id: 0,
            name: { $ifNull: ["$properties.Name", "$Name"] },
            address: { $ifNull: ["$properties.Address", "$Address"] },
            phone: { $ifNull: ["$properties.Phone", "$Phone", "100"] },
            stationType: { $ifNull: ["$properties.SiteType", "$SiteType"] },
            distanceKM: { $round: ["$distanceKM", 3] },
            geometry: 1
          }
        }
      ];

      const results = await this.gisDb.collection('policeStations').aggregate(pipeline).toArray();

      if (results && results.length > 0) {
        const result = results[0];
        const airDistanceKm = result.distanceKM.toFixed(3);

        // Get station coordinates
        const stationLng = result.geometry?.coordinates?.[0];
        const stationLat = result.geometry?.coordinates?.[1];

        // Get real road distance and travel time using Google Distance Matrix API ONLY
        if (stationLat && stationLng) {
          console.log(`🚗 GIS Service: POLICE STATION - Getting road distance from project (${y}, ${x}) to police station (${stationLat}, ${stationLng})`);
          console.log(`🔍 GIS Service: POLICE STATION - Air distance: ${airDistanceKm}km, Station coordinates: lat=${stationLat}, lng=${stationLng}`);

          const distanceData = await distanceMatrixService.calculateDistance(y, x, stationLat, stationLng);

          if (distanceData) {
            const roadDistance = distanceData.distance;
            const travelTime = distanceData.duration;
            console.log(`✅ GIS Service: POLICE STATION - SUCCESS! Road distance: ${distanceData.distanceText}, Travel time: ${distanceData.durationText}`);
            console.log(`📊 GIS Service: POLICE STATION - Using road distance: ${roadDistance}km (was air: ${airDistanceKm}km)`);
            
            const policeStationData = {
              name: result.name || 'תחנת משטרה',
              address: result.address || '',
              phone: result.phone || '100',
              stationType: result.stationType || '',
              distance: roadDistance,
              travelTime: travelTime,
              distance_m: roadDistance * 1000,
              coordinates: {
                longitude: stationLng || null,
                latitude: stationLat || null
              }
            };

            console.log(`✅ GIS Service: Found nearest police station ${policeStationData.name} at distance ${roadDistance}km for coordinates (${x}, ${y})`);
            console.log(`🚗 GIS Service: Using Google Distance Matrix API for accurate road distances`);
            return policeStationData;
          } else {
            console.error(`❌ GIS Service: POLICE STATION - Distance Matrix API failed, cannot calculate distance`);
            return null;
          }
        } else {
          console.error(`❌ GIS Service: POLICE STATION - No station coordinates available, cannot calculate distance`);
          return null;
        }
      }

      console.log(`⚠️ GIS Service: No police station found for coordinates (${x}, ${y})`);
      return null;
    } catch (error) {
      console.error('❌ GIS Service: Error getting nearest police station:', error);
      return null;
    }
  }

  /**
   * Get the nearest fuel station based on coordinates
   * @param {number} x - X coordinate (longitude)
   * @param {number} y - Y coordinate (latitude)
   * @returns {Object|null} - Fuel station data or null if not found
   */
  async getNearestFuelStation(x, y) {
    try {
      await this.initialize();

      // Use $geoNear aggregation pipeline for efficient spatial query
      // Note: Fuel stations data might be stored as [Y, X] (Latitude, Longitude) - let's try both
      console.log(`🔍 GIS Service: Searching fuel stations for coordinates (${x}, ${y})`);

      // Try both coordinate orders
      const coordinates1 = [x, y]; // [longitude, latitude] - standard GeoJSON
      const coordinates2 = [y, x]; // [latitude, longitude] - alternative

      const pipeline = [
        {
          $geoNear: {
            near: { type: "Point", coordinates: coordinates1 },
            key: "geometry",
            spherical: true,
            distanceField: "distanceKM",
            distanceMultiplier: 0.001 // Convert meters to kilometers
          }
        },
        { $limit: 1 },
        {
          $project: {
            _id: 0,
            name: { $ifNull: ["$properties.Name", "$Name", "$properties.name"] },
            address: { $ifNull: ["$properties.Address", "$address", "$properties.address"] },
            phone: { $ifNull: ["$properties.Phone", "$phone", "$properties.phone", "לא זמין"] },
            stationType: { $ifNull: ["$properties.Type", "$type", "$properties.type", "תחנת דלק"] },
            distanceKM: { $round: ["$distanceKM", 3] },
            geometry: 1
          }
        }
      ];

      // Try different possible collection names
      let results = [];
      const possibleNames = ['fuelStation', 'fuelStations', 'fuel_station', 'fuel_stations', 'fuelstation'];

      for (const collectionName of possibleNames) {
        try {
          const collection = this.gisDb.collection(collectionName);
          const count = await collection.countDocuments();
          console.log(`🔍 Checking collection ${collectionName}: ${count} documents`);
          if (count > 0) {
            console.log(`✅ Found fuel stations in collection: ${collectionName} (${count} documents)`);
            results = await collection.aggregate(pipeline).toArray();
            break;
          }
        } catch (error) {
          console.log(`⚠️ Collection ${collectionName} not found or error:`, error.message);
        }
      }

      // If no results found, log all available collections
      if (results.length === 0) {
        console.log('🔍 No fuel stations found. Checking all available collections...');
        try {
          const collections = await this.gisDb.listCollections().toArray();
          console.log('📋 Available collections:', collections.map(c => c.name));
        } catch (error) {
          console.log('⚠️ Could not list collections:', error.message);
        }
      }

      if (results && results.length > 0) {
        const result = results[0];
        const distanceKm = result.distanceKM.toFixed(3);

        // Check if the distance is reasonable (less than 50km)
        if (parseFloat(distanceKm) > 50) {
          console.log(`⚠️ GIS Service: Found fuel station but distance seems too far (${distanceKm}km). Trying alternative coordinates...`);

          // Try with reversed coordinates
          const pipeline2 = [
            {
              $geoNear: {
                near: { type: "Point", coordinates: coordinates2 },
                key: "geometry",
                spherical: true,
                distanceField: "distanceKM",
                distanceMultiplier: 0.001
              }
            },
            { $limit: 1 },
            {
              $project: {
                _id: 0,
                name: { $ifNull: ["$properties.Name", "$Name", "$properties.name"] },
                address: { $ifNull: ["$properties.Address", "$address", "$properties.address"] },
                phone: { $ifNull: ["$properties.Phone", "$phone", "$properties.phone", "לא זמין"] },
                stationType: { $ifNull: ["$properties.Type", "$type", "$properties.type", "תחנת דלק"] },
                distanceKM: { $round: ["$distanceKM", 3] },
                geometry: 1
              }
            }
          ];

          const results2 = await this.gisDb.collection('fuelStation').aggregate(pipeline2).toArray();
          if (results2 && results2.length > 0 && parseFloat(results2[0].distanceKM.toFixed(3)) < parseFloat(distanceKm)) {
            console.log(`✅ GIS Service: Found closer fuel station with alternative coordinates`);
            results = results2;
          }
        }

        const finalResult = results[0];
        const finalDistanceKm = finalResult.distanceKM.toFixed(3);

        // Estimate travel time (rough calculation: 1.5 minutes per km for fuel stations)
        const travelTime = Math.ceil(parseFloat(finalDistanceKm) * 1.5);

        const fuelStationData = {
          name: finalResult.name || 'תחנת דלק',
          address: finalResult.address || '',
          phone: finalResult.phone || 'לא זמין',
          stationType: finalResult.stationType || 'תחנת דלק',
          distance: finalDistanceKm,
          travelTime: travelTime,
          distance_m: finalResult.distanceKM * 1000,
          coordinates: {
            longitude: finalResult.geometry?.coordinates?.[0] || null,
            latitude: finalResult.geometry?.coordinates?.[1] || null
          }
        };

        console.log(`✅ GIS Service: Found nearest fuel station ${fuelStationData.name} at distance ${finalDistanceKm}km for coordinates (${x}, ${y})`);
        return fuelStationData;
      }

      console.log(`⚠️ GIS Service: No fuel station found for coordinates (${x}, ${y})`);
      return null;
    } catch (error) {
      console.error('❌ GIS Service: Error getting nearest fuel station:', error);
      return null;
    }
  }

  /**
   * Get the nearest first aid station (MDA) based on coordinates
   * @param {number} x - X coordinate (longitude)
   * @param {number} y - Y coordinate (latitude)
   * @returns {Object|null} - First aid station data or null if not found
   */
  async getNearestFirstAidStation(x, y) {
    try {
      console.log(`🏥 GIS Service: getNearestFirstAidStation called with coordinates (${x}, ${y})`);
      await this.initialize();

      // Use $geoNear aggregation pipeline for efficient spatial query
      // Note: First aid stations data is stored as [X, Y] (Longitude, Latitude) - standard GeoJSON format
      console.log(`🔍 GIS Service: Searching first aid stations for coordinates (${x}, ${y})`);

      const pipeline = [
        {
          $geoNear: {
            near: { type: "Point", coordinates: [x, y] },
            key: "geometry",
            spherical: true,
            distanceField: "distanceKM",
            distanceMultiplier: 0.001 // Convert meters to kilometers
          }
        },
        { $limit: 1 },
        {
          $project: {
            _id: 0,
            name: { $ifNull: ["$properties.stationName", "$Name", "$properties.name"] },
            city: { $ifNull: ["$properties.city", "$City", "$properties.City"] },
            address: { $ifNull: ["$properties.address", "$Address", "$properties.Address"] },
            phone: { $ifNull: ["$properties.phone", "$Phone", "$properties.Phone", "101"] },
            stationType: { $ifNull: ["$properties.type", "$Type", "$properties.Type", "תחנת מד״א"] },
            distanceKM: { $round: ["$distanceKM", 3] },
            geometry: 1
          }
        }
      ];

      const results = await this.gisDb.collection('firstAidStations').aggregate(pipeline).toArray();

      if (results && results.length > 0) {
        const result = results[0];
        const airDistanceKm = result.distanceKM.toFixed(3);

        // Get station coordinates
        const stationLng = result.geometry?.coordinates?.[0];
        const stationLat = result.geometry?.coordinates?.[1];

        // Get real road distance and travel time using Google Distance Matrix API ONLY
        if (stationLat && stationLng) {
          console.log(`🚗 GIS Service: FIRST AID STATION - Getting road distance from project (${y}, ${x}) to first aid station (${stationLat}, ${stationLng})`);
          console.log(`🔍 GIS Service: FIRST AID STATION - Air distance: ${airDistanceKm}km, Station coordinates: lat=${stationLat}, lng=${stationLng}`);

          const distanceData = await distanceMatrixService.calculateDistance(y, x, stationLat, stationLng);

          if (distanceData) {
            const roadDistance = distanceData.distance;
            const travelTime = distanceData.duration;
            console.log(`✅ GIS Service: FIRST AID STATION - SUCCESS! Road distance: ${distanceData.distanceText}, Travel time: ${distanceData.durationText}`);
            console.log(`📊 GIS Service: FIRST AID STATION - Using road distance: ${roadDistance}km (was air: ${airDistanceKm}km)`);
            
            const firstAidStationData = {
              name: result.name || 'תחנת מד״א',
              city: result.city || '',
              address: result.address || '',
              phone: result.phone || '101',
              stationType: result.stationType || 'תחנת מד״א',
              distance: roadDistance,
              travelTime: travelTime,
              distance_m: roadDistance * 1000,
              coordinates: {
                longitude: stationLng || null,
                latitude: stationLat || null
              }
            };

            console.log(`✅ GIS Service: Found nearest first aid station ${firstAidStationData.name} at distance ${roadDistance}km for coordinates (${x}, ${y})`);
            console.log(`🚗 GIS Service: Using Google Distance Matrix API for accurate road distances`);
            return firstAidStationData;
          } else {
            console.error(`❌ GIS Service: FIRST AID STATION - Distance Matrix API failed, cannot calculate distance`);
            return null;
          }
        } else {
          console.error(`❌ GIS Service: FIRST AID STATION - No station coordinates available, cannot calculate distance`);
          return null;
        }
      }

      console.log(`⚠️ GIS Service: No first aid station found for coordinates (${x}, ${y})`);
      return null;
    } catch (error) {
      console.error('❌ GIS Service: Error getting nearest first aid station:', error);
      return null;
    }
  }

  /**
   * Calculate both PNG25 and Cresta values for given coordinates
   * @param {number} x - X coordinate (longitude)
   * @param {number} y - Y coordinate (latitude)
   * @returns {Object} - Object containing png25 and cresta values
   */
  async calculateGISValues(x, y) {
    try {
      if (!x || !y) {
        return { png25: null, cresta: null };
      }

      console.log(`🔍 GIS Service: Calculating GIS values for coordinates (${x}, ${y})`);

      // Calculate both values in parallel for better performance
      const [png25, cresta] = await Promise.all([
        this.getPNG25Value(x, y),
        this.getCrestaZone(x, y)
      ]);

      return {
        png25: png25,
        cresta: cresta
      };
    } catch (error) {
      console.error('❌ GIS Service: Error calculating GIS values:', error);
      return { png25: null, cresta: null };
    }
  }

  /**
   * Update project with calculated GIS values
   * @param {string} projectId - Project ID
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Object} - Updated project data
   */
  async updateProjectWithGISValues(projectId, x, y) {
    try {
      await this.initialize();

      const gisValues = await this.calculateGISValues(x, y);

      // Update the project in the database
      const updateData = {};

      if (gisValues.png25 !== null) {
        updateData['engineeringQuestionnaire.soilReport.png25EarthquakeRating'] = gisValues.png25;
      }

      if (gisValues.cresta !== null) {
        updateData['engineeringQuestionnaire.soilReport.crestaArea'] = gisValues.cresta;
      }

      if (Object.keys(updateData).length > 0) {
        const result = await this.contractorDb.collection('projects').updateOne(
          { _id: new require('mongodb').ObjectId(projectId) },
          { $set: updateData }
        );

        console.log(`✅ GIS Service: Updated project ${projectId} with GIS values:`, gisValues);
        return { success: true, gisValues, updatedFields: Object.keys(updateData) };
      }

      return { success: false, message: 'No GIS values found for the given coordinates' };
    } catch (error) {
      console.error('❌ GIS Service: Error updating project with GIS values:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Close the MongoDB connection
   */
  async close() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.gisDb = null;
      this.contractorDb = null;
      console.log('✅ GIS Service: Connection closed');
    }
  }
}

// Export singleton instance
const gisService = new GISService();
module.exports = gisService;
