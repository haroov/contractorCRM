const { auditBus } = require('../lib/auditBus');
const crypto = require('crypto');

function auditMiddleware(req, res, next) {
  const requestStart = Date.now();
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
  req.correlationId = correlationId;

  const baseEvent = {
    meta: { correlationId },
    actor: extractActor(req),
    request: extractRequest(req),
  };

  // Fire request.received event
  auditBus.emit('audit', {
    ...baseEvent,
    type: 'request.received',
    data: { headers: redactHeaders(req.headers) },
  });

  res.on('finish', () => {
    const durationMs = Date.now() - requestStart;
    auditBus.emit('audit', {
      ...baseEvent,
      type: 'request.completed',
      data: { statusCode: res.statusCode, durationMs },
    });
  });

  next();
}

function extractActor(req) {
  const actorFromSession = req.session?.user || req.user || req.session?.contactUser;
  if (!actorFromSession) return {};
  return {
    id: actorFromSession._id || actorFromSession.id || actorFromSession.contactId || undefined,
    email: actorFromSession.email || undefined,
    role: actorFromSession.role || undefined,
    userType: actorFromSession.userType || (req.session?.contactUser ? 'contact' : undefined),
    contractorId: actorFromSession.contractorId || undefined,
  };
}

function extractRequest(req) {
  return {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    sessionId: req.sessionID,
    device: req.get('x-device') || undefined,
  };
}

function redactHeaders(headers) {
  const clone = { ...headers };
  if (clone.authorization) clone.authorization = '[redacted]';
  if (clone.cookie) clone.cookie = '[redacted]';
  return clone;
}

module.exports = { auditMiddleware, extractActor, extractRequest };
