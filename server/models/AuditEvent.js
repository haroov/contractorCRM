const mongoose = require('mongoose');

const AuditEventSchema = new mongoose.Schema(
  {
    ts: { type: Date, default: Date.now, index: true },
    type: { type: String, required: true, index: true },
    actor: {
      id: { type: String, index: true },
      email: { type: String, index: true },
      role: { type: String },
      userType: { type: String },
    },
    request: {
      method: String,
      path: String,
      ip: String,
      userAgent: String,
      sessionId: String,
      device: String,
    },
    target: {
      collection: String,
      id: String,
      path: String,
      extra: mongoose.Schema.Types.Mixed,
    },
    data: mongoose.Schema.Types.Mixed, // old/new values, payloads
    meta: mongoose.Schema.Types.Mixed, // correlationId, tracing, etc
  },
  { minimize: false }
);

// Helpful compound indexes
AuditEventSchema.index({ 'actor.email': 1, ts: -1 });
AuditEventSchema.index({ 'actor.id': 1, ts: -1 });
AuditEventSchema.index({ type: 1, ts: -1 });
AuditEventSchema.index({ 'request.sessionId': 1, ts: -1 });
AuditEventSchema.index({ 'target.collection': 1, 'target.id': 1, ts: -1 });

module.exports = mongoose.model('AuditEvent', AuditEventSchema);
