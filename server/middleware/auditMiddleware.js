const auditService = require('../services/auditService');

/**
 * Middleware for logging API requests
 */
function auditRequestMiddleware(options = {}) {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Store original end function
    const originalEnd = res.end;
    
    // Override res.end to capture response details
    res.end = function(chunk, encoding) {
      const duration = Date.now() - startTime;
      
      // Skip logging for certain routes if specified
      const skipRoutes = options.skipRoutes || ['/health', '/favicon.ico'];
      const shouldSkip = skipRoutes.some(route => req.path.includes(route));
      
      if (!shouldSkip) {
        // Log API request
        auditService.logApiRequest({
          method: req.method,
          endpoint: req.path,
          statusCode: res.statusCode,
          duration,
          responseSize: chunk ? chunk.length : 0
        }, req, req.user);
      }
      
      // Call original end function
      originalEnd.call(this, chunk, encoding);
    };
    
    next();
  };
}

/**
 * Middleware for logging authentication events
 */
function auditAuthMiddleware() {
  return (req, res, next) => {
    // Store original login method
    if (req.login) {
      const originalLogin = req.login;
      req.login = function(user, options, done) {
        // Log successful login
        auditService.logUserLogin(user, req);
        
        // Call original login
        return originalLogin.call(this, user, options, done);
      };
    }
    
    // Store original logout method
    if (req.logout) {
      const originalLogout = req.logout;
      req.logout = function(options, done) {
        // Log logout
        if (req.user) {
          auditService.logUserLogout(req.user, req);
        }
        
        // Call original logout
        return originalLogout.call(this, options, done);
      };
    }
    
    next();
  };
}

/**
 * Middleware for logging unauthorized access attempts
 */
function auditUnauthorizedMiddleware() {
  return (req, res, next) => {
    // Store original status method to catch 401/403 responses
    const originalStatus = res.status;
    
    res.status = function(statusCode) {
      if (statusCode === 401) {
        auditService.logUnauthorizedAccess({
          resource: req.path,
          resourceType: 'endpoint',
          method: req.method
        }, req, req.user);
      } else if (statusCode === 403) {
        auditService.logPermissionDenied({
          resource: req.path,
          resourceType: 'endpoint',
          method: req.method
        }, req, req.user);
      }
      
      return originalStatus.call(this, statusCode);
    };
    
    next();
  };
}

/**
 * Middleware for logging system errors
 */
function auditErrorMiddleware() {
  return (err, req, res, next) => {
    // Log system error
    auditService.logSystemError(err, req, req.user);
    
    next(err);
  };
}

/**
 * Middleware for detecting suspicious activity
 */
function auditSuspiciousActivityMiddleware(options = {}) {
  const requestCounts = new Map(); // In production, use Redis or similar
  const maxRequestsPerMinute = options.maxRequestsPerMinute || 100;
  const suspiciousThreshold = options.suspiciousThreshold || 200;
  
  return (req, res, next) => {
    const clientId = req.ip + (req.user ? req.user._id : 'anonymous');
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    
    // Clean old entries
    for (const [key, timestamps] of requestCounts.entries()) {
      const validTimestamps = timestamps.filter(t => t > windowStart);
      if (validTimestamps.length === 0) {
        requestCounts.delete(key);
      } else {
        requestCounts.set(key, validTimestamps);
      }
    }
    
    // Track current request
    if (!requestCounts.has(clientId)) {
      requestCounts.set(clientId, []);
    }
    
    const clientRequests = requestCounts.get(clientId);
    clientRequests.push(now);
    
    // Check for suspicious activity
    if (clientRequests.length > suspiciousThreshold) {
      auditService.logSuspiciousActivity({
        activityType: 'excessive_requests',
        description: `Excessive requests detected: ${clientRequests.length} requests in 1 minute`,
        riskScore: Math.min(10, Math.floor(clientRequests.length / 20)),
        metadata: {
          requestCount: clientRequests.length,
          timeWindow: '1 minute',
          clientId,
          userAgent: req.get('User-Agent')
        }
      }, req, req.user);
    } else if (clientRequests.length > maxRequestsPerMinute) {
      // Log as potential suspicious activity
      auditService.logSuspiciousActivity({
        activityType: 'high_request_rate',
        description: `High request rate detected: ${clientRequests.length} requests in 1 minute`,
        riskScore: 5,
        metadata: {
          requestCount: clientRequests.length,
          timeWindow: '1 minute',
          clientId
        }
      }, req, req.user);
    }
    
    next();
  };
}

/**
 * Middleware for tracking resource access
 */
function auditResourceAccessMiddleware(resourceType) {
  return (req, res, next) => {
    // Store original json method to capture successful responses
    const originalJson = res.json;
    
    res.json = function(data) {
      // Only log successful GET requests (200 status)
      if (req.method === 'GET' && res.statusCode === 200 && data) {
        let resourceInfo = null;
        
        // Extract resource information based on response data
        if (Array.isArray(data)) {
          // List view - log as multiple resources viewed
          if (data.length > 0 && data[0]._id) {
            resourceInfo = {
              resourceType,
              action: 'list',
              count: data.length
            };
          }
        } else if (data._id) {
          // Single resource view
          resourceInfo = {
            resourceType,
            resourceId: data._id.toString(),
            resourceName: data.name || data.projectName || data.title || 'Unknown'
          };
        }
        
        if (resourceInfo) {
          // Log resource access based on type
          switch (resourceType) {
            case 'contractor':
              if (resourceInfo.resourceId) {
                auditService.logContractorViewed(req.user, data, req);
              }
              break;
            case 'project':
              if (resourceInfo.resourceId) {
                auditService.logProjectViewed(req.user, data, req);
              }
              break;
            case 'document':
              if (resourceInfo.resourceId) {
                auditService.logDocumentViewed(req.user, {
                  documentId: resourceInfo.resourceId,
                  filename: resourceInfo.resourceName
                }, req);
              }
              break;
            case 'risk_analysis':
              if (resourceInfo.resourceId) {
                auditService.logRiskAnalysisViewed(req.user, {
                  analysisId: resourceInfo.resourceId,
                  contractorName: resourceInfo.resourceName
                }, req);
              }
              break;
            case 'safety_report':
              if (resourceInfo.resourceId) {
                auditService.logSafetyReportViewed(req.user, {
                  reportId: resourceInfo.resourceId,
                  reportTitle: resourceInfo.resourceName
                }, req);
              }
              break;
          }
        }
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * Helper function to track changes between old and new objects
 */
function trackChanges(oldObj, newObj, excludeFields = ['updatedAt', '__v']) {
  const changes = [];
  
  if (!oldObj || !newObj) return changes;
  
  // Convert to plain objects if they're Mongoose documents
  const oldData = oldObj.toObject ? oldObj.toObject() : oldObj;
  const newData = newObj.toObject ? newObj.toObject() : newObj;
  
  // Get all fields from both objects
  const allFields = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  
  for (const field of allFields) {
    if (excludeFields.includes(field)) continue;
    
    const oldValue = oldData[field];
    const newValue = newData[field];
    
    // Simple comparison (for complex objects, you might want deep comparison)
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({
        field,
        oldValue,
        newValue
      });
    }
  }
  
  return changes;
}

/**
 * Middleware factory for CRUD operations
 */
function auditCrudMiddleware(resourceType) {
  return {
    // Middleware for CREATE operations
    create: (req, res, next) => {
      const originalJson = res.json;
      
      res.json = function(data) {
        if (res.statusCode === 200 || res.statusCode === 201) {
          switch (resourceType) {
            case 'contractor':
              auditService.logContractorCreated(req.user, data, req);
              break;
            case 'project':
              auditService.logProjectCreated(req.user, data, req);
              break;
            case 'user':
              auditService.logUserCreated(req.user, data, req);
              break;
          }
        }
        
        return originalJson.call(this, data);
      };
      
      next();
    },
    
    // Middleware for UPDATE operations
    update: (req, res, next) => {
      // Store the original data before update
      req.auditOriginalData = null;
      
      const originalJson = res.json;
      
      res.json = function(data) {
        if (res.statusCode === 200 && req.auditOriginalData) {
          const changes = trackChanges(req.auditOriginalData, data);
          
          switch (resourceType) {
            case 'contractor':
              auditService.logContractorUpdated(req.user, data, changes, req);
              break;
            case 'project':
              auditService.logProjectUpdated(req.user, data, changes, req);
              break;
            case 'user':
              auditService.logUserUpdated(req.user, data, changes, req);
              break;
          }
        }
        
        return originalJson.call(this, data);
      };
      
      next();
    },
    
    // Middleware for DELETE operations
    delete: (req, res, next) => {
      const originalJson = res.json;
      
      res.json = function(data) {
        if (res.statusCode === 200) {
          switch (resourceType) {
            case 'contractor':
              auditService.logContractorDeleted(req.user, req.auditOriginalData || data, req);
              break;
            case 'project':
              auditService.logProjectDeleted(req.user, req.auditOriginalData || data, req);
              break;
            case 'user':
              auditService.logUserDeleted(req.user, req.auditOriginalData || data, req);
              break;
          }
        }
        
        return originalJson.call(this, data);
      };
      
      next();
    }
  };
}

module.exports = {
  auditRequestMiddleware,
  auditAuthMiddleware,
  auditUnauthorizedMiddleware,
  auditErrorMiddleware,
  auditSuspiciousActivityMiddleware,
  auditResourceAccessMiddleware,
  auditCrudMiddleware,
  trackChanges
};