const Event = require('../models/Event');
const User = require('../models/User');
const mongoose = require('mongoose');

class EventService {
  /**
   * Log a new event
   * @param {Object} eventData - Event data
   * @returns {Promise<Object>} Created event
   */
  static async logEvent(eventData) {
    try {
      // Validate required fields
      if (!eventData.eventType || !eventData.resourceType || !eventData.description) {
        throw new Error('Missing required event fields: eventType, resourceType, description');
      }

      // If userId is provided, fetch user details
      if (eventData.userId) {
        const user = await User.findById(eventData.userId);
        if (user) {
          eventData.userEmail = user.email;
          eventData.userName = user.name;
        }
      }

      // Set default values
      const event = new Event({
        ...eventData,
        timestamp: eventData.timestamp || new Date(),
        eventId: eventData.eventId || new mongoose.Types.ObjectId().toString()
      });

      const savedEvent = await event.save();
      return savedEvent;
    } catch (error) {
      console.error('Error logging event:', error);
      throw error;
    }
  }

  /**
   * Log user login event
   * @param {Object} user - User object
   * @param {Object} request - Express request object
   * @returns {Promise<Object>} Created event
   */
  static async logLogin(user, request) {
    return this.logEvent({
      eventType: 'LOGIN',
      resourceType: 'AUTH',
      resourceId: user._id.toString(),
      userId: user._id,
      sessionId: request.sessionID,
      ipAddress: this.getClientIP(request),
      userAgent: request.get('User-Agent'),
      description: `User ${user.email} logged in successfully`,
      details: {
        loginMethod: 'password', // or 'google', 'oauth', etc.
        userRole: user.role
      }
    });
  }

  /**
   * Log user logout event
   * @param {Object} user - User object
   * @param {Object} request - Express request object
   * @returns {Promise<Object>} Created event
   */
  static async logLogout(user, request) {
    return this.logEvent({
      eventType: 'LOGOUT',
      resourceType: 'AUTH',
      resourceId: user._id.toString(),
      userId: user._id,
      sessionId: request.sessionID,
      ipAddress: this.getClientIP(request),
      userAgent: request.get('User-Agent'),
      description: `User ${user.email} logged out`
    });
  }

  /**
   * Log failed login attempt
   * @param {String} email - Email that failed to login
   * @param {Object} request - Express request object
   * @param {String} reason - Failure reason
   * @returns {Promise<Object>} Created event
   */
  static async logLoginFailed(email, request, reason = 'Invalid credentials') {
    return this.logEvent({
      eventType: 'LOGIN_FAILED',
      resourceType: 'AUTH',
      userId: null,
      sessionId: request.sessionID,
      ipAddress: this.getClientIP(request),
      userAgent: request.get('User-Agent'),
      description: `Failed login attempt for email: ${email}`,
      details: {
        attemptedEmail: email,
        failureReason: reason
      },
      status: 'FAILED',
      severity: 'MEDIUM'
    });
  }

  /**
   * Log resource creation event
   * @param {String} resourceType - Type of resource
   * @param {String} resourceId - ID of created resource
   * @param {Object} user - User who created the resource
   * @param {Object} request - Express request object
   * @param {Object} data - Created data
   * @returns {Promise<Object>} Created event
   */
  static async logCreate(resourceType, resourceId, user, request, data = {}) {
    return this.logEvent({
      eventType: 'CREATE',
      resourceType: resourceType.toUpperCase(),
      resourceId: resourceId.toString(),
      userId: user._id,
      sessionId: request.sessionID,
      ipAddress: this.getClientIP(request),
      userAgent: request.get('User-Agent'),
      description: `Created new ${resourceType.toLowerCase()}`,
      details: {
        createdData: this.sanitizeData(data)
      },
      changes: {
        after: this.sanitizeData(data)
      }
    });
  }

  /**
   * Log resource update event
   * @param {String} resourceType - Type of resource
   * @param {String} resourceId - ID of updated resource
   * @param {Object} user - User who updated the resource
   * @param {Object} request - Express request object
   * @param {Object} oldData - Previous data
   * @param {Object} newData - Updated data
   * @returns {Promise<Object>} Created event
   */
  static async logUpdate(resourceType, resourceId, user, request, oldData = {}, newData = {}) {
    const changes = this.calculateChanges(oldData, newData);
    
    return this.logEvent({
      eventType: 'UPDATE',
      resourceType: resourceType.toUpperCase(),
      resourceId: resourceId.toString(),
      userId: user._id,
      sessionId: request.sessionID,
      ipAddress: this.getClientIP(request),
      userAgent: request.get('User-Agent'),
      description: `Updated ${resourceType.toLowerCase()}`,
      details: {
        changes: changes,
        fieldsChanged: Object.keys(changes)
      },
      changes: {
        before: this.sanitizeData(oldData),
        after: this.sanitizeData(newData)
      }
    });
  }

  /**
   * Log resource deletion event
   * @param {String} resourceType - Type of resource
   * @param {String} resourceId - ID of deleted resource
   * @param {Object} user - User who deleted the resource
   * @param {Object} request - Express request object
   * @param {Object} deletedData - Deleted data
   * @returns {Promise<Object>} Created event
   */
  static async logDelete(resourceType, resourceId, user, request, deletedData = {}) {
    return this.logEvent({
      eventType: 'DELETE',
      resourceType: resourceType.toUpperCase(),
      resourceId: resourceId.toString(),
      userId: user._id,
      sessionId: request.sessionID,
      ipAddress: this.getClientIP(request),
      userAgent: request.get('User-Agent'),
      description: `Deleted ${resourceType.toLowerCase()}`,
      details: {
        deletedData: this.sanitizeData(deletedData)
      },
      changes: {
        before: this.sanitizeData(deletedData),
        after: null
      },
      severity: 'HIGH'
    });
  }

  /**
   * Log resource view event
   * @param {String} resourceType - Type of resource
   * @param {String} resourceId - ID of viewed resource
   * @param {Object} user - User who viewed the resource
   * @param {Object} request - Express request object
   * @returns {Promise<Object>} Created event
   */
  static async logView(resourceType, resourceId, user, request) {
    return this.logEvent({
      eventType: 'VIEW',
      resourceType: resourceType.toUpperCase(),
      resourceId: resourceId.toString(),
      userId: user._id,
      sessionId: request.sessionID,
      ipAddress: this.getClientIP(request),
      userAgent: request.get('User-Agent'),
      description: `Viewed ${resourceType.toLowerCase()}`,
      severity: 'LOW'
    });
  }

  /**
   * Log search event
   * @param {Object} user - User who performed search
   * @param {Object} request - Express request object
   * @param {Object} searchParams - Search parameters
   * @param {Number} resultCount - Number of results
   * @returns {Promise<Object>} Created event
   */
  static async logSearch(user, request, searchParams = {}, resultCount = 0) {
    return this.logEvent({
      eventType: 'SEARCH',
      resourceType: 'SYSTEM',
      userId: user._id,
      sessionId: request.sessionID,
      ipAddress: this.getClientIP(request),
      userAgent: request.get('User-Agent'),
      description: `Performed search`,
      details: {
        searchParams: this.sanitizeData(searchParams),
        resultCount: resultCount
      }
    });
  }

  /**
   * Log system error event
   * @param {String} errorMessage - Error message
   * @param {Object} request - Express request object
   * @param {Object} errorDetails - Additional error details
   * @returns {Promise<Object>} Created event
   */
  static async logSystemError(errorMessage, request, errorDetails = {}) {
    return this.logEvent({
      eventType: 'SYSTEM_ERROR',
      resourceType: 'SYSTEM',
      userId: request.user ? request.user._id : null,
      sessionId: request.sessionID,
      ipAddress: this.getClientIP(request),
      userAgent: request.get('User-Agent'),
      description: `System error: ${errorMessage}`,
      details: errorDetails,
      status: 'FAILED',
      severity: 'HIGH'
    });
  }

  /**
   * Log security alert event
   * @param {String} alertType - Type of security alert
   * @param {String} description - Alert description
   * @param {Object} request - Express request object
   * @param {Object} details - Additional details
   * @returns {Promise<Object>} Created event
   */
  static async logSecurityAlert(alertType, description, request, details = {}) {
    return this.logEvent({
      eventType: 'SECURITY_ALERT',
      resourceType: 'SYSTEM',
      userId: request.user ? request.user._id : null,
      sessionId: request.sessionID,
      ipAddress: this.getClientIP(request),
      userAgent: request.get('User-Agent'),
      description: `Security alert: ${description}`,
      details: {
        alertType,
        ...details
      },
      severity: 'CRITICAL'
    });
  }

  /**
   * Get events with filtering and pagination
   * @param {Object} filters - Filter options
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Events and pagination info
   */
  static async getEvents(filters = {}, options = {}) {
    const {
      eventType,
      resourceType,
      userId,
      startDate,
      endDate,
      status,
      severity,
      search
    } = filters;

    const {
      page = 1,
      limit = 50,
      sortBy = 'timestamp',
      sortOrder = -1
    } = options;

    // Build query
    const query = {};

    if (eventType) query.eventType = eventType;
    if (resourceType) query.resourceType = resourceType;
    if (userId) query.userId = userId;
    if (status) query.status = status;
    if (severity) query.severity = severity;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Execute query
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder };

    const [events, total] = await Promise.all([
      Event.find(query)
        .populate('userId', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Event.countDocuments(query)
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
   * Get user activity summary
   * @param {String} userId - User ID
   * @param {Number} days - Number of days to look back
   * @returns {Promise<Object>} Activity summary
   */
  static async getUserActivitySummary(userId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const pipeline = [
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          lastActivity: { $max: '$timestamp' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ];

    const activity = await Event.aggregate(pipeline);
    return activity;
  }

  /**
   * Get system statistics
   * @param {Number} days - Number of days to look back
   * @returns {Promise<Object>} System statistics
   */
  static async getSystemStats(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const pipeline = [
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          eventTypes: {
            $push: {
              type: '$eventType',
              status: '$status'
            }
          }
        }
      },
      {
        $project: {
          totalEvents: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          eventTypes: 1
        }
      }
    ];

    const [stats] = await Event.aggregate(pipeline);
    return stats || { totalEvents: 0, uniqueUsers: 0, eventTypes: [] };
  }

  /**
   * Archive old events
   * @param {Number} daysOld - Days old threshold
   * @returns {Promise<Object>} Archive result
   */
  static async archiveOldEvents(daysOld = 365) {
    return Event.archiveOldEvents(daysOld);
  }

  /**
   * Get client IP address from request
   * @param {Object} request - Express request object
   * @returns {String} Client IP address
   */
  static getClientIP(request) {
    return request.ip || 
           request.connection.remoteAddress || 
           request.socket.remoteAddress ||
           (request.connection.socket ? request.connection.socket.remoteAddress : null) ||
           request.headers['x-forwarded-for'] ||
           'unknown';
  }

  /**
   * Calculate changes between old and new data
   * @param {Object} oldData - Previous data
   * @param {Object} newData - New data
   * @returns {Object} Changes object
   */
  static calculateChanges(oldData, newData) {
    const changes = {};
    
    for (const key in newData) {
      if (oldData[key] !== newData[key]) {
        changes[key] = {
          from: oldData[key],
          to: newData[key]
        };
      }
    }
    
    return changes;
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   * @param {Object} data - Data to sanitize
   * @returns {Object} Sanitized data
   */
  static sanitizeData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
}

module.exports = EventService;