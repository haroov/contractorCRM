const mongoose = require('mongoose');

// Sub-schema for device information
const deviceInfoSchema = new mongoose.Schema({
  userAgent: String,
  ip: String,
  browser: String,
  os: String,
  device: String,
  platform: String,
  language: String,
  screenResolution: String,
  timezone: String
}, { _id: false });

// Sub-schema for request details
const requestDetailsSchema = new mongoose.Schema({
  method: String,
  path: String,
  query: mongoose.Schema.Types.Mixed,
  params: mongoose.Schema.Types.Mixed,
  headers: mongoose.Schema.Types.Mixed,
  statusCode: Number,
  responseTime: Number, // in milliseconds
  errorMessage: String
}, { _id: false });

// Sub-schema for data changes
const dataChangeSchema = new mongoose.Schema({
  collection: String,
  documentId: String,
  operation: {
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'READ']
  },
  fieldChanges: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    _id: false
  }],
  oldData: mongoose.Schema.Types.Mixed,
  newData: mongoose.Schema.Types.Mixed
}, { _id: false });

// Main audit log schema
const auditLogSchema = new mongoose.Schema({
  // Event metadata
  eventType: {
    type: String,
    required: true,
    enum: [
      // Authentication events
      'AUTH_LOGIN',
      'AUTH_LOGOUT',
      'AUTH_LOGIN_FAILED',
      'AUTH_SESSION_EXPIRED',
      'AUTH_PASSWORD_CHANGE',
      'AUTH_OTP_REQUEST',
      'AUTH_OTP_VERIFY',
      
      // User management events
      'USER_CREATE',
      'USER_UPDATE',
      'USER_DELETE',
      'USER_ACTIVATE',
      'USER_DEACTIVATE',
      'USER_ROLE_CHANGE',
      
      // Data access events
      'DATA_VIEW',
      'DATA_CREATE',
      'DATA_UPDATE',
      'DATA_DELETE',
      'DATA_EXPORT',
      'DATA_IMPORT',
      
      // File operations
      'FILE_UPLOAD',
      'FILE_DOWNLOAD',
      'FILE_DELETE',
      'FILE_VIEW',
      
      // System events
      'SYSTEM_ERROR',
      'SYSTEM_WARNING',
      'API_CALL',
      'PERMISSION_DENIED',
      'RATE_LIMIT_EXCEEDED',
      
      // Business operations
      'PROJECT_CREATE',
      'PROJECT_UPDATE',
      'PROJECT_DELETE',
      'PROJECT_VIEW',
      'CONTRACTOR_CREATE',
      'CONTRACTOR_UPDATE',
      'CONTRACTOR_DELETE',
      'CONTRACTOR_VIEW',
      'REPORT_GENERATE',
      'EMAIL_SENT',
      'SMS_SENT'
    ],
    index: true
  },
  
  // User information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  userEmail: {
    type: String,
    index: true
  },
  userName: String,
  userRole: String,
  sessionId: {
    type: String,
    index: true
  },
  
  // Timestamp with index for efficient querying
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  
  // Action details
  action: {
    type: String,
    required: true
  },
  description: String,
  
  // Resource information
  resourceType: {
    type: String,
    index: true
  },
  resourceId: {
    type: String,
    index: true
  },
  resourceName: String,
  
  // Device and location information
  deviceInfo: deviceInfoSchema,
  
  // Request details (for HTTP requests)
  requestDetails: requestDetailsSchema,
  
  // Data changes (for CRUD operations)
  dataChanges: dataChangeSchema,
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Status and result
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILURE', 'WARNING', 'INFO'],
    default: 'SUCCESS',
    index: true
  },
  
  // Error details if applicable
  error: {
    message: String,
    stack: String,
    code: String
  },
  
  // Tags for filtering and grouping
  tags: [{
    type: String,
    index: true
  }],
  
  // Severity level
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW',
    index: true
  },
  
  // Parent event ID for nested events
  parentEventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AuditLog'
  },
  
  // TTL for automatic deletion (optional)
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true,
  collection: 'audit_logs'
});

// Compound indexes for efficient querying
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ eventType: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
auditLogSchema.index({ sessionId: 1, timestamp: -1 });
auditLogSchema.index({ status: 1, severity: 1, timestamp: -1 });
auditLogSchema.index({ 'deviceInfo.ip': 1, timestamp: -1 });

// Text index for searching descriptions
auditLogSchema.index({ action: 'text', description: 'text' });

// Method to sanitize sensitive data before saving
auditLogSchema.pre('save', function(next) {
  // Remove sensitive fields from headers if present
  if (this.requestDetails?.headers) {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    sensitiveHeaders.forEach(header => {
      if (this.requestDetails.headers[header]) {
        this.requestDetails.headers[header] = '[REDACTED]';
      }
    });
  }
  
  // Sanitize password fields in data changes
  if (this.dataChanges?.fieldChanges) {
    this.dataChanges.fieldChanges = this.dataChanges.fieldChanges.map(change => {
      if (change.field && change.field.toLowerCase().includes('password')) {
        return {
          ...change,
          oldValue: '[REDACTED]',
          newValue: '[REDACTED]'
        };
      }
      return change;
    });
  }
  
  next();
});

// Static method to create audit log entry
auditLogSchema.statics.createLog = async function(eventData) {
  try {
    const log = new this(eventData);
    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to prevent breaking the main operation
    return null;
  }
};

// Method to get user activity
auditLogSchema.statics.getUserActivity = async function(userId, options = {}) {
  const { 
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default 30 days
    endDate = new Date(),
    limit = 100,
    skip = 0,
    eventTypes = null
  } = options;
  
  const query = {
    userId,
    timestamp: { $gte: startDate, $lte: endDate }
  };
  
  if (eventTypes) {
    query.eventType = { $in: eventTypes };
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

// Method to get resource history
auditLogSchema.statics.getResourceHistory = async function(resourceType, resourceId, options = {}) {
  const { 
    limit = 50,
    skip = 0
  } = options;
  
  return this.find({ resourceType, resourceId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'name email')
    .lean();
};

// Method for analytics
auditLogSchema.statics.getAnalytics = async function(options = {}) {
  const {
    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Default 7 days
    endDate = new Date(),
    groupBy = 'eventType'
  } = options;
  
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: `$${groupBy}`,
        count: { $sum: 1 },
        lastOccurrence: { $max: '$timestamp' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

module.exports = mongoose.model('AuditLog', auditLogSchema);