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
      
      // Query the seismic hazard zone collection
      const seismicHazardZones = await this.gisDb.collection('seismic-hazard-zone').find({}).toArray();
      
      if (!seismicHazardZones || seismicHazardZones.length === 0) {
        console.log('⚠️ GIS Service: No seismic hazard zones found');
        return null;
      }

      // Check each feature in the FeatureCollection
      for (const zone of seismicHazardZones) {
        if (zone.type === 'FeatureCollection' && zone.features) {
          for (const feature of zone.features) {
            if (feature.type === 'Feature' && 
                feature.geometry && 
                feature.geometry.type === 'Polygon' &&
                feature.properties && 
                feature.properties.Hazard !== undefined) {
              
              // Get the polygon coordinates (first ring of the polygon)
              const coordinates = feature.geometry.coordinates[0];
              
              if (this.isPointInPolygon(x, y, coordinates)) {
                console.log(`✅ GIS Service: Found PNG25 value ${feature.properties.Hazard} for coordinates (${x}, ${y})`);
                return feature.properties.Hazard;
              }
            }
          }
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
      
      // Query the cresta zones collection
      const crestaZones = await this.gisDb.collection('cresta-zones').find({}).toArray();
      
      if (!crestaZones || crestaZones.length === 0) {
        console.log('⚠️ GIS Service: No Cresta zones found');
        return null;
      }

      // Check each feature in the FeatureCollection
      for (const zone of crestaZones) {
        if (zone.type === 'FeatureCollection' && zone.features) {
          for (const feature of zone.features) {
            if (feature.type === 'Feature' && 
                feature.geometry && 
                feature.geometry.type === 'Polygon' &&
                feature.properties && 
                feature.properties.Name) {
              
              // Get the polygon coordinates (first ring of the polygon)
              const coordinates = feature.geometry.coordinates[0];
              
              if (this.isPointInPolygon(x, y, coordinates)) {
                console.log(`✅ GIS Service: Found Cresta zone ${feature.properties.Name} for coordinates (${x}, ${y})`);
                return feature.properties.Name;
              }
            }
          }
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
