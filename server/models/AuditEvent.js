const mongoose = require('mongoose');

// Device Information Schema
const DeviceInfoSchema = new mongoose.Schema({
  userAgent: { type: String, required: false },
  ipAddress: { type: String, required: false },
  deviceType: { type: String, enum: ['desktop', 'mobile', 'tablet', 'unknown'], default: 'unknown' },
  browser: { type: String, required: false },
  os: { type: String, required: false },
  screenResolution: { type: String, required: false },
  language: { type: String, required: false }
}, { _id: false });

// User Action Schema
const UserActionSchema = new mongoose.Schema({
  action: { type: String, required: true }, // 'login', 'logout', 'view', 'create', 'update', 'delete', 'search', 'export', 'import'
  resource: { type: String, required: true }, // 'contractor', 'user', 'project', 'file', 'system'
  resourceId: { type: String, required: false }, // ID of the specific resource
  details: { type: mongoose.Schema.Types.Mixed, required: false }, // Additional action-specific data
  oldValues: { type: mongoose.Schema.Types.Mixed, required: false }, // For update actions
  newValues: { type: mongoose.Schema.Types.Mixed, required: false }, // For update actions
  metadata: { type: mongoose.Schema.Types.Mixed, required: false } // Additional metadata
}, { _id: false });

// Session Information Schema
const SessionInfoSchema = new mongoose.Schema({
  sessionId: { type: String, required: false },
  loginTime: { type: Date, required: false },
  lastActivity: { type: Date, required: false },
  duration: { type: Number, required: false }, // Session duration in minutes
  isActive: { type: Boolean, default: true }
}, { _id: false });

// Main Audit Event Schema
const AuditEventSchema = new mongoose.Schema({
  // User Information
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  userEmail: { type: String, required: false },
  userName: { type: String, required: false },
  userRole: { type: String, required: false },
  
  // Event Timing
  timestamp: { type: Date, required: true, default: Date.now },
  eventId: { type: String, required: true, unique: true }, // Unique identifier for the event
  
  // Device and Location Information
  deviceInfo: { type: DeviceInfoSchema, required: false },
  
  // Session Information
  sessionInfo: { type: SessionInfoSchema, required: false },
  
  // Action Details
  action: { type: UserActionSchema, required: true },
  
  // System Information
  systemInfo: {
    version: { type: String, required: false },
    environment: { type: String, enum: ['development', 'staging', 'production'], default: 'production' },
    apiVersion: { type: String, required: false }
  },
  
  // Security Information
  security: {
    isSecureConnection: { type: Boolean, default: false },
    authenticationMethod: { type: String, enum: ['password', 'google-oauth', 'session', 'api-key'], required: false },
    riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' }
  },
  
  // Additional Context
  context: {
    pageUrl: { type: String, required: false },
    referrer: { type: String, required: false },
    requestId: { type: String, required: false },
    correlationId: { type: String, required: false } // For tracking related events
  },
  
  // Audit Trail
  auditTrail: {
    createdBy: { type: String, required: false },
    modifiedBy: { type: String, required: false },
    reason: { type: String, required: false }, // Reason for the action
    tags: [{ type: String }] // For categorization and filtering
  }
}, {
  timestamps: true,
  collection: 'audit_events'
});

// Indexes for better performance
AuditEventSchema.index({ timestamp: -1 }); // Most recent events first
AuditEventSchema.index({ userId: 1, timestamp: -1 }); // User activity timeline
AuditEventSchema.index({ 'action.action': 1, timestamp: -1 }); // Action type queries
AuditEventSchema.index({ 'action.resource': 1, timestamp: -1 }); // Resource type queries
AuditEventSchema.index({ 'action.resourceId': 1, timestamp: -1 }); // Specific resource queries
AuditEventSchema.index({ 'deviceInfo.ipAddress': 1, timestamp: -1 }); // IP-based queries
AuditEventSchema.index({ 'sessionInfo.sessionId': 1, timestamp: -1 }); // Session-based queries
AuditEventSchema.index({ 'security.riskLevel': 1, timestamp: -1 }); // Security risk queries
AuditEventSchema.index({ 'auditTrail.tags': 1, timestamp: -1 }); // Tag-based queries
AuditEventSchema.index({ eventId: 1 }, { unique: true }); // Unique event ID

// Compound indexes for common queries
AuditEventSchema.index({ 
  userId: 1, 
  'action.action': 1, 
  timestamp: -1 
});

AuditEventSchema.index({ 
  'action.resource': 1, 
  'action.resourceId': 1, 
  timestamp: -1 
});

// TTL index for automatic cleanup (optional - keeps events for 2 years)
AuditEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // 2 years

// Pre-save middleware to generate unique event ID
AuditEventSchema.pre('save', function(next) {
  if (!this.eventId) {
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Virtual for formatted timestamp
AuditEventSchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toISOString();
});

// Static method to get user activity summary
AuditEventSchema.statics.getUserActivitySummary = function(userId, startDate, endDate) {
  const query = { userId };
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  return this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$action.action',
        count: { $sum: 1 },
        lastActivity: { $max: '$timestamp' },
        resources: { $addToSet: '$action.resource' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Static method to get resource audit trail
AuditEventSchema.statics.getResourceAuditTrail = function(resource, resourceId) {
  return this.find({
    'action.resource': resource,
    'action.resourceId': resourceId
  }).sort({ timestamp: -1 }).populate('userId', 'name email');
};

// Static method to get security events
AuditEventSchema.statics.getSecurityEvents = function(riskLevel = null, startDate = null, endDate = null) {
  const query = {};
  if (riskLevel) query['security.riskLevel'] = riskLevel;
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  return this.find(query).sort({ timestamp: -1 });
};

module.exports = mongoose.model('AuditEvent', AuditEventSchema);