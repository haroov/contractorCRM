const EventService = require('../services/EventService');

/**
 * Middleware לרישום אוטומטי של אירועים
 */
class EventLogger {
  /**
   * Middleware לרישום פעולות CRUD
   * @param {Object} options - אפשרויות
   */
  static crudLogger(options = {}) {
    const {
      entityType,
      getEntityId = (req) => req.params.id,
      getEntityName = (req, res) => null,
      getBeforeData = (req) => null,
      getAfterData = (req, res) => null,
      getMetadata = (req, res) => ({}),
      actions = ['CREATE', 'UPDATE', 'DELETE'],
      skipActions = []
    } = options;

    return async (req, res, next) => {
      // שמירת נתונים לפני השינוי
      let beforeData = null;
      if (getBeforeData) {
        try {
          beforeData = await getBeforeData(req);
        } catch (error) {
          console.warn('⚠️ Could not get before data:', error.message);
        }
      }

      // שמירת הפונקציה המקורית
      const originalSend = res.send;
      const originalJson = res.json;

      // Override של res.send ו res.json
      res.send = function(data) {
        logEvent(req, res, data, beforeData);
        return originalSend.call(this, data);
      };

      res.json = function(data) {
        logEvent(req, res, data, beforeData);
        return originalJson.call(this, data);
      };

      next();
    };

    async function logEvent(req, res, responseData, beforeData) {
      try {
        // בדיקה אם צריך לרשום את האירוע
        const action = getActionFromMethod(req.method);
        if (!actions.includes(action) || skipActions.includes(action)) {
          return;
        }

        // קבלת נתוני המשתמש
        const user = req.user || req.session?.user;
        if (!user) {
          console.warn('⚠️ No user found for event logging');
          return;
        }

        // קבלת נתונים נוספים
        const entityId = getEntityId(req);
        const entityName = getEntityName ? await getEntityName(req, res) : null;
        const afterData = getAfterData ? await getAfterData(req, res) : null;
        const metadata = getMetadata ? await getMetadata(req, res) : {};

        // רישום האירוע
        await EventService.logCrudAction({
          userId: user._id || user.id,
          userEmail: user.email,
          userName: user.name,
          action,
          entityType,
          entityId,
          entityName,
          beforeData,
          afterData,
          metadata: {
            ...metadata,
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionID
        });
      } catch (error) {
        console.error('❌ Error in event logger:', error);
        // לא נזרוק שגיאה כדי לא לשבור את ה-request
      }
    }
  }

  /**
   * Middleware לרישום פעולות אימות
   */
  static authLogger() {
    return async (req, res, next) => {
      const originalSend = res.send;
      const originalJson = res.json;

      res.send = function(data) {
        logAuthEvent(req, res, data);
        return originalSend.call(this, data);
      };

      res.json = function(data) {
        logAuthEvent(req, res, data);
        return originalJson.call(this, data);
      };

      next();
    };

    async function logAuthEvent(req, res, responseData) {
      try {
        // בדיקה אם זה endpoint של אימות
        if (!isAuthEndpoint(req.path)) {
          return;
        }

        const action = getAuthAction(req.path, req.method, res.statusCode);
        const user = req.user || req.session?.user;
        
        // קבלת פרטי המשתמש מהבקשה או מהתגובה
        let userEmail = 'unknown';
        let userName = 'unknown';
        let userId = null;

        if (user) {
          userEmail = user.email;
          userName = user.name;
          userId = user._id || user.id;
        } else if (req.body?.email) {
          userEmail = req.body.email;
        }

        const success = res.statusCode >= 200 && res.statusCode < 400;
        const errorMessage = success ? null : (responseData?.message || 'Unknown error');

        await EventService.logAuthAction({
          userId,
          userEmail,
          userName,
          action,
          success,
          errorMessage,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          sessionId: req.sessionID,
          metadata: {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            body: req.body ? Object.keys(req.body) : null
          }
        });
      } catch (error) {
        console.error('❌ Error in auth event logger:', error);
      }
    }
  }

  /**
   * Middleware לרישום פעולות מערכת
   */
  static systemLogger(options = {}) {
    const {
      entityType = 'SYSTEM',
      getAction = (req) => getActionFromMethod(req.method),
      getEntityId = (req) => null,
      getEntityName = (req) => null,
      getMetadata = (req, res) => ({}),
      actions = ['CREATE', 'UPDATE', 'DELETE', 'READ'],
      skipActions = []
    } = options;

    return async (req, res, next) => {
      const originalSend = res.send;
      const originalJson = res.json;

      res.send = function(data) {
        logSystemEvent(req, res, data);
        return originalSend.call(this, data);
      };

      res.json = function(data) {
        logSystemEvent(req, res, data);
        return originalJson.call(this, data);
      };

      next();
    };

    async function logSystemEvent(req, res, responseData) {
      try {
        const action = getAction(req);
        if (!actions.includes(action) || skipActions.includes(action)) {
          return;
        }

        const user = req.user || req.session?.user;
        if (!user) {
          console.warn('⚠️ No user found for system event logging');
          return;
        }

        const entityId = getEntityId(req);
        const entityName = getEntityName(req);
        const metadata = getMetadata ? await getMetadata(req, res) : {};

        await EventService.logSystemAction({
          userId: user._id || user.id,
          userEmail: user.email,
          userName: user.name,
          action,
          entityType,
          entityId,
          entityName,
          metadata: {
            ...metadata,
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode
          },
          success: res.statusCode >= 200 && res.statusCode < 400,
          errorMessage: res.statusCode >= 400 ? (responseData?.message || 'Unknown error') : null
        });
      } catch (error) {
        console.error('❌ Error in system event logger:', error);
      }
    }
  }

  /**
   * Middleware פשוט לרישום כל הבקשות
   */
  static requestLogger() {
    return async (req, res, next) => {
      const startTime = Date.now();
      
      const originalSend = res.send;
      const originalJson = res.json;

      res.send = function(data) {
        logRequest(req, res, data, startTime);
        return originalSend.call(this, data);
      };

      res.json = function(data) {
        logRequest(req, res, data, startTime);
        return originalJson.call(this, data);
      };

      next();
    };

    async function logRequest(req, res, responseData, startTime) {
      try {
        // רישום רק עבור פעולות חשובות
        if (!isImportantEndpoint(req.path)) {
          return;
        }

        const user = req.user || req.session?.user;
        if (!user) {
          return;
        }

        const duration = Date.now() - startTime;
        const action = getActionFromMethod(req.method);

        await EventService.logSystemAction({
          userId: user._id || user.id,
          userEmail: user.email,
          userName: user.name,
          action,
          entityType: 'SYSTEM',
          entityId: null,
          entityName: req.path,
          metadata: {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration,
            responseSize: responseData ? JSON.stringify(responseData).length : 0
          },
          success: res.statusCode >= 200 && res.statusCode < 400,
          severity: res.statusCode >= 400 ? 'HIGH' : 'LOW'
        });
      } catch (error) {
        console.error('❌ Error in request logger:', error);
      }
    }
  }
}

// Helper functions
function getActionFromMethod(method) {
  const methodMap = {
    'GET': 'READ',
    'POST': 'CREATE',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE'
  };
  return methodMap[method] || 'READ';
}

function getAuthAction(path, method, statusCode) {
  if (path.includes('/login')) {
    return statusCode < 400 ? 'LOGIN' : 'LOGIN_FAILED';
  }
  if (path.includes('/logout')) {
    return 'LOGOUT';
  }
  if (path.includes('/register')) {
    return 'CREATE';
  }
  return 'LOGIN';
}

function isAuthEndpoint(path) {
  return path.includes('/auth') || 
         path.includes('/login') || 
         path.includes('/logout') || 
         path.includes('/register');
}

function isImportantEndpoint(path) {
  // רישום רק עבור endpoints חשובים
  const importantPaths = [
    '/api/contractors',
    '/api/users',
    '/api/projects',
    '/api/files',
    '/api/safety-reports',
    '/api/gis'
  ];
  
  return importantPaths.some(importantPath => path.startsWith(importantPath));
}

module.exports = EventLogger;