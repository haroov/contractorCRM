// API Configuration
export const API_CONFIG = {
    // Base URL for API calls - use import.meta.env for Vite/Vercel
    BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://contractorcrm-api.onrender.com/api',
    
    // Auth Base URL - for authentication endpoints
    AUTH_BASE_URL: import.meta.env.VITE_AUTH_BASE_URL || 'https://contractorcrm-api.onrender.com',

    // Specific endpoints
    CONTRACTORS: '/contractors',
    PROJECTS: '/projects',
    HEALTH: '/health',
    AUTH: '/auth',

    // Full URLs
    CONTRACTORS_URL: () => `${API_CONFIG.BASE_URL}${API_CONFIG.CONTRACTORS}`,
    PROJECTS_URL: () => `${API_CONFIG.BASE_URL}${API_CONFIG.PROJECTS}`,
    HEALTH_URL: () => `${API_CONFIG.BASE_URL}${API_CONFIG.HEALTH}`,
    
    // Auth URLs
    AUTH_STATUS_URL: () => `${API_CONFIG.AUTH_BASE_URL}${API_CONFIG.AUTH}/status`,
    AUTH_ME_URL: () => `${API_CONFIG.AUTH_BASE_URL}${API_CONFIG.AUTH}/me`,
    AUTH_LOGOUT_URL: () => `${API_CONFIG.AUTH_BASE_URL}${API_CONFIG.AUTH}/logout`,
    AUTH_GOOGLE_URL: () => `${API_CONFIG.AUTH_BASE_URL}${API_CONFIG.AUTH}/google`,

    // Individual contractor/project URLs
    CONTRACTOR_URL: (id: string) => `${API_CONFIG.BASE_URL}${API_CONFIG.CONTRACTORS}/${id}`,
    PROJECT_URL: (id: string) => `${API_CONFIG.BASE_URL}${API_CONFIG.PROJECTS}/${id}`,
    VALIDATE_STATUS_URL: (id: string) => `${API_CONFIG.BASE_URL}${API_CONFIG.CONTRACTORS}/validate-status/${id}`,
};
