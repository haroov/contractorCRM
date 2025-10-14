const express = require('express');
const router = express.Router();
const eventLoggingService = require('../services/eventLoggingService');
const { requireAuth, requireAdmin } = require('../middleware/auth');

/**
 * GET /api/events
 * Get events with filtering and pagination
 * Requires admin access
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      sortBy = 'timestamp',
      sortOrder = 'desc',
      eventType,
      category,
      userId,
      userEmail,
      resourceType,
      resourceId,
      status,
      severity,
      ipAddress,
      startDate,
      endDate
    } = req.query;

    // Build filters
    const filters = {};
    if (eventType) filters.eventType = eventType;
    if (category) filters.category = category;
    if (userId) filters.userId = userId;
    if (userEmail) filters.userEmail = userEmail;
    if (resourceType) filters.resourceType = resourceType;
    if (resourceId) filters.resourceId = resourceId;
    if (status) filters.status = status;
    if (severity) filters.severity = severity;
    if (ipAddress) filters.ipAddress = ipAddress;

    // Build options
    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 1000), // Max 1000 events per request
      sortBy,
      sortOrder,
      startDate,
      endDate
    };

    const result = await eventLoggingService.getEvents(filters, options);
    
    res.json({
      success: true,
      data: result.events,
      pagination: result.pagination,
      filters: filters
    });
  } catch (error) {
    console.error('❌ Failed to get events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve events',
      message: error.message
    });
  }
});

/**
 * GET /api/events/stats
 * Get event statistics
 * Requires admin access
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const stats = await eventLoggingService.getEventStats(filters);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Failed to get event stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve event statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/events/categories
 * Get available event categories and types
 * Requires admin access
 */
router.get('/categories', requireAdmin, async (req, res) => {
  try {
    const Event = require('../models/Event');
    
    // Get unique categories and event types
    const categories = await Event.distinct('category');
    const eventTypes = await Event.distinct('eventType');
    const statuses = await Event.distinct('status');
    const severities = await Event.distinct('severity');
    const resourceTypes = await Event.distinct('resourceType');

    res.json({
      success: true,
      data: {
        categories: categories.filter(Boolean),
        eventTypes: eventTypes.filter(Boolean),
        statuses: statuses.filter(Boolean),
        severities: severities.filter(Boolean),
        resourceTypes: resourceTypes.filter(Boolean)
      }
    });
  } catch (error) {
    console.error('❌ Failed to get event categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve event categories',
      message: error.message
    });
  }
});

/**
 * GET /api/events/user/:userId
 * Get events for a specific user
 * Requires auth (users can see their own events, admins can see any user's events)
 */
router.get('/user/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user || req.session?.user;
    
    // Check if user can access these events
    if (currentUser.role !== 'admin' && currentUser._id?.toString() !== userId && currentUser.id?.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const {
      page = 1,
      limit = 50,
      sortBy = 'timestamp',
      sortOrder = 'desc',
      eventType,
      category,
      startDate,
      endDate
    } = req.query;

    // Build filters
    const filters = { userId };
    if (eventType) filters.eventType = eventType;
    if (category) filters.category = category;

    // Build options
    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 1000),
      sortBy,
      sortOrder,
      startDate,
      endDate
    };

    const result = await eventLoggingService.getEvents(filters, options);
    
    res.json({
      success: true,
      data: result.events,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('❌ Failed to get user events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user events',
      message: error.message
    });
  }
});

/**
 * GET /api/events/resource/:resourceType/:resourceId
 * Get events for a specific resource
 * Requires admin access
 */
router.get('/resource/:resourceType/:resourceId', requireAdmin, async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    
    const {
      page = 1,
      limit = 50,
      sortBy = 'timestamp',
      sortOrder = 'desc',
      eventType,
      category,
      startDate,
      endDate
    } = req.query;

    // Build filters
    const filters = { resourceType, resourceId };
    if (eventType) filters.eventType = eventType;
    if (category) filters.category = category;

    // Build options
    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 1000),
      sortBy,
      sortOrder,
      startDate,
      endDate
    };

    const result = await eventLoggingService.getEvents(filters, options);
    
    res.json({
      success: true,
      data: result.events,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('❌ Failed to get resource events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve resource events',
      message: error.message
    });
  }
});

/**
 * POST /api/events/manual
 * Manually log an event (for testing or special cases)
 * Requires admin access
 */
router.post('/manual', requireAdmin, async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      userId: req.user?._id || req.session?.user?._id,
      userEmail: req.user?.email || req.session?.user?.email,
      userRole: req.user?.role || req.session?.user?.role,
      sessionId: req.sessionID || req.session?.id,
      ipAddress: eventLoggingService.getClientIP(req),
      userAgent: req.get('User-Agent'),
      metadata: {
        ...req.body.metadata,
        manuallyCreated: true,
        createdBy: req.user?.email || req.session?.user?.email
      }
    };

    const event = await eventLoggingService.logEvent(eventData);
    
    res.json({
      success: true,
      data: event,
      message: 'Event logged successfully'
    });
  } catch (error) {
    console.error('❌ Failed to log manual event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log event',
      message: error.message
    });
  }
});

/**
 * GET /api/events/export
 * Export events to CSV
 * Requires admin access
 */
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const {
      eventType,
      category,
      userId,
      userEmail,
      resourceType,
      resourceId,
      status,
      severity,
      startDate,
      endDate,
      format = 'csv'
    } = req.query;

    // Build filters
    const filters = {};
    if (eventType) filters.eventType = eventType;
    if (category) filters.category = category;
    if (userId) filters.userId = userId;
    if (userEmail) filters.userEmail = userEmail;
    if (resourceType) filters.resourceType = resourceType;
    if (resourceId) filters.resourceId = resourceId;
    if (status) filters.status = status;
    if (severity) filters.severity = severity;

    // Get all matching events (no pagination for export)
    const options = {
      page: 1,
      limit: 10000, // Large limit for export
      sortBy: 'timestamp',
      sortOrder: 'desc',
      startDate,
      endDate
    };

    const result = await eventLoggingService.getEvents(filters, options);
    
    if (format === 'csv') {
      // Convert to CSV
      const csv = convertEventsToCSV(result.events);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="events_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } else {
      // Return JSON
      res.json({
        success: true,
        data: result.events,
        count: result.events.length
      });
    }
  } catch (error) {
    console.error('❌ Failed to export events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export events',
      message: error.message
    });
  }
});

/**
 * Helper function to convert events to CSV
 */
function convertEventsToCSV(events) {
  if (events.length === 0) {
    return 'No events found';
  }

  const headers = [
    'Timestamp',
    'Event Type',
    'Category',
    'Action',
    'Description',
    'User Email',
    'User Role',
    'Resource Type',
    'Resource ID',
    'Resource Name',
    'Status',
    'Severity',
    'IP Address',
    'User Agent',
    'Request Method',
    'Request URL',
    'Status Code',
    'Response Time'
  ];

  const csvRows = [headers.join(',')];

  events.forEach(event => {
    const row = [
      event.timestamp,
      event.eventType,
      event.category,
      event.action,
      `"${event.description?.replace(/"/g, '""') || ''}"`,
      event.userEmail || '',
      event.userRole || '',
      event.resourceType || '',
      event.resourceId || '',
      `"${event.resourceName?.replace(/"/g, '""') || ''}"`,
      event.status,
      event.severity,
      event.ipAddress || '',
      `"${event.userAgent?.replace(/"/g, '""') || ''}"`,
      event.requestMethod || '',
      `"${event.requestUrl?.replace(/"/g, '""') || ''}"`,
      event.statusCode || '',
      event.responseTime || ''
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

module.exports = router;