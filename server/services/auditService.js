const EventEmitter = require('events');
const AuditLog = require('../models/AuditLog');
const UAParser = require('ua-parser-js');

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
    this.on('auth:login', this.handleAuthLogin.bind(this));
    this.on('auth:logout', this.handleAuthLogout.bind(this));
    this.on('auth:failed', this.handleAuthFailed.bind(this));
    this.on('auth:otp', this.handleAuthOTP.bind(this));
    
    // User management events
    this.on('user:created', this.handleUserCreated.bind(this));
    this.on('user:updated', this.handleUserUpdated.bind(this));
    this.on('user:deleted', this.handleUserDeleted.bind(this));
    
    // Data events
    this.on('data:viewed', this.handleDataViewed.bind(this));
    this.on('data:created', this.handleDataCreated.bind(this));
    this.on('data:updated', this.handleDataUpdated.bind(this));
    this.on('data:deleted', this.handleDataDeleted.bind(this));
    
    // File events
    this.on('file:uploaded', this.handleFileUploaded.bind(this));
    this.on('file:downloaded', this.handleFileDownloaded.bind(this));
    this.on('file:deleted', this.handleFileDeleted.bind(this));
    
    // System events
    this.on('system:error', this.handleSystemError.bind(this));
    this.on('api:called', this.handleApiCall.bind(this));
    this.on('permission:denied', this.handlePermissionDenied.bind(this));
    
    // Business events
    this.on('project:action', this.handleProjectAction.bind(this));
    this.on('contractor:action', this.handleContractorAction.bind(this));
    this.on('report:generated', this.handleReportGenerated.bind(this));
    this.on('email:sent', this.handleEmailSent.bind(this));
  }

  /**
   * Parse device information from request
   */
  parseDeviceInfo(req) {
    const userAgent = req.headers['user-agent'] || '';
    const parser = new UAParser(userAgent);
    const ua = parser.getResult();
    
    return {
      userAgent,
      ip: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0],
      browser: `${ua.browser.name || 'Unknown'} ${ua.browser.version || ''}`.trim(),
      os: `${ua.os.name || 'Unknown'} ${ua.os.version || ''}`.trim(),
      device: ua.device.type || 'desktop',
      platform: ua.cpu.architecture || 'unknown',
      language: req.headers['accept-language']?.split(',')[0] || 'unknown',
      screenResolution: req.headers['x-screen-resolution'] || null,
      timezone: req.headers['x-timezone'] || null
    };
  }

  /**
   * Extract user info from request
   */
  getUserInfo(req) {
    const user = req.user || req.session?.user;
    return {
      userId: user?._id || user?.id,
      userEmail: user?.email,
      userName: user?.name,
      userRole: user?.role,
      sessionId: req.sessionID || req.sessionId || req.headers['x-session-id']
    };
  }

  /**
   * Create request details object
   */
  getRequestDetails(req, res, responseTime) {
    return {
      method: req.method,
      path: req.path,
      query: req.query,
      params: req.params,
      headers: this.sanitizeHeaders(req.headers),
      statusCode: res?.statusCode,
      responseTime,
      errorMessage: res?.locals?.errorMessage
    };
  }

  /**
   * Sanitize headers to remove sensitive information
   */
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Calculate field changes between old and new data
   */
  calculateFieldChanges(oldData, newData) {
    const changes = [];
    const allKeys = new Set([
      ...Object.keys(oldData || {}),
      ...Object.keys(newData || {})
    ]);
    
    allKeys.forEach(key => {
      if (JSON.stringify(oldData?.[key]) !== JSON.stringify(newData?.[key])) {
        changes.push({
          field: key,
          oldValue: oldData?.[key],
          newValue: newData?.[key]
        });
      }
    });
    
    return changes;
  }

  /**
   * Log HTTP request
   */
  async logHttpRequest(req, res, responseTime) {
    try {
      const eventType = this.mapHttpMethodToEventType(req.method, req.path);
      
      await AuditLog.createLog({
        eventType,
        ...this.getUserInfo(req),
        timestamp: new Date(),
        action: `${req.method} ${req.path}`,
        description: `HTTP ${req.method} request to ${req.path}`,
        deviceInfo: this.parseDeviceInfo(req),
        requestDetails: this.getRequestDetails(req, res, responseTime),
        status: res.statusCode >= 400 ? 'FAILURE' : 'SUCCESS',
        severity: this.calculateSeverity(eventType, res.statusCode),
        tags: ['http', req.method.toLowerCase()]
      });
    } catch (error) {
      console.error('Error logging HTTP request:', error);
    }
  }

  /**
   * Map HTTP method and path to event type
   */
  mapHttpMethodToEventType(method, path) {
    // Check for authentication endpoints
    if (path.includes('/auth/login')) return 'AUTH_LOGIN';
    if (path.includes('/auth/logout')) return 'AUTH_LOGOUT';
    if (path.includes('/auth/otp')) return 'AUTH_OTP_REQUEST';
    
    // Check for file operations
    if (path.includes('/upload')) return 'FILE_UPLOAD';
    if (path.includes('/download')) return 'FILE_DOWNLOAD';
    
    // Check for specific resources
    if (path.includes('/projects')) {
      switch (method) {
        case 'GET': return 'PROJECT_VIEW';
        case 'POST': return 'PROJECT_CREATE';
        case 'PUT':
        case 'PATCH': return 'PROJECT_UPDATE';
        case 'DELETE': return 'PROJECT_DELETE';
      }
    }
    
    if (path.includes('/contractors')) {
      switch (method) {
        case 'GET': return 'CONTRACTOR_VIEW';
        case 'POST': return 'CONTRACTOR_CREATE';
        case 'PUT':
        case 'PATCH': return 'CONTRACTOR_UPDATE';
        case 'DELETE': return 'CONTRACTOR_DELETE';
      }
    }
    
    // Default mapping
    switch (method) {
      case 'GET': return 'DATA_VIEW';
      case 'POST': return 'DATA_CREATE';
      case 'PUT':
      case 'PATCH': return 'DATA_UPDATE';
      case 'DELETE': return 'DATA_DELETE';
      default: return 'API_CALL';
    }
  }

  /**
   * Calculate severity based on event type and status
   */
  calculateSeverity(eventType, statusCode = 200) {
    // Critical events
    if (eventType.includes('DELETE') || eventType === 'AUTH_LOGIN_FAILED') {
      return statusCode >= 400 ? 'HIGH' : 'MEDIUM';
    }
    
    // High severity events
    if (eventType.includes('UPDATE') || eventType.includes('CREATE')) {
      return 'MEDIUM';
    }
    
    // System errors
    if (eventType === 'SYSTEM_ERROR' || statusCode >= 500) {
      return 'CRITICAL';
    }
    
    // Permission denied
    if (eventType === 'PERMISSION_DENIED' || statusCode === 403) {
      return 'HIGH';
    }
    
    // Default
    return 'LOW';
  }

  // Event handlers
  async handleAuthLogin(data) {
    await AuditLog.createLog({
      eventType: 'AUTH_LOGIN',
      userId: data.userId,
      userEmail: data.email,
      userName: data.name,
      userRole: data.role,
      sessionId: data.sessionId,
      timestamp: new Date(),
      action: 'User login',
      description: `User ${data.email} logged in successfully`,
      deviceInfo: data.deviceInfo,
      requestDetails: data.requestDetails,
      status: 'SUCCESS',
      severity: 'LOW',
      tags: ['authentication', 'login'],
      metadata: {
        loginMethod: data.loginMethod || 'standard',
        provider: data.provider
      }
    });
  }

  async handleAuthLogout(data) {
    await AuditLog.createLog({
      eventType: 'AUTH_LOGOUT',
      userId: data.userId,
      userEmail: data.email,
      sessionId: data.sessionId,
      timestamp: new Date(),
      action: 'User logout',
      description: `User ${data.email} logged out`,
      deviceInfo: data.deviceInfo,
      status: 'SUCCESS',
      severity: 'LOW',
      tags: ['authentication', 'logout']
    });
  }

  async handleAuthFailed(data) {
    await AuditLog.createLog({
      eventType: 'AUTH_LOGIN_FAILED',
      userEmail: data.email,
      timestamp: new Date(),
      action: 'Failed login attempt',
      description: `Failed login attempt for ${data.email}`,
      deviceInfo: data.deviceInfo,
      requestDetails: data.requestDetails,
      status: 'FAILURE',
      severity: 'HIGH',
      tags: ['authentication', 'security'],
      error: {
        message: data.error,
        code: data.errorCode
      },
      metadata: {
        attemptCount: data.attemptCount
      }
    });
  }

  async handleAuthOTP(data) {
    await AuditLog.createLog({
      eventType: data.verified ? 'AUTH_OTP_VERIFY' : 'AUTH_OTP_REQUEST',
      userEmail: data.email,
      timestamp: new Date(),
      action: data.verified ? 'OTP verification' : 'OTP request',
      description: data.verified 
        ? `OTP verified for ${data.email}`
        : `OTP requested for ${data.email}`,
      deviceInfo: data.deviceInfo,
      status: data.success ? 'SUCCESS' : 'FAILURE',
      severity: 'MEDIUM',
      tags: ['authentication', 'otp']
    });
  }

  async handleUserCreated(data) {
    await AuditLog.createLog({
      eventType: 'USER_CREATE',
      userId: data.createdBy,
      timestamp: new Date(),
      action: 'User created',
      description: `New user created: ${data.newUserEmail}`,
      resourceType: 'User',
      resourceId: data.newUserId,
      resourceName: data.newUserName,
      dataChanges: {
        collection: 'users',
        documentId: data.newUserId,
        operation: 'CREATE',
        newData: data.userData
      },
      status: 'SUCCESS',
      severity: 'MEDIUM',
      tags: ['user-management', 'create']
    });
  }

  async handleUserUpdated(data) {
    await AuditLog.createLog({
      eventType: 'USER_UPDATE',
      userId: data.updatedBy,
      timestamp: new Date(),
      action: 'User updated',
      description: `User ${data.userEmail} updated`,
      resourceType: 'User',
      resourceId: data.userId,
      resourceName: data.userName,
      dataChanges: {
        collection: 'users',
        documentId: data.userId,
        operation: 'UPDATE',
        fieldChanges: this.calculateFieldChanges(data.oldData, data.newData),
        oldData: data.oldData,
        newData: data.newData
      },
      status: 'SUCCESS',
      severity: 'MEDIUM',
      tags: ['user-management', 'update']
    });
  }

  async handleUserDeleted(data) {
    await AuditLog.createLog({
      eventType: 'USER_DELETE',
      userId: data.deletedBy,
      timestamp: new Date(),
      action: 'User deleted',
      description: `User ${data.userEmail} deleted`,
      resourceType: 'User',
      resourceId: data.userId,
      resourceName: data.userName,
      dataChanges: {
        collection: 'users',
        documentId: data.userId,
        operation: 'DELETE',
        oldData: data.userData
      },
      status: 'SUCCESS',
      severity: 'HIGH',
      tags: ['user-management', 'delete']
    });
  }

  async handleDataViewed(data) {
    await AuditLog.createLog({
      eventType: 'DATA_VIEW',
      userId: data.userId,
      userEmail: data.userEmail,
      sessionId: data.sessionId,
      timestamp: new Date(),
      action: `View ${data.resourceType}`,
      description: data.description || `Viewed ${data.resourceType} ${data.resourceId || ''}`,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      resourceName: data.resourceName,
      deviceInfo: data.deviceInfo,
      status: 'SUCCESS',
      severity: 'LOW',
      tags: ['data-access', 'view', data.resourceType?.toLowerCase()],
      metadata: data.metadata
    });
  }

  async handleDataCreated(data) {
    await AuditLog.createLog({
      eventType: 'DATA_CREATE',
      userId: data.userId,
      userEmail: data.userEmail,
      sessionId: data.sessionId,
      timestamp: new Date(),
      action: `Create ${data.resourceType}`,
      description: data.description || `Created new ${data.resourceType}`,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      resourceName: data.resourceName,
      dataChanges: {
        collection: data.collection,
        documentId: data.resourceId,
        operation: 'CREATE',
        newData: data.data
      },
      deviceInfo: data.deviceInfo,
      status: 'SUCCESS',
      severity: 'MEDIUM',
      tags: ['data-mutation', 'create', data.resourceType?.toLowerCase()],
      metadata: data.metadata
    });
  }

  async handleDataUpdated(data) {
    await AuditLog.createLog({
      eventType: 'DATA_UPDATE',
      userId: data.userId,
      userEmail: data.userEmail,
      sessionId: data.sessionId,
      timestamp: new Date(),
      action: `Update ${data.resourceType}`,
      description: data.description || `Updated ${data.resourceType} ${data.resourceId}`,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      resourceName: data.resourceName,
      dataChanges: {
        collection: data.collection,
        documentId: data.resourceId,
        operation: 'UPDATE',
        fieldChanges: this.calculateFieldChanges(data.oldData, data.newData),
        oldData: data.oldData,
        newData: data.newData
      },
      deviceInfo: data.deviceInfo,
      status: 'SUCCESS',
      severity: 'MEDIUM',
      tags: ['data-mutation', 'update', data.resourceType?.toLowerCase()],
      metadata: data.metadata
    });
  }

  async handleDataDeleted(data) {
    await AuditLog.createLog({
      eventType: 'DATA_DELETE',
      userId: data.userId,
      userEmail: data.userEmail,
      sessionId: data.sessionId,
      timestamp: new Date(),
      action: `Delete ${data.resourceType}`,
      description: data.description || `Deleted ${data.resourceType} ${data.resourceId}`,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      resourceName: data.resourceName,
      dataChanges: {
        collection: data.collection,
        documentId: data.resourceId,
        operation: 'DELETE',
        oldData: data.data
      },
      deviceInfo: data.deviceInfo,
      status: 'SUCCESS',
      severity: 'HIGH',
      tags: ['data-mutation', 'delete', data.resourceType?.toLowerCase()],
      metadata: data.metadata
    });
  }

  async handleFileUploaded(data) {
    await AuditLog.createLog({
      eventType: 'FILE_UPLOAD',
      userId: data.userId,
      userEmail: data.userEmail,
      sessionId: data.sessionId,
      timestamp: new Date(),
      action: 'File upload',
      description: `Uploaded file: ${data.fileName}`,
      resourceType: 'File',
      resourceId: data.fileId,
      resourceName: data.fileName,
      deviceInfo: data.deviceInfo,
      status: 'SUCCESS',
      severity: 'LOW',
      tags: ['file', 'upload'],
      metadata: {
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        projectId: data.projectId
      }
    });
  }

  async handleFileDownloaded(data) {
    await AuditLog.createLog({
      eventType: 'FILE_DOWNLOAD',
      userId: data.userId,
      userEmail: data.userEmail,
      sessionId: data.sessionId,
      timestamp: new Date(),
      action: 'File download',
      description: `Downloaded file: ${data.fileName}`,
      resourceType: 'File',
      resourceId: data.fileId,
      resourceName: data.fileName,
      deviceInfo: data.deviceInfo,
      status: 'SUCCESS',
      severity: 'LOW',
      tags: ['file', 'download'],
      metadata: {
        fileSize: data.fileSize,
        mimeType: data.mimeType
      }
    });
  }

  async handleFileDeleted(data) {
    await AuditLog.createLog({
      eventType: 'FILE_DELETE',
      userId: data.userId,
      userEmail: data.userEmail,
      sessionId: data.sessionId,
      timestamp: new Date(),
      action: 'File deletion',
      description: `Deleted file: ${data.fileName}`,
      resourceType: 'File',
      resourceId: data.fileId,
      resourceName: data.fileName,
      deviceInfo: data.deviceInfo,
      status: 'SUCCESS',
      severity: 'MEDIUM',
      tags: ['file', 'delete'],
      metadata: {
        fileSize: data.fileSize,
        mimeType: data.mimeType
      }
    });
  }

  async handleSystemError(data) {
    await AuditLog.createLog({
      eventType: 'SYSTEM_ERROR',
      userId: data.userId,
      userEmail: data.userEmail,
      timestamp: new Date(),
      action: 'System error',
      description: data.error?.message || 'System error occurred',
      deviceInfo: data.deviceInfo,
      requestDetails: data.requestDetails,
      status: 'FAILURE',
      severity: 'CRITICAL',
      error: {
        message: data.error?.message,
        stack: data.error?.stack,
        code: data.error?.code
      },
      tags: ['system', 'error'],
      metadata: data.metadata
    });
  }

  async handleApiCall(data) {
    await AuditLog.createLog({
      eventType: 'API_CALL',
      userId: data.userId,
      userEmail: data.userEmail,
      sessionId: data.sessionId,
      timestamp: new Date(),
      action: `API call: ${data.endpoint}`,
      description: data.description || `Called API endpoint ${data.endpoint}`,
      deviceInfo: data.deviceInfo,
      requestDetails: data.requestDetails,
      status: data.success ? 'SUCCESS' : 'FAILURE',
      severity: 'LOW',
      tags: ['api', data.method?.toLowerCase()],
      metadata: {
        endpoint: data.endpoint,
        duration: data.duration,
        responseSize: data.responseSize
      }
    });
  }

  async handlePermissionDenied(data) {
    await AuditLog.createLog({
      eventType: 'PERMISSION_DENIED',
      userId: data.userId,
      userEmail: data.userEmail,
      sessionId: data.sessionId,
      timestamp: new Date(),
      action: 'Permission denied',
      description: `Permission denied for ${data.action || 'action'}`,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      deviceInfo: data.deviceInfo,
      requestDetails: data.requestDetails,
      status: 'FAILURE',
      severity: 'HIGH',
      tags: ['security', 'permission'],
      metadata: {
        requiredRole: data.requiredRole,
        userRole: data.userRole,
        action: data.action
      }
    });
  }

  async handleProjectAction(data) {
    const eventTypeMap = {
      'create': 'PROJECT_CREATE',
      'update': 'PROJECT_UPDATE',
      'delete': 'PROJECT_DELETE',
      'view': 'PROJECT_VIEW'
    };

    await AuditLog.createLog({
      eventType: eventTypeMap[data.action] || 'PROJECT_VIEW',
      userId: data.userId,
      userEmail: data.userEmail,
      sessionId: data.sessionId,
      timestamp: new Date(),
      action: `Project ${data.action}`,
      description: `${data.action} project: ${data.projectName}`,
      resourceType: 'Project',
      resourceId: data.projectId,
      resourceName: data.projectName,
      dataChanges: data.changes,
      deviceInfo: data.deviceInfo,
      status: 'SUCCESS',
      severity: data.action === 'delete' ? 'HIGH' : 'MEDIUM',
      tags: ['project', data.action],
      metadata: data.metadata
    });
  }

  async handleContractorAction(data) {
    const eventTypeMap = {
      'create': 'CONTRACTOR_CREATE',
      'update': 'CONTRACTOR_UPDATE',
      'delete': 'CONTRACTOR_DELETE',
      'view': 'CONTRACTOR_VIEW'
    };

    await AuditLog.createLog({
      eventType: eventTypeMap[data.action] || 'CONTRACTOR_VIEW',
      userId: data.userId,
      userEmail: data.userEmail,
      sessionId: data.sessionId,
      timestamp: new Date(),
      action: `Contractor ${data.action}`,
      description: `${data.action} contractor: ${data.contractorName}`,
      resourceType: 'Contractor',
      resourceId: data.contractorId,
      resourceName: data.contractorName,
      dataChanges: data.changes,
      deviceInfo: data.deviceInfo,
      status: 'SUCCESS',
      severity: data.action === 'delete' ? 'HIGH' : 'MEDIUM',
      tags: ['contractor', data.action],
      metadata: data.metadata
    });
  }

  async handleReportGenerated(data) {
    await AuditLog.createLog({
      eventType: 'REPORT_GENERATE',
      userId: data.userId,
      userEmail: data.userEmail,
      sessionId: data.sessionId,
      timestamp: new Date(),
      action: 'Report generated',
      description: `Generated report: ${data.reportType}`,
      resourceType: 'Report',
      resourceId: data.reportId,
      resourceName: data.reportName,
      deviceInfo: data.deviceInfo,
      status: 'SUCCESS',
      severity: 'LOW',
      tags: ['report', data.reportType],
      metadata: {
        reportType: data.reportType,
        format: data.format,
        parameters: data.parameters
      }
    });
  }

  async handleEmailSent(data) {
    await AuditLog.createLog({
      eventType: 'EMAIL_SENT',
      userId: data.userId,
      userEmail: data.userEmail,
      sessionId: data.sessionId,
      timestamp: new Date(),
      action: 'Email sent',
      description: `Email sent to ${data.recipient}`,
      status: data.success ? 'SUCCESS' : 'FAILURE',
      severity: 'LOW',
      tags: ['communication', 'email'],
      metadata: {
        recipient: data.recipient,
        subject: data.subject,
        template: data.template,
        error: data.error
      }
    });
  }
}

// Create singleton instance
const auditService = new AuditService();

module.exports = auditService;