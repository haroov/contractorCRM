const { eventBus } = require('../lib/eventBus');
const AuditEvent = require('../models/AuditEvent');

function safeRedact(obj, keysToRedact = ['password', 'otp', 'token', 'authorization', 'cookie']) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (keysToRedact.includes(k.toLowerCase())) {
      result[k] = '***REDACTED***';
    } else if (v && typeof v === 'object') {
      result[k] = safeRedact(v, keysToRedact);
    } else {
      result[k] = v;
    }
  }
  return result;
}

function buildActor(req) {
  const user = req.user || req.session?.user || null;
  return {
    id: user?.id || user?._id || null,
    email: user?.email || null,
    role: user?.role || null,
    userType: user?.userType || (req.isAuthenticated?.() ? 'system' : null),
    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip,
    userAgent: req.headers['user-agent'] || null,
    sessionId: req.sessionID || req.sessionId || null
  };
}

async function persist(event) {
  try {
    const doc = new AuditEvent(event);
    await doc.save();
  } catch (err) {
    console.error('Failed to persist audit event:', err);
  }
}

function emit(type, payload) {
  eventBus.emitEvent('audit', { type, ...payload });
}

function createAuditMiddleware(options = {}) {
  const { redactBodyKeys = ['password', 'otp'] } = options;
  return async function auditMiddleware(req, res, next) {
    const startedAt = Date.now();
    const baseEvent = {
      ts: new Date(),
      type: 'http_request',
      actor: buildActor(req),
      request: {
        method: req.method,
        path: req.originalUrl || req.url,
        query: safeRedact(req.query),
        body: safeRedact(req.body, redactBodyKeys),
        headers: safeRedact({
          'user-agent': req.headers['user-agent'],
          'x-forwarded-for': req.headers['x-forwarded-for'],
          'x-session-id': req.headers['x-session-id']
        })
      },
      meta: {}
    };

    // Hook response end to capture status
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      try {
        const durationMs = Date.now() - startedAt;
        const responseSummary = Array.isArray(body) ? { length: body.length } : (body && typeof body === 'object' ? { keys: Object.keys(body).slice(0, 10) } : { type: typeof body });
        emit('http_response', {
          ...baseEvent,
          type: 'http_response',
          meta: { durationMs, responseSummary, statusCode: res.statusCode }
        });
      } catch (e) {
        // ignore
      }
      return originalJson(body);
    };

    emit('http_request', baseEvent);
    next();
  };
}

// Subscribe once to persist all 'audit' events
let subscribed = false;
function ensureSubscription() {
  if (subscribed) return;
  eventBus.on('audit', persist);
  subscribed = true;
}

module.exports = {
  audit: { emit, persist, createAuditMiddleware, ensureSubscription, buildActor, safeRedact }
};
