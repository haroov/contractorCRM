const auditService = require('../services/auditService');

/**
 * Helper functions for integrating audit logging into existing operations
 */

/**
 * Wrap MongoDB operations with audit logging
 */
const auditMongoOperation = (operation, resourceType) => {
  return async function(...args) {
    const startTime = Date.now();
    let result = null;
    let error = null;
    let oldData = null;

    try {
      // Get old data for update and delete operations
      if (operation === 'updateOne' || operation === 'findOneAndUpdate' || 
          operation === 'deleteOne' || operation === 'findOneAndDelete') {
        const filter = args[0];
        oldData = await this.model(this.modelName || resourceType).findOne(filter).lean();
      }

      // Execute the original operation
      result = await this.constructor.prototype[operation].apply(this, args);

      // Log successful operation
      const eventData = {
        userId: this.options?.userId,
        userEmail: this.options?.userEmail,
        sessionId: this.options?.sessionId,
        resourceType: resourceType || this.modelName,
        resourceId: result?._id || oldData?._id,
        collection: this.collection?.name,
        responseTime: Date.now() - startTime
      };

      // Emit appropriate event based on operation
      if (operation.includes('insert') || operation.includes('create')) {
        auditService.emit('data:created', {
          ...eventData,
          data: result
        });
      } else if (operation.includes('update')) {
        auditService.emit('data:updated', {
          ...eventData,
          oldData,
          newData: result
        });
      } else if (operation.includes('delete')) {
        auditService.emit('data:deleted', {
          ...eventData,
          data: oldData
        });
      } else if (operation.includes('find') && !operation.includes('update') && !operation.includes('delete')) {
        auditService.emit('data:viewed', {
          ...eventData,
          description: `Viewed ${resourceType || this.modelName}`
        });
      }

      return result;
    } catch (err) {
      error = err;
      
      // Log error
      auditService.emit('system:error', {
        userId: this.options?.userId,
        userEmail: this.options?.userEmail,
        error: {
          message: err.message,
          stack: err.stack,
          code: err.code
        },
        metadata: {
          operation,
          resourceType: resourceType || this.modelName,
          args: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg).substring(0, 100) : arg)
        }
      });

      throw err;
    }
  };
};

/**
 * Add audit context to request
 */
const addAuditContext = (req) => {
  const user = req.user || req.session?.user;
  return {
    userId: user?._id || user?.id,
    userEmail: user?.email,
    userName: user?.name,
    userRole: user?.role,
    sessionId: req.sessionID || req.headers['x-session-id'],
    deviceInfo: auditService.parseDeviceInfo(req)
  };
};

/**
 * Log project operations
 */
const logProjectOperation = async (operation, req, projectData, oldData = null) => {
  const context = addAuditContext(req);
  
  const eventData = {
    ...context,
    action: operation,
    projectId: projectData?._id || projectData?.id,
    projectName: projectData?.projectName,
    metadata: {
      query: req.query,
      params: req.params
    }
  };

  if (operation === 'update' && oldData) {
    eventData.changes = {
      collection: 'projects',
      documentId: projectData._id,
      operation: 'UPDATE',
      fieldChanges: auditService.calculateFieldChanges(oldData, projectData),
      oldData,
      newData: projectData
    };
  }

  auditService.emit('project:action', eventData);
};

/**
 * Log contractor operations
 */
const logContractorOperation = async (operation, req, contractorData, oldData = null) => {
  const context = addAuditContext(req);
  
  const eventData = {
    ...context,
    action: operation,
    contractorId: contractorData?._id || contractorData?.id,
    contractorName: contractorData?.companyName,
    metadata: {
      query: req.query,
      params: req.params
    }
  };

  if (operation === 'update' && oldData) {
    eventData.changes = {
      collection: 'contractors',
      documentId: contractorData._id,
      operation: 'UPDATE',
      fieldChanges: auditService.calculateFieldChanges(oldData, contractorData),
      oldData,
      newData: contractorData
    };
  }

  auditService.emit('contractor:action', eventData);
};

/**
 * Log file operations
 */
const logFileOperation = async (operation, req, fileData) => {
  const context = addAuditContext(req);
  
  const eventMap = {
    'upload': 'file:uploaded',
    'download': 'file:downloaded',
    'delete': 'file:deleted'
  };

  const event = eventMap[operation];
  if (event) {
    auditService.emit(event, {
      ...context,
      fileName: fileData.originalname || fileData.filename,
      fileId: fileData.id || fileData._id,
      fileSize: fileData.size,
      mimeType: fileData.mimetype || fileData.contentType,
      projectId: req.body?.projectId || req.params?.projectId
    });
  }
};

/**
 * Log authentication events
 */
const logAuthEvent = async (eventType, req, userData, success = true) => {
  const deviceInfo = auditService.parseDeviceInfo(req);
  
  switch(eventType) {
    case 'login':
      if (success) {
        auditService.emit('auth:login', {
          userId: userData._id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          sessionId: req.sessionID,
          deviceInfo,
          requestDetails: auditService.getRequestDetails(req),
          loginMethod: userData.provider || 'email'
        });
      } else {
        auditService.emit('auth:failed', {
          email: req.body?.email || userData?.email,
          deviceInfo,
          requestDetails: auditService.getRequestDetails(req),
          error: 'Invalid credentials',
          errorCode: 'AUTH_FAILED'
        });
      }
      break;
      
    case 'logout':
      auditService.emit('auth:logout', {
        userId: userData?._id,
        email: userData?.email,
        sessionId: req.sessionID,
        deviceInfo
      });
      break;
      
    case 'otp':
      auditService.emit('auth:otp', {
        email: userData?.email || req.body?.email,
        verified: req.body?.otp ? true : false,
        success,
        deviceInfo
      });
      break;
  }
};

/**
 * Log report generation
 */
const logReportGeneration = async (req, reportData) => {
  const context = addAuditContext(req);
  
  auditService.emit('report:generated', {
    ...context,
    reportType: reportData.type,
    reportId: reportData.id,
    reportName: reportData.name,
    format: reportData.format,
    parameters: reportData.parameters
  });
};

/**
 * Log email operations
 */
const logEmailOperation = async (req, emailData, success = true) => {
  const context = addAuditContext(req);
  
  auditService.emit('email:sent', {
    ...context,
    recipient: emailData.to,
    subject: emailData.subject,
    template: emailData.template,
    success,
    error: emailData.error
  });
};

/**
 * Create audit-aware database operation
 */
const createAuditAwareOperation = (db, collectionName) => {
  return {
    async insertOne(doc, options = {}) {
      const context = options.auditContext || {};
      const result = await db.collection(collectionName).insertOne(doc, options);
      
      if (result.acknowledged) {
        auditService.emit('data:created', {
          ...context,
          resourceType: collectionName,
          resourceId: result.insertedId.toString(),
          collection: collectionName,
          data: { ...doc, _id: result.insertedId }
        });
      }
      
      return result;
    },
    
    async updateOne(filter, update, options = {}) {
      const context = options.auditContext || {};
      const oldDoc = await db.collection(collectionName).findOne(filter);
      const result = await db.collection(collectionName).updateOne(filter, update, options);
      
      if (result.acknowledged && result.modifiedCount > 0) {
        const newDoc = await db.collection(collectionName).findOne(filter);
        auditService.emit('data:updated', {
          ...context,
          resourceType: collectionName,
          resourceId: oldDoc?._id?.toString(),
          collection: collectionName,
          oldData: oldDoc,
          newData: newDoc
        });
      }
      
      return result;
    },
    
    async deleteOne(filter, options = {}) {
      const context = options.auditContext || {};
      const doc = await db.collection(collectionName).findOne(filter);
      const result = await db.collection(collectionName).deleteOne(filter, options);
      
      if (result.acknowledged && result.deletedCount > 0) {
        auditService.emit('data:deleted', {
          ...context,
          resourceType: collectionName,
          resourceId: doc?._id?.toString(),
          collection: collectionName,
          data: doc
        });
      }
      
      return result;
    },
    
    async findOne(filter, options = {}) {
      const context = options.auditContext || {};
      const result = await db.collection(collectionName).findOne(filter, options);
      
      if (result && context.logViews !== false) {
        auditService.emit('data:viewed', {
          ...context,
          resourceType: collectionName,
          resourceId: result._id?.toString(),
          collection: collectionName,
          description: `Viewed ${collectionName} document`
        });
      }
      
      return result;
    },
    
    // Delegate other methods to the original collection
    find(...args) {
      return db.collection(collectionName).find(...args);
    },
    
    aggregate(...args) {
      return db.collection(collectionName).aggregate(...args);
    },
    
    createIndex(...args) {
      return db.collection(collectionName).createIndex(...args);
    }
  };
};

module.exports = {
  auditMongoOperation,
  addAuditContext,
  logProjectOperation,
  logContractorOperation,
  logFileOperation,
  logAuthEvent,
  logReportGeneration,
  logEmailOperation,
  createAuditAwareOperation
};