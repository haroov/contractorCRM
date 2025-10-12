const { MongoClient } = require('mongodb');

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
        const distanceKm = result.distanceKM.toFixed(3);

        // Estimate travel time (rough calculation: 1.2 minutes per km in urban areas)
        const travelTime = Math.ceil(parseFloat(distanceKm) * 1.2);

        const fireStationData = {
          name: result.name || 'תחנת כיבוי אש',
          address: result.address || '',
          phone: result.phone || '102',
          stationType: result.stationType || '',
          distance: distanceKm,
          travelTime: travelTime,
          distance_m: result.distanceKM * 1000
        };

        console.log(`✅ GIS Service: Found nearest fire station ${fireStationData.name} at distance ${distanceKm}km for coordinates (${x}, ${y})`);
        return fireStationData;
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
        const distanceKm = result.distanceKM.toFixed(3);

        // Estimate travel time (rough calculation: 1.2 minutes per km in urban areas)
        const travelTime = Math.ceil(parseFloat(distanceKm) * 1.2);

        const policeStationData = {
          name: result.name || 'תחנת משטרה',
          address: result.address || '',
          phone: result.phone || '100',
          stationType: result.stationType || '',
          distance: distanceKm,
          travelTime: travelTime,
          distance_m: result.distanceKM * 1000
        };

        console.log(`✅ GIS Service: Found nearest police station ${policeStationData.name} at distance ${distanceKm}km for coordinates (${x}, ${y})`);
        return policeStationData;
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
      // Note: Fuel stations data is stored as [X, Y] (Longitude, Latitude) - standard GeoJSON format
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
            name: { $ifNull: ["$properties.Name", "$Name", "$properties.name"] },
            address: { $ifNull: ["$properties.Address", "$address", "$properties.address"] },
            phone: { $ifNull: ["$properties.Phone", "$phone", "$properties.phone", "לא זמין"] },
            stationType: { $ifNull: ["$properties.Type", "$type", "$properties.type", "תחנת דלק"] },
            distanceKM: { $round: ["$distanceKM", 3] },
            geometry: 1
          }
        }
      ];

      const results = await this.gisDb.collection('fuelStation').aggregate(pipeline).toArray();

      if (results && results.length > 0) {
        const result = results[0];
        const distanceKm = result.distanceKM.toFixed(3);

        // Estimate travel time (rough calculation: 1.5 minutes per km for fuel stations)
        const travelTime = Math.ceil(parseFloat(distanceKm) * 1.5);

        const fuelStationData = {
          name: result.name || 'תחנת דלק',
          address: result.address || '',
          phone: result.phone || 'לא זמין',
          stationType: result.stationType || 'תחנת דלק',
          distance: distanceKm,
          travelTime: travelTime,
          distance_m: result.distanceKM * 1000
        };

        console.log(`✅ GIS Service: Found nearest fuel station ${fuelStationData.name} at distance ${distanceKm}km for coordinates (${x}, ${y})`);
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
