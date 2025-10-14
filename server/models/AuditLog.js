const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Event identification
  eventId: {
    type: String,
    required: true,
    unique: true,
    default: () => require('nanoid').nanoid()
  },
  
  // Event type and action
  eventType: {
    type: String,
    required: true,
    enum: [
      'auth',           // Authentication events
      'crud',           // Create, Read, Update, Delete operations
      'file',           // File operations
      'system',         // System events
      'security',       // Security events
      'error'           // Error events
    ]
  },
  
  action: {
    type: String,
    required: true
    // Examples: login, logout, create, update, delete, upload, download, view, etc.
  },
  
  // User information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Some events might not have a user (system events)
  },
  
  userEmail: {
    type: String,
    required: false
  },
  
  userName: {
    type: String,
    required: false
  },
  
  userRole: {
    type: String,
    required: false
  },
  
  // Session and request information
  sessionId: {
    type: String,
    required: false
  },
  
  ipAddress: {
    type: String,
    required: false
  },
  
  userAgent: {
    type: String,
    required: false
  },
  
  // Device information (parsed from user agent)
  deviceInfo: {
    browser: {
      name: String,
      version: String
    },
    os: {
      name: String,
      version: String
    },
    device: {
      type: String, // mobile, tablet, desktop
      vendor: String,
      model: String
    }
  },
  
  // Request details
  method: {
    type: String,
    required: false
  },
  
  url: {
    type: String,
    required: false
  },
  
  endpoint: {
    type: String,
    required: false
  },
  
  // Resource information
  resourceType: {
    type: String,
    required: false
    // Examples: project, contractor, user, file, etc.
  },
  
  resourceId: {
    type: String,
    required: false
  },
  
  resourceName: {
    type: String,
    required: false
  },
  
  // Event details and changes
  description: {
    type: String,
    required: false
  },
  
  // For tracking changes (before/after values)
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  
  // Status and result
  success: {
    type: Boolean,
    required: true,
    default: true
  },
  
  statusCode: {
    type: Number,
    required: false
  },
  
  errorMessage: {
    type: String,
    required: false
  },
  
  // Performance metrics
  duration: {
    type: Number, // milliseconds
    required: false
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  // For future features
  tags: [{
    type: String
  }],
  
  // Compliance and retention
  retentionDate: {
    type: Date,
    required: false
  },
  
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  collection: 'audit_logs'
});

// Indexes for performance
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ eventType: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ userEmail: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
auditLogSchema.index({ sessionId: 1, timestamp: -1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });
auditLogSchema.index({ success: 1, timestamp: -1 });

// Compound indexes for common queries
auditLogSchema.index({ eventType: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, eventType: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, action: 1, timestamp: -1 });

// Static methods for common queries
auditLogSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId };
  if (options.eventType) query.eventType = options.eventType;
  if (options.action) query.action = options.action;
  if (options.startDate || options.endDate) {
    query.timestamp = {};
    if (options.startDate) query.timestamp.$gte = options.startDate;
    if (options.endDate) query.timestamp.$lte = options.endDate;
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 100)
    .skip(options.skip || 0);
};

auditLogSchema.statics.findByResource = function(resourceType, resourceId, options = {}) {
  const query = { resourceType, resourceId };
  if (options.action) query.action = options.action;
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 50);
};

auditLogSchema.statics.getAnalytics = function(options = {}) {
  const matchStage = {};
  if (options.startDate || options.endDate) {
    matchStage.timestamp = {};
    if (options.startDate) matchStage.timestamp.$gte = options.startDate;
    if (options.endDate) matchStage.timestamp.$lte = options.endDate;
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          eventType: '$eventType',
          action: '$action',
          success: '$success'
        },
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model('AuditLog', auditLogSchema);