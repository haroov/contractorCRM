import axios from 'axios';
import { authenticatedFetch } from '../config/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log('🚀 API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging and error handling
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

// Projects API
export const projectsAPI = {
  // Get all projects
  getAll: async () => {
    const response = await authenticatedFetch('/api/projects');
    
    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },

  // Get projects by contractor ID
  getByContractor: async (contractorId: string) => {
    const response = await authenticatedFetch(`/api/projects?contractorId=${contractorId}`);
    
    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },

  // Get project by ID
  getById: async (projectId: string) => {
    const response = await authenticatedFetch(`/api/projects/${projectId}`);
    
    console.log('🔍 API Response status:', response.status);
    console.log('🔍 API Response headers:', response.headers.get('content-type'));
    
    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('❌ API returned non-JSON response:', contentType);
      const responseText = await response.text();
      console.error('❌ Response content (first 500 chars):', responseText.substring(0, 500));
      console.error('❌ Full response URL:', response.url);
      console.error('❌ Response status:', response.status);
      console.error('❌ Response statusText:', response.statusText);
      throw new Error(`API returned non-JSON response: ${contentType}`);
    }
    
    return response.json();
  },

  // Create new project
  create: async (project: any) => {
    const response = await authenticatedFetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(project),
    });
    
    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },

  // Update project
  update: async (id: string, project: any) => {
    console.log('🔍 projectsAPI.update called with:');
    console.log('🔍 ID:', id);
    console.log('🔍 Project data:', JSON.stringify(project, null, 2));
    console.log('🔍 Full URL:', `/api/projects/${id}`);
    
    const response = await authenticatedFetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(project),
    });
    
    console.log('🔍 Response status:', response.status);
    console.log('🔍 Response ok:', response.ok);
    
    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('🔍 API Response result:', JSON.stringify(result, null, 2));
    return result;
  },

  // Delete project
  delete: async (id: string) => {
    const response = await authenticatedFetch(`/api/projects/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  },
};

// Health check
export const healthAPI = {
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

export const contractorsAPI = {
  // Get all contractors
  getAll: async () => {
    const response = await api.get("/contractors");
    return response.data;
  },

  // Get contractor by ID
  getById: async (id: string) => {
    const response = await api.get(`/contractors/${id}`);
    return response.data;
  },

  // Create new contractor
  create: async (contractor: any) => {
    const response = await api.post("/contractors", contractor);
    return response.data;
  },

  // Update contractor
  update: async (id: string, contractor: any) => {
    const response = await api.put(`/contractors/${id}`, contractor);
    return response.data;
  },

  // Delete contractor
  delete: async (id: string) => {
    const response = await api.delete(`/contractors/${id}`);
    return response.data;
  }
};

export default api;
