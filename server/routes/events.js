const express = require('express');
const router = express.Router();
const EventService = require('../services/EventService');
const Event = require('../models/Event');
const { requireAuth, requireAdmin } = require('../middleware/auth');

/**
 * GET /api/events
 * Get events with filtering and pagination
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const {
      eventType,
      resourceType,
      userId,
      startDate,
      endDate,
      status,
      severity,
      search,
      page = 1,
      limit = 50,
      sortBy = 'timestamp',
      sortOrder = -1
    } = req.query;

    // Convert string values to appropriate types
    const filters = {
      eventType,
      resourceType,
      userId,
      startDate,
      endDate,
      status,
      severity,
      search
    };

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder: parseInt(sortOrder)
    };

    const result = await EventService.getEvents(filters, options);

    res.json({
      success: true,
      data: result.events,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching events',
      error: error.message
    });
  }
});

/**
 * GET /api/events/stats
 * Get system statistics
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const stats = await EventService.getSystemStats(parseInt(days));

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching event stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching event statistics',
      error: error.message
    });
  }
});

/**
 * GET /api/events/user/:userId/activity
 * Get user activity summary
 */
router.get('/user/:userId/activity', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    // Check if user can view this activity (admin or own activity)
    if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const activity = await EventService.getUserActivitySummary(userId, parseInt(days));

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user activity',
      error: error.message
    });
  }
});

/**
 * GET /api/events/resource/:resourceType/:resourceId
 * Get events for a specific resource
 */
router.get('/resource/:resourceType/:resourceId', requireAuth, async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    const { limit = 50 } = req.query;

    const events = await Event.getResourceEvents(
      resourceType.toUpperCase(),
      resourceId,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Error fetching resource events:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching resource events',
      error: error.message
    });
  }
});

/**
 * GET /api/events/system
 * Get system events (admin only)
 */
router.get('/system', requireAdmin, async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const events = await Event.getSystemEvents(parseInt(limit));

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Error fetching system events:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system events',
      error: error.message
    });
  }
});

/**
 * GET /api/events/export
 * Export events to CSV (admin only)
 */
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const {
      eventType,
      resourceType,
      startDate,
      endDate,
      format = 'csv'
    } = req.query;

    const filters = {
      eventType,
      resourceType,
      startDate,
      endDate
    };

    const options = {
      page: 1,
      limit: 10000 // Large limit for export
    };

    const result = await EventService.getEvents(filters, options);

    if (format === 'csv') {
      // Convert to CSV
      const csvHeader = 'Event ID,Timestamp,Event Type,Resource Type,Resource ID,User,Description,Status,Severity,IP Address\n';
      const csvRows = result.events.map(event => {
        const user = event.userId ? `${event.userName || event.userEmail}` : 'System';
        return [
          event.eventId,
          event.timestamp.toISOString(),
          event.eventType,
          event.resourceType,
          event.resourceId || '',
          user,
          `"${event.description.replace(/"/g, '""')}"`,
          event.status,
          event.severity,
          event.ipAddress || ''
        ].join(',');
      }).join('\n');

      const csv = csvHeader + csvRows;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=events.csv');
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: result.events
      });
    }
  } catch (error) {
    console.error('Error exporting events:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting events',
      error: error.message
    });
  }
});

/**
 * POST /api/events/archive
 * Archive old events (admin only)
 */
router.post('/archive', requireAdmin, async (req, res) => {
  try {
    const { daysOld = 365 } = req.body;
    const result = await EventService.archiveOldEvents(daysOld);

    res.json({
      success: true,
      message: `Archived ${result.modifiedCount} events older than ${daysOld} days`,
      data: result
    });
  } catch (error) {
    console.error('Error archiving events:', error);
    res.status(500).json({
      success: false,
      message: 'Error archiving events',
      error: error.message
    });
  }
});

/**
 * GET /api/events/types
 * Get available event types
 */
router.get('/types', requireAuth, async (req, res) => {
  try {
    const eventTypes = [
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
      'CREATE', 'UPDATE', 'DELETE', 'VIEW',
      'EXPORT', 'IMPORT', 'DOWNLOAD', 'UPLOAD',
      'SEARCH', 'FILTER', 'SORT',
      'PERMISSION_GRANTED', 'PERMISSION_DENIED',
      'PASSWORD_CHANGE', 'PROFILE_UPDATE',
      'SYSTEM_ERROR', 'SECURITY_ALERT',
      'BULK_OPERATION', 'BACKUP', 'RESTORE'
    ];

    const resourceTypes = [
      'USER', 'CONTRACTOR', 'PROJECT', 'FILE', 'SYSTEM', 'SESSION', 'AUTH'
    ];

    const statuses = ['SUCCESS', 'FAILED', 'PENDING', 'CANCELLED'];
    const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    res.json({
      success: true,
      data: {
        eventTypes,
        resourceTypes,
        statuses,
        severities
      }
    });
  } catch (error) {
    console.error('Error fetching event types:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching event types',
      error: error.message
    });
  }
});

/**
 * GET /api/events/dashboard
 * Get dashboard data for events
 */
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get various statistics
    const [
      totalEvents,
      userActivity,
      systemStats,
      recentEvents
    ] = await Promise.all([
      Event.countDocuments({ timestamp: { $gte: startDate } }),
      Event.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Event.aggregate([
        { $match: { timestamp: { $gte: startDate } } },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Event.find({ timestamp: { $gte: startDate } })
        .populate('userId', 'name email')
        .sort({ timestamp: -1 })
        .limit(20)
    ]);

    res.json({
      success: true,
      data: {
        totalEvents,
        userActivity,
        systemStats,
        recentEvents
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
});

module.exports = router;