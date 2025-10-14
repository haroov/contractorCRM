const express = require('express');
const router = express.Router();
const AuditService = require('../services/AuditService');
const EventService = require('../services/EventService');

// Middleware לבדיקת הרשאות admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'נדרשת הרשאת מנהל לצפייה בנתוני audit' 
    });
  }
  next();
};

/**
 * GET /api/audit/trail/:entityType/:entityId
 * קבלת audit trail של ישות
 */
router.get('/trail/:entityType/:entityId', requireAdmin, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const {
      limit = 100,
      skip = 0,
      includeReads = false,
      startDate,
      endDate
    } = req.query;

    const options = {
      limit: parseInt(limit),
      skip: parseInt(skip),
      includeReads: includeReads === 'true',
      startDate,
      endDate
    };

    const auditTrail = await AuditService.getAuditTrail(entityType, entityId, options);
    
    res.json({
      success: true,
      data: auditTrail,
      pagination: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        total: auditTrail.length
      }
    });
  } catch (error) {
    console.error('❌ Error getting audit trail:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בקבלת audit trail',
      error: error.message
    });
  }
});

/**
 * GET /api/audit/field-history/:entityType/:entityId/:fieldName
 * קבלת היסטוריית שינויים של שדה ספציפי
 */
router.get('/field-history/:entityType/:entityId/:fieldName', requireAdmin, async (req, res) => {
  try {
    const { entityType, entityId, fieldName } = req.params;
    
    const fieldHistory = await AuditService.getFieldHistory(entityType, entityId, fieldName);
    
    res.json({
      success: true,
      data: fieldHistory
    });
  } catch (error) {
    console.error('❌ Error getting field history:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בקבלת היסטוריית השדה',
      error: error.message
    });
  }
});

/**
 * GET /api/audit/stats
 * קבלת סטטיסטיקות audit
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      entityType,
      userId
    } = req.query;

    const options = {
      startDate,
      endDate,
      entityType,
      userId
    };

    const stats = await AuditService.getAuditStats(options);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error getting audit stats:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בקבלת סטטיסטיקות audit',
      error: error.message
    });
  }
});

/**
 * GET /api/audit/undoable/:entityType/:entityId
 * קבלת רשימת פעולות שניתן לבטל
 */
router.get('/undoable/:entityType/:entityId', requireAdmin, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    
    const undoableActions = await AuditService.getUndoableActions(entityType, entityId);
    
    res.json({
      success: true,
      data: undoableActions
    });
  } catch (error) {
    console.error('❌ Error getting undoable actions:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בקבלת פעולות שניתן לבטל',
      error: error.message
    });
  }
});

/**
 * POST /api/audit/undo/:eventId
 * יצירת undo event
 */
router.post('/undo/:eventId', requireAdmin, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { reason } = req.body;
    
    const user = req.user;
    
    const undoEvent = await AuditService.createUndoEvent(
      eventId,
      user._id || user.id,
      user.email,
      user.name
    );
    
    res.json({
      success: true,
      message: 'נוצר undo event בהצלחה',
      data: undoEvent
    });
  } catch (error) {
    console.error('❌ Error creating undo event:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה ביצירת undo event',
      error: error.message
    });
  }
});

/**
 * GET /api/audit/can-undo/:eventId
 * בדיקה אם ניתן לבצע undo לפעולה
 */
router.get('/can-undo/:eventId', requireAdmin, async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const undoCheck = await AuditService.canUndo(eventId);
    
    res.json({
      success: true,
      data: undoCheck
    });
  } catch (error) {
    console.error('❌ Error checking undo capability:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בבדיקת יכולת undo',
      error: error.message
    });
  }
});

/**
 * GET /api/audit/report
 * יצירת דוח audit
 */
router.get('/report', requireAdmin, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      entityType,
      userId,
      format = 'json'
    } = req.query;

    const options = {
      startDate,
      endDate,
      entityType,
      userId,
      format
    };

    const report = await AuditService.generateAuditReport(options);
    
    if (format === 'csv') {
      // ייצוא ל-CSV
      const csv = convertAuditReportToCSV(report);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-report.csv"');
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: report
      });
    }
  } catch (error) {
    console.error('❌ Error generating audit report:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה ביצירת דוח audit',
      error: error.message
    });
  }
});

/**
 * GET /api/audit/export
 * ייצוא נתוני audit
 */
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      entityType,
      userId,
      format = 'json'
    } = req.query;

    const searchQuery = {
      startDate,
      endDate,
      entityType,
      userId,
      limit: 10000
    };

    const events = await EventService.searchEvents(searchQuery);
    
    if (format === 'csv') {
      const csv = convertEventsToCSV(events);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-export.csv"');
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="audit-export.json"');
      res.json({
        success: true,
        data: events,
        exportedAt: new Date().toISOString(),
        total: events.length
      });
    }
  } catch (error) {
    console.error('❌ Error exporting audit data:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בייצוא נתוני audit',
      error: error.message
    });
  }
});

/**
 * Helper function להמרת דוח audit ל-CSV
 */
function convertAuditReportToCSV(report) {
  const headers = [
    'Generated At',
    'Period Start',
    'Period End',
    'Total Events',
    'Unique Users',
    'Action',
    'Entity Type',
    'Count',
    'Last Activity'
  ];
  
  const rows = report.summary.actions.map(action => [
    report.generatedAt,
    report.period.startDate || '',
    report.period.endDate || '',
    report.summary.totalEvents,
    report.summary.uniqueUsers,
    action.action,
    action.entityType,
    action.count,
    action.lastActivity
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
  
  return csvContent;
}

/**
 * Helper function להמרת אירועים ל-CSV
 */
function convertEventsToCSV(events) {
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
    'Description',
    'IP Address',
    'User Agent'
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
    event.description || '',
    event.ipAddress || '',
    event.userAgent || ''
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
  
  return csvContent;
}

module.exports = router;