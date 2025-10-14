const auditService = require('../services/auditService');
const { v4: uuidv4 } = require('uuid');

/**
 * Extract device information from request
 */
function extractDeviceInfo(req) {
  const userAgent = req.get('User-Agent') || '';
  const ipAddress = req.ip || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                   req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                   'unknown';

  return {
    userAgent,
    ipAddress,
    screenResolution: req.headers['x-screen-resolution'] || null,
    language: req.headers['accept-language']?.split(',')[0] || null
  };
}

/**
 * Extract session information from request
 */
function extractSessionInfo(req) {
  const session = req.session || {};
  
  return {
    sessionId: session.id || sessionID,
    loginTime: session.loginTime || null,
    lastActivity: new Date(),
    duration: session.loginTime ? 
      Math.floor((new Date() - new Date(session.loginTime)) / 60000) : null,
    isActive: true
  };
}

/**
 * Extract context information from request
 */
function extractContext(req) {
  return {
    pageUrl: req.originalUrl || req.url,
    referrer: req.get('Referer') || req.get('Referrer'),
    requestId: req.headers['x-request-id'] || uuidv4(),
    correlationId: req.headers['x-correlation-id'] || null,
    isSecureConnection: req.secure || req.headers['x-forwarded-proto'] === 'https'
  };
}

/**
 * Determine action type from HTTP method and route
 */
function determineAction(req) {
  const method = req.method.toLowerCase();
  const path = req.route?.path || req.path;
  
  // Map HTTP methods to actions
  const methodMap = {
    'get': 'view',
    'post': 'create',
    'put': 'update',
    'patch': 'update',
    'delete': 'delete'
  };
  
  let action = methodMap[method] || 'unknown';
  
  // Special cases based on route patterns
  if (path.includes('/search')) {
    action = 'search';
  } else if (path.includes('/export')) {
    action = 'export';
  } else if (path.includes('/import')) {
    action = 'import';
  } else if (path.includes('/login')) {
    action = 'login';
  } else if (path.includes('/logout')) {
    action = 'logout';
  } else if (path.includes('/upload')) {
    action = 'upload';
  } else if (path.includes('/download')) {
    action = 'download';
  }
  
  return action;
}

/**
 * Determine resource type from route
 */
function determineResource(req) {
  const path = req.route?.path || req.path;
  
  // Extract resource from route patterns
  if (path.includes('/contractors')) return 'contractor';
  if (path.includes('/users')) return 'user';
  if (path.includes('/projects')) return 'project';
  if (path.includes('/files')) return 'file';
  if (path.includes('/reports')) return 'report';
  if (path.includes('/gis')) return 'gis';
  if (path.includes('/safety')) return 'safety';
  if (path.includes('/auth')) return 'auth';
  if (path.includes('/system')) return 'system';
  
  return 'unknown';
}

/**
 * Extract resource ID from request parameters or body
 */
function extractResourceId(req) {
  // Try to get ID from URL parameters
  const params = req.params || {};
  if (params.id) return params.id;
  if (params.contractorId) return params.contractorId;
  if (params.userId) return params.userId;
  if (params.projectId) return params.projectId;
  
  // Try to get ID from request body
  const body = req.body || {};
  if (body._id) return body._id;
  if (body.id) return body.id;
  if (body.contractorId) return body.contractorId;
  if (body.userId) return body.userId;
  if (body.projectId) return body.projectId;
  
  return null;
}

/**
 * Extract relevant data for audit logging
 */
function extractAuditData(req, res, action) {
  const data = {
    method: req.method,
    url: req.originalUrl || req.url,
    headers: {
      'content-type': req.get('Content-Type'),
      'authorization': req.get('Authorization') ? '[REDACTED]' : undefined,
      'user-agent': req.get('User-Agent')
    },
    query: req.query,
    timestamp: new Date().toISOString()
  };

  // Add response information
  if (res) {
    data.response = {
      statusCode: res.statusCode,
      statusMessage: res.statusMessage
    };
  }

  // Add specific data based on action type
  switch (action) {
    case 'search':
      data.searchQuery = req.query.q || req.query.search || req.query.query;
      data.filters = req.query;
      break;
    case 'create':
    case 'update':
      // Only log non-sensitive fields
      const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
      data.body = {};
      if (req.body) {
        Object.keys(req.body).forEach(key => {
          if (!sensitiveFields.some(field => key.toLowerCase().includes(field))) {
            data.body[key] = req.body[key];
          }
        });
      }
      break;
    case 'export':
      data.exportFormat = req.query.format || 'json';
      data.exportFilters = req.query;
      break;
    case 'import':
      data.importType = req.query.type || 'bulk';
      data.fileName = req.file?.originalname || null;
      break;
  }

  return data;
}

/**
 * Main audit middleware
 */
function auditMiddleware(options = {}) {
  const {
    excludePaths = [],
    excludeMethods = [],
    includeRequestBody = false,
    includeResponseBody = false,
    logLevel = 'info'
  } = options;

  return async (req, res, next) => {
    try {
      // Skip if path is excluded
      if (excludePaths.some(path => req.path.includes(path))) {
        return next();
      }

      // Skip if method is excluded
      if (excludeMethods.includes(req.method.toLowerCase())) {
        return next();
      }

      // Skip if no user session (for public endpoints)
      if (!req.user && !req.session?.user) {
        return next();
      }

      const user = req.user || req.session?.user;
      const action = determineAction(req);
      const resource = determineResource(req);
      const resourceId = extractResourceId(req);
      const deviceInfo = extractDeviceInfo(req);
      const sessionInfo = extractSessionInfo(req);
      const context = extractContext(req);

      // Extract details for audit
      const details = extractAuditData(req, null, action);

      // Log the event
      await auditService.logEvent({
        user: {
          _id: user._id || user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          authMethod: user.authMethod || 'session'
        },
        action,
        resource,
        resourceId,
        details,
        deviceInfo,
        sessionInfo,
        context,
        tags: ['api', 'http', req.method.toLowerCase()],
        reason: req.headers['x-audit-reason'] || null
      });

      // Override res.end to capture response data
      const originalEnd = res.end;
      res.end = function(chunk, encoding) {
        // Log response completion
        auditService.logEvent({
          user: {
            _id: user._id || user.id,
            email: user.email,
            name: user.name,
            role: user.role
          },
          action: 'response',
          resource: 'api',
          resourceId: context.requestId,
          details: {
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            responseTime: Date.now() - req.startTime,
            contentLength: res.get('Content-Length') || 0
          },
          deviceInfo,
          sessionInfo,
          context: {
            ...context,
            responseId: uuidv4()
          },
          tags: ['api', 'response']
        });

        originalEnd.call(this, chunk, encoding);
      };

      // Set request start time
      req.startTime = Date.now();

      next();
    } catch (error) {
      console.error('Audit middleware error:', error);
      // Don't break the request flow
      next();
    }
  };
}

/**
 * Specific middleware for authentication events
 */
function authAuditMiddleware() {
  return async (req, res, next) => {
    const originalLogin = req.login;
    const originalLogout = req.logout;

    // Override login method
    req.login = function(user, options, callback) {
      const cb = callback || options;
      const opts = callback ? options : {};

      return originalLogin.call(this, user, opts, async (err) => {
        if (!err && user) {
          // Log successful login
          await auditService.logLogin(
            user,
            extractDeviceInfo(req),
            extractSessionInfo(req),
            extractContext(req)
          );
        }
        if (cb) cb(err);
      });
    };

    // Override logout method
    req.logout = function(callback) {
      const user = req.user;
      
      return originalLogout.call(this, async (err) => {
        if (!err && user) {
          // Log logout
          await auditService.logLogout(
            user,
            extractSessionInfo(req),
            extractContext(req)
          );
        }
        if (callback) callback(err);
      });
    };

    next();
  };
}

/**
 * Middleware for specific resource operations
 */
function resourceAuditMiddleware(resourceType) {
  return async (req, res, next) => {
    const originalSend = res.send;
    const originalJson = res.json;

    // Override response methods to capture data changes
    res.send = function(body) {
      if (req.method !== 'GET' && req.user) {
        // Log data modification
        const action = determineAction(req);
        const resourceId = extractResourceId(req);
        
        if (['create', 'update', 'delete'].includes(action)) {
          auditService.logEvent({
            user: req.user,
            action,
            resource: resourceType,
            resourceId,
            details: {
              endpoint: req.originalUrl,
              method: req.method,
              timestamp: new Date().toISOString()
            },
            deviceInfo: extractDeviceInfo(req),
            sessionInfo: extractSessionInfo(req),
            context: extractContext(req),
            tags: ['api', resourceType, action]
          });
        }
      }
      
      return originalSend.call(this, body);
    };

    res.json = function(obj) {
      if (req.method !== 'GET' && req.user) {
        // Log data modification
        const action = determineAction(req);
        const resourceId = extractResourceId(req);
        
        if (['create', 'update', 'delete'].includes(action)) {
          auditService.logEvent({
            user: req.user,
            action,
            resource: resourceType,
            resourceId,
            details: {
              endpoint: req.originalUrl,
              method: req.method,
              timestamp: new Date().toISOString()
            },
            deviceInfo: extractDeviceInfo(req),
            sessionInfo: extractSessionInfo(req),
            context: extractContext(req),
            tags: ['api', resourceType, action]
          });
        }
      }
      
      return originalJson.call(this, obj);
    };

    next();
  };
}

module.exports = {
  auditMiddleware,
  authAuditMiddleware,
  resourceAuditMiddleware,
  extractDeviceInfo,
  extractSessionInfo,
  extractContext,
  determineAction,
  determineResource,
  extractResourceId
};