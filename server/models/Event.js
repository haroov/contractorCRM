const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  // Event identification
  eventId: {
    type: String,
    required: true,
    unique: true,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  
  // Event type and action
  eventType: {
    type: String,
    required: true,
    enum: [
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
      'CREATE', 'UPDATE', 'DELETE', 'VIEW',
      'EXPORT', 'IMPORT', 'DOWNLOAD', 'UPLOAD',
      'SEARCH', 'FILTER', 'SORT',
      'PERMISSION_GRANTED', 'PERMISSION_DENIED',
      'PASSWORD_CHANGE', 'PROFILE_UPDATE',
      'SYSTEM_ERROR', 'SECURITY_ALERT',
      'BULK_OPERATION', 'BACKUP', 'RESTORE'
    ]
  },
  
  // Resource information
  resourceType: {
    type: String,
    required: true,
    enum: ['USER', 'CONTRACTOR', 'PROJECT', 'FILE', 'SYSTEM', 'SESSION', 'AUTH']
  },
  
  resourceId: {
    type: String,
    required: false // Can be null for system events
  },
  
  // User information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Can be null for system events
  },
  
  userEmail: {
    type: String,
    required: false
  },
  
  userName: {
    type: String,
    required: false
  },
  
  // Session information
  sessionId: {
    type: String,
    required: false
  },
  
  // Request information
  ipAddress: {
    type: String,
    required: false
  },
  
  userAgent: {
    type: String,
    required: false
  },
  
  // Event details
  description: {
    type: String,
    required: true
  },
  
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: false // Additional data specific to the event
  },
  
  // Change tracking (for audit purposes)
  changes: {
    before: {
      type: mongoose.Schema.Types.Mixed,
      required: false
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      required: false
    }
  },
  
  // Status and result
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'PENDING', 'CANCELLED'],
    default: 'SUCCESS'
  },
  
  errorMessage: {
    type: String,
    required: false
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  
  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  // Retention and archival
  isArchived: {
    type: Boolean,
    default: false
  },
  
  archivedAt: {
    type: Date,
    required: false
  },
  
  // Security and compliance
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW'
  },
  
  isSensitive: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'events'
});

// Indexes for better performance
EventSchema.index({ eventType: 1, timestamp: -1 });
EventSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
EventSchema.index({ userId: 1, timestamp: -1 });
EventSchema.index({ sessionId: 1, timestamp: -1 });
EventSchema.index({ ipAddress: 1, timestamp: -1 });
EventSchema.index({ status: 1, timestamp: -1 });
EventSchema.index({ severity: 1, timestamp: -1 });
EventSchema.index({ timestamp: -1 });
EventSchema.index({ isArchived: 1, timestamp: -1 });

// Compound indexes for common queries
EventSchema.index({ 
  eventType: 1, 
  resourceType: 1, 
  timestamp: -1 
});

EventSchema.index({ 
  userId: 1, 
  eventType: 1, 
  timestamp: -1 
});

// Text index for searching descriptions
EventSchema.index({ 
  description: 'text',
  details: 'text'
});

// Virtual for human-readable event summary
EventSchema.virtual('summary').get(function () {
  const user = this.userName || this.userEmail || 'System';
  const action = this.eventType.toLowerCase().replace('_', ' ');
  const resource = this.resourceType.toLowerCase();
  
  return `${user} ${action} ${resource}${this.resourceId ? ` (ID: ${this.resourceId})` : ''}`;
});

// Static method to get recent events for a user
EventSchema.statics.getUserEvents = function(userId, limit = 50, skip = 0) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'name email');
};

// Static method to get events by resource
EventSchema.statics.getResourceEvents = function(resourceType, resourceId, limit = 50) {
  return this.find({ resourceType, resourceId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'name email');
};

// Static method to get system events
EventSchema.statics.getSystemEvents = function(limit = 100) {
  return this.find({ 
    $or: [
      { resourceType: 'SYSTEM' },
      { eventType: { $in: ['SYSTEM_ERROR', 'SECURITY_ALERT'] } }
    ]
  })
  .sort({ timestamp: -1 })
  .limit(limit);
};

// Static method to archive old events
EventSchema.statics.archiveOldEvents = function(daysOld = 365) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.updateMany(
    { 
      timestamp: { $lt: cutoffDate },
      isArchived: false 
    },
    { 
      $set: { 
        isArchived: true, 
        archivedAt: new Date() 
      } 
    }
  );
};

module.exports = mongoose.model('Event', EventSchema);