const auditService = require('../services/auditService');

/**
 * Middleware to track all HTTP requests for audit logging
 */
const auditMiddleware = (options = {}) => {
  const {
    excludePaths = ['/health', '/metrics', '/favicon.ico', '/public'],
    excludeMethods = ['OPTIONS'],
    logResponseBody = false,
    logRequestBody = true
  } = options;

  return (req, res, next) => {
    // Skip excluded paths
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Skip excluded methods
    if (excludeMethods.includes(req.method)) {
      return next();
    }

    // Record start time
    const startTime = Date.now();

    // Store original methods
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;

    // Capture response data
    let responseData = null;

    // Override send method
    res.send = function(data) {
      if (logResponseBody) {
        responseData = data;
      }
      return originalSend.call(this, data);
    };

    // Override json method
    res.json = function(data) {
      if (logResponseBody) {
        responseData = data;
      }
      return originalJson.call(this, data);
    };

    // Override end method to log the request
    res.end = function(...args) {
      const responseTime = Date.now() - startTime;

      // Log the HTTP request
      auditService.logHttpRequest(req, res, responseTime);

      // Emit specific events based on the request
      emitSpecificEvents(req, res, responseData);

      return originalEnd.call(this, ...args);
    };

    next();
  };
};

/**
 * Emit specific events based on request path and method
 */
function emitSpecificEvents(req, res, responseData) {
  const { method, path } = req;
  const userInfo = extractUserInfo(req);
  const deviceInfo = auditService.parseDeviceInfo(req);

  // Handle authentication events
  if (path.includes('/auth/login') && method === 'POST' && res.statusCode === 200) {
    auditService.emit('auth:login', {
      userId: req.user?._id || req.session?.user?._id,
      email: req.body?.email || req.user?.email,
      name: req.user?.name || req.session?.user?.name,
      role: req.user?.role || req.session?.user?.role,
      sessionId: req.sessionID,
      deviceInfo,
      requestDetails: auditService.getRequestDetails(req, res),
      loginMethod: req.body?.provider || 'email'
    });
  }

  if (path.includes('/auth/logout')) {
    auditService.emit('auth:logout', {
      userId: userInfo.userId,
      email: userInfo.userEmail,
      sessionId: req.sessionID,
      deviceInfo
    });
  }

  if (path.includes('/auth/login') && method === 'POST' && res.statusCode === 401) {
    auditService.emit('auth:failed', {
      email: req.body?.email,
      deviceInfo,
      requestDetails: auditService.getRequestDetails(req, res),
      error: responseData?.error || 'Authentication failed',
      errorCode: 'AUTH_FAILED'
    });
  }

  // Handle OTP events
  if (path.includes('/auth/otp/send') && method === 'POST') {
    auditService.emit('auth:otp', {
      email: req.body?.email,
      verified: false,
      success: res.statusCode === 200,
      deviceInfo
    });
  }

  if (path.includes('/auth/otp/verify') && method === 'POST') {
    auditService.emit('auth:otp', {
      email: req.body?.email,
      verified: true,
      success: res.statusCode === 200,
      deviceInfo
    });
  }

  // Handle data events for projects
  if (path.includes('/projects')) {
    const projectId = extractResourceId(path, 'projects');
    const action = mapMethodToAction(method);
    
    if (action) {
      auditService.emit('project:action', {
        action,
        projectId,
        projectName: req.body?.projectName || responseData?.projectName,
        ...userInfo,
        deviceInfo,
        metadata: {
          query: req.query,
          params: req.params
        }
      });
    }
  }

  // Handle data events for contractors
  if (path.includes('/contractors')) {
    const contractorId = extractResourceId(path, 'contractors');
    const action = mapMethodToAction(method);
    
    if (action) {
      auditService.emit('contractor:action', {
        action,
        contractorId,
        contractorName: req.body?.companyName || responseData?.companyName,
        ...userInfo,
        deviceInfo,
        metadata: {
          query: req.query,
          params: req.params
        }
      });
    }
  }

  // Handle file upload events
  if (path.includes('/upload') && method === 'POST' && res.statusCode === 200) {
    const files = req.files || (req.file ? [req.file] : []);
    files.forEach(file => {
      auditService.emit('file:uploaded', {
        ...userInfo,
        fileName: file.originalname || file.filename,
        fileId: file.id || file.filename,
        fileSize: file.size,
        mimeType: file.mimetype,
        projectId: req.body?.projectId,
        deviceInfo
      });
    });
  }

  // Handle permission denied
  if (res.statusCode === 403) {
    auditService.emit('permission:denied', {
      ...userInfo,
      action: `${method} ${path}`,
      resourceType: extractResourceType(path),
      resourceId: extractResourceId(path),
      deviceInfo,
      requestDetails: auditService.getRequestDetails(req, res),
      userRole: req.user?.role || req.session?.user?.role
    });
  }

  // Handle system errors
  if (res.statusCode >= 500) {
    auditService.emit('system:error', {
      ...userInfo,
      deviceInfo,
      requestDetails: auditService.getRequestDetails(req, res),
      error: {
        message: responseData?.error || 'Internal server error',
        code: res.statusCode
      },
      metadata: {
        path,
        method
      }
    });
  }
}

/**
 * Extract user information from request
 */
function extractUserInfo(req) {
  const user = req.user || req.session?.user;
  return {
    userId: user?._id || user?.id,
    userEmail: user?.email,
    sessionId: req.sessionID || req.headers['x-session-id']
  };
}

/**
 * Extract resource ID from path
 */
function extractResourceId(path, resourceType) {
  const regex = new RegExp(`/${resourceType}/([a-zA-Z0-9]+)`);
  const match = path.match(regex);
  return match ? match[1] : null;
}

/**
 * Extract resource type from path
 */
function extractResourceType(path) {
  const resources = ['projects', 'contractors', 'users', 'reports', 'files'];
  for (const resource of resources) {
    if (path.includes(`/${resource}`)) {
      return resource.slice(0, -1); // Remove 's' from plural
    }
  }
  return 'resource';
}

/**
 * Map HTTP method to action
 */
function mapMethodToAction(method) {
  const actionMap = {
    'GET': 'view',
    'POST': 'create',
    'PUT': 'update',
    'PATCH': 'update',
    'DELETE': 'delete'
  };
  return actionMap[method] || null;
}

/**
 * Middleware to track specific data operations with before/after data
 */
const trackDataOperation = (operationType, resourceType, getResourceId) => {
  return async (req, res, next) => {
    const resourceId = getResourceId ? getResourceId(req) : req.params.id;
    const userInfo = extractUserInfo(req);
    const deviceInfo = auditService.parseDeviceInfo(req);

    // Store original data for updates and deletes
    let originalData = null;
    if ((operationType === 'update' || operationType === 'delete') && resourceId) {
      try {
        // This should be replaced with actual data fetching logic
        // based on your database structure
        originalData = await fetchResourceData(resourceType, resourceId);
      } catch (error) {
        console.error('Error fetching original data for audit:', error);
      }
    }

    // Store original response methods
    const originalJson = res.json;
    const originalSend = res.send;

    // Override response methods to capture new data
    res.json = function(data) {
      if (res.statusCode < 400) {
        logDataOperation(operationType, {
          ...userInfo,
          resourceType,
          resourceId: resourceId || data?._id || data?.id,
          resourceName: data?.name || data?.projectName || data?.companyName,
          oldData: originalData,
          newData: operationType !== 'delete' ? data : null,
          collection: resourceType.toLowerCase() + 's',
          deviceInfo,
          description: `${operationType} ${resourceType}`,
          metadata: {
            query: req.query,
            params: req.params
          }
        });
      }
      return originalJson.call(this, data);
    };

    res.send = function(data) {
      if (res.statusCode < 400 && typeof data === 'object') {
        logDataOperation(operationType, {
          ...userInfo,
          resourceType,
          resourceId: resourceId || data?._id || data?.id,
          resourceName: data?.name || data?.projectName || data?.companyName,
          oldData: originalData,
          newData: operationType !== 'delete' ? data : null,
          collection: resourceType.toLowerCase() + 's',
          deviceInfo,
          description: `${operationType} ${resourceType}`,
          metadata: {
            query: req.query,
            params: req.params
          }
        });
      }
      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Log data operation
 */
function logDataOperation(operationType, data) {
  const eventMap = {
    'view': 'data:viewed',
    'create': 'data:created',
    'update': 'data:updated',
    'delete': 'data:deleted'
  };

  const event = eventMap[operationType];
  if (event) {
    auditService.emit(event, data);
  }
}

/**
 * Placeholder function to fetch resource data
 * This should be replaced with actual implementation
 */
async function fetchResourceData(resourceType, resourceId) {
  // This is a placeholder - implement based on your database structure
  // Example:
  // const Model = getModelByResourceType(resourceType);
  // return await Model.findById(resourceId);
  return null;
}

/**
 * Middleware to track user activity
 */
const trackUserActivity = () => {
  return (req, res, next) => {
    const user = req.user || req.session?.user;
    if (user) {
      // Update last activity timestamp in session
      if (req.session) {
        req.session.lastActivity = new Date();
      }
      
      // You can also emit a general activity event if needed
      // This is useful for real-time dashboards or activity monitoring
      if (req.method !== 'GET' || req.path.includes('/api/')) {
        auditService.emit('user:activity', {
          userId: user._id || user.id,
          userEmail: user.email,
          path: req.path,
          method: req.method,
          timestamp: new Date()
        });
      }
    }
    next();
  };
};

module.exports = {
  auditMiddleware,
  trackDataOperation,
  trackUserActivity
};