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

    const data = await response.json();
    console.log('🔍 Raw API response data:', data);
    console.log('🔍 Raw insuranceSpecification from API:', data.insuranceSpecification);
    console.log('🔍 Raw theftCoverage from API:', data.insuranceSpecification?.theftCoverage);

    // Extract the project data from the response
    if (data.success && data.project) {
      console.log('🔍 Extracted project data:', data.project);
      console.log('🔍 Extracted insuranceSpecification:', data.project.insuranceSpecification);
      console.log('🔍 Extracted theftCoverage:', data.project.insuranceSpecification?.theftCoverage);
      return data.project;
    }

    return data;
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

// Annual Insurances API
export const annualInsurancesAPI = {
  // Get all annual insurances by contractor
  getByContractor: async (contractorId: string) => {
    const response = await authenticatedFetch(`/api/annual-insurances?contractorId=${contractorId}`);

    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },

  // Get annual insurance by ID
  getById: async (id: string) => {
    const response = await authenticatedFetch(`/api/annual-insurances/${id}`);

    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },

  // Create new annual insurance
  create: async (annualInsurance: any) => {
    const response = await authenticatedFetch('/api/annual-insurances', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(annualInsurance),
    });

    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },

  // Update annual insurance
  update: async (id: string, annualInsurance: any) => {
    const response = await authenticatedFetch(`/api/annual-insurances/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(annualInsurance),
    });

    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },

  // Delete annual insurance
  delete: async (id: string) => {
    const response = await authenticatedFetch(`/api/annual-insurances/${id}`, {
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

  // Increase coverage
  increaseCoverage: async (id: string, amount: number, premium: number, reason?: string) => {
    const response = await authenticatedFetch(`/api/annual-insurances/${id}/increase-coverage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount, premium, reason }),
    });

    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },

  // Add project to annual insurance
  addProject: async (id: string, projectId: string) => {
    const response = await authenticatedFetch(`/api/annual-insurances/${id}/add-project`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ projectId }),
    });

    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },

  // Remove project from annual insurance
  removeProject: async (id: string, projectId: string) => {
    const response = await authenticatedFetch(`/api/annual-insurances/${id}/remove-project`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ projectId }),
    });

    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },

  // Get projects for annual insurance
  getProjects: async (id: string) => {
    const response = await authenticatedFetch(`/api/annual-insurances/${id}/projects`);

    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },

  // Transfer projects
  transferProjects: async (id: string, targetAnnualInsuranceId: string, projectIds: string[]) => {
    const response = await authenticatedFetch(`/api/annual-insurances/${id}/transfer-projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ targetAnnualInsuranceId, projectIds }),
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

export default api;
