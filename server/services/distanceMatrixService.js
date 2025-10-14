const https = require('https');

class DistanceMatrixService {
  constructor() {
    // Try multiple environment variable names for Google Maps API key
    this.apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || 
                  process.env.GOOGLE_MAPS_API_KEY || 
                  process.env.GOOGLE_API_KEY ||
                  'AIzaSyBh6ONIwih2T-I_u9w11hkrbyusX_ujk80'; // Fallback key
    this.baseUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json';
  }

  /**
   * Calculate road distance and travel time between two coordinates using Google Distance Matrix API
   * @param {number} originLat - Origin latitude
   * @param {number} originLng - Origin longitude
   * @param {number} destLat - Destination latitude
   * @param {number} destLng - Destination longitude
   * @returns {Promise<Object>} - { distance: number (km), duration: number (minutes), distanceText: string, durationText: string }
   */
  async calculateDistance(originLat, originLng, destLat, destLng) {
    try {
      if (!this.apiKey) {
        console.warn('⚠️ Distance Matrix Service: No Google Maps API key found');
        return null;
      }

      const origins = `${originLat},${originLng}`;
      const destinations = `${destLat},${destLng}`;
      
      const url = `${this.baseUrl}?origins=${origins}&destinations=${destinations}&mode=driving&key=${this.apiKey}`;
      
      console.log(`🚗 Distance Matrix Service: Calculating distance from (${originLat}, ${originLng}) to (${destLat}, ${destLng})`);
      
      const response = await this.makeRequest(url);
      
      if (response.status === 'OK' && response.rows && response.rows.length > 0) {
        const element = response.rows[0].elements[0];
        
        if (element.status === 'OK') {
          const distanceKm = element.distance.value / 1000; // Convert meters to kilometers
          const durationMinutes = Math.ceil(element.duration.value / 60); // Convert seconds to minutes
          
          const result = {
            distance: parseFloat(distanceKm.toFixed(3)),
            duration: durationMinutes,
            distanceText: element.distance.text,
            durationText: element.duration.text
          };
          
          console.log(`✅ Distance Matrix Service: Found route - ${result.distanceText} in ${result.durationText}`);
          return result;
        } else {
          console.warn(`⚠️ Distance Matrix Service: Route calculation failed - ${element.status}`);
          return null;
        }
      } else {
        console.warn(`⚠️ Distance Matrix Service: API response error - ${response.status}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Distance Matrix Service: Error calculating distance:', error);
      return null;
    }
  }

  /**
   * Make HTTP request to Google Distance Matrix API
   * @param {string} url - Full API URL
   * @returns {Promise<Object>} - API response
   */
  makeRequest(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (error) {
            reject(new Error(`Failed to parse API response: ${error.message}`));
          }
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }
}

module.exports = new DistanceMatrixService();
