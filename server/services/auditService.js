const EventEmitter = require('events');
const { AuditEvent, EventTypes } = require('../models/AuditEvent');
const UAParser = require('ua-parser-js'); // נצטרך להוסיף את החבילה הזו

class AuditService extends EventEmitter {
  constructor() {
    super();
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for different audit events
   */
  setupEventListeners() {
    // Authentication events
    this.on('user:login', this.handleUserLogin.bind(this));
    this.on('user:logout', this.handleUserLogout.bind(this));
    this.on('user:login:failed', this.handleUserLoginFailed.bind(this));

    // User management events
    this.on('user:created', this.handleUserCreated.bind(this));
    this.on('user:updated', this.handleUserUpdated.bind(this));
    this.on('user:deleted', this.handleUserDeleted.bind(this));

    // Contractor events
    this.on('contractor:created', this.handleContractorCreated.bind(this));
    this.on('contractor:updated', this.handleContractorUpdated.bind(this));
    this.on('contractor:deleted', this.handleContractorDeleted.bind(this));
    this.on('contractor:viewed', this.handleContractorViewed.bind(this));

    // Project events
    this.on('project:created', this.handleProjectCreated.bind(this));
    this.on('project:updated', this.handleProjectUpdated.bind(this));
    this.on('project:deleted', this.handleProjectDeleted.bind(this));
    this.on('project:viewed', this.handleProjectViewed.bind(this));

    // Document events
    this.on('document:uploaded', this.handleDocumentUploaded.bind(this));
    this.on('document:downloaded', this.handleDocumentDownloaded.bind(this));
    this.on('document:deleted', this.handleDocumentDeleted.bind(this));
    this.on('document:viewed', this.handleDocumentViewed.bind(this));

    // Risk analysis events
    this.on('risk:created', this.handleRiskAnalysisCreated.bind(this));
    this.on('risk:updated', this.handleRiskAnalysisUpdated.bind(this));
    this.on('risk:viewed', this.handleRiskAnalysisViewed.bind(this));

    // Safety events
    this.on('safety:report:created', this.handleSafetyReportCreated.bind(this));
    this.on('safety:report:updated', this.handleSafetyReportUpdated.bind(this));
    this.on('safety:report:viewed', this.handleSafetyReportViewed.bind(this));

    // System events
    this.on('system:error', this.handleSystemError.bind(this));
    this.on('api:request', this.handleApiRequest.bind(this));

    // Security events
    this.on('security:unauthorized', this.handleUnauthorizedAccess.bind(this));
    this.on('security:permission:denied', this.handlePermissionDenied.bind(this));
    this.on('security:suspicious', this.handleSuspiciousActivity.bind(this));
  }

  /**
   * Parse user agent and extract device information
   */
  parseUserAgent(userAgent) {
    if (!userAgent) return {};
    
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    
    return {
      userAgent,
      browser: `${result.browser.name || 'Unknown'} ${result.browser.version || ''}`.trim(),
      os: `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim(),
      device: result.device.model || result.device.type || 'Desktop',
      isMobile: result.device.type === 'mobile' || result.device.type === 'tablet'
    };
  }

  /**
   * Extract location information from IP (placeholder - would need IP geolocation service)
   */
  async getLocationFromIP(ip) {
    // TODO: Implement IP geolocation service (e.g., MaxMind, IPapi, etc.)
    // For now, return basic info
    return {
      country: 'Israel', // Default for Israeli system
      city: 'Unknown',
      region: 'Unknown',
      timezone: 'Asia/Jerusalem'
    };
  }

  /**
   * Create base audit event data
   */
  async createBaseEventData(eventType, eventCategory, data = {}) {
    const baseData = {
      eventType,
      eventCategory,
      timestamp: new Date(),
      success: data.success !== false,
      ...data
    };

    // Parse device info if request is provided
    if (data.req) {
      baseData.deviceInfo = this.parseUserAgent(data.req.get('User-Agent'));
      baseData.location = await this.getLocationFromIP(data.req.ip);
      baseData.method = data.req.method;
      baseData.url = data.req.originalUrl || data.req.url;
      baseData.endpoint = data.req.route ? data.req.route.path : data.req.path;
      baseData.sessionId = data.req.sessionID;
    }

    // Extract user info if user is provided
    if (data.user) {
      baseData.userId = data.user._id || data.user.id;
      baseData.userEmail = data.user.email;
      baseData.userName = data.user.name;
      baseData.userRole = data.user.role;
    }

    return baseData;
  }

  /**
   * Save audit event to database
   */
  async saveAuditEvent(eventData) {
    try {
      const auditEvent = new AuditEvent(eventData);
      await auditEvent.save();
      console.log(`📝 Audit event saved: ${eventData.eventType}`);
      return auditEvent;
    } catch (error) {
      console.error('❌ Error saving audit event:', error);
      // Don't throw error to prevent disrupting main application flow
    }
  }

  // Authentication Event Handlers
  async handleUserLogin(data) {
    const eventData = await this.createBaseEventData(EventTypes.USER_LOGIN, 'authentication', {
      ...data,
      action: 'login',
      description: `User ${data.user?.email || 'unknown'} logged in successfully`,
      severity: 'low'
    });
    
    await this.saveAuditEvent(eventData);
  }

  async handleUserLogout(data) {
    const eventData = await this.createBaseEventData(EventTypes.USER_LOGOUT, 'authentication', {
      ...data,
      action: 'logout',
      description: `User ${data.user?.email || 'unknown'} logged out`,
      severity: 'low'
    });
    
    await this.saveAuditEvent(eventData);
  }

  async handleUserLoginFailed(data) {
    const eventData = await this.createBaseEventData(EventTypes.USER_LOGIN_FAILED, 'authentication', {
      ...data,
      action: 'login',
      description: `Failed login attempt for ${data.email || 'unknown email'}`,
      success: false,
      severity: 'medium',
      errorMessage: data.error || 'Invalid credentials'
    });
    
    await this.saveAuditEvent(eventData);
  }

  // User Management Event Handlers
  async handleUserCreated(data) {
    const eventData = await this.createBaseEventData(EventTypes.USER_CREATED, 'user_management', {
      ...data,
      action: 'create',
      description: `New user created: ${data.targetUser?.email || 'unknown'}`,
      resourceType: 'user',
      resourceId: data.targetUser?._id?.toString(),
      resourceName: data.targetUser?.name,
      severity: 'medium'
    });
    
    await this.saveAuditEvent(eventData);
  }

  async handleUserUpdated(data) {
    const eventData = await this.createBaseEventData(EventTypes.USER_UPDATED, 'user_management', {
      ...data,
      action: 'update',
      description: `User updated: ${data.targetUser?.email || 'unknown'}`,
      resourceType: 'user',
      resourceId: data.targetUser?._id?.toString(),
      resourceName: data.targetUser?.name,
      changes: data.changes || [],
      severity: 'low'
    });
    
    await this.saveAuditEvent(eventData);
  }

  async handleUserDeleted(data) {
    const eventData = await this.createBaseEventData(EventTypes.USER_DELETED, 'user_management', {
      ...data,
      action: 'delete',
      description: `User deleted: ${data.targetUser?.email || 'unknown'}`,
      resourceType: 'user',
      resourceId: data.targetUser?._id?.toString(),
      resourceName: data.targetUser?.name,
      severity: 'high'
    });
    
    await this.saveAuditEvent(eventData);
  }

  // Contractor Event Handlers
  async handleContractorCreated(data) {
    const eventData = await this.createBaseEventData(EventTypes.CONTRACTOR_CREATED, 'contractor', {
      ...data,
      action: 'create',
      description: `New contractor created: ${data.contractor?.name || 'unknown'}`,
      resourceType: 'contractor',
      resourceId: data.contractor?._id?.toString(),
      resourceName: data.contractor?.name,
      severity: 'medium'
    });
    
    await this.saveAuditEvent(eventData);
  }

  async handleContractorUpdated(data) {
    const eventData = await this.createBaseEventData(EventTypes.CONTRACTOR_UPDATED, 'contractor', {
      ...data,
      action: 'update',
      description: `Contractor updated: ${data.contractor?.name || 'unknown'}`,
      resourceType: 'contractor',
      resourceId: data.contractor?._id?.toString(),
      resourceName: data.contractor?.name,
      changes: data.changes || [],
      severity: 'low'
    });
    
    await this.saveAuditEvent(eventData);
  }

  async handleContractorDeleted(data) {
    const eventData = await this.createBaseEventData(EventTypes.CONTRACTOR_DELETED, 'contractor', {
      ...data,
      action: 'delete',
      description: `Contractor deleted: ${data.contractor?.name || 'unknown'}`,
      resourceType: 'contractor',
      resourceId: data.contractor?._id?.toString(),
      resourceName: data.contractor?.name,
      severity: 'high'
    });
    
    await this.saveAuditEvent(eventData);
  }

  async handleContractorViewed(data) {
    const eventData = await this.createBaseEventData(EventTypes.CONTRACTOR_VIEWED, 'contractor', {
      ...data,
      action: 'read',
      description: `Contractor viewed: ${data.contractor?.name || 'unknown'}`,
      resourceType: 'contractor',
      resourceId: data.contractor?._id?.toString(),
      resourceName: data.contractor?.name,
      severity: 'low'
    });
    
    await this.saveAuditEvent(eventData);
  }

  // Project Event Handlers
  async handleProjectCreated(data) {
    const eventData = await this.createBaseEventData(EventTypes.PROJECT_CREATED, 'project', {
      ...data,
      action: 'create',
      description: `New project created: ${data.project?.projectName || 'unknown'}`,
      resourceType: 'project',
      resourceId: data.project?._id?.toString(),
      resourceName: data.project?.projectName,
      severity: 'medium'
    });
    
    await this.saveAuditEvent(eventData);
  }

  async handleProjectUpdated(data) {
    const eventData = await this.createBaseEventData(EventTypes.PROJECT_UPDATED, 'project', {
      ...data,
      action: 'update',
      description: `Project updated: ${data.project?.projectName || 'unknown'}`,
      resourceType: 'project',
      resourceId: data.project?._id?.toString(),
      resourceName: data.project?.projectName,
      changes: data.changes || [],
      severity: 'low'
    });
    
    await this.saveAuditEvent(eventData);
  }

  async handleProjectDeleted(data) {
    const eventData = await this.createBaseEventData(EventTypes.PROJECT_DELETED, 'project', {
      ...data,
      action: 'delete',
      description: `Project deleted: ${data.project?.projectName || 'unknown'}`,
      resourceType: 'project',
      resourceId: data.project?._id?.toString(),
      resourceName: data.project?.projectName,
      severity: 'high'
    });
    
    await this.saveAuditEvent(eventData);
  }

  async handleProjectViewed(data) {
    const eventData = await this.createBaseEventData(EventTypes.PROJECT_VIEWED, 'project', {
      ...data,
      action: 'read',
      description: `Project viewed: ${data.project?.projectName || 'unknown'}`,
      resourceType: 'project',
      resourceId: data.project?._id?.toString(),
      resourceName: data.project?.projectName,
      severity: 'low'
    });
    
    await this.saveAuditEvent(eventData);
  }

  // Document Event Handlers
  async handleDocumentUploaded(data) {
    const eventData = await this.createBaseEventData(EventTypes.DOCUMENT_UPLOADED, 'document', {
      ...data,
      action: 'create',
      description: `Document uploaded: ${data.filename || 'unknown'}`,
      resourceType: 'document',
      resourceId: data.documentId,
      resourceName: data.filename,
      severity: 'medium',
      metadata: {
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        originalName: data.originalName
      }
    });
    
    await this.saveAuditEvent(eventData);
  }

  async handleDocumentDownloaded(data) {
    const eventData = await this.createBaseEventData(EventTypes.DOCUMENT_DOWNLOADED, 'document', {
      ...data,
      action: 'read',
      description: `Document downloaded: ${data.filename || 'unknown'}`,
      resourceType: 'document',
      resourceId: data.documentId,
      resourceName: data.filename,
      severity: 'low'
    });
    
    await this.saveAuditEvent(eventData);
  }

  async handleDocumentDeleted(data) {
    const eventData = await this.createBaseEventData(EventTypes.DOCUMENT_DELETED, 'document', {
      ...data,
      action: 'delete',
      description: `Document deleted: ${data.filename || 'unknown'}`,
      resourceType: 'document',
      resourceId: data.documentId,
      resourceName: data.filename,
      severity: 'high'
    });
    
    await this.saveAuditEvent(eventData);
  }

  async handleDocumentViewed(data) {
    const eventData = await this.createBaseEventData(EventTypes.DOCUMENT_VIEWED, 'document', {
      ...data,
      action: 'read',
      description: `Document viewed: ${data.filename || 'unknown'}`,
      resourceType: 'document',
      resourceId: data.documentId,
      resourceName: data.filename,
      severity: 'low'
    });
    
    await this.saveAuditEvent(eventData);
  }

  // Risk Analysis Event Handlers
  async handleRiskAnalysisCreated(data) {
    const eventData = await this.createBaseEventData(EventTypes.RISK_ANALYSIS_CREATED, 'risk_analysis', {
      ...data,
      action: 'create',
      description: `Risk analysis created for: ${data.contractorName || 'unknown contractor'}`,
      resourceType: 'risk_analysis',
      resourceId: data.analysisId,
      resourceName: `Risk Analysis - ${data.contractorName}`,
      severity: 'medium'
    });
    
    await this.saveAuditEvent(eventData);
  }

  async handleRiskAnalysisUpdated(data) {
    const eventData = await this.createBaseEventData(EventTypes.RISK_ANALYSIS_UPDATED, 'risk_analysis', {
      ...data,
      action: 'update',
      description: `Risk analysis updated for: ${data.contractorName || 'unknown contractor'}`,
      resourceType: 'risk_analysis',
      resourceId: data.analysisId,
      resourceName: `Risk Analysis - ${data.contractorName}`,
      changes: data.changes || [],
      severity: 'low'
    });
    
    await this.saveAuditEvent(eventData);
  }

  async handleRiskAnalysisViewed(data) {
    const eventData = await this.createBaseEventData(EventTypes.RISK_ANALYSIS_VIEWED, 'risk_analysis', {
      ...data,
      action: 'read',
      description: `Risk analysis viewed for: ${data.contractorName || 'unknown contractor'}`,
      resourceType: 'risk_analysis',
      resourceId: data.analysisId,
      resourceName: `Risk Analysis - ${data.contractorName}`,
      severity: 'low'
    });
    
    await this.saveAuditEvent(eventData);
  }

  // Safety Event Handlers
  async handleSafetyReportCreated(data) {
    const eventData = await this.createBaseEventData(EventTypes.SAFETY_REPORT_CREATED, 'safety', {
      ...data,
      action: 'create',
      description: `Safety report created: ${data.reportTitle || 'unknown report'}`,
      resourceType: 'safety_report',
      resourceId: data.reportId,
      resourceName: data.reportTitle,
      severity: 'medium'
    });
    
    await this.saveAuditEvent(eventData);
  }

  async handleSafetyReportUpdated(data) {
    const eventData = await this.createBaseEventData(EventTypes.SAFETY_REPORT_UPDATED, 'safety', {
      ...data,
      action: 'update',
      description: `Safety report updated: ${data.reportTitle || 'unknown report'}`,
      resourceType: 'safety_report',
      resourceId: data.reportId,
      resourceName: data.reportTitle,
      changes: data.changes || [],
      severity: 'low'
    });
    
    await this.saveAuditEvent(eventData);
  }

  async handleSafetyReportViewed(data) {
    const eventData = await this.createBaseEventData(EventTypes.SAFETY_REPORT_VIEWED, 'safety', {
      ...data,
      action: 'read',
      description: `Safety report viewed: ${data.reportTitle || 'unknown report'}`,
      resourceType: 'safety_report',
      resourceId: data.reportId,
      resourceName: data.reportTitle,
      severity: 'low'
    });
    
    await this.saveAuditEvent(eventData);
  }

  // System Event Handlers
  async handleSystemError(data) {
    const eventData = await this.createBaseEventData(EventTypes.SYSTEM_ERROR, 'system', {
      ...data,
      action: 'error',
      description: `System error: ${data.error?.message || 'Unknown error'}`,
      success: false,
      severity: 'high',
      errorMessage: data.error?.message,
      errorCode: data.error?.code,
      metadata: {
        stack: data.error?.stack,
        ...data.metadata
      }
    });
    
    await this.saveAuditEvent(eventData);
  }

  async handleApiRequest(data) {
    const eventData = await this.createBaseEventData(EventTypes.API_REQUEST, 'system', {
      ...data,
      action: 'request',
      description: `API request: ${data.method} ${data.endpoint}`,
      severity: 'low',
      duration: data.duration,
      metadata: {
        statusCode: data.statusCode,
        responseSize: data.responseSize,
        ...data.metadata
      }
    });
    
    await this.saveAuditEvent(eventData);
  }

  // Security Event Handlers
  async handleUnauthorizedAccess(data) {
    const eventData = await this.createBaseEventData(EventTypes.UNAUTHORIZED_ACCESS, 'security', {
      ...data,
      action: 'unauthorized',
      description: `Unauthorized access attempt to: ${data.resource || 'unknown resource'}`,
      success: false,
      severity: 'high',
      resourceType: data.resourceType,
      resourceId: data.resourceId
    });
    
    await this.saveAuditEvent(eventData);
  }

  async handlePermissionDenied(data) {
    const eventData = await this.createBaseEventData(EventTypes.PERMISSION_DENIED, 'security', {
      ...data,
      action: 'permission_denied',
      description: `Permission denied for: ${data.resource || 'unknown resource'}`,
      success: false,
      severity: 'medium',
      resourceType: data.resourceType,
      resourceId: data.resourceId
    });
    
    await this.saveAuditEvent(eventData);
  }

  async handleSuspiciousActivity(data) {
    const eventData = await this.createBaseEventData(EventTypes.SUSPICIOUS_ACTIVITY, 'security', {
      ...data,
      action: 'suspicious',
      description: `Suspicious activity detected: ${data.description || 'Unknown activity'}`,
      severity: 'critical',
      metadata: {
        activityType: data.activityType,
        riskScore: data.riskScore,
        ...data.metadata
      }
    });
    
    await this.saveAuditEvent(eventData);
  }

  /**
   * Public methods for emitting events
   */
  logUserLogin(user, req) {
    this.emit('user:login', { user, req });
  }

  logUserLogout(user, req) {
    this.emit('user:logout', { user, req });
  }

  logUserLoginFailed(email, error, req) {
    this.emit('user:login:failed', { email, error, req });
  }

  logUserCreated(user, targetUser, req) {
    this.emit('user:created', { user, targetUser, req });
  }

  logUserUpdated(user, targetUser, changes, req) {
    this.emit('user:updated', { user, targetUser, changes, req });
  }

  logUserDeleted(user, targetUser, req) {
    this.emit('user:deleted', { user, targetUser, req });
  }

  logContractorCreated(user, contractor, req) {
    this.emit('contractor:created', { user, contractor, req });
  }

  logContractorUpdated(user, contractor, changes, req) {
    this.emit('contractor:updated', { user, contractor, changes, req });
  }

  logContractorDeleted(user, contractor, req) {
    this.emit('contractor:deleted', { user, contractor, req });
  }

  logContractorViewed(user, contractor, req) {
    this.emit('contractor:viewed', { user, contractor, req });
  }

  logProjectCreated(user, project, req) {
    this.emit('project:created', { user, project, req });
  }

  logProjectUpdated(user, project, changes, req) {
    this.emit('project:updated', { user, project, changes, req });
  }

  logProjectDeleted(user, project, req) {
    this.emit('project:deleted', { user, project, req });
  }

  logProjectViewed(user, project, req) {
    this.emit('project:viewed', { user, project, req });
  }

  logDocumentUploaded(user, documentInfo, req) {
    this.emit('document:uploaded', { user, ...documentInfo, req });
  }

  logDocumentDownloaded(user, documentInfo, req) {
    this.emit('document:downloaded', { user, ...documentInfo, req });
  }

  logDocumentDeleted(user, documentInfo, req) {
    this.emit('document:deleted', { user, ...documentInfo, req });
  }

  logDocumentViewed(user, documentInfo, req) {
    this.emit('document:viewed', { user, ...documentInfo, req });
  }

  logRiskAnalysisCreated(user, analysisInfo, req) {
    this.emit('risk:created', { user, ...analysisInfo, req });
  }

  logRiskAnalysisUpdated(user, analysisInfo, changes, req) {
    this.emit('risk:updated', { user, ...analysisInfo, changes, req });
  }

  logRiskAnalysisViewed(user, analysisInfo, req) {
    this.emit('risk:viewed', { user, ...analysisInfo, req });
  }

  logSafetyReportCreated(user, reportInfo, req) {
    this.emit('safety:report:created', { user, ...reportInfo, req });
  }

  logSafetyReportUpdated(user, reportInfo, changes, req) {
    this.emit('safety:report:updated', { user, ...reportInfo, changes, req });
  }

  logSafetyReportViewed(user, reportInfo, req) {
    this.emit('safety:report:viewed', { user, ...reportInfo, req });
  }

  logSystemError(error, req, user = null) {
    this.emit('system:error', { error, req, user });
  }

  logApiRequest(requestInfo, req, user = null) {
    this.emit('api:request', { ...requestInfo, req, user });
  }

  logUnauthorizedAccess(resourceInfo, req, user = null) {
    this.emit('security:unauthorized', { ...resourceInfo, req, user });
  }

  logPermissionDenied(resourceInfo, req, user = null) {
    this.emit('security:permission:denied', { ...resourceInfo, req, user });
  }

  logSuspiciousActivity(activityInfo, req, user = null) {
    this.emit('security:suspicious', { ...activityInfo, req, user });
  }

  /**
   * Get audit events with filtering and pagination
   */
  async getAuditEvents(filters = {}, options = {}) {
    const query = {};
    
    if (filters.userId) query.userId = filters.userId;
    if (filters.eventType) query.eventType = filters.eventType;
    if (filters.eventCategory) query.eventCategory = filters.eventCategory;
    if (filters.resourceType) query.resourceType = filters.resourceType;
    if (filters.resourceId) query.resourceId = filters.resourceId;
    if (filters.success !== undefined) query.success = filters.success;
    if (filters.severity) query.severity = filters.severity;
    
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
      if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
    }

    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      AuditEvent.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email role'),
      AuditEvent.countDocuments(query)
    ]);

    return {
      events,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(filters = {}) {
    const matchQuery = {};
    
    if (filters.startDate || filters.endDate) {
      matchQuery.timestamp = {};
      if (filters.startDate) matchQuery.timestamp.$gte = new Date(filters.startDate);
      if (filters.endDate) matchQuery.timestamp.$lte = new Date(filters.endDate);
    }

    const [
      eventsByCategory,
      eventsByType,
      eventsByUser,
      successRate,
      securityEvents
    ] = await Promise.all([
      // Events by category
      AuditEvent.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$eventCategory', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Events by type
      AuditEvent.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // Events by user
      AuditEvent.aggregate([
        { $match: { ...matchQuery, userId: { $ne: null } } },
        { $group: { _id: '$userId', count: { $sum: 1 }, lastActivity: { $max: '$timestamp' } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } }
      ]),
      
      // Success rate
      AuditEvent.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$success', count: { $sum: 1 } } }
      ]),
      
      // Security events
      AuditEvent.aggregate([
        { $match: { ...matchQuery, eventCategory: 'security' } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    return {
      eventsByCategory,
      eventsByType,
      eventsByUser,
      successRate,
      securityEvents
    };
  }
}

// Create singleton instance
const auditService = new AuditService();

module.exports = auditService;