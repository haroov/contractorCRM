const Event = require('../models/Event');
const { getDb } = require('../lib/mongo');

class EventLoggingService {
  constructor() {
    this.isEnabled = process.env.EVENT_LOGGING_ENABLED !== 'false';
    this.logLevel = process.env.EVENT_LOG_LEVEL || 'INFO';
    this.batchSize = parseInt(process.env.EVENT_BATCH_SIZE) || 100;
    this.flushInterval = parseInt(process.env.EVENT_FLUSH_INTERVAL) || 5000; // 5 seconds
    this.eventQueue = [];
    this.isProcessing = false;
    
    // Start batch processing
    if (this.isEnabled) {
      this.startBatchProcessor();
    }
  }

  /**
   * Log an event to the database
   * @param {Object} eventData - Event data to log
   * @returns {Promise<Object>} - Created event or null if disabled
   */
  async logEvent(eventData) {
    if (!this.isEnabled) {
      return null;
    }

    try {
      // Validate required fields
      if (!eventData.eventType || !eventData.action || !eventData.description) {
        console.error('❌ Event logging failed: Missing required fields', eventData);
        return null;
      }

      // Enrich event data with defaults
      const enrichedEvent = this.enrichEventData(eventData);
      
      // Add to queue for batch processing
      this.eventQueue.push(enrichedEvent);
      
      // If queue is full, process immediately
      if (this.eventQueue.length >= this.batchSize) {
        this.processEventQueue();
      }

      return enrichedEvent;
    } catch (error) {
      console.error('❌ Event logging failed:', error);
      return null;
    }
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(type, user, req, additionalData = {}) {
    const eventData = {
      eventType: type,
      category: 'AUTH',
      action: type.toLowerCase(),
      description: this.getAuthEventDescription(type, user),
      userId: user?._id || user?.id,
      userEmail: user?.email,
      userRole: user?.role,
      sessionId: req?.sessionID || req?.session?.id,
      ipAddress: this.getClientIP(req),
      userAgent: req?.get('User-Agent'),
      requestMethod: req?.method,
      requestUrl: req?.originalUrl || req?.url,
      status: additionalData.success !== false ? 'SUCCESS' : 'FAILED',
      severity: type.includes('FAILED') ? 'MEDIUM' : 'LOW',
      metadata: {
        ...additionalData,
        loginMethod: additionalData.loginMethod || 'unknown'
      }
    };

    return this.logEvent(eventData);
  }

  /**
   * Log CRUD operations
   */
  async logCrudEvent(operation, resourceType, resourceData, user, req, oldData = null) {
    const eventData = {
      eventType: operation.toUpperCase(),
      category: 'CRUD',
      action: `${operation.toLowerCase()}_${resourceType}`,
      description: `${operation} ${resourceType} ${resourceData?.name || resourceData?._id || 'unknown'}`,
      userId: user?._id || user?.id,
      userEmail: user?.email,
      userRole: user?.role,
      sessionId: req?.sessionID || req?.session?.id,
      resourceType: resourceType,
      resourceId: resourceData?._id?.toString() || resourceData?.id?.toString(),
      resourceName: resourceData?.name || resourceData?.projectName || resourceData?.companyName || resourceData?.title,
      ipAddress: this.getClientIP(req),
      userAgent: req?.get('User-Agent'),
      requestMethod: req?.method,
      requestUrl: req?.originalUrl || req?.url,
      oldData: this.sanitizeData(oldData),
      newData: this.sanitizeData(resourceData),
      changedFields: oldData ? this.getChangedFields(oldData, resourceData) : [],
      status: 'SUCCESS',
      severity: operation === 'DELETE' ? 'MEDIUM' : 'LOW'
    };

    return this.logEvent(eventData);
  }

  /**
   * Log file operations
   */
  async logFileEvent(operation, fileName, fileSize, user, req, additionalData = {}) {
    const eventData = {
      eventType: `FILE_${operation.toUpperCase()}`,
      category: 'FILE',
      action: `file_${operation.toLowerCase()}`,
      description: `${operation} file: ${fileName}`,
      userId: user?._id || user?.id,
      userEmail: user?.email,
      userRole: user?.role,
      sessionId: req?.sessionID || req?.session?.id,
      resourceType: 'file',
      resourceName: fileName,
      ipAddress: this.getClientIP(req),
      userAgent: req?.get('User-Agent'),
      requestMethod: req?.method,
      requestUrl: req?.originalUrl || req?.url,
      status: 'SUCCESS',
      severity: 'LOW',
      metadata: {
        fileSize: fileSize,
        fileType: fileName?.split('.').pop(),
        ...additionalData
      }
    };

    return this.logEvent(eventData);
  }

  /**
   * Log system events
   */
  async logSystemEvent(type, description, severity = 'LOW', metadata = {}) {
    const eventData = {
      eventType: type,
      category: 'SYSTEM',
      action: type.toLowerCase(),
      description: description,
      status: severity === 'CRITICAL' || severity === 'HIGH' ? 'FAILED' : 'INFO',
      severity: severity,
      metadata: metadata
    };

    return this.logEvent(eventData);
  }

  /**
   * Log error events
   */
  async logError(error, req, user = null, context = {}) {
    const eventData = {
      eventType: 'SYSTEM_ERROR',
      category: 'SYSTEM',
      action: 'system_error',
      description: `Error: ${error.message}`,
      userId: user?._id || user?.id,
      userEmail: user?.email,
      sessionId: req?.sessionID || req?.session?.id,
      ipAddress: this.getClientIP(req),
      userAgent: req?.get('User-Agent'),
      requestMethod: req?.method,
      requestUrl: req?.originalUrl || req?.url,
      status: 'FAILED',
      severity: 'HIGH',
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code || error.status
      },
      metadata: context
    };

    return this.logEvent(eventData);
  }

  /**
   * Get events with filtering and pagination
   */
  async getEvents(filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = 'timestamp',
        sortOrder = 'desc',
        startDate,
        endDate
      } = options;

      const query = {};

      // Apply filters
      if (filters.eventType) query.eventType = filters.eventType;
      if (filters.category) query.category = filters.category;
      if (filters.userId) query.userId = filters.userId;
      if (filters.userEmail) query.userEmail = new RegExp(filters.userEmail, 'i');
      if (filters.resourceType) query.resourceType = filters.resourceType;
      if (filters.resourceId) query.resourceId = filters.resourceId;
      if (filters.status) query.status = filters.status;
      if (filters.severity) query.severity = filters.severity;
      if (filters.ipAddress) query.ipAddress = filters.ipAddress;

      // Date range filter
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const events = await Event.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Event.countDocuments(query);

      return {
        events,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Failed to get events:', error);
      throw error;
    }
  }

  /**
   * Get event statistics
   */
  async getEventStats(filters = {}) {
    try {
      const matchStage = {};
      
      if (filters.startDate || filters.endDate) {
        matchStage.timestamp = {};
        if (filters.startDate) matchStage.timestamp.$gte = new Date(filters.startDate);
        if (filters.endDate) matchStage.timestamp.$lte = new Date(filters.endDate);
      }

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalEvents: { $sum: 1 },
            successEvents: { $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] } },
            failedEvents: { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } },
            criticalEvents: { $sum: { $cond: [{ $eq: ['$severity', 'CRITICAL'] }, 1, 0] } },
            highSeverityEvents: { $sum: { $cond: [{ $eq: ['$severity', 'HIGH'] }, 1, 0] } },
            uniqueUsers: { $addToSet: '$userId' },
            uniqueIPs: { $addToSet: '$ipAddress' }
          }
        },
        {
          $project: {
            _id: 0,
            totalEvents: 1,
            successEvents: 1,
            failedEvents: 1,
            criticalEvents: 1,
            highSeverityEvents: 1,
            uniqueUsers: { $size: { $filter: { input: '$uniqueUsers', cond: { $ne: ['$$this', null] } } } },
            uniqueIPs: { $size: { $filter: { input: '$uniqueIPs', cond: { $ne: ['$$this', null] } } } }
          }
        }
      ];

      const stats = await Event.aggregate(pipeline);
      return stats[0] || {
        totalEvents: 0,
        successEvents: 0,
        failedEvents: 0,
        criticalEvents: 0,
        highSeverityEvents: 0,
        uniqueUsers: 0,
        uniqueIPs: 0
      };
    } catch (error) {
      console.error('❌ Failed to get event stats:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  enrichEventData(eventData) {
    return {
      ...eventData,
      timestamp: eventData.timestamp || new Date(),
      eventId: eventData.eventId || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: eventData.status || 'SUCCESS',
      severity: eventData.severity || 'LOW',
      metadata: eventData.metadata || {}
    };
  }

  getAuthEventDescription(type, user) {
    const descriptions = {
      'USER_LOGIN': `User ${user?.email || 'unknown'} logged in successfully`,
      'USER_LOGOUT': `User ${user?.email || 'unknown'} logged out`,
      'USER_LOGIN_FAILED': `Failed login attempt for ${user?.email || 'unknown'}`,
      'USER_REGISTER': `New user ${user?.email || 'unknown'} registered`,
      'USER_PASSWORD_CHANGE': `User ${user?.email || 'unknown'} changed password`,
      'USER_SESSION_EXPIRED': `Session expired for user ${user?.email || 'unknown'}`,
      'USER_OTP_SENT': `OTP sent to ${user?.email || 'unknown'}`,
      'USER_OTP_VERIFIED': `OTP verified for ${user?.email || 'unknown'}`,
      'USER_OTP_FAILED': `OTP verification failed for ${user?.email || 'unknown'}`
    };
    return descriptions[type] || `Authentication event: ${type}`;
  }

  getClientIP(req) {
    if (!req) return null;
    return req.ip || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           null;
  }

  sanitizeData(data) {
    if (!data) return null;
    
    const sanitized = { ...data };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  getChangedFields(oldData, newData) {
    if (!oldData || !newData) return [];
    
    const changes = [];
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    
    allKeys.forEach(key => {
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changes.push(key);
      }
    });
    
    return changes;
  }

  startBatchProcessor() {
    setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.processEventQueue();
      }
    }, this.flushInterval);
  }

  async processEventQueue() {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const eventsToProcess = this.eventQueue.splice(0, this.batchSize);

    try {
      await Event.insertMany(eventsToProcess, { ordered: false });
      console.log(`✅ Processed ${eventsToProcess.length} events`);
    } catch (error) {
      console.error('❌ Failed to process event batch:', error);
      // Re-add failed events to queue for retry
      this.eventQueue.unshift(...eventsToProcess);
    } finally {
      this.isProcessing = false;
    }
  }
}

// Create singleton instance
const eventLoggingService = new EventLoggingService();

module.exports = eventLoggingService;