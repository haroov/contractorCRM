// API Configuration
const getBaseUrl = () => {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://contractorcrm-api.onrender.com';
        // Remove trailing /api if it exists to avoid duplication
        return baseUrl.endsWith('/api') ? baseUrl.slice(0, -4) : baseUrl;
    }
    return 'https://contractorcrm-api.onrender.com';
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

    // Check if this is a contact user (not system admin)
    const isContactUser = localStorage.getItem('contactUserAuthenticated') === 'true';
    const contactUser = localStorage.getItem('contactUser');

    // For contact users, we don't need sessionId - they use session cookies
    if (isContactUser && contactUser) {
        try {
            const contactUserData = JSON.parse(contactUser);
            if (contactUserData.userType === 'contact') {
                return null; // Contact users rely on session cookies
            }
        } catch (error) {
            console.error('Error parsing contact user data:', error);
        }
    }

    // For system users (admin/regular), we need sessionId
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
            try {
                const userData = JSON.parse(contactUser);
                // Only add X-Contact-User header for actual contact users, not system users
                if (userData.userType === 'contact') {
                    // Encode the contact user data to avoid non-ISO-8859-1 characters
                    headers['X-Contact-User'] = encodeURIComponent(contactUser);
                }
            } catch (error) {
                console.error('Error parsing contact user data:', error);
            }
        }
    }

    return headers;
};

// Helper function for authenticated API calls
export const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const sessionId = getSessionId();
    console.log('🔍 authenticatedFetch - sessionId:', sessionId);
    console.log('🔍 authenticatedFetch - url:', url);

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
    console.log('🔍 authenticatedFetch - fullUrl:', fullUrl);
    console.log('🔍 authenticatedFetch - API_CONFIG.BASE_URL:', API_CONFIG.BASE_URL);

    // Check if this is a contact user vs system user
    const isContactUser = localStorage.getItem('contactUserAuthenticated') === 'true';
    const contactUser = localStorage.getItem('contactUser');
    let isSystemUser = false;

    console.log('🔍 authenticatedFetch - isContactUser:', isContactUser);
    console.log('🔍 authenticatedFetch - contactUser:', contactUser);

    if (isContactUser && contactUser) {
        try {
            const contactUserData = JSON.parse(contactUser);
            isSystemUser = contactUserData.userType !== 'contact';
            console.log('🔍 authenticatedFetch - contactUserData.userType:', contactUserData.userType);
            console.log('🔍 authenticatedFetch - isSystemUser:', isSystemUser);
        } catch (error) {
            console.error('Error parsing contact user data:', error);
            isSystemUser = true; // Default to system user if parsing fails
        }
    } else {
        isSystemUser = true; // If not a contact user, assume system user
        console.log('🔍 authenticatedFetch - defaulting to system user');
    }

    // For system users, add sessionId as query parameter
    if (sessionId && isSystemUser) {
        // Add session ID as query parameter as well
        const urlWithSession = fullUrl.includes('?')
            ? `${fullUrl}&sessionId=${sessionId}`
            : `${fullUrl}?sessionId=${sessionId}`;
        console.log('✅ authenticatedFetch - final URL with sessionId:', urlWithSession);
        return fetch(urlWithSession, fetchOptions);
    }

    // For contact users, don't add sessionId - they use session cookies
    if (sessionId && isContactUser && !isSystemUser) {
        // Contact users rely on session cookies only
        console.log('✅ authenticatedFetch - contact user, using cookies only:', fullUrl);
        return fetch(fullUrl, fetchOptions);
    }

    console.log('❌ authenticatedFetch - no sessionId or not system user, using basic URL:', fullUrl);
    return fetch(fullUrl, fetchOptions);
};
