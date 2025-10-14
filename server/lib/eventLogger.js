const { nanoid } = require('nanoid');
const { getDb } = require('./mongo');

function buildActor(req) {
  try {
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      return {
        type: 'user',
        userId: req.user._id?.toString?.() || null,
        email: req.user.email || null,
        name: req.user.name || null,
        role: req.user.role || null
      };
    }

    if (req.session && req.session.user) {
      const u = req.session.user;
      return {
        type: 'session_user',
        userId: u.id || u._id || null,
        email: u.email || null,
        name: u.name || null,
        role: u.role || null
      };
    }

    if (req.session && req.session.contactUser) {
      const c = req.session.contactUser;
      return {
        type: 'contact_user',
        contactId: c.contactId || null,
        email: c.contactEmail || null,
        name: c.contactName || null,
        role: c.contactRole || null,
        contractorId: c.contractorId || null,
        contractorName: c.contractorName || null
      };
    }

    const header = req.headers?.['x-contact-user'] || req.headers?.['contact-user'];
    if (header) {
      try {
        const decoded = decodeURIComponent(header);
        const parsed = JSON.parse(decoded);
        return {
          type: 'contact_user_header',
          contactId: parsed.id || null,
          email: parsed.email || null,
          name: parsed.fullName || parsed.name || null,
          role: parsed.role || null,
          contractorId: parsed.contractorId || null
        };
      } catch (_) {}
    }
  } catch (_) {}

  return { type: 'anonymous' };
}

function getRequestMetadata(req) {
  const ipHeader = req.headers?.['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || null;
  const ip = Array.isArray(ipHeader) ? ipHeader[0] : (ipHeader?.split(',')[0] || ipHeader);
  return {
    ip: ip || null,
    userAgent: req.headers?.['user-agent'] || null,
    method: req.method,
    path: req.originalUrl || req.url,
    sessionId: req.sessionID || null
  };
}

async function ensureIndexes(db) {
  try {
    const coll = db.collection('events');
    await coll.createIndexes([
      { key: { timestamp: -1 }, name: 'ts_desc' },
      { key: { action: 1, 'entity.type': 1 }, name: 'action_entity' },
      { key: { 'entity.type': 1, 'entity.id': 1, timestamp: -1 }, name: 'entity_ts' },
      { key: { 'actor.userId': 1, timestamp: -1 }, name: 'actor_ts' },
      { key: { correlationId: 1 }, name: 'correlation' }
    ]);
  } catch (err) {
    console.error('Events index creation failed:', err.message);
  }
}

async function initEventLogger() {
  const db = await getDb();
  await ensureIndexes(db);
}

async function logEventInternal(req, event) {
  const db = await getDb();
  const coll = db.collection('events');

  const correlationId = req.correlationId || req.headers?.['x-correlation-id'] || nanoid(12);

  const document = {
    timestamp: new Date(),
    correlationId,
    action: event.action,
    actor: event.actor || buildActor(req),
    entity: event.entity || null,
    request: event.request || getRequestMetadata(req),
    data: event.data || null,
    meta: event.meta || null,
    result: event.result || 'success',
    error: event.error || null
  };

  return coll.insertOne(document);
}

function eventContextMiddleware(req, _res, next) {
  req.correlationId = req.headers?.['x-correlation-id'] || nanoid(12);
  req.actor = () => buildActor(req);
  req.logEvent = async (action, options = {}) => {
    try {
      return await logEventInternal(req, { action, ...options });
    } catch (err) {
      console.error('Event log failure for', action, err.message);
      return null;
    }
  };
  next();
}

module.exports = {
  initEventLogger,
  eventContextMiddleware,
  logEventInternal,
  buildActor,
  getRequestMetadata
};
