const EventService = require('../services/EventService');

/**
 * Middleware to automatically log API requests
 */
const logApiRequest = (req, res, next) => {
  // Skip logging for certain paths
  const skipPaths = ['/health', '/ping', '/favicon.ico'];
  if (skipPaths.includes(req.path)) {
    return next();
  }

  // Store original response methods
  const originalSend = res.send;
  const originalJson = res.json;

  // Track response data
  let responseData = null;
  let responseStatus = null;

  // Override res.send to capture response
  res.send = function(data) {
    responseData = data;
    responseStatus = res.statusCode;
    return originalSend.call(this, data);
  };

  // Override res.json to capture response
  res.json = function(data) {
    responseData = data;
    responseStatus = res.statusCode;
    return originalJson.call(this, data);
  };

  // Log the request when response is sent
  res.on('finish', async () => {
    try {
      // Determine event type based on HTTP method and status
      let eventType = 'VIEW';
      if (req.method === 'POST') eventType = 'CREATE';
      else if (req.method === 'PUT' || req.method === 'PATCH') eventType = 'UPDATE';
      else if (req.method === 'DELETE') eventType = 'DELETE';
      else if (req.method === 'GET') eventType = 'VIEW';

      // Determine resource type from URL
      let resourceType = 'SYSTEM';
      if (req.path.includes('/users')) resourceType = 'USER';
      else if (req.path.includes('/contractors')) resourceType = 'CONTRACTOR';
      else if (req.path.includes('/projects')) resourceType = 'PROJECT';
      else if (req.path.includes('/files')) resourceType = 'FILE';

      // Extract resource ID from URL params
      let resourceId = null;
      const idMatch = req.path.match(/\/([a-f0-9]{24})\b/);
      if (idMatch) {
        resourceId = idMatch[1];
      }

      // Create description
      const description = `${req.method} ${req.path} - ${responseStatus}`;

      // Log the event
      await EventService.logEvent({
        eventType,
        resourceType,
        resourceId,
        userId: req.user ? req.user._id : null,
        sessionId: req.sessionID,
        ipAddress: EventService.getClientIP(req),
        userAgent: req.get('User-Agent'),
        description,
        details: {
          method: req.method,
          path: req.path,
          query: req.query,
          statusCode: responseStatus,
          responseSize: responseData ? JSON.stringify(responseData).length : 0
        },
        status: responseStatus >= 400 ? 'FAILED' : 'SUCCESS',
        severity: responseStatus >= 500 ? 'HIGH' : 'LOW'
      });
    } catch (error) {
      console.error('Error logging API request:', error);
    }
  });

  next();
};

/**
 * Middleware to log authentication events
 */
const logAuthEvents = (req, res, next) => {
  // Store original methods
  const originalSend = res.send;
  const originalJson = res.json;

  // Track if this is an auth endpoint
  const isAuthEndpoint = req.path.includes('/auth') || req.path.includes('/login') || req.path.includes('/logout');

  if (isAuthEndpoint) {
    let responseData = null;
    let responseStatus = null;

    // Override response methods
    res.send = function(data) {
      responseData = data;
      responseStatus = res.statusCode;
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      responseData = data;
      responseStatus = res.statusCode;
      return originalJson.call(this, data);
    };

    // Log auth event when response is sent
    res.on('finish', async () => {
      try {
        let eventType = 'LOGIN';
        if (req.path.includes('/logout')) eventType = 'LOGOUT';
        else if (req.path.includes('/register')) eventType = 'CREATE';
        else if (responseStatus >= 400) eventType = 'LOGIN_FAILED';

        const description = `${eventType} attempt - ${responseStatus}`;

        await EventService.logEvent({
          eventType,
          resourceType: 'AUTH',
          userId: req.user ? req.user._id : null,
          sessionId: req.sessionID,
          ipAddress: EventService.getClientIP(req),
          userAgent: req.get('User-Agent'),
          description,
          details: {
            path: req.path,
            method: req.method,
            statusCode: responseStatus,
            body: req.body ? EventService.sanitizeData(req.body) : null
          },
          status: responseStatus >= 400 ? 'FAILED' : 'SUCCESS',
          severity: responseStatus >= 400 ? 'MEDIUM' : 'LOW'
        });
      } catch (error) {
        console.error('Error logging auth event:', error);
      }
    });
  }

  next();
};

/**
 * Middleware to log database operations
 */
const logDatabaseOperations = (Model) => {
  return (req, res, next) => {
    // Store original methods
    const originalSend = res.send;
    const originalJson = res.json;

    let responseData = null;
    let responseStatus = null;

    // Override response methods
    res.send = function(data) {
      responseData = data;
      responseStatus = res.statusCode;
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      responseData = data;
      responseStatus = res.statusCode;
      return originalJson.call(this, data);
    };

    // Log database operation when response is sent
    res.on('finish', async () => {
      try {
        if (responseStatus >= 200 && responseStatus < 300) {
          const modelName = Model.modelName || 'Unknown';
          let eventType = 'VIEW';
          let resourceId = null;

          if (req.method === 'POST') eventType = 'CREATE';
          else if (req.method === 'PUT' || req.method === 'PATCH') eventType = 'UPDATE';
          else if (req.method === 'DELETE') eventType = 'DELETE';

          // Extract resource ID from response or URL
          if (responseData && responseData._id) {
            resourceId = responseData._id;
          } else if (req.params.id) {
            resourceId = req.params.id;
          }

          const description = `${eventType} ${modelName.toLowerCase()}`;

          await EventService.logEvent({
            eventType,
            resourceType: modelName.toUpperCase(),
            resourceId,
            userId: req.user ? req.user._id : null,
            sessionId: req.sessionID,
            ipAddress: EventService.getClientIP(req),
            userAgent: req.get('User-Agent'),
            description,
            details: {
              model: modelName,
              method: req.method,
              path: req.path,
              statusCode: responseStatus
            },
            status: 'SUCCESS'
          });
        }
      } catch (error) {
        console.error('Error logging database operation:', error);
      }
    });

    next();
  };
};

/**
 * Middleware to log errors
 */
const logErrors = (err, req, res, next) => {
  // Log the error
  EventService.logSystemError(
    err.message,
    req,
    {
      stack: err.stack,
      path: req.path,
      method: req.method,
      body: req.body
    }
  ).catch(error => {
    console.error('Error logging system error:', error);
  });

  // Continue with error handling
  next(err);
};

/**
 * Middleware to log security events
 */
const logSecurityEvents = (req, res, next) => {
  // Check for suspicious activity
  const suspiciousPatterns = [
    /\.\./,  // Path traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /drop.*table/i,  // SQL injection
    /javascript:/i,  // JavaScript injection
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(req.url) || 
    pattern.test(JSON.stringify(req.body)) ||
    pattern.test(JSON.stringify(req.query))
  );

  if (isSuspicious) {
    EventService.logSecurityAlert(
      'SUSPICIOUS_REQUEST',
      `Suspicious request detected: ${req.method} ${req.path}`,
      req,
      {
        url: req.url,
        body: req.body,
        query: req.query,
        headers: req.headers
      }
    ).catch(error => {
      console.error('Error logging security event:', error);
    });
  }

  next();
};

module.exports = {
  logApiRequest,
  logAuthEvents,
  logDatabaseOperations,
  logErrors,
  logSecurityEvents
};