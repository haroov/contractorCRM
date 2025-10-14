const mongoose = require('mongoose');

// Event schema for comprehensive application logging
const eventSchema = new mongoose.Schema({
  // Event identification
  eventId: {
    type: String,
    required: true,
    unique: true,
    default: () => `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  // Event type and category
  eventType: {
    type: String,
    required: true,
    enum: [
      // Authentication events
      'USER_LOGIN',
      'USER_LOGOUT',
      'USER_LOGIN_FAILED',
      'USER_REGISTER',
      'USER_PASSWORD_CHANGE',
      'USER_SESSION_EXPIRED',
      'USER_OTP_SENT',
      'USER_OTP_VERIFIED',
      'USER_OTP_FAILED',
      
      // CRUD operations
      'CREATE',
      'READ',
      'UPDATE',
      'DELETE',
      'BULK_UPDATE',
      'BULK_DELETE',
      
      // File operations
      'FILE_UPLOAD',
      'FILE_DOWNLOAD',
      'FILE_DELETE',
      'PDF_GENERATE',
      'THUMBNAIL_GENERATE',
      
      // Project operations
      'PROJECT_CREATE',
      'PROJECT_UPDATE',
      'PROJECT_DELETE',
      'PROJECT_ARCHIVE',
      'PROJECT_RESTORE',
      
      // Contractor operations
      'CONTRACTOR_CREATE',
      'CONTRACTOR_UPDATE',
      'CONTRACTOR_DELETE',
      'CONTRACTOR_IMPORT',
      'CONTRACTOR_EXPORT',
      
      // Safety and risk operations
      'SAFETY_REPORT_CREATE',
      'SAFETY_REPORT_UPDATE',
      'RISK_ANALYSIS_RUN',
      'COMPANY_ANALYSIS_RUN',
      
      // GIS operations
      'GIS_QUERY',
      'GIS_DATA_UPDATE',
      'GIS_SPATIAL_SEARCH',
      
      // System events
      'SYSTEM_ERROR',
      'SYSTEM_WARNING',
      'SYSTEM_INFO',
      'API_RATE_LIMIT_HIT',
      'UNAUTHORIZED_ACCESS_ATTEMPT',
      
      // Data operations
      'DATA_EXPORT',
      'DATA_IMPORT',
      'DATA_BACKUP',
      'DATA_MIGRATION',
      
      // Admin operations
      'ADMIN_ACTION',
      'USER_ROLE_CHANGE',
      'SYSTEM_CONFIG_CHANGE'
    ]
  },
  
  // Event category for grouping
  category: {
    type: String,
    required: true,
    enum: ['AUTH', 'CRUD', 'FILE', 'PROJECT', 'CONTRACTOR', 'SAFETY', 'GIS', 'SYSTEM', 'ADMIN', 'DATA']
  },
  
  // User information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  userEmail: {
    type: String,
    default: null
  },
  userRole: {
    type: String,
    default: null
  },
  sessionId: {
    type: String,
    default: null
  },
  
  // Resource information
  resourceType: {
    type: String, // e.g., 'project', 'contractor', 'file', 'user'
    default: null
  },
  resourceId: {
    type: String, // ID of the affected resource
    default: null
  },
  resourceName: {
    type: String, // Human-readable name of the resource
    default: null
  },
  
  // Event details
  action: {
    type: String,
    required: true // e.g., 'login', 'create_project', 'update_contractor'
  },
  description: {
    type: String,
    required: true
  },
  
  // Request information
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  requestMethod: {
    type: String,
    default: null
  },
  requestUrl: {
    type: String,
    default: null
  },
  requestHeaders: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // Response information
  statusCode: {
    type: Number,
    default: null
  },
  responseTime: {
    type: Number, // in milliseconds
    default: null
  },
  
  // Data changes (for audit trail)
  oldData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  newData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  changedFields: [{
    type: String
  }],
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Error information (if applicable)
  error: {
    message: String,
    stack: String,
    code: String
  },
  
  // Event status
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'WARNING', 'INFO'],
    default: 'SUCCESS'
  },
  
  // Severity level
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW'
  },
  
  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'events'
});

// Indexes for better query performance
eventSchema.index({ timestamp: -1 });
eventSchema.index({ eventType: 1, timestamp: -1 });
eventSchema.index({ userId: 1, timestamp: -1 });
eventSchema.index({ userEmail: 1, timestamp: -1 });
eventSchema.index({ category: 1, timestamp: -1 });
eventSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
eventSchema.index({ status: 1, timestamp: -1 });
eventSchema.index({ severity: 1, timestamp: -1 });
eventSchema.index({ sessionId: 1, timestamp: -1 });
eventSchema.index({ ipAddress: 1, timestamp: -1 });

// Compound indexes for common queries
eventSchema.index({ eventType: 1, userId: 1, timestamp: -1 });
eventSchema.index({ category: 1, status: 1, timestamp: -1 });
eventSchema.index({ resourceType: 1, action: 1, timestamp: -1 });

// TTL index to automatically delete old events (optional - can be configured)
// eventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 }); // 1 year

module.exports = mongoose.model('Event', eventSchema);