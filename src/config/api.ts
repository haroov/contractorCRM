// API Configuration
const getBaseUrl = () => {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
        // Remove trailing /api if it exists to avoid duplication
        return baseUrl.endsWith('/api') ? baseUrl.slice(0, -4) : baseUrl;
    }
    return '/api';
};

const getAuthBaseUrl = () => {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env.VITE_AUTH_BASE_URL || '';
    }
    return '';
};

export const API_CONFIG = {
    // Base URL for API calls - use import.meta.env for Vite/Vercel
    BASE_URL: getBaseUrl(),
    
    // Auth Base URL - for authentication endpoints
    AUTH_BASE_URL: getAuthBaseUrl(),

    // Specific endpoints
    CONTRACTORS: '/api/contractors',
    PROJECTS: '/api/projects',
    HEALTH: '/api/health',
    AUTH: '/api/auth',

    // Full URLs - these are already complete paths, don't add BASE_URL
    CONTRACTORS_URL: () => API_CONFIG.CONTRACTORS,
    PROJECTS_URL: () => API_CONFIG.PROJECTS,
    HEALTH_URL: () => API_CONFIG.HEALTH,
    
    // Auth URLs
    AUTH_STATUS_URL: () => `${API_CONFIG.AUTH}/status`,
    AUTH_ME_URL: () => `${API_CONFIG.AUTH}/me`,
    AUTH_LOGOUT_URL: () => `${API_CONFIG.AUTH}/logout`,
    AUTH_GOOGLE_URL: () => `${API_CONFIG.AUTH}/google`,

    // Individual contractor/project URLs
    CONTRACTOR_URL: (id: string) => `${API_CONFIG.CONTRACTORS}/${id}`,
    PROJECT_URL: (id: string) => `${API_CONFIG.PROJECTS}/${id}`,
    VALIDATE_STATUS_URL: (id: string) => `${API_CONFIG.CONTRACTORS}/validate-status/${id}`,
};

// Helper function to get session ID from URL or localStorage
export const getSessionId = (): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSessionId = urlParams.get('sessionId');
    const localSessionId = localStorage.getItem('sessionId');
    
    // Check if this is a system user (admin/regular user) vs contact user
    const contactUser = localStorage.getItem('contactUser');
    const isSystemUser = contactUser && JSON.parse(contactUser).userType === 'system';
    
    // For system users, we need sessionId
    if (isSystemUser) {
        return urlSessionId || localSessionId;
    }
    
    // For contact users, we don't need sessionId - they use session cookies
    const isContactUser = localStorage.getItem('contactUserAuthenticated') === 'true';
    if (isContactUser && !isSystemUser) {
        return null; // Contact users rely on session cookies
    }
    
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
    
    // Add contact user data from localStorage if available
    const isContactUser = localStorage.getItem('contactUserAuthenticated') === 'true';
    if (isContactUser) {
        const contactUser = localStorage.getItem('contactUser');
        if (contactUser) {
            const userData = JSON.parse(contactUser);
            // Only add X-Contact-User header for actual contact users, not system users
            if (userData.userType !== 'system') {
                // Encode the contact user data to avoid non-ISO-8859-1 characters
                headers['X-Contact-User'] = encodeURIComponent(contactUser);
            }
        }
    }
    
    return headers;
};

// Helper function for authenticated API calls
export const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const sessionId = getSessionId();
    
    // For FormData, don't set Content-Type - let browser set it with boundary
    const isFormData = options.body instanceof FormData;
    const headers = isFormData ? {} : getAuthHeaders();
    
    const fetchOptions: RequestInit = {
        ...options,
        headers: {
            ...headers,
            ...options.headers,
        },
        credentials: 'include',
    };
    
    // Add base URL if the URL doesn't start with http
    const fullUrl = url.startsWith('http') ? url : `${API_CONFIG.BASE_URL}${url}`;
    
    // Check if this is a system user vs contact user
    const contactUser = localStorage.getItem('contactUser');
    const isSystemUser = contactUser && JSON.parse(contactUser).userType === 'system';
    const isContactUser = localStorage.getItem('contactUserAuthenticated') === 'true';
    
    // For system users, add sessionId as query parameter
    if (sessionId && isSystemUser) {
        // Add session ID as query parameter as well
        const urlWithSession = fullUrl.includes('?') 
            ? `${fullUrl}&sessionId=${sessionId}`
            : `${fullUrl}?sessionId=${sessionId}`;
        return fetch(urlWithSession, fetchOptions);
    }
    
    // For contact users, don't add sessionId - they use session cookies
    if (sessionId && isContactUser && !isSystemUser) {
        // Contact users rely on session cookies only
        return fetch(fullUrl, fetchOptions);
    }
    
    return fetch(fullUrl, fetchOptions);
};
