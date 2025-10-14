const Event = require('../models/Event');
const EventService = require('./EventService');

class AuditService {
  /**
   * קבלת audit trail מלא של ישות
   * @param {String} entityType - סוג הישות
   * @param {String} entityId - מזהה הישות
   * @param {Object} options - אפשרויות
   */
  static async getAuditTrail(entityType, entityId, options = {}) {
    try {
      const {
        limit = 100,
        skip = 0,
        includeReads = false,
        startDate,
        endDate
      } = options;

      const query = {
        entityType,
        entityId
      };

      // אם לא רוצים לקרוא פעולות READ
      if (!includeReads) {
        query.action = { $in: ['CREATE', 'UPDATE', 'DELETE', 'UPLOAD', 'DOWNLOAD', 'DELETE_FILE'] };
      }

      // סינון לפי תאריכים
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      const events = await Event.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .populate('userId', 'name email role');

      // יצירת audit trail מפורט
      const auditTrail = events.map(event => ({
        id: event._id,
        action: event.action,
        user: {
          id: event.userId?._id,
          name: event.userName,
          email: event.userEmail,
          role: event.userId?.role
        },
        timestamp: event.timestamp,
        beforeData: event.beforeData,
        afterData: event.afterData,
        description: event.description,
        metadata: event.metadata,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        success: event.success,
        errorMessage: event.errorMessage
      }));

      return auditTrail;
    } catch (error) {
      console.error('❌ Error getting audit trail:', error);
      throw error;
    }
  }

  /**
   * קבלת היסטוריית שינויים של שדה ספציפי
   * @param {String} entityType - סוג הישות
   * @param {String} entityId - מזהה הישות
   * @param {String} fieldName - שם השדה
   */
  static async getFieldHistory(entityType, entityId, fieldName) {
    try {
      const events = await Event.find({
        entityType,
        entityId,
        action: 'UPDATE',
        $or: [
          { [`beforeData.${fieldName}`]: { $exists: true } },
          { [`afterData.${fieldName}`]: { $exists: true } }
        ]
      })
      .sort({ timestamp: -1 })
      .populate('userId', 'name email');

      const fieldHistory = events.map(event => ({
        id: event._id,
        user: {
          name: event.userName,
          email: event.userEmail
        },
        timestamp: event.timestamp,
        oldValue: event.beforeData?.[fieldName],
        newValue: event.afterData?.[fieldName],
        description: `שינוי שדה ${fieldName}`,
        metadata: event.metadata
      }));

      return fieldHistory;
    } catch (error) {
      console.error('❌ Error getting field history:', error);
      throw error;
    }
  }

  /**
   * קבלת סטטיסטיקות audit
   * @param {Object} options - אפשרויות
   */
  static async getAuditStats(options = {}) {
    try {
      const {
        startDate,
        endDate,
        entityType,
        userId
      } = options;

      const matchStage = {};
      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = new Date(startDate);
        if (endDate) matchStage.timestamp.$lte = new Date(endDate);
      }
      if (entityType) matchStage.entityType = entityType;
      if (userId) matchStage.userId = userId;

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: {
              action: '$action',
              entityType: '$entityType'
            },
            count: { $sum: 1 },
            users: { $addToSet: '$userId' },
            lastActivity: { $max: '$timestamp' }
          }
        },
        {
          $group: {
            _id: null,
            totalEvents: { $sum: '$count' },
            actions: {
              $push: {
                action: '$_id.action',
                entityType: '$_id.entityType',
                count: '$count',
                lastActivity: '$lastActivity'
              }
            },
            uniqueUsers: { $sum: { $size: '$users' } }
          }
        }
      ];

      const result = await Event.aggregate(pipeline);
      return result[0] || {
        totalEvents: 0,
        actions: [],
        uniqueUsers: 0
      };
    } catch (error) {
      console.error('❌ Error getting audit stats:', error);
      throw error;
    }
  }

  /**
   * בדיקה אם ניתן לבצע undo לפעולה
   * @param {String} eventId - מזהה האירוע
   */
  static async canUndo(eventId) {
    try {
      const event = await Event.findById(eventId);
      
      if (!event) {
        return { canUndo: false, reason: 'Event not found' };
      }

      // בדיקה אם הפעולה נתמכת לundo
      const undoableActions = ['UPDATE', 'DELETE'];
      if (!undoableActions.includes(event.action)) {
        return { canUndo: false, reason: 'Action not supported for undo' };
      }

      // בדיקה אם יש נתונים לפני השינוי
      if (!event.beforeData) {
        return { canUndo: false, reason: 'No before data available' };
      }

      // בדיקה אם הישות עדיין קיימת (לפעולות UPDATE)
      if (event.action === 'UPDATE') {
        // כאן נוכל להוסיף בדיקה אם הישות עדיין קיימת
        return { canUndo: true, reason: 'Can undo' };
      }

      // בדיקה אם הישות לא קיימת (לפעולות DELETE)
      if (event.action === 'DELETE') {
        // כאן נוכל להוסיף בדיקה אם הישות לא קיימת
        return { canUndo: true, reason: 'Can undo' };
      }

      return { canUndo: false, reason: 'Unknown action' };
    } catch (error) {
      console.error('❌ Error checking undo capability:', error);
      throw error;
    }
  }

  /**
   * יצירת undo event (הכנה לundo)
   * @param {String} eventId - מזהה האירוע המקורי
   * @param {String} userId - מזהה המשתמש המבצע
   * @param {String} userEmail - אימייל המשתמש
   * @param {String} userName - שם המשתמש
   */
  static async createUndoEvent(eventId, userId, userEmail, userName) {
    try {
      const originalEvent = await Event.findById(eventId);
      
      if (!originalEvent) {
        throw new Error('Original event not found');
      }

      // בדיקה אם ניתן לבצע undo
      const undoCheck = await this.canUndo(eventId);
      if (!undoCheck.canUndo) {
        throw new Error(undoCheck.reason);
      }

      // יצירת undo event
      const undoEvent = await EventService.logSystemAction({
        userId,
        userEmail,
        userName,
        action: 'UNDO',
        entityType: originalEvent.entityType,
        entityId: originalEvent.entityId,
        entityName: originalEvent.entityName,
        metadata: {
          originalEventId: eventId,
          originalAction: originalEvent.action,
          undoReason: 'User requested undo'
        },
        description: `ביטול פעולה: ${originalEvent.description}`,
        severity: 'HIGH'
      });

      return undoEvent;
    } catch (error) {
      console.error('❌ Error creating undo event:', error);
      throw error;
    }
  }

  /**
   * קבלת רשימת פעולות שניתן לבטל
   * @param {String} entityType - סוג הישות
   * @param {String} entityId - מזהה הישות
   */
  static async getUndoableActions(entityType, entityId) {
    try {
      const events = await Event.find({
        entityType,
        entityId,
        action: { $in: ['UPDATE', 'DELETE'] },
        beforeData: { $exists: true, $ne: null }
      })
      .sort({ timestamp: -1 })
      .populate('userId', 'name email');

      const undoableActions = [];

      for (const event of events) {
        const undoCheck = await this.canUndo(event._id);
        if (undoCheck.canUndo) {
          undoableActions.push({
            id: event._id,
            action: event.action,
            description: event.description,
            timestamp: event.timestamp,
            user: {
              name: event.userName,
              email: event.userEmail
            },
            canUndo: true
          });
        }
      }

      return undoableActions;
    } catch (error) {
      console.error('❌ Error getting undoable actions:', error);
      throw error;
    }
  }

  /**
   * יצירת דוח audit
   * @param {Object} options - אפשרויות
   */
  static async generateAuditReport(options = {}) {
    try {
      const {
        startDate,
        endDate,
        entityType,
        userId,
        format = 'json'
      } = options;

      // קבלת נתונים
      const stats = await this.getAuditStats({ startDate, endDate, entityType, userId });
      const recentEvents = await EventService.searchEvents({
        startDate,
        endDate,
        entityType,
        userId,
        limit: 1000
      });

      const report = {
        generatedAt: new Date().toISOString(),
        period: {
          startDate: startDate || null,
          endDate: endDate || null
        },
        filters: {
          entityType: entityType || null,
          userId: userId || null
        },
        summary: {
          totalEvents: stats.totalEvents,
          uniqueUsers: stats.uniqueUsers,
          actions: stats.actions
        },
        recentEvents: recentEvents.slice(0, 100), // רק 100 אירועים אחרונים
        recommendations: this.generateRecommendations(stats)
      };

      return report;
    } catch (error) {
      console.error('❌ Error generating audit report:', error);
      throw error;
    }
  }

  /**
   * יצירת המלצות על בסיס נתוני audit
   * @param {Object} stats - סטטיסטיקות
   */
  static generateRecommendations(stats) {
    const recommendations = [];

    // בדיקת פעילות חשודה
    const highActivityUsers = stats.actions
      .filter(action => action.count > 100)
      .map(action => action.action);

    if (highActivityUsers.length > 0) {
      recommendations.push({
        type: 'warning',
        message: 'זוהתה פעילות גבוהה - מומלץ לבדוק את המשתמשים',
        details: highActivityUsers
      });
    }

    // בדיקת פעולות כושלות
    const failedActions = stats.actions
      .filter(action => action.count > 10)
      .map(action => action.action);

    if (failedActions.length > 0) {
      recommendations.push({
        type: 'info',
        message: 'זוהו פעולות כושלות - מומלץ לבדוק את הלוגים',
        details: failedActions
      });
    }

    return recommendations;
  }
}

module.exports = AuditService;