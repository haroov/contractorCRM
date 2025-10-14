/**
 * דוגמה לשימוש בתשתית Event Logging
 * 
 * קובץ זה מדגים כיצד להשתמש בתשתית Event Logging
 * לניהול אירועים במערכת
 */

const EventService = require('../services/EventService');
const AuditService = require('../services/AuditService');
const Event = require('../models/Event');

class EventLoggingExample {
  /**
   * דוגמה לרישום פעולת יצירת קבלן
   */
  static async logContractorCreation(contractorData, user) {
    try {
      const event = await EventService.logCrudAction({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        action: 'CREATE',
        entityType: 'CONTRACTOR',
        entityId: contractorData._id,
        entityName: contractorData.name,
        beforeData: null,
        afterData: contractorData,
        metadata: {
          city: contractorData.city,
          sector: contractorData.sector,
          companyType: contractorData.companyType
        },
        description: `נוצר קבלן חדש: ${contractorData.name}`
      });

      console.log('✅ Contractor creation logged:', event._id);
      return event;
    } catch (error) {
      console.error('❌ Error logging contractor creation:', error);
      throw error;
    }
  }

  /**
   * דוגמה לרישום פעולת עדכון קבלן
   */
  static async logContractorUpdate(contractorId, oldData, newData, user) {
    try {
      const event = await EventService.logCrudAction({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        action: 'UPDATE',
        entityType: 'CONTRACTOR',
        entityId: contractorId,
        entityName: newData.name,
        beforeData: oldData,
        afterData: newData,
        metadata: {
          changedFields: this.getChangedFields(oldData, newData),
          city: newData.city,
          sector: newData.sector
        },
        description: `עודכן קבלן: ${newData.name}`
      });

      console.log('✅ Contractor update logged:', event._id);
      return event;
    } catch (error) {
      console.error('❌ Error logging contractor update:', error);
      throw error;
    }
  }

  /**
   * דוגמה לרישום פעולת מחיקת קבלן
   */
  static async logContractorDeletion(contractorData, user) {
    try {
      const event = await EventService.logCrudAction({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        action: 'DELETE',
        entityType: 'CONTRACTOR',
        entityId: contractorData._id,
        entityName: contractorData.name,
        beforeData: contractorData,
        afterData: null,
        metadata: {
          city: contractorData.city,
          sector: contractorData.sector,
          reason: 'User requested deletion'
        },
        description: `נמחק קבלן: ${contractorData.name}`
      });

      console.log('✅ Contractor deletion logged:', event._id);
      return event;
    } catch (error) {
      console.error('❌ Error logging contractor deletion:', error);
      throw error;
    }
  }

  /**
   * דוגמה לרישום פעולת התחברות
   */
  static async logUserLogin(user, ipAddress, userAgent) {
    try {
      const event = await EventService.logAuthAction({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        action: 'LOGIN',
        success: true,
        ipAddress: ipAddress,
        userAgent: userAgent,
        metadata: {
          loginMethod: 'password', // או 'google', 'contact'
          role: user.role
        }
      });

      console.log('✅ User login logged:', event._id);
      return event;
    } catch (error) {
      console.error('❌ Error logging user login:', error);
      throw error;
    }
  }

  /**
   * דוגמה לרישום פעולת העלאת קובץ
   */
  static async logFileUpload(fileData, user) {
    try {
      const event = await EventService.logSystemAction({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        action: 'UPLOAD',
        entityType: 'FILE',
        entityId: fileData._id,
        entityName: fileData.originalname,
        metadata: {
          filename: fileData.filename,
          originalName: fileData.originalname,
          size: fileData.size,
          mimetype: fileData.mimetype,
          uploadPath: fileData.path
        },
        description: `הועלה קובץ: ${fileData.originalname}`
      });

      console.log('✅ File upload logged:', event._id);
      return event;
    } catch (error) {
      console.error('❌ Error logging file upload:', error);
      throw error;
    }
  }

  /**
   * דוגמה לקבלת audit trail של קבלן
   */
  static async getContractorAuditTrail(contractorId) {
    try {
      const auditTrail = await AuditService.getAuditTrail('CONTRACTOR', contractorId, {
        limit: 50,
        includeReads: false
      });

      console.log(`📋 Audit trail for contractor ${contractorId}:`);
      auditTrail.forEach(event => {
        console.log(`  ${event.timestamp.toISOString()} - ${event.action} by ${event.user.name} (${event.user.email})`);
        if (event.description) {
          console.log(`    ${event.description}`);
        }
      });

      return auditTrail;
    } catch (error) {
      console.error('❌ Error getting audit trail:', error);
      throw error;
    }
  }

  /**
   * דוגמה לקבלת היסטוריית שדה ספציפי
   */
  static async getFieldHistory(contractorId, fieldName) {
    try {
      const fieldHistory = await AuditService.getFieldHistory('CONTRACTOR', contractorId, fieldName);

      console.log(`📋 Field history for ${fieldName}:`);
      fieldHistory.forEach(change => {
        console.log(`  ${change.timestamp.toISOString()} - ${change.user.name}:`);
        console.log(`    From: ${change.oldValue}`);
        console.log(`    To: ${change.newValue}`);
      });

      return fieldHistory;
    } catch (error) {
      console.error('❌ Error getting field history:', error);
      throw error;
    }
  }

  /**
   * דוגמה לבדיקת יכולת undo
   */
  static async checkUndoCapability(eventId) {
    try {
      const undoCheck = await AuditService.canUndo(eventId);

      console.log(`🔍 Undo check for event ${eventId}:`);
      console.log(`  Can undo: ${undoCheck.canUndo}`);
      console.log(`  Reason: ${undoCheck.reason}`);

      return undoCheck;
    } catch (error) {
      console.error('❌ Error checking undo capability:', error);
      throw error;
    }
  }

  /**
   * דוגמה ליצירת undo event
   */
  static async createUndoEvent(eventId, user) {
    try {
      const undoEvent = await AuditService.createUndoEvent(
        eventId,
        user._id,
        user.email,
        user.name
      );

      console.log('✅ Undo event created:', undoEvent._id);
      return undoEvent;
    } catch (error) {
      console.error('❌ Error creating undo event:', error);
      throw error;
    }
  }

  /**
   * דוגמה לקבלת סטטיסטיקות אירועים
   */
  static async getEventStatistics(startDate, endDate) {
    try {
      const stats = await EventService.getEventStats({
        startDate: startDate,
        endDate: endDate
      });

      console.log('📊 Event Statistics:');
      console.log(`  Total events: ${stats.totalEvents}`);
      console.log(`  Successful events: ${stats.successfulEvents}`);
      console.log(`  Failed events: ${stats.failedEvents}`);
      console.log(`  Success rate: ${stats.successRate.toFixed(2)}%`);
      console.log(`  Unique actions: ${stats.uniqueActions.join(', ')}`);
      console.log(`  Unique entity types: ${stats.uniqueEntityTypes.join(', ')}`);

      return stats;
    } catch (error) {
      console.error('❌ Error getting event statistics:', error);
      throw error;
    }
  }

  /**
   * דוגמה לחיפוש אירועים
   */
  static async searchEvents(searchQuery) {
    try {
      const events = await EventService.searchEvents(searchQuery);

      console.log(`🔍 Search results (${events.length} events):`);
      events.forEach(event => {
        console.log(`  ${event.timestamp.toISOString()} - ${event.action} ${event.entityType} by ${event.userName}`);
        if (event.description) {
          console.log(`    ${event.description}`);
        }
      });

      return events;
    } catch (error) {
      console.error('❌ Error searching events:', error);
      throw error;
    }
  }

  /**
   * דוגמה לייצוא אירועים
   */
  static async exportEvents(format = 'json') {
    try {
      const events = await EventService.searchEvents({
        limit: 1000,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 ימים אחרונים
      });

      if (format === 'csv') {
        const csv = this.convertToCSV(events);
        console.log('📄 CSV Export:');
        console.log(csv);
        return csv;
      } else {
        console.log('📄 JSON Export:');
        console.log(JSON.stringify(events, null, 2));
        return events;
      }
    } catch (error) {
      console.error('❌ Error exporting events:', error);
      throw error;
    }
  }

  /**
   * Helper function לזיהוי שדות שהשתנו
   */
  static getChangedFields(oldData, newData) {
    const changedFields = [];
    
    for (const key in newData) {
      if (oldData[key] !== newData[key]) {
        changedFields.push(key);
      }
    }
    
    return changedFields;
  }

  /**
   * Helper function להמרה ל-CSV
   */
  static convertToCSV(events) {
    if (!events.length) return '';
    
    const headers = [
      'ID',
      'User Email',
      'User Name',
      'Action',
      'Entity Type',
      'Entity ID',
      'Entity Name',
      'Timestamp',
      'Success',
      'Description'
    ];
    
    const rows = events.map(event => [
      event._id,
      event.userEmail,
      event.userName,
      event.action,
      event.entityType,
      event.entityId || '',
      event.entityName || '',
      event.timestamp.toISOString(),
      event.success,
      event.description || ''
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    return csvContent;
  }
}

module.exports = EventLoggingExample;