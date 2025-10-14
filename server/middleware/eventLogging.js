const eventLoggingService = require('../services/eventLoggingService');

/**
 * Middleware to automatically log HTTP requests and responses
 */
const requestLoggingMiddleware = (options = {}) => {
  const {
    logAllRequests = false,
    logOnlyErrors = false,
    excludePaths = ['/health', '/favicon.ico', '/assets'],
    excludeHeaders = ['authorization', 'cookie', 'x-api-key'],
    logRequestBody = false,
    logResponseBody = false
  } = options;

  return (req, res, next) => {
    // Skip excluded paths
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const startTime = Date.now();
    
    // Store original res.json to intercept response
    const originalJson = res.json;
    const originalSend = res.send;
    let responseBody = null;

    // Intercept response
    res.json = function(body) {
      if (logResponseBody) {
        responseBody = body;
      }
      return originalJson.call(this, body);
    };

    res.send = function(body) {
      if (logResponseBody && !responseBody) {
        responseBody = body;
      }
      return originalSend.call(this, body);
    };

    // Log request on response finish
    res.on('finish', async () => {
      const responseTime = Date.now() - startTime;
      const shouldLog = logAllRequests || 
                       (logOnlyErrors && res.statusCode >= 400) ||
                       (!logAllRequests && !logOnlyErrors && (res.statusCode >= 400 || req.method !== 'GET'));

      if (shouldLog) {
        try {
          // Get user info from request
          const user = req.user || req.session?.user;
          
          // Prepare headers (exclude sensitive ones)
          const headers = { ...req.headers };
          excludeHeaders.forEach(header => {
            if (headers[header]) {
              headers[header] = '[REDACTED]';
            }
          });

          const eventData = {
            eventType: res.statusCode >= 400 ? 'SYSTEM_ERROR' : 'SYSTEM_INFO',
            category: 'SYSTEM',
            action: 'http_request',
            description: `${req.method} ${req.originalUrl} - ${res.statusCode}`,
            userId: user?._id || user?.id,
            userEmail: user?.email,
            userRole: user?.role,
            sessionId: req.sessionID || req.session?.id,
            ipAddress: eventLoggingService.getClientIP(req),
            userAgent: req.get('User-Agent'),
            requestMethod: req.method,
            requestUrl: req.originalUrl,
            requestHeaders: headers,
            statusCode: res.statusCode,
            responseTime: responseTime,
            status: res.statusCode >= 400 ? 'FAILED' : 'SUCCESS',
            severity: res.statusCode >= 500 ? 'HIGH' : res.statusCode >= 400 ? 'MEDIUM' : 'LOW',
            metadata: {
              requestBody: logRequestBody ? req.body : undefined,
              responseBody: logResponseBody ? responseBody : undefined,
              contentLength: res.get('content-length'),
              referer: req.get('referer')
            }
          };

          await eventLoggingService.logEvent(eventData);
        } catch (error) {
          console.error('❌ Failed to log request event:', error);
        }
      }
    });

    next();
  };
};

/**
 * Middleware to log authentication events
 */
const authEventMiddleware = (eventType) => {
  return async (req, res, next) => {
    // Store original methods to intercept success/failure
    const originalJson = res.json;
    const originalSend = res.send;
    
    res.json = function(body) {
      // Log auth event based on response
      setTimeout(async () => {
        try {
          const user = req.user || req.session?.user || req.body;
          const success = res.statusCode < 400;
          
          await eventLoggingService.logAuthEvent(
            success ? eventType : `${eventType}_FAILED`,
            user,
            req,
            { 
              success,
              responseCode: res.statusCode,
              loginMethod: req.body?.loginMethod || 'email'
            }
          );
        } catch (error) {
          console.error('❌ Failed to log auth event:', error);
        }
      }, 0);
      
      return originalJson.call(this, body);
    };

    res.send = function(body) {
      // Log auth event based on response
      setTimeout(async () => {
        try {
          const user = req.user || req.session?.user || req.body;
          const success = res.statusCode < 400;
          
          await eventLoggingService.logAuthEvent(
            success ? eventType : `${eventType}_FAILED`,
            user,
            req,
            { 
              success,
              responseCode: res.statusCode,
              loginMethod: req.body?.loginMethod || 'email'
            }
          );
        } catch (error) {
          console.error('❌ Failed to log auth event:', error);
        }
      }, 0);
      
      return originalSend.call(this, body);
    };

    next();
  };
};

/**
 * Middleware to log CRUD operations
 */
const crudEventMiddleware = (operation, resourceType) => {
  return async (req, res, next) => {
    // Store original data for comparison (for updates)
    if (operation === 'UPDATE' && req.params.id) {
      try {
        // This would need to be customized based on your models
        // For now, we'll store it in req for later use
        req.originalData = await getOriginalData(resourceType, req.params.id);
      } catch (error) {
        console.error('❌ Failed to get original data for audit:', error);
      }
    }

    // Store original response methods
    const originalJson = res.json;
    const originalSend = res.send;
    
    res.json = function(body) {
      // Log CRUD event after successful response
      if (res.statusCode < 400) {
        setTimeout(async () => {
          try {
            const user = req.user || req.session?.user;
            const resourceData = body?.data || body || req.body;
            
            await eventLoggingService.logCrudEvent(
              operation,
              resourceType,
              resourceData,
              user,
              req,
              req.originalData
            );
          } catch (error) {
            console.error('❌ Failed to log CRUD event:', error);
          }
        }, 0);
      }
      
      return originalJson.call(this, body);
    };

    res.send = function(body) {
      // Log CRUD event after successful response
      if (res.statusCode < 400) {
        setTimeout(async () => {
          try {
            const user = req.user || req.session?.user;
            const resourceData = body?.data || body || req.body;
            
            await eventLoggingService.logCrudEvent(
              operation,
              resourceType,
              resourceData,
              user,
              req,
              req.originalData
            );
          } catch (error) {
            console.error('❌ Failed to log CRUD event:', error);
          }
        }, 0);
      }
      
      return originalSend.call(this, body);
    };

    next();
  };
};

/**
 * Error logging middleware
 */
const errorLoggingMiddleware = (err, req, res, next) => {
  // Log the error
  eventLoggingService.logError(err, req, req.user || req.session?.user, {
    route: req.route?.path,
    params: req.params,
    query: req.query,
    body: req.body
  }).catch(logError => {
    console.error('❌ Failed to log error event:', logError);
  });

  next(err);
};

/**
 * Helper function to get original data (customize based on your models)
 */
async function getOriginalData(resourceType, resourceId) {
  try {
    const { getDb } = require('../lib/mongo');
    const db = await getDb();
    
    // Map resource types to collections
    const collectionMap = {
      'project': 'projects',
      'contractor': 'contractors',
      'user': 'users',
      'safety-report': 'safety-reports'
    };
    
    const collectionName = collectionMap[resourceType];
    if (!collectionName) {
      return null;
    }
    
    const collection = db.collection(collectionName);
    const ObjectId = require('mongodb').ObjectId;
    
    return await collection.findOne({ _id: new ObjectId(resourceId) });
  } catch (error) {
    console.error('❌ Failed to get original data:', error);
    return null;
  }
}

module.exports = {
  requestLoggingMiddleware,
  authEventMiddleware,
  crudEventMiddleware,
  errorLoggingMiddleware
};