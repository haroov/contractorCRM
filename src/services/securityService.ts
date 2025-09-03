import type { Contact } from '../types/contractor';

// Security Service - Security by Design
export class SecurityService {
    private static instance: SecurityService;
    private currentUser: Contact | null = null;
    private userPermissions: Set<string> = new Set();

    private constructor() { }

    public static getInstance(): SecurityService {
        if (!SecurityService.instance) {
            SecurityService.instance = new SecurityService();
        }
        return SecurityService.instance;
    }

    // Authentication & Authorization
    public authenticateUser(user: Contact): boolean {
        try {
            // Validate user data
            if (!this.validateUserData(user)) {
                console.error('❌ Invalid user data for authentication');
                return false;
            }

            this.currentUser = user;
            this.userPermissions = new Set([user.permissions]);

            console.log('✅ User authenticated successfully:', user.fullName);
            return true;
        } catch (error) {
            console.error('❌ Authentication error:', error);
            return false;
        }
    }

    public logout(): void {
        this.currentUser = null;
        this.userPermissions.clear();
        console.log('✅ User logged out successfully');
    }

    // Permission Checks
    public hasPermission(permission: string): boolean {
        if (!this.currentUser) {
            console.warn('⚠️ No authenticated user');
            return false;
        }

        const hasPermission = this.userPermissions.has(permission);
        console.log(`🔐 Permission check: ${permission} - ${hasPermission ? 'GRANTED' : 'DENIED'}`);
        return hasPermission;
    }

    public canView(): boolean {
        return this.hasPermission('user') || this.hasPermission('admin');
    }

    public canEdit(): boolean {
        return this.hasPermission('admin');
    }

    public canDelete(): boolean {
        return this.hasPermission('admin');
    }

    public canCreate(): boolean {
        return this.hasPermission('admin');
    }

    // Data Validation & Sanitization
    public validateUserData(user: Contact): boolean {
        // Basic validation
        if (!user.id || !user.fullName || !user.role || !user.permissions) {
            return false;
        }

        // Permission validation
        if (!['user', 'admin'].includes(user.permissions)) {
            return false;
        }

        // Email validation (if provided)
        if (user.email && !this.isValidEmail(user.email)) {
            return false;
        }

        // Phone validation (if provided)
        if (user.mobile && !this.isValidPhone(user.mobile)) {
            return false;
        }

        return true;
    }

    public sanitizeInput(input: string): string {
        // Remove potentially dangerous characters
        return input
            .replace(/[<>]/g, '') // Remove < and >
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+=/gi, '') // Remove event handlers
            .trim();
    }

    public validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    public validatePhone(phone: string): boolean {
        // Israeli phone number validation
        const phoneRegex = /^05[0-9]-?[0-9]{7}$/;
        return phoneRegex.test(phone);
    }

    // Audit Logging
    public logSecurityEvent(event: string, details: any): void {
        const timestamp = new Date().toISOString();
        const user = this.currentUser?.fullName || 'Unknown';

        console.log(`🔒 SECURITY EVENT [${timestamp}] - User: ${user} - Event: ${event}`, details);

        // In production, this would be sent to a secure logging service
        // await this.sendToSecurityLog(timestamp, user, event, details);
    }

    // Rate Limiting
    private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

    public checkRateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 900000): boolean {
        const now = Date.now();
        const record = this.requestCounts.get(identifier);

        if (!record || now > record.resetTime) {
            this.requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
            return true;
        }

        if (record.count >= maxRequests) {
            this.logSecurityEvent('RATE_LIMIT_EXCEEDED', { identifier, count: record.count });
            return false;
        }

        record.count++;
        return true;
    }

    // Encryption (placeholder for production)
    public encryptSensitiveData(data: string): string {
        // In production, use proper encryption (AES-256, etc.)
        // This is just a placeholder
        return btoa(data);
    }

    public decryptSensitiveData(encryptedData: string): string {
        // In production, use proper decryption
        // This is just a placeholder
        return atob(encryptedData);
    }

    // Session Management
    public getCurrentUser(): Contact | null {
        return this.currentUser;
    }

    public isAuthenticated(): boolean {
        return this.currentUser !== null;
    }

    // Security Headers (for web deployment)
    public getSecurityHeaders(): Record<string, string> {
        return {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
        };
    }
}

// Export singleton instance
export const securityService = SecurityService.getInstance();
