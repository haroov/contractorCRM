const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  // מי ביצע את הפעולה
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  
  // מה נעשה
  action: {
    type: String,
    required: true,
    enum: [
      // CRUD operations
      'CREATE', 'READ', 'UPDATE', 'DELETE',
      // Authentication
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
      // File operations
      'UPLOAD', 'DOWNLOAD', 'DELETE_FILE',
      // System operations
      'EXPORT', 'IMPORT', 'BACKUP', 'RESTORE',
      // Custom actions
      'VIEW', 'EDIT', 'APPROVE', 'REJECT', 'ASSIGN', 'UNASSIGN',
      'STATUS_CHANGE', 'PERMISSION_CHANGE', 'PASSWORD_CHANGE'
    ]
  },
  
  // על איזה entity (ישות) בוצעה הפעולה
  entityType: {
    type: String,
    required: true,
    enum: [
      'USER', 'CONTRACTOR', 'PROJECT', 'FILE', 'SESSION', 
      'CLASSIFICATION', 'CONTACT', 'SAFETY_REPORT', 'GIS_DATA',
      'SYSTEM', 'AUTHENTICATION'
    ]
  },
  
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false // לא תמיד יש entityId (למשל בLOGIN)
  },
  
  entityName: {
    type: String,
    required: false // שם הישות (למשל שם הקבלן)
  },
  
  // מתי בוצעה הפעולה
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  // IP address של המשתמש
  ipAddress: {
    type: String,
    required: false
  },
  
  // User Agent
  userAgent: {
    type: String,
    required: false
  },
  
  // נתונים נוספים על הפעולה
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // נתונים לפני השינוי (לצורך undo)
  beforeData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // נתונים אחרי השינוי
  afterData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // הודעה תיאורית של הפעולה
  description: {
    type: String,
    required: false
  },
  
  // רמת חשיבות האירוע
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  
  // האם הפעולה הצליחה
  success: {
    type: Boolean,
    default: true
  },
  
  // הודעת שגיאה אם הפעולה נכשלה
  errorMessage: {
    type: String,
    required: false
  },
  
  // Session ID
  sessionId: {
    type: String,
    required: false
  },
  
  // Request ID לצורך tracking
  requestId: {
    type: String,
    required: false
  }
}, {
  timestamps: true,
  collection: 'events'
});

// Indexes for better performance
EventSchema.index({ userId: 1, timestamp: -1 });
EventSchema.index({ action: 1, timestamp: -1 });
EventSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
EventSchema.index({ timestamp: -1 });
EventSchema.index({ userEmail: 1, timestamp: -1 });
EventSchema.index({ sessionId: 1, timestamp: -1 });
EventSchema.index({ success: 1, timestamp: -1 });
EventSchema.index({ severity: 1, timestamp: -1 });

// Compound indexes for common queries
EventSchema.index({ entityType: 1, action: 1, timestamp: -1 });
EventSchema.index({ userId: 1, action: 1, timestamp: -1 });

// Virtual for formatted timestamp
EventSchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toISOString();
});

// Static method to get events by user
EventSchema.statics.getEventsByUser = function(userId, limit = 50, skip = 0) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'name email');
};

// Static method to get events by entity
EventSchema.statics.getEventsByEntity = function(entityType, entityId, limit = 50, skip = 0) {
  return this.find({ entityType, entityId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'name email');
};

// Static method to get recent events
EventSchema.statics.getRecentEvents = function(limit = 100, skip = 0) {
  return this.find()
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'name email');
};

// Static method to search events
EventSchema.statics.searchEvents = function(query) {
  const {
    userId,
    action,
    entityType,
    entityId,
    startDate,
    endDate,
    severity,
    success,
    limit = 50,
    skip = 0
  } = query;

  const filter = {};
  
  if (userId) filter.userId = userId;
  if (action) filter.action = action;
  if (entityType) filter.entityType = entityType;
  if (entityId) filter.entityId = entityId;
  if (severity) filter.severity = severity;
  if (success !== undefined) filter.success = success;
  
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }

  return this.find(filter)
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'name email');
};

module.exports = mongoose.model('Event', EventSchema);