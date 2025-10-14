const express = require('express');
const router = express.Router();
const EventService = require('../services/EventService');
const Event = require('../models/Event');

// Middleware לבדיקת הרשאות admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'נדרשת הרשאת מנהל לצפייה באירועים' 
    });
  }
  next();
};

// Middleware לבדיקת הרשאות (admin או המשתמש עצמו)
const requireAdminOrSelf = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'נדרשת התחברות' 
    });
  }
  
  const requestedUserId = req.params.userId;
  if (req.user.role !== 'admin' && req.user._id.toString() !== requestedUserId) {
    return res.status(403).json({ 
      success: false, 
      message: 'אין הרשאה לצפייה באירועים של משתמש אחר' 
    });
  }
  
  next();
};

/**
 * GET /api/events
 * קבלת רשימת אירועים (admin only)
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const {
      limit = 50,
      skip = 0,
      action,
      entityType,
      entityId,
      userId,
      startDate,
      endDate,
      severity,
      success,
      search
    } = req.query;

    const searchQuery = {
      limit: parseInt(limit),
      skip: parseInt(skip),
      action,
      entityType,
      entityId,
      userId,
      startDate,
      endDate,
      severity,
      success: success !== undefined ? success === 'true' : undefined
    };

    const events = await EventService.searchEvents(searchQuery);
    
    res.json({
      success: true,
      data: events,
      pagination: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        total: events.length
      }
    });
  } catch (error) {
    console.error('❌ Error getting events:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בקבלת אירועים',
      error: error.message
    });
  }
});

/**
 * GET /api/events/stats
 * קבלת סטטיסטיקות אירועים (admin only)
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      userId,
      entityType
    } = req.query;

    const options = {
      startDate,
      endDate,
      userId,
      entityType
    };

    const stats = await EventService.getEventStats(options);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error getting event stats:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בקבלת סטטיסטיקות אירועים',
      error: error.message
    });
  }
});

/**
 * GET /api/events/user/:userId
 * קבלת אירועים של משתמש ספציפי
 */
router.get('/user/:userId', requireAdminOrSelf, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      limit = 50,
      skip = 0,
      action,
      entityType,
      startDate,
      endDate
    } = req.query;

    const options = {
      limit: parseInt(limit),
      skip: parseInt(skip),
      action,
      entityType,
      startDate,
      endDate
    };

    const events = await EventService.getEventsByUser(userId, options);
    
    res.json({
      success: true,
      data: events,
      pagination: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        total: events.length
      }
    });
  } catch (error) {
    console.error('❌ Error getting user events:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בקבלת אירועי המשתמש',
      error: error.message
    });
  }
});

/**
 * GET /api/events/entity/:entityType/:entityId
 * קבלת אירועים של ישות ספציפית (admin only)
 */
router.get('/entity/:entityType/:entityId', requireAdmin, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const {
      limit = 50,
      skip = 0,
      action,
      startDate,
      endDate
    } = req.query;

    const options = {
      limit: parseInt(limit),
      skip: parseInt(skip),
      action,
      startDate,
      endDate
    };

    const events = await EventService.getEventsByEntity(entityType, entityId, options);
    
    res.json({
      success: true,
      data: events,
      pagination: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        total: events.length
      }
    });
  } catch (error) {
    console.error('❌ Error getting entity events:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בקבלת אירועי הישות',
      error: error.message
    });
  }
});

/**
 * GET /api/events/recent
 * קבלת אירועים אחרונים (admin only)
 */
router.get('/recent', requireAdmin, async (req, res) => {
  try {
    const { limit = 100, skip = 0 } = req.query;

    const events = await Event.getRecentEvents(
      parseInt(limit),
      parseInt(skip)
    );
    
    res.json({
      success: true,
      data: events,
      pagination: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        total: events.length
      }
    });
  } catch (error) {
    console.error('❌ Error getting recent events:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בקבלת אירועים אחרונים',
      error: error.message
    });
  }
});

/**
 * GET /api/events/audit/:entityType/:entityId
 * קבלת היסטוריית שינויים של ישות (audit trail)
 */
router.get('/audit/:entityType/:entityId', requireAdmin, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { limit = 100, skip = 0 } = req.query;

    // קבלת כל הפעולות על הישות
    const events = await Event.find({
      entityType,
      entityId,
      action: { $in: ['CREATE', 'UPDATE', 'DELETE'] }
    })
    .sort({ timestamp: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(skip))
    .populate('userId', 'name email');

    // יצירת audit trail
    const auditTrail = events.map(event => ({
      id: event._id,
      action: event.action,
      user: {
        name: event.userName,
        email: event.userEmail
      },
      timestamp: event.timestamp,
      beforeData: event.beforeData,
      afterData: event.afterData,
      description: event.description,
      metadata: event.metadata
    }));
    
    res.json({
      success: true,
      data: auditTrail,
      pagination: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        total: events.length
      }
    });
  } catch (error) {
    console.error('❌ Error getting audit trail:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בקבלת היסטוריית השינויים',
      error: error.message
    });
  }
});

/**
 * POST /api/events/cleanup
 * ניקוי אירועים ישנים (admin only)
 */
router.post('/cleanup', requireAdmin, async (req, res) => {
  try {
    const { daysOld = 365 } = req.body;
    
    const deletedCount = await EventService.cleanupOldEvents(daysOld);
    
    res.json({
      success: true,
      message: `נוקו ${deletedCount} אירועים ישנים`,
      deletedCount
    });
  } catch (error) {
    console.error('❌ Error cleaning up events:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בניקוי אירועים',
      error: error.message
    });
  }
});

/**
 * GET /api/events/export
 * ייצוא אירועים לקובץ (admin only)
 */
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      entityType,
      action,
      format = 'json'
    } = req.query;

    const searchQuery = {
      startDate,
      endDate,
      entityType,
      action,
      limit: 10000 // הגבלה לייצוא
    };

    const events = await EventService.searchEvents(searchQuery);
    
    if (format === 'csv') {
      // ייצוא ל-CSV
      const csv = convertToCSV(events);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="events.csv"');
      res.send(csv);
    } else {
      // ייצוא ל-JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="events.json"');
      res.json({
        success: true,
        data: events,
        exportedAt: new Date().toISOString(),
        total: events.length
      });
    }
  } catch (error) {
    console.error('❌ Error exporting events:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בייצוא אירועים',
      error: error.message
    });
  }
});

/**
 * Helper function להמרה ל-CSV
 */
function convertToCSV(events) {
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