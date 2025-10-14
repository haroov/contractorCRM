const mongoose = require('mongoose');

// Event Types Enum
const EventTypes = {
  // Authentication events
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_LOGIN_FAILED: 'user_login_failed',
  
  // User management events
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  USER_ROLE_CHANGED: 'user_role_changed',
  
  // Contractor events
  CONTRACTOR_CREATED: 'contractor_created',
  CONTRACTOR_UPDATED: 'contractor_updated',
  CONTRACTOR_DELETED: 'contractor_deleted',
  CONTRACTOR_VIEWED: 'contractor_viewed',
  
  // Project events
  PROJECT_CREATED: 'project_created',
  PROJECT_UPDATED: 'project_updated',
  PROJECT_DELETED: 'project_deleted',
  PROJECT_VIEWED: 'project_viewed',
  PROJECT_STATUS_CHANGED: 'project_status_changed',
  
  // Document events
  DOCUMENT_UPLOADED: 'document_uploaded',
  DOCUMENT_DOWNLOADED: 'document_downloaded',
  DOCUMENT_DELETED: 'document_deleted',
  DOCUMENT_VIEWED: 'document_viewed',
  
  // Risk analysis events
  RISK_ANALYSIS_CREATED: 'risk_analysis_created',
  RISK_ANALYSIS_UPDATED: 'risk_analysis_updated',
  RISK_ANALYSIS_VIEWED: 'risk_analysis_viewed',
  
  // Safety events
  SAFETY_REPORT_CREATED: 'safety_report_created',
  SAFETY_REPORT_UPDATED: 'safety_report_updated',
  SAFETY_REPORT_VIEWED: 'safety_report_viewed',
  
  // System events
  SYSTEM_ERROR: 'system_error',
  API_REQUEST: 'api_request',
  DATA_EXPORT: 'data_export',
  DATA_IMPORT: 'data_import',
  
  // Security events
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  PERMISSION_DENIED: 'permission_denied',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity'
};

// Device Info Schema
const DeviceInfoSchema = new mongoose.Schema({
  userAgent: { type: String },
  ip: { type: String },
  browser: { type: String },
  os: { type: String },
  device: { type: String },
  isMobile: { type: Boolean, default: false }
}, { _id: false });

// Location Schema
const LocationSchema = new mongoose.Schema({
  country: { type: String },
  city: { type: String },
  region: { type: String },
  timezone: { type: String },
  coordinates: {
    latitude: { type: Number },
    longitude: { type: Number }
  }
}, { _id: false });

// Change Details Schema - for tracking what exactly changed
const ChangeDetailsSchema = new mongoose.Schema({
  field: { type: String },
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

// Main Audit Event Schema
const AuditEventSchema = new mongoose.Schema({
  // Event identification
  eventType: {
    type: String,
    required: true,
    enum: Object.values(EventTypes)
  },
  eventCategory: {
    type: String,
    required: true,
    enum: ['authentication', 'user_management', 'contractor', 'project', 'document', 'risk_analysis', 'safety', 'system', 'security']
  },
  
  // User information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Some events might not have a user (system events)
  },
  userEmail: { type: String },
  userName: { type: String },
  userRole: { type: String },
  
  // Session information
  sessionId: { type: String },
  
  // Target resource information
  resourceType: { type: String }, // 'contractor', 'project', 'user', 'document', etc.
  resourceId: { type: String }, // ID of the affected resource
  resourceName: { type: String }, // Human-readable name of the resource
  
  // Event details
  action: { type: String, required: true }, // 'create', 'read', 'update', 'delete', 'login', etc.
  description: { type: String, required: true },
  
  // Change tracking
  changes: [ChangeDetailsSchema], // What exactly changed
  
  // Request information
  method: { type: String }, // HTTP method
  url: { type: String }, // Request URL
  endpoint: { type: String }, // API endpoint
  
  // Device and location information
  deviceInfo: DeviceInfoSchema,
  location: LocationSchema,
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Status and result
  success: { type: Boolean, default: true },
  errorMessage: { type: String },
  errorCode: { type: String },
  
  // Performance metrics
  duration: { type: Number }, // Request duration in milliseconds
  
  // Severity level
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  
  // Timestamps
  timestamp: { type: Date, default: Date.now, required: true }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  collection: 'audit_events'
});

// Indexes for performance
AuditEventSchema.index({ timestamp: -1 }); // Most recent first
AuditEventSchema.index({ eventType: 1, timestamp: -1 });
AuditEventSchema.index({ eventCategory: 1, timestamp: -1 });
AuditEventSchema.index({ userId: 1, timestamp: -1 });
AuditEventSchema.index({ userEmail: 1, timestamp: -1 });
AuditEventSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
AuditEventSchema.index({ sessionId: 1, timestamp: -1 });
AuditEventSchema.index({ success: 1, timestamp: -1 });
AuditEventSchema.index({ severity: 1, timestamp: -1 });

// Compound indexes for common queries
AuditEventSchema.index({ eventCategory: 1, eventType: 1, timestamp: -1 });
AuditEventSchema.index({ userId: 1, eventCategory: 1, timestamp: -1 });
AuditEventSchema.index({ resourceType: 1, action: 1, timestamp: -1 });

// TTL index for automatic cleanup (optional - keep events for 2 years)
AuditEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // 2 years in seconds

// Static methods for common queries
AuditEventSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId };
  if (options.eventType) query.eventType = options.eventType;
  if (options.eventCategory) query.eventCategory = options.eventCategory;
  if (options.startDate) query.timestamp = { $gte: options.startDate };
  if (options.endDate) {
    query.timestamp = query.timestamp || {};
    query.timestamp.$lte = options.endDate;
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};

AuditEventSchema.statics.findByResource = function(resourceType, resourceId, options = {}) {
  const query = { resourceType, resourceId };
  if (options.action) query.action = options.action;
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 50);
};

AuditEventSchema.statics.getActivitySummary = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), timestamp: { $gte: startDate } } },
    {
      $group: {
        _id: '$eventCategory',
        count: { $sum: 1 },
        lastActivity: { $max: '$timestamp' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Instance methods
AuditEventSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  // Remove sensitive information if needed
  if (obj.metadata && obj.metadata.password) {
    delete obj.metadata.password;
  }
  return obj;
};

const AuditEvent = mongoose.model('AuditEvent', AuditEventSchema);

module.exports = {
  AuditEvent,
  EventTypes
};