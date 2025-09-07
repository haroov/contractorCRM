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

// Helper function to get session ID from URL or localStorage
export const getSessionId = (): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSessionId = urlParams.get('sessionId');
    const localSessionId = localStorage.getItem('sessionId');
    return urlSessionId || localSessionId;
};

// Helper function to create authenticated fetch options
export const getAuthHeaders = (): HeadersInit => {
    const sessionId = getSessionId();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    
    if (sessionId) {
        headers['X-Session-ID'] = sessionId;
    }
    
    return headers;
};

// Helper function for authenticated API calls
export const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const sessionId = getSessionId();
    const fetchOptions: RequestInit = {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...options.headers,
        },
        credentials: 'include',
    };
    
    // Add base URL if the URL doesn't start with http
    const fullUrl = url.startsWith('http') ? url : `${API_CONFIG.BASE_URL}${url}`;
    
    if (sessionId) {
        // Add session ID as query parameter as well
        const urlWithSession = fullUrl.includes('?') 
            ? `${fullUrl}&sessionId=${sessionId}`
            : `${fullUrl}?sessionId=${sessionId}`;
        return fetch(urlWithSession, fetchOptions);
    }
    
    return fetch(fullUrl, fetchOptions);
};
