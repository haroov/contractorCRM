const auditService = require('../services/auditService');

// Middleware to automatically log HTTP requests
function auditMiddleware(options = {}) {
  const {
    excludePaths = [],
    excludeMethods = ['OPTIONS'],
    logResponseBody = false,
    logRequestBody = true
  } = options;

  return (req, res, next) => {
    // Skip excluded paths and methods
    if (excludePaths.some(path => req.path.startsWith(path)) || 
        excludeMethods.includes(req.method)) {
      return next();
    }

    const startTime = Date.now();

    // Store original end function
    const originalEnd = res.end;

    // Override res.end to capture response
    res.end = function(chunk, encoding) {
      // Calculate duration
      const duration = Date.now() - startTime;

      // Determine action based on method and path
      const action = determineAction(req.method, req.path);
      
      // Extract resource info from path
      const { resourceType, resourceId } = extractResourceInfo(req.path);

      // Prepare audit data
      const auditData = {
        eventType: 'crud',
        action,
        ...auditService.extractUserInfo(req),
        ...auditService.extractRequestInfo(req),
        resourceType,
        resourceId,
        success: res.statusCode < 400,
        statusCode: res.statusCode,
        duration,
        metadata: {
          requestBody: logRequestBody ? sanitizeRequestBody(req.body) : undefined,
          responseBody: logResponseBody ? sanitizeResponseBody(chunk) : undefined,
          query: req.query,
          params: req.params
        }
      };

      // Log the event
      auditService.logEvent(auditData);

      // Call original end function
      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}

// Middleware to track user activity (page views, interactions)
function trackUserActivity() {
  return (req, res, next) => {
    // Only track GET requests to main pages
    if (req.method === 'GET' && isPageRequest(req.path)) {
      const userInfo = auditService.extractUserInfo(req);
      
      if (userInfo.userId) {
        auditService.logEvent({
          eventType: 'crud',
          action: 'view',
          ...userInfo,
          ...auditService.extractRequestInfo(req),
          resourceType: 'page',
          resourceName: req.path,
          description: `User viewed page: ${req.path}`
        });
      }
    }

    next();
  };
}

// Helper functions

function determineAction(method, path) {
  const methodActionMap = {
    'GET': 'read',
    'POST': 'create',
    'PUT': 'update',
    'PATCH': 'update',
    'DELETE': 'delete'
  };

  // Special cases based on path
  if (path.includes('/login')) return 'login';
  if (path.includes('/logout')) return 'logout';
  if (path.includes('/upload')) return 'upload';
  if (path.includes('/download')) return 'download';
  if (path.includes('/search')) return 'search';
  if (path.includes('/export')) return 'export';

  return methodActionMap[method] || 'unknown';
}

function extractResourceInfo(path) {
  // Extract resource type and ID from API paths
  // Examples: /api/contractors/123 -> { resourceType: 'contractor', resourceId: '123' }
  //          /api/projects/456/files -> { resourceType: 'project', resourceId: '456' }
  
  const apiMatch = path.match(/^\/api\/([^\/]+)(?:\/([^\/]+))?/);
  if (apiMatch) {
    const resourceType = apiMatch[1];
    const resourceId = apiMatch[2];
    
    return {
      resourceType: resourceType.replace(/s$/, ''), // Remove plural 's'
      resourceId: resourceId && !isNaN(resourceId) ? resourceId : undefined
    };
  }

  return { resourceType: undefined, resourceId: undefined };
}

function isPageRequest(path) {
  // Determine if this is a page view (not API call, asset, etc.)
  return !path.startsWith('/api/') && 
         !path.startsWith('/assets/') && 
         !path.startsWith('/public/') &&
         !path.includes('.') && // No file extensions
         path !== '/favicon.ico';
}

function sanitizeRequestBody(body) {
  if (!body) return undefined;

  // Remove sensitive fields
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

function sanitizeResponseBody(chunk) {
  if (!chunk) return undefined;

  try {
    const response = JSON.parse(chunk.toString());
    
    // Remove sensitive fields from response
    const sanitized = { ...response };
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  } catch (error) {
    // If not JSON, return truncated string
    return chunk.toString().substring(0, 200);
  }
}

// Specific audit logging functions for common operations

function logLogin(req, user, success = true) {
  auditService.logAuthEvent('login', req, user, success);
}

function logLogout(req, user) {
  auditService.logAuthEvent('logout', req, user);
}

function logCreate(req, resourceType, resourceId, resourceName, data) {
  auditService.logCrudEvent('create', req, resourceType, resourceId, resourceName, {
    after: data
  });
}

function logUpdate(req, resourceType, resourceId, resourceName, oldData, newData) {
  auditService.logCrudEvent('update', req, resourceType, resourceId, resourceName, {
    before: oldData,
    after: newData
  });
}

function logDelete(req, resourceType, resourceId, resourceName, data) {
  auditService.logCrudEvent('delete', req, resourceType, resourceId, resourceName, {
    before: data
  });
}

function logFileUpload(req, fileName, fileSize) {
  auditService.logFileEvent('upload', req, fileName, fileSize);
}

function logFileDownload(req, fileName, fileSize) {
  auditService.logFileEvent('download', req, fileName, fileSize);
}

function logSecurityViolation(req, description, metadata = {}) {
  auditService.logSecurityEvent('security_violation', req, description, metadata);
}

function logError(error, req, metadata = {}) {
  auditService.logErrorEvent(error, req, metadata);
}

module.exports = {
  auditMiddleware,
  trackUserActivity,
  logLogin,
  logLogout,
  logCreate,
  logUpdate,
  logDelete,
  logFileUpload,
  logFileDownload,
  logSecurityViolation,
  logError
};