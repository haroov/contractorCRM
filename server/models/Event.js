const mongoose = require('mongoose');

// Use a lean, append-only event model for auditability
// This collection can later power undo and full audit trails
const EventSchema = new mongoose.Schema({
  // When the event occurred (not when written); default now
  at: { type: Date, default: Date.now, index: true },

  // High-level category, e.g., auth, contractor, project, system
  domain: { type: String, required: true, index: true },

  // Action verb, e.g., login, logout, create, update, delete, upload
  action: { type: String, required: true, index: true },

  // Actor information (system or user/contact)
  actor: {
    type: {
      id: { type: String, default: null }, // userId or contactId (string for flexibility)
      type: { type: String, enum: ['system', 'user', 'contact'], default: 'system' },
      email: { type: String, default: null },
      name: { type: String, default: null },
      role: { type: String, default: null },
      contractorId: { type: String, default: null },
      contractorName: { type: String, default: null },
      ip: { type: String, default: null },
      userAgent: { type: String, default: null },
      sessionId: { type: String, default: null }
    },
    default: {}
  },

  // Target entity that the action affected
  target: {
    type: {
      collection: { type: String, default: null }, // e.g., contractors, projects, users
      id: { type: String, default: null },
      idType: { type: String, enum: ['objectId', 'string', 'number', null], default: null },
      extra: { type: Object, default: undefined } // optional metadata (non-sensitive)
    },
    default: {}
  },

  // Contextual info for the event. Keep it lightweight; avoid secrets and large blobs.
  context: {
    type: {
      route: { type: String, default: null },
      method: { type: String, default: null },
      query: { type: Object, default: undefined },
      body: { type: Object, default: undefined }, // sanitized
      params: { type: Object, default: undefined }
    },
    default: {}
  },

  // Optional diff for update operations to enable future undo (best-effort, sanitized)
  changes: {
    type: {
      before: { type: Object, default: undefined },
      after: { type: Object, default: undefined },
      fields: { type: [String], default: undefined }
    },
    default: undefined
  },

  // Free-form tags for quick filtering/analytics
  tags: { type: [String], default: undefined },

  // Correlation ID for grouping related events (e.g., requestId, batchId)
  correlationId: { type: String, default: null, index: true }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: false }, // createdAt mirrors write time
  collection: 'events'
});

// Helpful compound indexes for common queries
EventSchema.index({ domain: 1, action: 1, at: -1 });
EventSchema.index({ 'actor.id': 1, at: -1 });
EventSchema.index({ 'target.collection': 1, 'target.id': 1, at: -1 });

module.exports = mongoose.model('Event', EventSchema);
