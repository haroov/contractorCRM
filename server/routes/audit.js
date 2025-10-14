const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { requireAuth, requireAdmin } = require('../middleware/auth');

/**
 * Get audit logs with filtering and pagination
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50, max: 200)
 * - startDate: Start date for filtering (ISO string)
 * - endDate: End date for filtering (ISO string)
 * - eventType: Filter by event type
 * - userId: Filter by user ID
 * - userEmail: Filter by user email
 * - resourceType: Filter by resource type
 * - resourceId: Filter by resource ID
 * - status: Filter by status (SUCCESS, FAILURE, WARNING, INFO)
 * - severity: Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)
 * - search: Text search in action and description
 * - sortBy: Sort field (default: timestamp)
 * - sortOrder: Sort order (asc or desc, default: desc)
 */
router.get('/logs', requireAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      startDate,
      endDate,
      eventType,
      userId,
      userEmail,
      resourceType,
      resourceId,
      status,
      severity,
      search,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    // Date range filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Event type filter
    if (eventType) {
      query.eventType = Array.isArray(eventType) ? { $in: eventType } : eventType;
    }

    // User filters
    if (userId) query.userId = userId;
    if (userEmail) query.userEmail = new RegExp(userEmail, 'i');

    // Resource filters
    if (resourceType) query.resourceType = resourceType;
    if (resourceId) query.resourceId = resourceId;

    // Status and severity filters
    if (status) query.status = status;
    if (severity) query.severity = severity;

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 200); // Max 200 items per page
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [logs, totalCount] = await Promise.all([
      AuditLog.find(query)
        .sort(sort)
        .limit(limitNum)
        .skip(skip)
        .populate('userId', 'name email')
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      data: logs,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs'
    });
  }
});

/**
 * Get audit log by ID
 */
router.get('/logs/:id', requireAdmin, async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('parentEventId')
      .lean();

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Audit log not found'
      });
    }

    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit log'
    });
  }
});

/**
 * Get user activity history
 */
router.get('/user/:userId/activity', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      startDate,
      endDate,
      limit = 100,
      skip = 0,
      eventTypes
    } = req.query;

    // Check authorization - users can only see their own activity unless admin
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to view this user activity'
      });
    }

    const options = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: Math.min(parseInt(limit), 500),
      skip: parseInt(skip),
      eventTypes: eventTypes ? (Array.isArray(eventTypes) ? eventTypes : [eventTypes]) : null
    };

    const activity = await AuditLog.getUserActivity(userId, options);

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user activity'
    });
  }
});

/**
 * Get resource history
 */
router.get('/resource/:resourceType/:resourceId/history', requireAuth, async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    const history = await AuditLog.getResourceHistory(
      resourceType, 
      resourceId,
      {
        limit: Math.min(parseInt(limit), 200),
        skip: parseInt(skip)
      }
    );

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching resource history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch resource history'
    });
  }
});

/**
 * Get audit analytics/statistics
 */
router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'eventType' } = req.query;

    const analytics = await AuditLog.getAnalytics({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      groupBy
    });

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching audit analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit analytics'
    });
  }
});

/**
 * Get recent system events (for admin dashboard)
 */
router.get('/recent-events', requireAdmin, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const recentEvents = await AuditLog.find({
      severity: { $in: ['HIGH', 'CRITICAL'] }
    })
      .sort({ timestamp: -1 })
      .limit(Math.min(parseInt(limit), 100))
      .populate('userId', 'name email')
      .lean();

    res.json({
      success: true,
      data: recentEvents
    });
  } catch (error) {
    console.error('Error fetching recent events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent events'
    });
  }
});

/**
 * Get login attempts for a specific user
 */
router.get('/login-attempts/:email', requireAdmin, async (req, res) => {
  try {
    const { email } = req.params;
    const { limit = 10, includeSuccessful = false } = req.query;

    const query = {
      userEmail: email,
      eventType: includeSuccessful 
        ? { $in: ['AUTH_LOGIN', 'AUTH_LOGIN_FAILED'] }
        : 'AUTH_LOGIN_FAILED'
    };

    const loginAttempts = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(Math.min(parseInt(limit), 50))
      .select('timestamp status deviceInfo.ip deviceInfo.browser error')
      .lean();

    res.json({
      success: true,
      data: loginAttempts
    });
  } catch (error) {
    console.error('Error fetching login attempts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch login attempts'
    });
  }
});

/**
 * Get active sessions
 */
router.get('/sessions/active', requireAdmin, async (req, res) => {
  try {
    const activeSessions = await AuditLog.aggregate([
      {
        $match: {
          eventType: 'AUTH_LOGIN',
          timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        }
      },
      {
        $group: {
          _id: '$sessionId',
          userId: { $first: '$userId' },
          userEmail: { $first: '$userEmail' },
          userName: { $first: '$userName' },
          loginTime: { $first: '$timestamp' },
          deviceInfo: { $first: '$deviceInfo' },
          lastActivity: { $max: '$timestamp' }
        }
      },
      {
        $lookup: {
          from: 'audit_logs',
          let: { sessionId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$sessionId', '$$sessionId'] },
                    { $eq: ['$eventType', 'AUTH_LOGOUT'] }
                  ]
                }
              }
            }
          ],
          as: 'logoutEvent'
        }
      },
      {
        $match: {
          logoutEvent: { $size: 0 } // No logout event found
        }
      },
      {
        $project: {
          sessionId: '$_id',
          userId: 1,
          userEmail: 1,
          userName: 1,
          loginTime: 1,
          lastActivity: 1,
          deviceInfo: 1,
          duration: {
            $divide: [
              { $subtract: [new Date(), '$loginTime'] },
              1000 * 60 // Convert to minutes
            ]
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: activeSessions
    });
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active sessions'
    });
  }
});

/**
 * Export audit logs (CSV format)
 */
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, eventType } = req.query;

    // Build query
    const query = {};
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    if (eventType) query.eventType = eventType;

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(10000) // Limit export to 10000 records
      .populate('userId', 'name email')
      .lean();

    // Convert to CSV format
    const csv = convertToCSV(logs);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export audit logs'
    });
  }
});

/**
 * Helper function to convert logs to CSV
 */
function convertToCSV(logs) {
  const headers = [
    'Timestamp',
    'Event Type',
    'User Email',
    'User Name',
    'Action',
    'Description',
    'Resource Type',
    'Resource ID',
    'Status',
    'Severity',
    'IP Address',
    'Browser',
    'Device'
  ];

  const rows = logs.map(log => [
    log.timestamp?.toISOString() || '',
    log.eventType || '',
    log.userEmail || '',
    log.userName || log.userId?.name || '',
    log.action || '',
    log.description || '',
    log.resourceType || '',
    log.resourceId || '',
    log.status || '',
    log.severity || '',
    log.deviceInfo?.ip || '',
    log.deviceInfo?.browser || '',
    log.deviceInfo?.device || ''
  ]);

  // Escape CSV values
  const escapeCSV = (value) => {
    if (value == null) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Build CSV string
  const csvRows = [
    headers.join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ];

  return csvRows.join('\n');
}

module.exports = router;