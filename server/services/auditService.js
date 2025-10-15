const EventEmitter = require('events');
const UAParser = require('ua-parser-js');
const AuditLog = require('../models/AuditLog');

class AuditService extends EventEmitter {
    constructor() {
        super();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for audit events and save them to database
        this.on('audit', async (eventData) => {
            try {
                await this.saveAuditLog(eventData);
            } catch (error) {
                console.error('❌ Failed to save audit log:', error);
                // Don't throw error to prevent breaking the main application flow
            }
        });
    }

    // Main method to emit audit events
    logEvent(eventData) {
        // Add timestamp if not provided
        if (!eventData.timestamp) {
            eventData.timestamp = new Date();
        }

        // Emit the event for async processing
        this.emit('audit', eventData);
    }

    // Parse device information from user agent
    parseDeviceInfo(userAgent) {
        if (!userAgent) return {};

        try {
            const parser = new UAParser(userAgent);
            const result = parser.getResult();

            return {
                browser: {
                    name: result.browser.name || 'Unknown',
                    version: result.browser.version || 'Unknown'
                },
                os: {
                    name: result.os.name || 'Unknown',
                    version: result.os.version || 'Unknown'
                },
                device: {
                    type: result.device.type || 'desktop',
                    vendor: result.device.vendor || 'Unknown',
                    model: result.device.model || 'Unknown'
                }
            };
        } catch (error) {
            console.error('❌ Failed to parse user agent:', error);
            return {};
        }
    }

    // Extract user information from request
    extractUserInfo(req) {
        const user = req.user || req.session?.user;
        if (!user) return {};

        return {
            userId: user._id || user.id,
            userEmail: user.email,
            userName: user.name,
            userRole: user.role
        };
    }

    // Extract request information
    extractRequestInfo(req) {
        return {
            method: req.method,
            url: req.originalUrl || req.url,
            endpoint: req.route?.path || req.path,
            ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'],
            userAgent: req.headers['user-agent'],
            sessionId: req.sessionID || req.session?.id
        };
    }

    // Save audit log to database
    async saveAuditLog(eventData) {
        try {
            // Parse device info if user agent is provided
            if (eventData.userAgent && !eventData.deviceInfo) {
                eventData.deviceInfo = this.parseDeviceInfo(eventData.userAgent);
            }

            // Create clean audit log object with only valid fields
            const auditLogData = {
                eventType: eventData.eventType,
                action: eventData.action,
                userId: eventData.userId,
                userEmail: eventData.userEmail,
                userName: eventData.userName,
                userRole: eventData.userRole,
                sessionId: eventData.sessionId,
                ipAddress: eventData.ipAddress,
                userAgent: eventData.userAgent,
                deviceInfo: eventData.deviceInfo ? {
                    browser: eventData.deviceInfo.browser ? {
                        name: eventData.deviceInfo.browser.name || 'Unknown',
                        version: eventData.deviceInfo.browser.version || 'Unknown'
                    } : undefined,
                    os: eventData.deviceInfo.os ? {
                        name: eventData.deviceInfo.os.name || 'Unknown',
                        version: eventData.deviceInfo.os.version || 'Unknown'
                    } : undefined,
                    device: eventData.deviceInfo.device ? {
                        type: eventData.deviceInfo.device.type || 'desktop',
                        vendor: eventData.deviceInfo.device.vendor || 'Unknown',
                        model: eventData.deviceInfo.device.model || 'Unknown'
                    } : undefined
                } : undefined,
                method: eventData.method,
                url: eventData.url,
                endpoint: eventData.endpoint,
                resourceType: eventData.resourceType,
                resourceId: eventData.resourceId,
                resourceName: eventData.resourceName,
                description: eventData.description,
                changes: eventData.changes,
                metadata: eventData.metadata,
                success: eventData.success,
                statusCode: eventData.statusCode,
                errorMessage: eventData.errorMessage,
                duration: eventData.duration,
                timestamp: eventData.timestamp || new Date(),
                tags: eventData.tags,
                retentionDate: eventData.retentionDate,
                isArchived: eventData.isArchived
            };

            // Create audit log entry
            const auditLog = new AuditLog(auditLogData);
            await auditLog.save();

            console.log(`✅ Audit log saved: ${eventData.eventType}/${eventData.action} by ${eventData.userEmail || 'anonymous'}`);
        } catch (error) {
            console.error('❌ Failed to save audit log to database:', error);
            // Don't throw error to prevent breaking the main application flow
            // Just log the error and continue
            console.error('❌ Audit log data that failed:', JSON.stringify(auditLogData, null, 2));
        }
    }

    // Convenience methods for different event types

    // Authentication events
    logAuthEvent(action, req, user, success = true, metadata = {}) {
        const requestInfo = this.extractRequestInfo(req);

        this.logEvent({
            eventType: 'auth',
            action,
            userId: user?._id || user?.id,
            userEmail: user?.email,
            userName: user?.name,
            userRole: user?.role,
            success,
            ...requestInfo,
            metadata,
            description: `User ${success ? 'successfully' : 'failed to'} ${action}`
        });
    }

    // CRUD operations
    logCrudEvent(action, req, resourceType, resourceId, resourceName, changes = {}, metadata = {}) {
        const userInfo = this.extractUserInfo(req);
        const requestInfo = this.extractRequestInfo(req);

        this.logEvent({
            eventType: 'crud',
            action,
            resourceType,
            resourceId: resourceId?.toString(),
            resourceName,
            changes,
            ...userInfo,
            ...requestInfo,
            metadata,
            description: `${action} ${resourceType} ${resourceName || resourceId}`
        });
    }

    // File operations
    logFileEvent(action, req, fileName, fileSize, metadata = {}) {
        const userInfo = this.extractUserInfo(req);
        const requestInfo = this.extractRequestInfo(req);

        this.logEvent({
            eventType: 'file',
            action,
            resourceType: 'file',
            resourceName: fileName,
            ...userInfo,
            ...requestInfo,
            metadata: {
                ...metadata,
                fileSize
            },
            description: `${action} file: ${fileName}`
        });
    }

    // System events
    logSystemEvent(action, description, metadata = {}) {
        this.logEvent({
            eventType: 'system',
            action,
            description,
            metadata
        });
    }

    // Security events
    logSecurityEvent(action, req, description, metadata = {}) {
        const userInfo = this.extractUserInfo(req);
        const requestInfo = this.extractRequestInfo(req);

        this.logEvent({
            eventType: 'security',
            action,
            ...userInfo,
            ...requestInfo,
            description,
            metadata,
            success: false // Security events are usually about failed attempts
        });
    }

    // Error events
    logErrorEvent(error, req, metadata = {}) {
        const userInfo = this.extractUserInfo(req);
        const requestInfo = this.extractRequestInfo(req);

        this.logEvent({
            eventType: 'error',
            action: 'error',
            ...userInfo,
            ...requestInfo,
            success: false,
            errorMessage: error.message,
            statusCode: error.status || error.statusCode || 500,
            metadata: {
                ...metadata,
                stack: error.stack
            },
            description: `Error occurred: ${error.message}`
        });
    }

    // Query methods for retrieving audit logs

    async getUserActivity(userId, options = {}) {
        return await AuditLog.findByUser(userId, options);
    }

    async getResourceHistory(resourceType, resourceId, options = {}) {
        return await AuditLog.findByResource(resourceType, resourceId, options);
    }

    async getAnalytics(options = {}) {
        return await AuditLog.getAnalytics(options);
    }

    async searchLogs(filters = {}, options = {}) {
        const query = {};

        // Build query from filters
        if (filters.eventType) query.eventType = filters.eventType;
        if (filters.action) query.action = filters.action;
        if (filters.userId) query.userId = filters.userId;
        if (filters.userEmail) query.userEmail = new RegExp(filters.userEmail, 'i');
        if (filters.resourceType) query.resourceType = filters.resourceType;
        if (filters.resourceId) query.resourceId = filters.resourceId;
        if (filters.ipAddress) query.ipAddress = filters.ipAddress;
        if (filters.success !== undefined) query.success = filters.success;

        // Date range
        if (filters.startDate || filters.endDate) {
            query.timestamp = {};
            if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
            if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
        }

        // Text search in description
        if (filters.search) {
            query.$or = [
                { description: new RegExp(filters.search, 'i') },
                { resourceName: new RegExp(filters.search, 'i') }
            ];
        }

        return await AuditLog.find(query)
            .sort({ timestamp: -1 })
            .limit(options.limit || 100)
            .skip(options.skip || 0)
            .populate('userId', 'name email role');
    }
}

// Create singleton instance
const auditService = new AuditService();

module.exports = auditService;