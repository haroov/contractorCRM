// API Configuration
export const API_CONFIG = {
    // Base URL for API calls - use import.meta.env for Vite/Vercel
    BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',

    // Specific endpoints
    CONTRACTORS: '/contractors',
    PROJECTS: '/projects',
    HEALTH: '/health',

    // Full URLs
    CONTRACTORS_URL: () => `${API_CONFIG.BASE_URL}${API_CONFIG.CONTRACTORS}`,
    PROJECTS_URL: () => `${API_CONFIG.BASE_URL}${API_CONFIG.PROJECTS}`,
    HEALTH_URL: () => `${API_CONFIG.BASE_URL}${API_CONFIG.HEALTH}`,

    // Individual contractor/project URLs
    CONTRACTOR_URL: (id: string) => `${API_CONFIG.BASE_URL}${API_CONFIG.CONTRACTORS}/${id}`,
    PROJECT_URL: (id: string) => `${API_CONFIG.BASE_URL}${API_CONFIG.PROJECTS}/${id}`,
    VALIDATE_STATUS_URL: (id: string) => `${API_CONFIG.BASE_URL}${API_CONFIG.CONTRACTORS}/validate-status/${id}`,
};
