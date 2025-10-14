const EventEmitter = require('events');

class AuditBus extends EventEmitter {}

// Singleton instance
const auditBus = new AuditBus();

module.exports = { auditBus };
