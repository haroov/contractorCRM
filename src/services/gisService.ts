import { authenticatedFetch } from '../config/api';

export interface GISValues {
  png25: number | null;
  cresta: string | null;
}

export interface FireStationData {
  name: string;
  address: string;
  phone: string;
  stationType: string;
  distance: string;
  travelTime: number;
  distance_m: number;
  coordinates: {
    longitude: number | null;
    latitude: number | null;
  };
}

export interface PoliceStationData {
  name: string;
  address: string;
  phone: string;
  stationType: string;
  distance: string;
  travelTime: number;
  distance_m: number;
  coordinates: {
    longitude: number | null;
    latitude: number | null;
  };
}

export interface FuelStationData {
  name: string;
  address: string;
  phone: string;
  stationType: string;
  distance: string;
  travelTime: number;
  distance_m: number;
  coordinates: {
    longitude: number | null;
    latitude: number | null;
  };
}

export interface FirstAidStationData {
  name: string;
  city: string;
  address: string;
  phone: string;
  stationType: string;
  distance: string;
  travelTime: number;
  distance_m: number;
  coordinates: {
    longitude: number | null;
    latitude: number | null;
  };
}

export interface GISResponse {
  success: boolean;
  coordinates: {
    x: number;
    y: number;
  };
  gisValues: GISValues;
}

export interface ProjectUpdateResponse {
  success: boolean;
  projectId: string;
  coordinates: {
    x: number;
    y: number;
  };
  gisValues: GISValues;
  updatedFields: string[];
}

class GISService {
  /**
   * Calculate GIS values (PNG25 and Cresta) for given coordinates
   * @param x - X coordinate (longitude)
   * @param y - Y coordinate (latitude)
   * @returns Promise<GISResponse>
   */
  async calculateGISValues(x: number, y: number): Promise<GISResponse> {
    try {
      console.log(`🔍 GIS Service: Calculating values for coordinates (${x}, ${y})`);

      const response = await authenticatedFetch('/api/gis/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ x, y }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate GIS values');
      }

      const data = await response.json();
      console.log('✅ GIS Service: Successfully calculated GIS values:', data);
      return data;
    } catch (error) {
      console.error('❌ GIS Service: Error calculating GIS values:', error);
      throw error;
    }
  }

  /**
   * Get nearest fire station based on coordinates
   * @param x - X coordinate (longitude)
   * @param y - Y coordinate (latitude)
   * @returns Promise<FireStationData | null>
   */
  async getNearestFireStation(x: number, y: number): Promise<FireStationData | null> {
    try {
      console.log(`🔍 GIS Service: Finding nearest fire station for coordinates (${x}, ${y})`);

      const response = await authenticatedFetch(`/api/gis/fire-station?x=${x}&y=${y}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to find nearest fire station');
      }

      const data = await response.json();
      console.log('✅ GIS Service: Successfully found nearest fire station:', data);
      return data.fireStation;
    } catch (error) {
      console.error('❌ GIS Service: Error finding nearest fire station:', error);
      throw error;
    }
  }

  /**
   * Find nearest police station for given coordinates
   * @param x - X coordinate (longitude)
   * @param y - Y coordinate (latitude)
   * @returns Promise<PoliceStationData | null>
   */
  async getNearestPoliceStation(x: number, y: number): Promise<PoliceStationData | null> {
    try {
      console.log(`🔍 GIS Service: Finding nearest police station for coordinates (${x}, ${y})`);

      const response = await authenticatedFetch(`/api/gis/police-station?x=${x}&y=${y}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to find nearest police station');
      }

      const data = await response.json();
      console.log('✅ GIS Service: Successfully found nearest police station:', data);
      return data.policeStation;
    } catch (error) {
      console.error('❌ GIS Service: Error finding nearest police station:', error);
      throw error;
    }
  }

  /**
   * Get nearest fuel station based on coordinates
   * @param x - X coordinate (longitude)
   * @param y - Y coordinate (latitude)
   * @returns Promise<FuelStationData | null>
   */
  async getNearestFuelStation(x: number, y: number): Promise<FuelStationData | null> {
    try {
      console.log(`🔍 GIS Service: Finding nearest fuel station for coordinates (${x}, ${y})`);

      const response = await authenticatedFetch(`/api/gis/fuel-station?x=${x}&y=${y}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to find nearest fuel station');
      }

      const data = await response.json();
      console.log('✅ GIS Service: Successfully found nearest fuel station:', data);
      return data.fuelStation;
    } catch (error) {
      console.error('❌ GIS Service: Error finding nearest fuel station:', error);
      throw error;
    }
  }

  /**
   * Get nearest first aid station (MDA) based on coordinates
   * @param x - X coordinate (longitude)
   * @param y - Y coordinate (latitude)
   * @returns Promise<FirstAidStationData | null>
   */
  async getNearestFirstAidStation(x: number, y: number): Promise<FirstAidStationData | null> {
    try {
      console.log(`🔍 GIS Service: Finding nearest first aid station for coordinates (${x}, ${y})`);

      const response = await authenticatedFetch(`/api/gis/first-aid-station?x=${x}&y=${y}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to find nearest first aid station');
      }

      const data = await response.json();
      console.log('✅ GIS Service: Successfully found nearest first aid station:', data);
      return data.firstAidStation;
    } catch (error) {
      console.error('❌ GIS Service: Error finding nearest first aid station:', error);
      throw error;
    }
  }

  /**
   * Update project with GIS values based on coordinates
   * @param projectId - Project ID
   * @param x - X coordinate (longitude)
   * @param y - Y coordinate (latitude)
   * @returns Promise<ProjectUpdateResponse>
   */
  async updateProjectWithGISValues(projectId: string, x: number, y: number): Promise<ProjectUpdateResponse> {
    try {
      console.log(`🔍 GIS Service: Updating project ${projectId} with coordinates (${x}, ${y})`);

      const response = await authenticatedFetch(`/api/gis/update-project/${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ x, y }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update project with GIS values');
      }

      const data = await response.json();
      console.log('✅ GIS Service: Successfully updated project with GIS values:', data);
      return data;
    } catch (error) {
      console.error('❌ GIS Service: Error updating project:', error);
      throw error;
    }
  }

  /**
   * Get PNG25 value for coordinates
   * @param x - X coordinate (longitude)
   * @param y - Y coordinate (latitude)
   * @returns Promise<number | null>
   */
  async getPNG25Value(x: number, y: number): Promise<number | null> {
    try {
      console.log(`🔍 GIS Service: Getting PNG25 for coordinates (${x}, ${y})`);

      const response = await authenticatedFetch(`/api/gis/png25?x=${x}&y=${y}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get PNG25 value');
      }

      const data = await response.json();
      console.log('✅ GIS Service: Successfully got PNG25 value:', data.png25);
      return data.png25;
    } catch (error) {
      console.error('❌ GIS Service: Error getting PNG25 value:', error);
      return null;
    }
  }

  /**
   * Get Cresta zone for coordinates
   * @param x - X coordinate (longitude)
   * @param y - Y coordinate (latitude)
   * @returns Promise<string | null>
   */
  async getCrestaZone(x: number, y: number): Promise<string | null> {
    try {
      console.log(`🔍 GIS Service: Getting Cresta zone for coordinates (${x}, ${y})`);

      const response = await authenticatedFetch(`/api/gis/cresta?x=${x}&y=${y}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get Cresta zone');
      }

      const data = await response.json();
      console.log('✅ GIS Service: Successfully got Cresta zone:', data.cresta);
      return data.cresta;
    } catch (error) {
      console.error('❌ GIS Service: Error getting Cresta zone:', error);
      return null;
    }
  }

  /**
   * Check if GIS service is healthy
   * @returns Promise<boolean>
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response = await authenticatedFetch('/api/gis/health');
      return response.ok;
    } catch (error) {
      console.error('❌ GIS Service: Health check failed:', error);
      return false;
    }
  }

  /**
   * Auto-calculate GIS values when coordinates change
   * @param x - X coordinate (longitude)
   * @param y - Y coordinate (latitude)
   * @param onSuccess - Callback function called with calculated values
   * @param onError - Callback function called on error
   */
  async autoCalculateGISValues(
    x: number,
    y: number,
    onSuccess: (values: GISValues) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      if (!x || !y) {
        console.log('⚠️ GIS Service: Skipping calculation - coordinates are empty');
        return;
      }

      const result = await this.calculateGISValues(x, y);
      onSuccess(result.gisValues);
    } catch (error) {
      console.error('❌ GIS Service: Auto-calculation failed:', error);
      if (onError) {
        onError(error as Error);
      }
    }
  }
}

// Export singleton instance
const gisService = new GISService();
export default gisService;
