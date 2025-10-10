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
      // Note: Data is stored as [Y, X] (Latitude, Longitude) instead of standard [X, Y]
      const pipeline = [
        {
          $geoNear: {
            near: { type: "Point", coordinates: [y, x] },
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
      // Note: Data is stored as [Y, X] (Latitude, Longitude) instead of standard [X, Y]
      const pipeline = [
        {
          $geoNear: {
            near: { type: "Point", coordinates: [y, x] },
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
            distanceField: "distance_m"
          }
        },
        { $limit: 1 },
        {
          $project: {
            _id: 1,
            "properties.Name": 1,
            "properties.address": 1,
            "properties.EmergencyPhoneNumber": 1,
            "properties.Station_Type": 1,
            distance_m: 1
          }
        }
      ];

      const results = await this.gisDb.collection('fireStations').aggregate(pipeline).toArray();

      if (results && results.length > 0) {
        const result = results[0];
        const distanceKm = (result.distance_m / 1000).toFixed(2);

        // Estimate travel time (rough calculation: 1 minute per km in urban areas)
        const travelTime = Math.ceil(parseFloat(distanceKm) * 1.2);

        const fireStationData = {
          name: result.properties?.Name || 'תחנת כיבוי אש',
          address: result.properties?.address || '',
          phone: result.properties?.EmergencyPhoneNumber || '102',
          stationType: result.properties?.Station_Type || '',
          distance: distanceKm,
          travelTime: travelTime,
          distance_m: result.distance_m
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
