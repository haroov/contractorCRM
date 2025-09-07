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
    const response = await authenticatedFetch('/projects');
    return response.json();
  },

  // Get projects by contractor ID
  getByContractor: async (contractorId: string) => {
    const response = await authenticatedFetch(`/projects?contractorId=${contractorId}`);
    return response.json();
  },

  // Get project by ID
  getById: async (projectId: string) => {
    const response = await authenticatedFetch(`/projects/${projectId}`);
    return response.json();
  },

  // Create new project
  create: async (project: any) => {
    const response = await authenticatedFetch('/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(project),
    });
    return response.json();
  },

  // Update project
  update: async (id: string, project: any) => {
    const response = await authenticatedFetch(`/projects/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(project),
    });
    return response.json();
  },

  // Delete project
  delete: async (id: string) => {
    const response = await authenticatedFetch(`/projects/${id}`, {
      method: 'DELETE',
    });
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
