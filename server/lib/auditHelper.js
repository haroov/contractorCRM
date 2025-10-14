const auditService = require('../services/auditService');

/**
 * Add audit context to request object for easier tracking
 */
function addAuditContext(req, context = {}) {
    req.auditContext = {
        ...req.auditContext,
        ...context
    };
}

/**
 * Log authentication events with consistent format
 */
async function logAuthEvent(action, req, user, success = true, metadata = {}) {
    try {
        auditService.logAuthEvent(action, req, user, success, metadata);
    } catch (error) {
        console.error('❌ Failed to log auth event:', error);
    }
}

/**
 * Log CRUD operations with before/after data tracking
 */
async function logCrudOperation(action, req, resourceType, resourceId, resourceName, oldData = null, newData = null, metadata = {}) {
    try {
        const changes = {};
        if (oldData) changes.before = oldData;
        if (newData) changes.after = newData;

        auditService.logCrudEvent(action, req, resourceType, resourceId, resourceName, changes, metadata);
    } catch (error) {
        console.error('❌ Failed to log CRUD operation:', error);
    }
}

/**
 * Create an audit-aware wrapper for database operations
 */
function createAuditAwareOperation(resourceType) {
    return {
        async create(req, data, resourceName) {
            const result = await this.performCreate(data);
            await logCrudOperation('create', req, resourceType, result._id, resourceName, null, data);
            return result;
        },

        async update(req, resourceId, oldData, newData, resourceName) {
            const result = await this.performUpdate(resourceId, newData);
            await logCrudOperation('update', req, resourceType, resourceId, resourceName, oldData, newData);
            return result;
        },

        async delete(req, resourceId, data, resourceName) {
            const result = await this.performDelete(resourceId);
            await logCrudOperation('delete', req, resourceType, resourceId, resourceName, data, null);
            return result;
        },

        async read(req, resourceId, resourceName) {
            const result = await this.performRead(resourceId);
            await logCrudOperation('read', req, resourceType, resourceId, resourceName);
            return result;
        }
    };
}

/**
 * Middleware to automatically track model changes
 */
function auditModelChanges(Model, resourceType) {
    // Override save method
    const originalSave = Model.prototype.save;
    Model.prototype.save = async function (options = {}) {
        const isNew = this.isNew;
        const oldData = isNew ? null : this.toObject();

        const result = await originalSave.call(this, options);

        if (options.auditReq) {
            const action = isNew ? 'create' : 'update';
            const resourceName = this.name || this.title || this._id;

            if (isNew) {
                await logCrudOperation(action, options.auditReq, resourceType, this._id, resourceName, null, this.toObject());
            } else {
                await logCrudOperation(action, options.auditReq, resourceType, this._id, resourceName, oldData, this.toObject());
            }
        }

        return result;
    };

    // Override deleteOne method
    const originalDeleteOne = Model.deleteOne;
    Model.deleteOne = async function (filter, options = {}) {
        if (options.auditReq) {
            const doc = await this.findOne(filter);
            if (doc) {
                const resourceName = doc.name || doc.title || doc._id;
                await logCrudOperation('delete', options.auditReq, resourceType, doc._id, resourceName, doc.toObject(), null);
            }
        }

        return await originalDeleteOne.call(this, filter, options);
    };

    return Model;
}

/**
 * Track file operations
 */
async function logFileOperation(action, req, fileName, fileSize = null, filePath = null, metadata = {}) {
    try {
        auditService.logFileEvent(action, req, fileName, fileSize, {
            ...metadata,
            filePath
        });
    } catch (error) {
        console.error('❌ Failed to log file operation:', error);
    }
}

/**
 * Track security events
 */
async function logSecurityEvent(action, req, description, severity = 'medium', metadata = {}) {
    try {
        auditService.logSecurityEvent(action, req, description, {
            ...metadata,
            severity
        });
    } catch (error) {
        console.error('❌ Failed to log security event:', error);
    }
}

/**
 * Track system events
 */
async function logSystemEvent(action, description, metadata = {}) {
    try {
        auditService.logSystemEvent(action, description, metadata);
    } catch (error) {
        console.error('❌ Failed to log system event:', error);
    }
}

/**
 * Create audit trail for a specific workflow
 */
class AuditTrail {
    constructor(req, workflowName) {
        this.req = req;
        this.workflowName = workflowName;
        this.steps = [];
        this.startTime = Date.now();
    }

    async logStep(action, description, data = {}) {
        const step = {
            action,
            description,
            timestamp: new Date(),
            data,
            duration: Date.now() - this.startTime
        };

        this.steps.push(step);

        // Log individual step
        await auditService.logEvent({
            eventType: 'system',
            action: `${this.workflowName}_${action}`,
            ...auditService.extractUserInfo(this.req),
            ...auditService.extractRequestInfo(this.req),
            description: `${this.workflowName}: ${description}`,
            metadata: {
                workflowName: this.workflowName,
                step: this.steps.length,
                stepData: data
            }
        });
    }

    async complete(success = true, result = {}) {
        const totalDuration = Date.now() - this.startTime;

        await auditService.logEvent({
            eventType: 'system',
            action: `${this.workflowName}_complete`,
            ...auditService.extractUserInfo(this.req),
            ...auditService.extractRequestInfo(this.req),
            success,
            duration: totalDuration,
            description: `${this.workflowName} workflow ${success ? 'completed' : 'failed'}`,
            metadata: {
                workflowName: this.workflowName,
                totalSteps: this.steps.length,
                totalDuration,
                steps: this.steps,
                result
            }
        });
    }
}

/**
 * Decorator for automatic audit logging of controller methods
 */
function auditController(resourceType) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (req, res, ...args) {
            const startTime = Date.now();
            let success = true;
            let error = null;

            try {
                const result = await originalMethod.call(this, req, res, ...args);
                return result;
            } catch (err) {
                success = false;
                error = err;
                throw err;
            } finally {
                const duration = Date.now() - startTime;

                // Log the controller action
                auditService.logEvent({
                    eventType: 'crud',
                    action: propertyKey,
                    ...auditService.extractUserInfo(req),
                    ...auditService.extractRequestInfo(req),
                    resourceType,
                    success,
                    duration,
                    errorMessage: error?.message,
                    description: `Controller method: ${target.constructor.name}.${propertyKey}`,
                    metadata: {
                        controller: target.constructor.name,
                        method: propertyKey,
                        params: req.params,
                        query: req.query
                    }
                });
            }
        };

        return descriptor;
    };
}

/**
 * Batch audit logging for bulk operations
 */
class BatchAuditLogger {
    constructor(req, batchName) {
        this.req = req;
        this.batchName = batchName;
        this.operations = [];
        this.startTime = Date.now();
    }

    addOperation(action, resourceType, resourceId, resourceName, success = true, metadata = {}) {
        this.operations.push({
            action,
            resourceType,
            resourceId,
            resourceName,
            success,
            metadata,
            timestamp: new Date()
        });
    }

    async commit() {
        const totalDuration = Date.now() - this.startTime;
        const successCount = this.operations.filter(op => op.success).length;
        const failureCount = this.operations.length - successCount;

        // Log batch summary
        await auditService.logEvent({
            eventType: 'system',
            action: 'batch_operation',
            ...auditService.extractUserInfo(this.req),
            ...auditService.extractRequestInfo(this.req),
            success: failureCount === 0,
            duration: totalDuration,
            description: `Batch operation: ${this.batchName}`,
            metadata: {
                batchName: this.batchName,
                totalOperations: this.operations.length,
                successCount,
                failureCount,
                operations: this.operations
            }
        });

        // Log individual operations if needed
        for (const operation of this.operations) {
            await auditService.logCrudEvent(
                operation.action,
                this.req,
                operation.resourceType,
                operation.resourceId,
                operation.resourceName,
                {},
                {
                    ...operation.metadata,
                    batchName: this.batchName
                }
            );
        }
    }
}

module.exports = {
    addAuditContext,
    logAuthEvent,
    logCrudOperation,
    createAuditAwareOperation,
    auditModelChanges,
    logFileOperation,
    logSecurityEvent,
    logSystemEvent,
    AuditTrail,
    auditController,
    BatchAuditLogger
};