const EventEmitter = require('events');
const AuditEvent = require('../models/AuditEvent');
const { v4: uuidv4 } = require('uuid');

class AuditService extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50); // Increase max listeners for high-volume events
  }

  /**
   * Log a user action with comprehensive audit information
   * @param {Object} options - Audit event options
   * @param {Object} options.user - User information
   * @param {String} options.action - Action type (login, logout, view, create, update, delete, etc.)
   * @param {String} options.resource - Resource type (contractor, user, project, etc.)
   * @param {String} options.resourceId - Specific resource ID
   * @param {Object} options.details - Action-specific details
   * @param {Object} options.oldValues - Previous values (for updates)
   * @param {Object} options.newValues - New values (for updates)
   * @param {Object} options.deviceInfo - Device and browser information
   * @param {Object} options.sessionInfo - Session information
   * @param {Object} options.context - Additional context (URL, referrer, etc.)
   * @param {String} options.reason - Reason for the action
   * @param {Array} options.tags - Tags for categorization
   * @param {String} options.riskLevel - Security risk level
   */
  async logEvent(options = {}) {
    try {
      const {
        user = {},
        action,
        resource,
        resourceId,
        details = {},
        oldValues = null,
        newValues = null,
        deviceInfo = {},
        sessionInfo = {},
        context = {},
        reason = null,
        tags = [],
        riskLevel = 'low',
        metadata = {}
      } = options;

      // Validate required fields
      if (!action || !resource) {
        throw new Error('Action and resource are required for audit logging');
      }

      // Determine risk level based on action type
      const calculatedRiskLevel = this.calculateRiskLevel(action, resource, details);
      const finalRiskLevel = riskLevel !== 'low' ? riskLevel : calculatedRiskLevel;

      // Create audit event
      const auditEvent = new AuditEvent({
        userId: user._id || user.id,
        userEmail: user.email,
        userName: user.name,
        userRole: user.role,
        eventId: `evt_${Date.now()}_${uuidv4().substr(0, 8)}`,
        deviceInfo: {
          userAgent: deviceInfo.userAgent,
          ipAddress: deviceInfo.ipAddress,
          deviceType: this.detectDeviceType(deviceInfo.userAgent),
          browser: this.extractBrowser(deviceInfo.userAgent),
          os: this.extractOS(deviceInfo.userAgent),
          screenResolution: deviceInfo.screenResolution,
          language: deviceInfo.language
        },
        sessionInfo: {
          sessionId: sessionInfo.sessionId,
          loginTime: sessionInfo.loginTime,
          lastActivity: sessionInfo.lastActivity,
          duration: sessionInfo.duration,
          isActive: sessionInfo.isActive !== false
        },
        action: {
          action,
          resource,
          resourceId,
          details,
          oldValues,
          newValues,
          metadata
        },
        systemInfo: {
          version: process.env.APP_VERSION || '1.0.0',
          environment: process.env.NODE_ENV || 'production',
          apiVersion: 'v1'
        },
        security: {
          isSecureConnection: context.isSecureConnection || false,
          authenticationMethod: user.authMethod || 'session',
          riskLevel: finalRiskLevel
        },
        context: {
          pageUrl: context.pageUrl,
          referrer: context.referrer,
          requestId: context.requestId || uuidv4(),
          correlationId: context.correlationId
        },
        auditTrail: {
          createdBy: user.email || 'system',
          modifiedBy: user.email || 'system',
          reason,
          tags
        }
      });

      // Save to database
      const savedEvent = await auditEvent.save();

      // Emit event for real-time processing
      this.emit('auditEvent', savedEvent);

      // Emit specific action events
      this.emit(`action:${action}`, savedEvent);
      this.emit(`resource:${resource}`, savedEvent);

      // Emit security events for high-risk actions
      if (finalRiskLevel === 'high' || finalRiskLevel === 'critical') {
        this.emit('securityEvent', savedEvent);
      }

      return savedEvent;
    } catch (error) {
      console.error('Error logging audit event:', error);
      // Don't throw error to avoid breaking the main application flow
      return null;
    }
  }

  /**
   * Log user login
   */
  async logLogin(user, deviceInfo, sessionInfo, context = {}) {
    return this.logEvent({
      user,
      action: 'login',
      resource: 'user',
      resourceId: user._id || user.id,
      details: {
        loginMethod: user.authMethod || 'password',
        loginTime: new Date().toISOString()
      },
      deviceInfo,
      sessionInfo,
      context,
      tags: ['authentication', 'login'],
      riskLevel: 'low'
    });
  }

  /**
   * Log user logout
   */
  async logLogout(user, sessionInfo, context = {}) {
    return this.logEvent({
      user,
      action: 'logout',
      resource: 'user',
      resourceId: user._id || user.id,
      details: {
        logoutTime: new Date().toISOString(),
        sessionDuration: sessionInfo.duration
      },
      sessionInfo,
      context,
      tags: ['authentication', 'logout'],
      riskLevel: 'low'
    });
  }

  /**
   * Log data viewing
   */
  async logView(user, resource, resourceId, details = {}, context = {}) {
    return this.logEvent({
      user,
      action: 'view',
      resource,
      resourceId,
      details,
      context,
      tags: ['data-access', 'view'],
      riskLevel: 'low'
    });
  }

  /**
   * Log data creation
   */
  async logCreate(user, resource, resourceId, newValues, details = {}, context = {}) {
    return this.logEvent({
      user,
      action: 'create',
      resource,
      resourceId,
      details,
      newValues,
      context,
      tags: ['data-modification', 'create'],
      riskLevel: 'medium'
    });
  }

  /**
   * Log data update
   */
  async logUpdate(user, resource, resourceId, oldValues, newValues, details = {}, context = {}) {
    return this.logEvent({
      user,
      action: 'update',
      resource,
      resourceId,
      details,
      oldValues,
      newValues,
      context,
      tags: ['data-modification', 'update'],
      riskLevel: 'medium'
    });
  }

  /**
   * Log data deletion
   */
  async logDelete(user, resource, resourceId, oldValues, details = {}, context = {}) {
    return this.logEvent({
      user,
      action: 'delete',
      resource,
      resourceId,
      details,
      oldValues,
      context,
      tags: ['data-modification', 'delete'],
      riskLevel: 'high'
    });
  }

  /**
   * Log search operations
   */
  async logSearch(user, resource, searchQuery, resultsCount, context = {}) {
    return this.logEvent({
      user,
      action: 'search',
      resource,
      details: {
        searchQuery,
        resultsCount,
        searchTime: new Date().toISOString()
      },
      context,
      tags: ['data-access', 'search'],
      riskLevel: 'low'
    });
  }

  /**
   * Log export operations
   */
  async logExport(user, resource, exportType, recordCount, context = {}) {
    return this.logEvent({
      user,
      action: 'export',
      resource,
      details: {
        exportType,
        recordCount,
        exportTime: new Date().toISOString()
      },
      context,
      tags: ['data-access', 'export'],
      riskLevel: 'medium'
    });
  }

  /**
   * Log import operations
   */
  async logImport(user, resource, importType, recordCount, context = {}) {
    return this.logEvent({
      user,
      action: 'import',
      resource,
      details: {
        importType,
        recordCount,
        importTime: new Date().toISOString()
      },
      context,
      tags: ['data-modification', 'import'],
      riskLevel: 'high'
    });
  }

  /**
   * Calculate risk level based on action and context
   */
  calculateRiskLevel(action, resource, details) {
    // High-risk actions
    if (['delete', 'import', 'bulk_update'].includes(action)) {
      return 'high';
    }

    // Medium-risk actions
    if (['create', 'update', 'export'].includes(action)) {
      return 'medium';
    }

    // Check for sensitive resources
    if (['user', 'system', 'security'].includes(resource)) {
      return 'medium';
    }

    // Check for bulk operations
    if (details.recordCount && details.recordCount > 100) {
      return 'high';
    }

    return 'low';
  }

  /**
   * Detect device type from user agent
   */
  detectDeviceType(userAgent) {
    if (!userAgent) return 'unknown';
    
    const ua = userAgent.toLowerCase();
    if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
      return 'mobile';
    }
    if (/tablet|ipad|playbook|silk/i.test(ua)) {
      return 'tablet';
    }
    return 'desktop';
  }

  /**
   * Extract browser information from user agent
   */
  extractBrowser(userAgent) {
    if (!userAgent) return 'unknown';
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari')) return 'Safari';
    if (ua.includes('edge')) return 'Edge';
    if (ua.includes('opera')) return 'Opera';
    return 'Unknown';
  }

  /**
   * Extract OS information from user agent
   */
  extractOS(userAgent) {
    if (!userAgent) return 'unknown';
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('windows')) return 'Windows';
    if (ua.includes('mac')) return 'macOS';
    if (ua.includes('linux')) return 'Linux';
    if (ua.includes('android')) return 'Android';
    if (ua.includes('ios')) return 'iOS';
    return 'Unknown';
  }

  /**
   * Get audit events with filtering
   */
  async getAuditEvents(filters = {}, options = {}) {
    const {
      userId,
      action,
      resource,
      resourceId,
      startDate,
      endDate,
      riskLevel,
      tags,
      page = 1,
      limit = 50,
      sortBy = 'timestamp',
      sortOrder = -1
    } = filters;

    const query = {};
    
    if (userId) query.userId = userId;
    if (action) query['action.action'] = action;
    if (resource) query['action.resource'] = resource;
    if (resourceId) query['action.resourceId'] = resourceId;
    if (riskLevel) query['security.riskLevel'] = riskLevel;
    if (tags && tags.length > 0) query['auditTrail.tags'] = { $in: tags };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const sort = {};
    sort[sortBy] = sortOrder;

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      AuditEvent.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email role')
        .lean(),
      AuditEvent.countDocuments(query)
    ]);

    return {
      events,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(userId, startDate, endDate) {
    return AuditEvent.getUserActivitySummary(userId, startDate, endDate);
  }

  /**
   * Get resource audit trail
   */
  async getResourceAuditTrail(resource, resourceId) {
    return AuditEvent.getResourceAuditTrail(resource, resourceId);
  }

  /**
   * Get security events
   */
  async getSecurityEvents(riskLevel = null, startDate = null, endDate = null) {
    return AuditEvent.getSecurityEvents(riskLevel, startDate, endDate);
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(startDate, endDate) {
    const matchQuery = {};
    if (startDate || endDate) {
      matchQuery.timestamp = {};
      if (startDate) matchQuery.timestamp.$gte = new Date(startDate);
      if (endDate) matchQuery.timestamp.$lte = new Date(endDate);
    }

    const stats = await AuditEvent.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          actions: { $addToSet: '$action.action' },
          resources: { $addToSet: '$action.resource' },
          riskLevels: { $addToSet: '$security.riskLevel' }
        }
      },
      {
        $project: {
          totalEvents: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          actions: { $size: '$actions' },
          resources: { $size: '$resources' },
          riskLevels: 1
        }
      }
    ]);

    return stats[0] || {
      totalEvents: 0,
      uniqueUsers: 0,
      actions: 0,
      resources: 0,
      riskLevels: []
    };
  }
}

// Create singleton instance
const auditService = new AuditService();

module.exports = auditService;