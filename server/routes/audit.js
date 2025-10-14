const express = require('express');
const router = express.Router();
const { AuditEvent, EventTypes } = require('../models/AuditEvent');
const auditService = require('../services/auditService');
const auth = require('../middleware/auth');

// Middleware to check admin permissions for audit access
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin privileges required.' 
    });
  }
  next();
};

/**
 * GET /api/audit/events
 * Get audit events with filtering and pagination
 */
router.get('/events', auth, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      eventType,
      eventCategory,
      resourceType,
      resourceId,
      success,
      severity,
      startDate,
      endDate,
      search
    } = req.query;

    const filters = {};
    
    // Apply filters
    if (userId) filters.userId = userId;
    if (eventType) filters.eventType = eventType;
    if (eventCategory) filters.eventCategory = eventCategory;
    if (resourceType) filters.resourceType = resourceType;
    if (resourceId) filters.resourceId = resourceId;
    if (success !== undefined) filters.success = success === 'true';
    if (severity) filters.severity = severity;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    // Handle search across multiple fields
    if (search) {
      filters.$or = [
        { description: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { resourceName: { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100) // Max 100 items per page
    };

    const result = await auditService.getAuditEvents(filters, options);

    res.json({
      success: true,
      data: result.events,
      pagination: result.pagination,
      filters: {
        userId,
        eventType,
        eventCategory,
        resourceType,
        resourceId,
        success,
        severity,
        startDate,
        endDate,
        search
      }
    });

  } catch (error) {
    console.error('Error fetching audit events:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit events',
      error: error.message
    });
  }
});

/**
 * GET /api/audit/events/:id
 * Get specific audit event by ID
 */
router.get('/events/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const event = await AuditEvent.findById(id)
      .populate('userId', 'name email role');
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Audit event not found'
      });
    }

    res.json({
      success: true,
      data: event
    });

  } catch (error) {
    console.error('Error fetching audit event:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit event',
      error: error.message
    });
  }
});

/**
 * GET /api/audit/statistics
 * Get audit statistics and analytics
 */
router.get('/statistics', auth, requireAdmin, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      period = '30d' // 7d, 30d, 90d, 1y
    } = req.query;

    const filters = {};
    
    // Set date range based on period if not explicitly provided
    if (!startDate && !endDate) {
      const now = new Date();
      const start = new Date();
      
      switch (period) {
        case '7d':
          start.setDate(now.getDate() - 7);
          break;
        case '30d':
          start.setDate(now.getDate() - 30);
          break;
        case '90d':
          start.setDate(now.getDate() - 90);
          break;
        case '1y':
          start.setFullYear(now.getFullYear() - 1);
          break;
        default:
          start.setDate(now.getDate() - 30);
      }
      
      filters.startDate = start;
      filters.endDate = now;
    } else {
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
    }

    const statistics = await auditService.getAuditStatistics(filters);

    // Additional statistics
    const [
      totalEvents,
      uniqueUsers,
      recentActivity,
      topResources
    ] = await Promise.all([
      // Total events in period
      AuditEvent.countDocuments({
        timestamp: {
          $gte: filters.startDate,
          $lte: filters.endDate
        }
      }),
      
      // Unique active users
      AuditEvent.distinct('userId', {
        timestamp: {
          $gte: filters.startDate,
          $lte: filters.endDate
        },
        userId: { $ne: null }
      }),
      
      // Recent activity (last 24 hours)
      AuditEvent.find({
        timestamp: {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      })
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('userId', 'name email'),
      
      // Top accessed resources
      AuditEvent.aggregate([
        {
          $match: {
            timestamp: {
              $gte: filters.startDate,
              $lte: filters.endDate
            },
            resourceType: { $ne: null },
            resourceId: { $ne: null }
          }
        },
        {
          $group: {
            _id: {
              resourceType: '$resourceType',
              resourceId: '$resourceId',
              resourceName: '$resourceName'
            },
            accessCount: { $sum: 1 },
            lastAccess: { $max: '$timestamp' }
          }
        },
        { $sort: { accessCount: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.json({
      success: true,
      data: {
        ...statistics,
        summary: {
          totalEvents,
          uniqueUsers: uniqueUsers.length,
          period: {
            startDate: filters.startDate,
            endDate: filters.endDate,
            days: Math.ceil((filters.endDate - filters.startDate) / (1000 * 60 * 60 * 24))
          }
        },
        recentActivity,
        topResources
      }
    });

  } catch (error) {
    console.error('Error fetching audit statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit statistics',
      error: error.message
    });
  }
});

/**
 * GET /api/audit/user/:userId/activity
 * Get activity for specific user
 */
router.get('/user/:userId/activity', auth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      limit = 50,
      eventType,
      eventCategory,
      startDate,
      endDate
    } = req.query;

    const options = {
      limit: Math.min(parseInt(limit), 100),
      eventType,
      eventCategory
    };

    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);

    const events = await AuditEvent.findByUser(userId, options);
    const summary = await AuditEvent.getActivitySummary(userId);

    res.json({
      success: true,
      data: {
        events,
        summary
      }
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
 * GET /api/audit/resource/:resourceType/:resourceId/history
 * Get history for specific resource
 */
router.get('/resource/:resourceType/:resourceId/history', auth, requireAdmin, async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    const { limit = 50, action } = req.query;

    const options = {
      limit: Math.min(parseInt(limit), 100),
      action
    };

    const events = await AuditEvent.findByResource(resourceType, resourceId, options);

    res.json({
      success: true,
      data: events
    });

  } catch (error) {
    console.error('Error fetching resource history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching resource history',
      error: error.message
    });
  }
});

/**
 * GET /api/audit/security/events
 * Get security-related events
 */
router.get('/security/events', auth, requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      severity,
      startDate,
      endDate
    } = req.query;

    const filters = {
      eventCategory: 'security'
    };

    if (severity) filters.severity = severity;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const options = {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100)
    };

    const result = await auditService.getAuditEvents(filters, options);

    // Get security summary
    const securitySummary = await AuditEvent.aggregate([
      {
        $match: {
          eventCategory: 'security',
          timestamp: {
            $gte: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            $lte: endDate ? new Date(endDate) : new Date()
          }
        }
      },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 },
          latestEvent: { $max: '$timestamp' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: result.events,
      pagination: result.pagination,
      summary: securitySummary
    });

  } catch (error) {
    console.error('Error fetching security events:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching security events',
      error: error.message
    });
  }
});

/**
 * GET /api/audit/export
 * Export audit events to CSV
 */
router.get('/export', auth, requireAdmin, async (req, res) => {
  try {
    const {
      format = 'csv',
      startDate,
      endDate,
      eventCategory,
      eventType,
      userId
    } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (eventCategory) filters.eventCategory = eventCategory;
    if (eventType) filters.eventType = eventType;
    if (userId) filters.userId = userId;

    // Get events without pagination for export
    const result = await auditService.getAuditEvents(filters, { limit: 10000 });
    const events = result.events;

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'Timestamp',
        'Event Type',
        'Category',
        'User Email',
        'User Name',
        'Action',
        'Description',
        'Resource Type',
        'Resource Name',
        'Success',
        'Severity',
        'IP Address',
        'User Agent'
      ].join(',');

      const csvRows = events.map(event => [
        event.timestamp.toISOString(),
        event.eventType,
        event.eventCategory,
        event.userEmail || '',
        event.userName || '',
        event.action,
        `"${event.description.replace(/"/g, '""')}"`, // Escape quotes
        event.resourceType || '',
        event.resourceName || '',
        event.success,
        event.severity,
        event.deviceInfo?.ip || '',
        `"${(event.deviceInfo?.userAgent || '').replace(/"/g, '""')}"`
      ].join(','));

      const csv = [csvHeaders, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-events-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit-events-${new Date().toISOString().split('T')[0]}.json"`);
      res.json({
        exportDate: new Date().toISOString(),
        filters,
        totalEvents: events.length,
        events
      });
    }

    // Log the export action
    auditService.logApiRequest({
      action: 'export',
      resourceType: 'audit_events',
      format,
      eventCount: events.length
    }, req, req.user);

  } catch (error) {
    console.error('Error exporting audit events:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting audit events',
      error: error.message
    });
  }
});

/**
 * GET /api/audit/event-types
 * Get available event types and categories
 */
router.get('/event-types', auth, requireAdmin, (req, res) => {
  try {
    const eventCategories = {
      authentication: ['user_login', 'user_logout', 'user_login_failed'],
      user_management: ['user_created', 'user_updated', 'user_deleted', 'user_role_changed'],
      contractor: ['contractor_created', 'contractor_updated', 'contractor_deleted', 'contractor_viewed'],
      project: ['project_created', 'project_updated', 'project_deleted', 'project_viewed', 'project_status_changed'],
      document: ['document_uploaded', 'document_downloaded', 'document_deleted', 'document_viewed'],
      risk_analysis: ['risk_analysis_created', 'risk_analysis_updated', 'risk_analysis_viewed'],
      safety: ['safety_report_created', 'safety_report_updated', 'safety_report_viewed'],
      system: ['system_error', 'api_request', 'data_export', 'data_import'],
      security: ['unauthorized_access', 'permission_denied', 'suspicious_activity']
    };

    res.json({
      success: true,
      data: {
        eventTypes: Object.values(EventTypes),
        eventCategories,
        severityLevels: ['low', 'medium', 'high', 'critical']
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
 * DELETE /api/audit/events/cleanup
 * Cleanup old audit events (admin only)
 */
router.delete('/events/cleanup', auth, requireAdmin, async (req, res) => {
  try {
    const { olderThanDays = 365 } = req.body;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThanDays));
    
    const result = await AuditEvent.deleteMany({
      timestamp: { $lt: cutoffDate }
    });
    
    // Log the cleanup action
    auditService.logApiRequest({
      action: 'cleanup',
      resourceType: 'audit_events',
      deletedCount: result.deletedCount,
      cutoffDate: cutoffDate.toISOString()
    }, req, req.user);
    
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} audit events older than ${olderThanDays} days`,
      deletedCount: result.deletedCount,
      cutoffDate
    });

  } catch (error) {
    console.error('Error cleaning up audit events:', error);
    res.status(500).json({
      success: false,
      message: 'Error cleaning up audit events',
      error: error.message
    });
  }
});

module.exports = router;