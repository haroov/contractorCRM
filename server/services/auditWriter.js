const { auditBus } = require('../lib/auditBus');
const AuditEvent = require('../models/AuditEvent');

// Simple in-memory queue to decouple request path from DB writes
const queue = [];
let draining = false;

function enqueue(event) {
  queue.push(event);
  drain().catch((err) => console.error('Audit drain error:', err));
}

async function drain() {
  if (draining) return;
  draining = true;
  try {
    while (queue.length) {
      const batch = queue.splice(0, 100); // write in batches
      try {
        await AuditEvent.insertMany(batch, { ordered: false });
      } catch (err) {
        console.error('Audit insertMany error:', err?.message || err);
      }
    }
  } finally {
    draining = false;
  }
}

function startAuditWriter() {
  // Ensure indexes are built (non-blocking)
  AuditEvent.init().then(() => {
    /* indexes ready */
  }).catch((err) => {
    console.warn('AuditEvent.init() failed:', err?.message || err);
  });

  auditBus.on('audit', (event) => enqueue({ ...event, ts: event.ts || new Date() }));
}

module.exports = { startAuditWriter };
