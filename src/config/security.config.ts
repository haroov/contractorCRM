// Security Configuration for Cloud Deployment
export const SecurityConfig = {
    // Authentication & Authorization
    AUTH: {
        JWT_SECRET: process.env.JWT_SECRET || (() => {
            if (process.env.NODE_ENV === 'production') {
                throw new Error('JWT_SECRET environment variable must be set in production');
            }
            return 'dev-jwt-secret-not-for-production';
        })(),
        JWT_EXPIRES_IN: '24h',
        REFRESH_TOKEN_EXPIRES_IN: '7d',
        PASSWORD_MIN_LENGTH: 12,
        PASSWORD_REQUIRE_SPECIAL_CHARS: true,
        PASSWORD_REQUIRE_NUMBERS: true,
        PASSWORD_REQUIRE_UPPERCASE: true,
        PASSWORD_REQUIRE_LOWERCASE: true,
        MAX_LOGIN_ATTEMPTS: 5,
        LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
    },

    // Database Security
    DATABASE: {
        CONNECTION_STRING: process.env.MONGODB_URI || 'mongodb://localhost:27017/contractor-crm',
        USE_SSL: process.env.NODE_ENV === 'production',
        USE_TLS: process.env.NODE_ENV === 'production',
        AUTH_SOURCE: 'admin',
        MAX_POOL_SIZE: 10,
        MIN_POOL_SIZE: 2,
        MAX_IDLE_TIME: 30000,
        SERVER_SELECTION_TIMEOUT: 5000,
    },

    // API Security
    API: {
        RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
        RATE_LIMIT_MAX_REQUESTS: 100,
        CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
        CORS_CREDENTIALS: true,
        CORS_MAX_AGE: 86400, // 24 hours
    },

    // Encryption
    ENCRYPTION: {
        ALGORITHM: 'aes-256-gcm',
        KEY_LENGTH: 32,
        IV_LENGTH: 16,
        SALT_LENGTH: 64,
        ITERATIONS: 100000,
    },

    // Session Management
    SESSION: {
        SECRET: process.env.SESSION_SECRET || (() => {
            if (process.env.NODE_ENV === 'production') {
                throw new Error('SESSION_SECRET environment variable must be set in production');
            }
            return 'dev-session-secret-not-for-production';
        })(),
        COOKIE_SECURE: process.env.NODE_ENV === 'production',
        COOKIE_HTTP_ONLY: true,
        COOKIE_SAME_SITE: 'strict' as const,
        COOKIE_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
    },

    // Logging & Monitoring
    LOGGING: {
        LEVEL: process.env.LOG_LEVEL || 'info',
        ENABLE_AUDIT_LOG: true,
        ENABLE_SECURITY_LOG: true,
        LOG_RETENTION_DAYS: 90,
        SEND_TO_EXTERNAL_SERVICE: process.env.NODE_ENV === 'production',
    },

    // Cloud Provider Specific
    CLOUD: {
        PROVIDER: process.env.CLOUD_PROVIDER || 'local', // aws, azure, gcp, local
        REGION: process.env.CLOUD_REGION || 'us-east-1',
        ENVIRONMENT: process.env.NODE_ENV || 'development',
        ENABLE_HTTPS: process.env.NODE_ENV === 'production',
        ENABLE_CDN: process.env.NODE_ENV === 'production',
        ENABLE_LOAD_BALANCER: process.env.NODE_ENV === 'production',
    },

    // Security Headers
    HEADERS: {
        ENABLE_HSTS: process.env.NODE_ENV === 'production',
        ENABLE_CSP: true,
        ENABLE_XSS_PROTECTION: true,
        ENABLE_CONTENT_TYPE_OPTIONS: true,
        ENABLE_FRAME_OPTIONS: true,
        ENABLE_REFERRER_POLICY: true,
        ENABLE_PERMISSIONS_POLICY: true,
    },

    // File Upload Security
    FILE_UPLOAD: {
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        ALLOWED_EXTENSIONS: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
        ALLOWED_MIME_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'],
        SCAN_FOR_VIRUSES: process.env.NODE_ENV === 'production',
        ENCRYPT_AT_REST: true,
    },

    // Backup & Recovery
    BACKUP: {
        ENABLE_AUTOMATIC_BACKUP: process.env.NODE_ENV === 'production',
        BACKUP_FREQUENCY: 'daily',
        BACKUP_RETENTION_DAYS: 30,
        ENCRYPT_BACKUPS: true,
        TEST_RESTORE_REGULARLY: true,
    },

    // Disaster Recovery
    DISASTER_RECOVERY: {
        ENABLE_MULTI_REGION: process.env.NODE_ENV === 'production',
        ENABLE_AUTO_SCALING: process.env.NODE_ENV === 'production',
        ENABLE_LOAD_BALANCING: process.env.NODE_ENV === 'production',
        RTO_TARGET: 4 * 60 * 60 * 1000, // 4 hours
        RPO_TARGET: 60 * 60 * 1000, // 1 hour
    },
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'production') {
    SecurityConfig.API.RATE_LIMIT_MAX_REQUESTS = 50; // Stricter rate limiting in production
    SecurityConfig.AUTH.MAX_LOGIN_ATTEMPTS = 3; // Fewer login attempts in production
    SecurityConfig.SESSION.COOKIE_MAX_AGE = 60 * 60 * 1000; // Shorter sessions in production
}

// Validation function
export function validateSecurityConfig(): boolean {
    try {
        // Validate required environment variables
        if (process.env.NODE_ENV === 'production') {
            if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
                throw new Error('JWT_SECRET must be set in production');
            }
            if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'your-super-secret-session-key-change-in-production') {
                throw new Error('SESSION_SECRET must be set in production');
            }
            if (!process.env.MONGODB_URI) {
                throw new Error('MONGODB_URI must be set in production');
            }
        }

        console.log('✅ Security configuration validated successfully');
        return true;
    } catch (error) {
        console.error('❌ Security configuration validation failed:', error);
        return false;
    }
}


