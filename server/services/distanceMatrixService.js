const https = require('https');

class DistanceMatrixService {
  constructor() {
    // Try multiple environment variable names for Google Maps API key
    this.apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GEO_MATRIX_API_KEY; // New geoMatrix API key from environment
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
      console.log('🔍 Distance Matrix Service: Starting distance calculation...');
      console.log(`🔑 Distance Matrix Service: API Key available: ${this.apiKey ? 'YES' : 'NO'}`);
      // Never print parts of secrets in logs
      console.log('🔑 Distance Matrix Service: API Key preview: [HIDDEN]');

      if (!this.apiKey) {
        console.warn('⚠️ Distance Matrix Service: No Google Maps API key found');
        return null;
      }

      const origins = `${originLat},${originLng}`;
      const destinations = `${destLat},${destLng}`;

      const url = `${this.baseUrl}?origins=${origins}&destinations=${destinations}&mode=driving&key=${this.apiKey}`;

      console.log(`🚗 Distance Matrix Service: Calculating distance from (${originLat}, ${originLng}) to (${destLat}, ${destLng})`);
      console.log(`🌐 Distance Matrix Service: API URL: ${url.replace(this.apiKey, 'API_KEY_HIDDEN')}`);

      const response = await this.makeRequest(url);

      console.log(`📡 Distance Matrix Service: Raw API response:`, JSON.stringify(response, null, 2));

      if (response.status === 'OK' && response.rows && response.rows.length > 0) {
        const element = response.rows[0].elements[0];
        console.log(`🔍 Distance Matrix Service: Element status: ${element.status}`);

        if (element.status === 'OK') {
          const distanceKm = element.distance.value / 1000; // Convert meters to kilometers
          const durationMinutes = Math.ceil(element.duration.value / 60); // Convert seconds to minutes

          const result = {
            distance: parseFloat(distanceKm.toFixed(3)),
            duration: durationMinutes,
            distanceText: element.distance.text,
            durationText: element.duration.text
          };

          console.log(`✅ Distance Matrix Service: SUCCESS - Found route - ${result.distanceText} in ${result.durationText}`);
          console.log(`📊 Distance Matrix Service: Processed result:`, result);
          return result;
        } else {
          console.warn(`⚠️ Distance Matrix Service: Route calculation failed - ${element.status}`);
          console.warn(`⚠️ Distance Matrix Service: Element details:`, element);
          return null;
        }
      } else {
        console.warn(`⚠️ Distance Matrix Service: API response error - ${response.status}`);
        console.warn(`⚠️ Distance Matrix Service: Full response:`, response);
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
      console.log(`🌐 Distance Matrix Service: Making HTTPS request to Google API...`);
      console.log(`📡 Distance Matrix Service: Request URL (key hidden): ${url.replace(this.apiKey, 'API_KEY_HIDDEN')}`);

      https.get(url, (res) => {
        console.log(`📡 Distance Matrix Service: HTTP Status: ${res.statusCode}`);
        console.log(`📡 Distance Matrix Service: Response Headers:`, res.headers);

        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          console.log(`📡 Distance Matrix Service: Raw response data:`, data);
          try {
            const response = JSON.parse(data);
            console.log(`📡 Distance Matrix Service: Parsed response:`, response);
            resolve(response);
          } catch (error) {
            console.error(`❌ Distance Matrix Service: Failed to parse response:`, error);
            reject(new Error(`Failed to parse API response: ${error.message}`));
          }
        });
      }).on('error', (error) => {
        console.error(`❌ Distance Matrix Service: HTTPS request error:`, error);
        reject(error);
      });
    });
  }
}

module.exports = new DistanceMatrixService();
