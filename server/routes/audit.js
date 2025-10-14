const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const auditService = require('../services/auditService');
const AuditLog = require('../models/AuditLog');
const router = express.Router();

// Get audit logs with filtering and pagination
router.get('/logs', requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      eventType,
      action,
      userId,
      userEmail,
      resourceType,
      resourceId,
      startDate,
      endDate,
      search,
      success
    } = req.query;

    const filters = {};
    if (eventType) filters.eventType = eventType;
    if (action) filters.action = action;
    if (userId) filters.userId = userId;
    if (userEmail) filters.userEmail = userEmail;
    if (resourceType) filters.resourceType = resourceType;
    if (resourceId) filters.resourceId = resourceId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (search) filters.search = search;
    if (success !== undefined) filters.success = success === 'true';

    const options = {
      limit: Math.min(parseInt(limit), 200), // Max 200 records per request
      skip: (parseInt(page) - 1) * parseInt(limit)
    };

    const logs = await auditService.searchLogs(filters, options);
    
    // Get total count for pagination
    const totalQuery = { ...filters };
    delete totalQuery.search; // Remove search for count query
    const total = await AuditLog.countDocuments(totalQuery);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message
    });
  }
});

// Get user activity history
router.get('/user/:userId/activity', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      page = 1,
      limit = 50,
      eventType,
      action,
      startDate,
      endDate
    } = req.query;

    // Check if user can access this data (admin or own data)
    const currentUser = req.user || req.session?.user;
    if (currentUser.role !== 'admin' && currentUser.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const options = {
      limit: Math.min(parseInt(limit), 100),
      skip: (parseInt(page) - 1) * parseInt(limit),
      eventType,
      action,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    };

    const activity = await auditService.getUserActivity(userId, options);
    
    res.json({
      success: true,
      data: activity
    });

  } catch (error) {
    console.error('❌ Error fetching user activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user activity',
      error: error.message
    });
  }
});

// Get resource history
router.get('/resource/:resourceType/:resourceId/history', requireAuth, async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    const { limit = 50, action } = req.query;

    const options = {
      limit: Math.min(parseInt(limit), 100),
      action
    };

    const history = await auditService.getResourceHistory(resourceType, resourceId, options);
    
    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('❌ Error fetching resource history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resource history',
      error: error.message
    });
  }
});

// Get audit analytics
router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const options = {};
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);

    // Get basic analytics
    const analytics = await auditService.getAnalytics(options);

    // Get activity over time
    const timeGrouping = getTimeGrouping(groupBy);
    const activityOverTime = await AuditLog.aggregate([
      {
        $match: {
          timestamp: {
            $gte: options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: last 30 days
            $lte: options.endDate || new Date()
          }
        }
      },
      {
        $group: {
          _id: timeGrouping,
          totalEvents: { $sum: 1 },
          successfulEvents: {
            $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
          },
          failedEvents: {
            $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] }
          },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $addFields: {
          uniqueUserCount: { $size: '$uniqueUsers' }
        }
      },
      {
        $project: {
          uniqueUsers: 0 // Remove the array, keep only the count
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get top users by activity
    const topUsers = await AuditLog.aggregate([
      {
        $match: {
          userId: { $exists: true },
          timestamp: {
            $gte: options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            $lte: options.endDate || new Date()
          }
        }
      },
      {
        $group: {
          _id: '$userId',
          userEmail: { $first: '$userEmail' },
          userName: { $first: '$userName' },
          eventCount: { $sum: 1 },
          lastActivity: { $max: '$timestamp' }
        }
      },
      { $sort: { eventCount: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        summary: analytics,
        activityOverTime,
        topUsers
      }
    });

  } catch (error) {
    console.error('❌ Error fetching audit analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit analytics',
      error: error.message
    });
  }
});

// Export audit logs to CSV
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const {
      eventType,
      action,
      userId,
      startDate,
      endDate,
      format = 'csv'
    } = req.query;

    const filters = {};
    if (eventType) filters.eventType = eventType;
    if (action) filters.action = action;
    if (userId) filters.userId = userId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const logs = await auditService.searchLogs(filters, { limit: 10000 }); // Max 10k for export

    if (format === 'csv') {
      const csv = convertToCSV(logs);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: logs
      });
    }

  } catch (error) {
    console.error('❌ Error exporting audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export audit logs',
      error: error.message
    });
  }
});

// Get audit statistics
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    const startDate = getStartDateForPeriod(period);
    
    const stats = await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $facet: {
          totalEvents: [{ $count: 'count' }],
          eventsByType: [
            { $group: { _id: '$eventType', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          eventsByAction: [
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ],
          successRate: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                successful: { $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] } }
              }
            }
          ],
          uniqueUsers: [
            { $group: { _id: '$userId' } },
            { $count: 'count' }
          ]
        }
      }
    ]);

    const result = stats[0];
    const successRate = result.successRate[0] ? 
      (result.successRate[0].successful / result.successRate[0].total * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        totalEvents: result.totalEvents[0]?.count || 0,
        eventsByType: result.eventsByType,
        eventsByAction: result.eventsByAction,
        successRate: parseFloat(successRate),
        uniqueUsers: result.uniqueUsers[0]?.count || 0,
        period
      }
    });

  } catch (error) {
    console.error('❌ Error fetching audit statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit statistics',
      error: error.message
    });
  }
});

// Helper functions

function getTimeGrouping(groupBy) {
  switch (groupBy) {
    case 'hour':
      return {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' },
        hour: { $hour: '$timestamp' }
      };
    case 'day':
      return {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' }
      };
    case 'week':
      return {
        year: { $year: '$timestamp' },
        week: { $week: '$timestamp' }
      };
    case 'month':
      return {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' }
      };
    default:
      return {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' }
      };
  }
}

function getStartDateForPeriod(period) {
  const now = new Date();
  switch (period) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

function convertToCSV(logs) {
  if (!logs || logs.length === 0) return '';

  const headers = [
    'Timestamp',
    'Event Type',
    'Action',
    'User Email',
    'User Name',
    'Resource Type',
    'Resource ID',
    'Success',
    'IP Address',
    'Description'
  ];

  const rows = logs.map(log => [
    log.timestamp.toISOString(),
    log.eventType,
    log.action,
    log.userEmail || '',
    log.userName || '',
    log.resourceType || '',
    log.resourceId || '',
    log.success,
    log.ipAddress || '',
    log.description || ''
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return csvContent;
}

module.exports = router;