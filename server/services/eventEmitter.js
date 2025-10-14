const EventEmitter = require('events');
const auditService = require('./auditService');

class SystemEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for audit events
   */
  setupEventHandlers() {
    // Listen to audit events and process them
    auditService.on('auditEvent', (auditEvent) => {
      this.processAuditEvent(auditEvent);
    });

    // Listen to specific action events
    auditService.on('action:login', (auditEvent) => {
      this.handleLoginEvent(auditEvent);
    });

    auditService.on('action:logout', (auditEvent) => {
      this.handleLogoutEvent(auditEvent);
    });

    auditService.on('action:delete', (auditEvent) => {
      this.handleDeleteEvent(auditEvent);
    });

    auditService.on('action:create', (auditEvent) => {
      this.handleCreateEvent(auditEvent);
    });

    auditService.on('action:update', (auditEvent) => {
      this.handleUpdateEvent(auditEvent);
    });

    // Listen to security events
    auditService.on('securityEvent', (auditEvent) => {
      this.handleSecurityEvent(auditEvent);
    });

    // Listen to resource-specific events
    auditService.on('resource:contractor', (auditEvent) => {
      this.handleContractorEvent(auditEvent);
    });

    auditService.on('resource:user', (auditEvent) => {
      this.handleUserEvent(auditEvent);
    });

    auditService.on('resource:project', (auditEvent) => {
      this.handleProjectEvent(auditEvent);
    });
  }

  /**
   * Process general audit events
   */
  async processAuditEvent(auditEvent) {
    try {
      // Emit system-wide event
      this.emit('system:audit', auditEvent);

      // Check for suspicious patterns
      await this.checkSuspiciousActivity(auditEvent);

      // Update user activity metrics
      await this.updateUserActivityMetrics(auditEvent);

      // Check for data integrity issues
      await this.checkDataIntegrity(auditEvent);

    } catch (error) {
      console.error('Error processing audit event:', error);
    }
  }

  /**
   * Handle login events
   */
  async handleLoginEvent(auditEvent) {
    try {
      // Emit login event
      this.emit('user:login', auditEvent);

      // Check for unusual login patterns
      await this.checkUnusualLogin(auditEvent);

      // Update login statistics
      await this.updateLoginStatistics(auditEvent);

    } catch (error) {
      console.error('Error handling login event:', error);
    }
  }

  /**
   * Handle logout events
   */
  async handleLogoutEvent(auditEvent) {
    try {
      // Emit logout event
      this.emit('user:logout', auditEvent);

      // Update session statistics
      await this.updateSessionStatistics(auditEvent);

    } catch (error) {
      console.error('Error handling logout event:', error);
    }
  }

  /**
   * Handle delete events
   */
  async handleDeleteEvent(auditEvent) {
    try {
      // Emit delete event
      this.emit('data:delete', auditEvent);

      // Check for bulk delete operations
      if (auditEvent.action.details.recordCount > 10) {
        this.emit('alert:bulkDelete', auditEvent);
      }

      // Check for critical data deletion
      if (this.isCriticalData(auditEvent.action.resource, auditEvent.action.resourceId)) {
        this.emit('alert:criticalDelete', auditEvent);
      }

    } catch (error) {
      console.error('Error handling delete event:', error);
    }
  }

  /**
   * Handle create events
   */
  async handleCreateEvent(auditEvent) {
    try {
      // Emit create event
      this.emit('data:create', auditEvent);

      // Check for bulk create operations
      if (auditEvent.action.details.recordCount > 50) {
        this.emit('alert:bulkCreate', auditEvent);
      }

    } catch (error) {
      console.error('Error handling create event:', error);
    }
  }

  /**
   * Handle update events
   */
  async handleUpdateEvent(auditEvent) {
    try {
      // Emit update event
      this.emit('data:update', auditEvent);

      // Check for sensitive field updates
      if (this.hasSensitiveFieldUpdates(auditEvent)) {
        this.emit('alert:sensitiveUpdate', auditEvent);
      }

      // Check for bulk update operations
      if (auditEvent.action.details.recordCount > 20) {
        this.emit('alert:bulkUpdate', auditEvent);
      }

    } catch (error) {
      console.error('Error handling update event:', error);
    }
  }

  /**
   * Handle security events
   */
  async handleSecurityEvent(auditEvent) {
    try {
      // Emit security event
      this.emit('security:event', auditEvent);

      // Check for security threats
      await this.checkSecurityThreats(auditEvent);

      // Send security alerts
      await this.sendSecurityAlert(auditEvent);

    } catch (error) {
      console.error('Error handling security event:', error);
    }
  }

  /**
   * Handle contractor-specific events
   */
  async handleContractorEvent(auditEvent) {
    try {
      // Emit contractor event
      this.emit('contractor:event', auditEvent);

      // Update contractor statistics
      await this.updateContractorStatistics(auditEvent);

    } catch (error) {
      console.error('Error handling contractor event:', error);
    }
  }

  /**
   * Handle user-specific events
   */
  async handleUserEvent(auditEvent) {
    try {
      // Emit user event
      this.emit('user:event', auditEvent);

      // Update user statistics
      await this.updateUserStatistics(auditEvent);

    } catch (error) {
      console.error('Error handling user event:', error);
    }
  }

  /**
   * Handle project-specific events
   */
  async handleProjectEvent(auditEvent) {
    try {
      // Emit project event
      this.emit('project:event', auditEvent);

      // Update project statistics
      await this.updateProjectStatistics(auditEvent);

    } catch (error) {
      console.error('Error handling project event:', error);
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  async checkSuspiciousActivity(auditEvent) {
    try {
      const { userId, action, deviceInfo, timestamp } = auditEvent;

      // Check for rapid-fire actions (more than 10 actions in 1 minute)
      const oneMinuteAgo = new Date(timestamp.getTime() - 60000);
      const recentEvents = await auditService.getAuditEvents({
        userId,
        startDate: oneMinuteAgo,
        endDate: timestamp
      });

      if (recentEvents.total > 10) {
        this.emit('alert:rapidActivity', {
          userId,
          eventCount: recentEvents.total,
          timeWindow: '1 minute',
          auditEvent
        });
      }

      // Check for unusual IP addresses
      if (deviceInfo.ipAddress && deviceInfo.ipAddress !== 'unknown') {
        const ipEvents = await auditService.getAuditEvents({
          'deviceInfo.ipAddress': deviceInfo.ipAddress,
          startDate: new Date(timestamp.getTime() - 3600000), // 1 hour
          endDate: timestamp
        });

        if (ipEvents.total > 50) {
          this.emit('alert:suspiciousIP', {
            ipAddress: deviceInfo.ipAddress,
            eventCount: ipEvents.total,
            timeWindow: '1 hour',
            auditEvent
          });
        }
      }

    } catch (error) {
      console.error('Error checking suspicious activity:', error);
    }
  }

  /**
   * Check for unusual login patterns
   */
  async checkUnusualLogin(auditEvent) {
    try {
      const { userId, deviceInfo, timestamp } = auditEvent;

      // Check for login from new device/location
      const oneDayAgo = new Date(timestamp.getTime() - 86400000);
      const recentLogins = await auditService.getAuditEvents({
        userId,
        action: 'login',
        startDate: oneDayAgo,
        endDate: timestamp
      });

      const uniqueIPs = new Set();
      recentLogins.events.forEach(event => {
        if (event.deviceInfo?.ipAddress) {
          uniqueIPs.add(event.deviceInfo.ipAddress);
        }
      });

      if (uniqueIPs.size > 3) {
        this.emit('alert:unusualLogin', {
          userId,
          uniqueIPs: Array.from(uniqueIPs),
          auditEvent
        });
      }

    } catch (error) {
      console.error('Error checking unusual login:', error);
    }
  }

  /**
   * Check for security threats
   */
  async checkSecurityThreats(auditEvent) {
    try {
      const { security, action, deviceInfo } = auditEvent;

      // Check for high-risk actions
      if (security.riskLevel === 'critical') {
        this.emit('alert:criticalSecurity', auditEvent);
      }

      // Check for potential brute force attacks
      if (action.action === 'login' && security.riskLevel === 'high') {
        this.emit('alert:potentialBruteForce', auditEvent);
      }

      // Check for data exfiltration attempts
      if (action.action === 'export' && action.details.recordCount > 1000) {
        this.emit('alert:potentialDataExfiltration', auditEvent);
      }

    } catch (error) {
      console.error('Error checking security threats:', error);
    }
  }

  /**
   * Send security alert
   */
  async sendSecurityAlert(auditEvent) {
    try {
      // This would integrate with your alerting system
      // For now, we'll just emit an event
      this.emit('security:alert', {
        level: auditEvent.security.riskLevel,
        event: auditEvent,
        timestamp: new Date(),
        message: `Security event detected: ${auditEvent.action.action} on ${auditEvent.action.resource}`
      });

    } catch (error) {
      console.error('Error sending security alert:', error);
    }
  }

  /**
   * Check if data is critical
   */
  isCriticalData(resource, resourceId) {
    const criticalResources = ['user', 'system', 'security'];
    return criticalResources.includes(resource);
  }

  /**
   * Check if update contains sensitive fields
   */
  hasSensitiveFieldUpdates(auditEvent) {
    const sensitiveFields = ['password', 'email', 'role', 'permissions', 'apiKey'];
    const { oldValues, newValues } = auditEvent.action;
    
    if (!oldValues || !newValues) return false;

    return sensitiveFields.some(field => {
      return oldValues[field] !== newValues[field];
    });
  }

  /**
   * Update user activity metrics
   */
  async updateUserActivityMetrics(auditEvent) {
    try {
      // This would update metrics in your metrics system
      this.emit('metrics:userActivity', {
        userId: auditEvent.userId,
        action: auditEvent.action.action,
        resource: auditEvent.action.resource,
        timestamp: auditEvent.timestamp
      });

    } catch (error) {
      console.error('Error updating user activity metrics:', error);
    }
  }

  /**
   * Update login statistics
   */
  async updateLoginStatistics(auditEvent) {
    try {
      this.emit('metrics:login', {
        userId: auditEvent.userId,
        deviceType: auditEvent.deviceInfo?.deviceType,
        ipAddress: auditEvent.deviceInfo?.ipAddress,
        timestamp: auditEvent.timestamp
      });

    } catch (error) {
      console.error('Error updating login statistics:', error);
    }
  }

  /**
   * Update session statistics
   */
  async updateSessionStatistics(auditEvent) {
    try {
      this.emit('metrics:session', {
        userId: auditEvent.userId,
        sessionDuration: auditEvent.sessionInfo?.duration,
        timestamp: auditEvent.timestamp
      });

    } catch (error) {
      console.error('Error updating session statistics:', error);
    }
  }

  /**
   * Update contractor statistics
   */
  async updateContractorStatistics(auditEvent) {
    try {
      this.emit('metrics:contractor', {
        action: auditEvent.action.action,
        resourceId: auditEvent.action.resourceId,
        userId: auditEvent.userId,
        timestamp: auditEvent.timestamp
      });

    } catch (error) {
      console.error('Error updating contractor statistics:', error);
    }
  }

  /**
   * Update user statistics
   */
  async updateUserStatistics(auditEvent) {
    try {
      this.emit('metrics:user', {
        action: auditEvent.action.action,
        resourceId: auditEvent.action.resourceId,
        userId: auditEvent.userId,
        timestamp: auditEvent.timestamp
      });

    } catch (error) {
      console.error('Error updating user statistics:', error);
    }
  }

  /**
   * Update project statistics
   */
  async updateProjectStatistics(auditEvent) {
    try {
      this.emit('metrics:project', {
        action: auditEvent.action.action,
        resourceId: auditEvent.action.resourceId,
        userId: auditEvent.userId,
        timestamp: auditEvent.timestamp
      });

    } catch (error) {
      console.error('Error updating project statistics:', error);
    }
  }

  /**
   * Check data integrity
   */
  async checkDataIntegrity(auditEvent) {
    try {
      const { action } = auditEvent;

      // Check for data consistency issues
      if (action.action === 'update' && action.oldValues && action.newValues) {
        // Check for data type changes
        const oldKeys = Object.keys(action.oldValues);
        const newKeys = Object.keys(action.newValues);

        if (oldKeys.length !== newKeys.length) {
          this.emit('alert:dataIntegrity', {
            type: 'fieldCountMismatch',
            auditEvent
          });
        }
      }

    } catch (error) {
      console.error('Error checking data integrity:', error);
    }
  }

  /**
   * Get event statistics
   */
  getEventStatistics() {
    const listeners = this.eventNames();
    return {
      totalListeners: listeners.length,
      listeners: listeners,
      maxListeners: this.getMaxListeners()
    };
  }

  /**
   * Cleanup old events (for memory management)
   */
  cleanup() {
    // Remove all listeners
    this.removeAllListeners();
  }
}

// Create singleton instance
const systemEventEmitter = new SystemEventEmitter();

module.exports = systemEventEmitter;