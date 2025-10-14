const express = require('express');
const router = express.Router();
const auditService = require('../services/auditService');
const systemEventEmitter = require('../services/eventEmitter');

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  const user = req.user || req.session?.user;
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get audit events with filtering
router.get('/events', requireAdmin, async (req, res) => {
  try {
    const {
      userId,
      action,
      resource,
      resourceId,
      startDate,
      endDate,
      riskLevel,
      tags,
      page = 1,
      limit = 50,
      sortBy = 'timestamp',
      sortOrder = -1
    } = req.query;

    const filters = {
      userId,
      action,
      resource,
      resourceId,
      startDate,
      endDate,
      riskLevel,
      tags: tags ? tags.split(',') : undefined,
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder: parseInt(sortOrder)
    };

    const result = await auditService.getAuditEvents(filters);
    res.json(result);
  } catch (error) {
    console.error('Error fetching audit events:', error);
    res.status(500).json({ error: 'Failed to fetch audit events' });
  }
});

// Get user activity summary
router.get('/users/:userId/activity', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const summary = await auditService.getUserActivitySummary(userId, startDate, endDate);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching user activity summary:', error);
    res.status(500).json({ error: 'Failed to fetch user activity summary' });
  }
});

// Get resource audit trail
router.get('/resources/:resource/:resourceId', requireAdmin, async (req, res) => {
  try {
    const { resource, resourceId } = req.params;
    const trail = await auditService.getResourceAuditTrail(resource, resourceId);
    res.json(trail);
  } catch (error) {
    console.error('Error fetching resource audit trail:', error);
    res.status(500).json({ error: 'Failed to fetch resource audit trail' });
  }
});

// Get security events
router.get('/security', requireAdmin, async (req, res) => {
  try {
    const { riskLevel, startDate, endDate } = req.query;
    const events = await auditService.getSecurityEvents(riskLevel, startDate, endDate);
    res.json(events);
  } catch (error) {
    console.error('Error fetching security events:', error);
    res.status(500).json({ error: 'Failed to fetch security events' });
  }
});

// Get audit statistics
router.get('/statistics', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const stats = await auditService.getAuditStatistics(startDate, endDate);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching audit statistics:', error);
    res.status(500).json({ error: 'Failed to fetch audit statistics' });
  }
});

// Get real-time audit events (WebSocket-like endpoint)
router.get('/events/realtime', requireAdmin, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Listen to audit events
  const auditListener = (auditEvent) => {
    sendEvent({
      type: 'audit',
      data: auditEvent
    });
  };

  const securityListener = (auditEvent) => {
    sendEvent({
      type: 'security',
      data: auditEvent
    });
  };

  const alertListener = (alertData) => {
    sendEvent({
      type: 'alert',
      data: alertData
    });
  };

  // Register listeners
  auditService.on('auditEvent', auditListener);
  auditService.on('securityEvent', securityListener);
  systemEventEmitter.on('alert:rapidActivity', alertListener);
  systemEventEmitter.on('alert:suspiciousIP', alertListener);
  systemEventEmitter.on('alert:bulkDelete', alertListener);
  systemEventEmitter.on('alert:criticalDelete', alertListener);
  systemEventEmitter.on('security:alert', alertListener);

  // Cleanup on disconnect
  req.on('close', () => {
    auditService.removeListener('auditEvent', auditListener);
    auditService.removeListener('securityEvent', securityListener);
    systemEventEmitter.removeListener('alert:rapidActivity', alertListener);
    systemEventEmitter.removeListener('alert:suspiciousIP', alertListener);
    systemEventEmitter.removeListener('alert:bulkDelete', alertListener);
    systemEventEmitter.removeListener('alert:criticalDelete', alertListener);
    systemEventEmitter.removeListener('security:alert', alertListener);
  });

  // Send initial connection event
  sendEvent({
    type: 'connected',
    data: { message: 'Connected to audit event stream' }
  });
});

// Get audit events by date range with aggregation
router.get('/events/aggregated', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'hour' } = req.query;
    
    const AuditEvent = require('../models/AuditEvent');
    
    const matchQuery = {};
    if (startDate || endDate) {
      matchQuery.timestamp = {};
      if (startDate) matchQuery.timestamp.$gte = new Date(startDate);
      if (endDate) matchQuery.timestamp.$lte = new Date(endDate);
    }

    let groupFormat;
    switch (groupBy) {
      case 'minute':
        groupFormat = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
          hour: { $hour: '$timestamp' },
          minute: { $minute: '$timestamp' }
        };
        break;
      case 'hour':
        groupFormat = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
          hour: { $hour: '$timestamp' }
        };
        break;
      case 'day':
        groupFormat = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' }
        };
        break;
      default:
        groupFormat = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
          hour: { $hour: '$timestamp' }
        };
    }

    const aggregated = await AuditEvent.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: groupFormat,
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          actions: { $addToSet: '$action.action' },
          resources: { $addToSet: '$action.resource' },
          riskLevels: { $addToSet: '$security.riskLevel' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          actions: { $size: '$actions' },
          resources: { $size: '$resources' },
          riskLevels: 1
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1, '_id.hour': -1 } }
    ]);

    res.json(aggregated);
  } catch (error) {
    console.error('Error fetching aggregated audit events:', error);
    res.status(500).json({ error: 'Failed to fetch aggregated audit events' });
  }
});

// Get audit events by user with detailed breakdown
router.get('/users/:userId/events', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, action, resource } = req.query;

    const filters = {
      userId,
      startDate,
      endDate,
      action,
      resource,
      page: 1,
      limit: 1000
    };

    const result = await auditService.getAuditEvents(filters);
    
    // Group by action and resource
    const grouped = result.events.reduce((acc, event) => {
      const key = `${event.action.action}_${event.action.resource}`;
      if (!acc[key]) {
        acc[key] = {
          action: event.action.action,
          resource: event.action.resource,
          count: 0,
          lastActivity: null,
          events: []
        };
      }
      acc[key].count++;
      if (!acc[key].lastActivity || event.timestamp > acc[key].lastActivity) {
        acc[key].lastActivity = event.timestamp;
      }
      acc[key].events.push(event);
      return acc;
    }, {});

    res.json({
      summary: Object.values(grouped),
      totalEvents: result.total,
      user: result.events[0]?.userName || 'Unknown'
    });
  } catch (error) {
    console.error('Error fetching user events:', error);
    res.status(500).json({ error: 'Failed to fetch user events' });
  }
});

// Get audit events by IP address
router.get('/ip/:ipAddress', requireAdmin, async (req, res) => {
  try {
    const { ipAddress } = req.params;
    const { startDate, endDate } = req.query;

    const filters = {
      'deviceInfo.ipAddress': ipAddress,
      startDate,
      endDate,
      page: 1,
      limit: 1000
    };

    const result = await auditService.getAuditEvents(filters);
    
    // Group by user
    const userGroups = result.events.reduce((acc, event) => {
      const userId = event.userId || 'anonymous';
      if (!acc[userId]) {
        acc[userId] = {
          userId,
          userName: event.userName,
          userEmail: event.userEmail,
          events: [],
          count: 0
        };
      }
      acc[userId].events.push(event);
      acc[userId].count++;
      return acc;
    }, {});

    res.json({
      ipAddress,
      totalEvents: result.total,
      uniqueUsers: Object.keys(userGroups).length,
      userGroups: Object.values(userGroups)
    });
  } catch (error) {
    console.error('Error fetching IP events:', error);
    res.status(500).json({ error: 'Failed to fetch IP events' });
  }
});

// Get audit events by session
router.get('/sessions/:sessionId', requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { startDate, endDate } = req.query;

    const filters = {
      'sessionInfo.sessionId': sessionId,
      startDate,
      endDate,
      page: 1,
      limit: 1000
    };

    const result = await auditService.getAuditEvents(filters);
    
    // Calculate session duration
    const events = result.events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const sessionStart = events[0]?.timestamp;
    const sessionEnd = events[events.length - 1]?.timestamp;
    const duration = sessionStart && sessionEnd ? 
      Math.floor((new Date(sessionEnd) - new Date(sessionStart)) / 60000) : 0;

    res.json({
      sessionId,
      totalEvents: result.total,
      duration: duration,
      sessionStart,
      sessionEnd,
      events: events
    });
  } catch (error) {
    console.error('Error fetching session events:', error);
    res.status(500).json({ error: 'Failed to fetch session events' });
  }
});

// Export audit events to CSV
router.get('/events/export', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, format = 'csv' } = req.query;
    
    const filters = {
      startDate,
      endDate,
      page: 1,
      limit: 10000 // Large limit for export
    };

    const result = await auditService.getAuditEvents(filters);
    
    if (format === 'csv') {
      // Convert to CSV
      const csvHeader = 'Timestamp,User,Action,Resource,Resource ID,IP Address,Device Type,Risk Level,Details\n';
      const csvRows = result.events.map(event => {
        const details = JSON.stringify(event.action.details || {}).replace(/"/g, '""');
        return [
          event.timestamp.toISOString(),
          event.userName || event.userEmail || 'Unknown',
          event.action.action,
          event.action.resource,
          event.action.resourceId || '',
          event.deviceInfo?.ipAddress || '',
          event.deviceInfo?.deviceType || '',
          event.security?.riskLevel || 'low',
          `"${details}"`
        ].join(',');
      }).join('\n');
      
      const csv = csvHeader + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-events-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } else {
      res.json(result);
    }
  } catch (error) {
    console.error('Error exporting audit events:', error);
    res.status(500).json({ error: 'Failed to export audit events' });
  }
});

// Get system event emitter statistics
router.get('/system/stats', requireAdmin, (req, res) => {
  try {
    const stats = systemEventEmitter.getEventStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching system stats:', error);
    res.status(500).json({ error: 'Failed to fetch system stats' });
  }
});

module.exports = router;