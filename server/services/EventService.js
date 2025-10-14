const Event = require('../models/Event');
const { v4: uuidv4 } = require('uuid');

class EventService {
  /**
   * יצירת אירוע חדש
   * @param {Object} eventData - נתוני האירוע
   * @returns {Promise<Object>} האירוע שנוצר
   */
  static async createEvent(eventData) {
    try {
      const event = new Event({
        ...eventData,
        requestId: eventData.requestId || uuidv4()
      });
      
      const savedEvent = await event.save();
      console.log(`📝 Event logged: ${eventData.action} on ${eventData.entityType} by ${eventData.userEmail}`);
      
      return savedEvent;
    } catch (error) {
      console.error('❌ Error creating event:', error);
      throw error;
    }
  }

  /**
   * רישום פעולת CRUD
   * @param {Object} params - פרמטרים
   */
  static async logCrudAction({
    userId,
    userEmail,
    userName,
    action,
    entityType,
    entityId,
    entityName,
    beforeData = null,
    afterData = null,
    metadata = {},
    ipAddress = null,
    userAgent = null,
    sessionId = null,
    description = null,
    severity = 'MEDIUM'
  }) {
    try {
      const eventData = {
        userId,
        userEmail,
        userName,
        action,
        entityType,
        entityId,
        entityName,
        beforeData,
        afterData,
        metadata,
        ipAddress,
        userAgent,
        sessionId,
        description: description || this.generateDescription(action, entityType, entityName),
        severity,
        success: true
      };

      return await this.createEvent(eventData);
    } catch (error) {
      console.error('❌ Error logging CRUD action:', error);
      throw error;
    }
  }

  /**
   * רישום פעולת אימות
   * @param {Object} params - פרמטרים
   */
  static async logAuthAction({
    userId,
    userEmail,
    userName,
    action,
    success = true,
    errorMessage = null,
    ipAddress = null,
    userAgent = null,
    sessionId = null,
    metadata = {}
  }) {
    try {
      const eventData = {
        userId: userId || null,
        userEmail: userEmail || 'unknown',
        userName: userName || 'unknown',
        action,
        entityType: 'AUTHENTICATION',
        entityId: null,
        entityName: null,
        success,
        errorMessage,
        ipAddress,
        userAgent,
        sessionId,
        metadata,
        description: this.generateAuthDescription(action, success, userEmail),
        severity: success ? 'MEDIUM' : 'HIGH'
      };

      return await this.createEvent(eventData);
    } catch (error) {
      console.error('❌ Error logging auth action:', error);
      throw error;
    }
  }

  /**
   * רישום פעולת מערכת
   * @param {Object} params - פרמטרים
   */
  static async logSystemAction({
    userId,
    userEmail,
    userName,
    action,
    entityType,
    entityId = null,
    entityName = null,
    metadata = {},
    description = null,
    severity = 'MEDIUM',
    success = true,
    errorMessage = null
  }) {
    try {
      const eventData = {
        userId,
        userEmail,
        userName,
        action,
        entityType,
        entityId,
        entityName,
        metadata,
        description: description || this.generateDescription(action, entityType, entityName),
        severity,
        success,
        errorMessage
      };

      return await this.createEvent(eventData);
    } catch (error) {
      console.error('❌ Error logging system action:', error);
      throw error;
    }
  }

  /**
   * קבלת אירועים לפי משתמש
   * @param {String} userId - מזהה המשתמש
   * @param {Object} options - אפשרויות
   */
  static async getEventsByUser(userId, options = {}) {
    try {
      const { limit = 50, skip = 0, action, entityType, startDate, endDate } = options;
      
      const query = { userId };
      
      if (action) query.action = action;
      if (entityType) query.entityType = entityType;
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      return await Event.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .populate('userId', 'name email');
    } catch (error) {
      console.error('❌ Error getting events by user:', error);
      throw error;
    }
  }

  /**
   * קבלת אירועים לפי ישות
   * @param {String} entityType - סוג הישות
   * @param {String} entityId - מזהה הישות
   * @param {Object} options - אפשרויות
   */
  static async getEventsByEntity(entityType, entityId, options = {}) {
    try {
      const { limit = 50, skip = 0, action, startDate, endDate } = options;
      
      const query = { entityType, entityId };
      
      if (action) query.action = action;
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      return await Event.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .populate('userId', 'name email');
    } catch (error) {
      console.error('❌ Error getting events by entity:', error);
      throw error;
    }
  }

  /**
   * חיפוש אירועים
   * @param {Object} searchQuery - שאילתת חיפוש
   */
  static async searchEvents(searchQuery) {
    try {
      return await Event.searchEvents(searchQuery);
    } catch (error) {
      console.error('❌ Error searching events:', error);
      throw error;
    }
  }

  /**
   * קבלת סטטיסטיקות אירועים
   * @param {Object} options - אפשרויות
   */
  static async getEventStats(options = {}) {
    try {
      const { startDate, endDate, userId, entityType } = options;
      
      const matchStage = {};
      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = new Date(startDate);
        if (endDate) matchStage.timestamp.$lte = new Date(endDate);
      }
      if (userId) matchStage.userId = userId;
      if (entityType) matchStage.entityType = entityType;

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalEvents: { $sum: 1 },
            successfulEvents: {
              $sum: { $cond: ['$success', 1, 0] }
            },
            failedEvents: {
              $sum: { $cond: ['$success', 0, 1] }
            },
            actions: {
              $push: '$action'
            },
            entityTypes: {
              $push: '$entityType'
            }
          }
        },
        {
          $project: {
            totalEvents: 1,
            successfulEvents: 1,
            failedEvents: 1,
            successRate: {
              $multiply: [
                { $divide: ['$successfulEvents', '$totalEvents'] },
                100
              ]
            },
            uniqueActions: { $setUnion: ['$actions', []] },
            uniqueEntityTypes: { $setUnion: ['$entityTypes', []] }
          }
        }
      ];

      const result = await Event.aggregate(pipeline);
      return result[0] || {
        totalEvents: 0,
        successfulEvents: 0,
        failedEvents: 0,
        successRate: 0,
        uniqueActions: [],
        uniqueEntityTypes: []
      };
    } catch (error) {
      console.error('❌ Error getting event stats:', error);
      throw error;
    }
  }

  /**
   * מחיקת אירועים ישנים (לניקוי)
   * @param {Number} daysOld - מספר ימים
   */
  static async cleanupOldEvents(daysOld = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const result = await Event.deleteMany({
        timestamp: { $lt: cutoffDate },
        severity: { $in: ['LOW', 'MEDIUM'] } // שמירה על אירועים חשובים
      });
      
      console.log(`🧹 Cleaned up ${result.deletedCount} old events`);
      return result.deletedCount;
    } catch (error) {
      console.error('❌ Error cleaning up old events:', error);
      throw error;
    }
  }

  /**
   * יצירת תיאור אוטומטי לפעולה
   * @param {String} action - הפעולה
   * @param {String} entityType - סוג הישות
   * @param {String} entityName - שם הישות
   */
  static generateDescription(action, entityType, entityName) {
    const actionMap = {
      'CREATE': 'נוצר',
      'READ': 'נקרא',
      'UPDATE': 'עודכן',
      'DELETE': 'נמחק',
      'LOGIN': 'התחבר',
      'LOGOUT': 'התנתק',
      'UPLOAD': 'העלה קובץ',
      'DOWNLOAD': 'הוריד קובץ',
      'DELETE_FILE': 'מחק קובץ',
      'EXPORT': 'ייצא',
      'IMPORT': 'ייבא',
      'VIEW': 'צפה',
      'EDIT': 'ערך',
      'APPROVE': 'אישר',
      'REJECT': 'דחה',
      'ASSIGN': 'הקצה',
      'UNASSIGN': 'הסיר הקצאה',
      'STATUS_CHANGE': 'שינה סטטוס',
      'PERMISSION_CHANGE': 'שינה הרשאות',
      'PASSWORD_CHANGE': 'שינה סיסמה'
    };

    const entityMap = {
      'USER': 'משתמש',
      'CONTRACTOR': 'קבלן',
      'PROJECT': 'פרויקט',
      'FILE': 'קובץ',
      'SESSION': 'סשן',
      'CLASSIFICATION': 'סיווג',
      'CONTACT': 'איש קשר',
      'SAFETY_REPORT': 'דוח בטיחות',
      'GIS_DATA': 'נתוני GIS',
      'SYSTEM': 'מערכת',
      'AUTHENTICATION': 'אימות'
    };

    const actionText = actionMap[action] || action;
    const entityText = entityMap[entityType] || entityType;
    const nameText = entityName ? ` "${entityName}"` : '';

    return `${actionText} ${entityText}${nameText}`;
  }

  /**
   * יצירת תיאור לפעולת אימות
   * @param {String} action - הפעולה
   * @param {Boolean} success - האם הצליחה
   * @param {String} userEmail - אימייל המשתמש
   */
  static generateAuthDescription(action, success, userEmail) {
    const actionMap = {
      'LOGIN': 'התחברות',
      'LOGOUT': 'התנתקות',
      'LOGIN_FAILED': 'ניסיון התחברות כושל'
    };

    const actionText = actionMap[action] || action;
    const statusText = success ? 'הצליחה' : 'נכשלה';
    const userText = userEmail ? ` עבור ${userEmail}` : '';

    return `${actionText} ${statusText}${userText}`;
  }
}

module.exports = EventService;