const mongoose = require('mongoose');

const AuditEventSchema = new mongoose.Schema(
  {
    ts: { type: Date, default: Date.now, index: true },
    type: { type: String, required: true, index: true },
    actor: {
      id: { type: String, default: null },
      email: { type: String, default: null, index: true },
      role: { type: String, default: null },
      userType: { type: String, default: null },
      ip: { type: String, default: null },
      userAgent: { type: String, default: null },
      sessionId: { type: String, default: null, index: true },
      device: {
        os: { type: String, default: null },
        browser: { type: String, default: null },
        deviceType: { type: String, default: null }
      }
    },
    request: {
      method: { type: String, default: null },
      path: { type: String, default: null, index: true },
      query: { type: Object, default: {} },
      body: { type: Object, default: {} },
      headers: { type: Object, default: {} }
    },
    target: {
      collection: { type: String, default: null, index: true },
      id: { type: String, default: null, index: true },
      action: { type: String, default: null },
      // for reads, writes, deletes
    },
    changes: {
      before: { type: Object, default: null },
      after: { type: Object, default: null },
      diff: { type: Object, default: null }
    },
    meta: { type: Object, default: {} },
    level: { type: String, enum: ['info', 'warn', 'error'], default: 'info', index: true }
  },
  {
    strict: false,
    minimize: false
  }
);

AuditEventSchema.index({ type: 1, 'actor.email': 1, ts: -1 });
AuditEventSchema.index({ 'target.collection': 1, 'target.id': 1, ts: -1 });
AuditEventSchema.index({ ts: -1 });

module.exports = mongoose.model('AuditEvent', AuditEventSchema);
