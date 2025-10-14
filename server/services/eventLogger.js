const { randomUUID } = require('crypto');
const mongoose = require('mongoose');
const Event = require('../models/Event');

// Fields that should never be logged
const SENSITIVE_KEYS = new Set([
  'password', 'currentPassword', 'newPassword', 'confirmPassword',
  'otp', 'code', 'token', 'accessToken', 'refreshToken', 'authorization',
  'secret', 'clientSecret', 'apiKey', 'sendgridApiKey', 'creditCard', 'cc',
]);

function redact(value) {
  if (value == null) return value;
  if (typeof value === 'string') return '[REDACTED]';
  if (typeof value === 'number' || typeof value === 'boolean') return '[REDACTED]';
  if (Array.isArray(value)) return value.map(() => '[REDACTED]');
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).map(k => [k, '[REDACTED]']));
  return '[REDACTED]';
}

function sanitizeObject(obj, depth = 0) {
  if (!obj || typeof obj !== 'object') return obj;
  if (depth > 3) return '[Truncated]';
  const out = Array.isArray(obj) ? [] : {};
  const entries = Array.isArray(obj) ? obj.entries() : Object.entries(obj);
  for (const [key, rawVal] of entries) {
    const k = Array.isArray(obj) ? key : key;
    const val = Array.isArray(obj) ? obj[key] : rawVal;
    if (!Array.isArray(obj) && SENSITIVE_KEYS.has(k)) {
      out[k] = redact(val);
      continue;
    }
    if (val && typeof val === 'object') {
      if (val instanceof Buffer) {
        out[k] = `[Buffer ${val.length} bytes]`;
      } else if (val instanceof Date) {
        out[k] = val.toISOString();
      } else if (val && val._id && mongoose.isValidObjectId(val._id)) {
        out[k] = { _id: val._id.toString() };
      } else {
        out[k] = sanitizeObject(val, depth + 1);
      }
    } else {
      out[k] = val;
    }
  }
  return out;
}

function buildActor(req) {
  const actorFromSession = req.session?.user
    ? {
        id: req.session.user.id?.toString?.() || null,
        type: 'user',
        email: req.session.user.email || null,
        name: req.session.user.name || null,
        role: req.session.user.role || null,
        contractorId: req.session.user.contractorId || null,
        contractorName: req.session.user.contractorName || null,
      }
    : req.session?.contactUser
    ? {
        id: req.session.contactUser.contactId || null,
        type: 'contact',
        email: req.session.contactUser.contactEmail || null,
        name: req.session.contactUser.contactName || null,
        role: req.session.contactUser.contactRole || null,
        contractorId: req.session.contactUser.contractorId || null,
        contractorName: req.session.contactUser.contractorName || null,
      }
    : { type: 'system' };

  return {
    ...actorFromSession,
    ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null,
    userAgent: req.headers['user-agent'] || null,
    sessionId: req.sessionID || null,
  };
}

async function logEvent({
  domain,
  action,
  req,
  target = {},
  context = {},
  changes = undefined,
  tags = undefined,
  correlationId = undefined,
  at = new Date(),
}) {
  try {
    const eventDoc = new Event({
      at,
      domain,
      action,
      actor: req ? buildActor(req) : { type: 'system' },
      target: {
        collection: target.collection || null,
        id: target.id != null ? String(target.id) : null,
        idType: target.idType || null,
        extra: target.extra ? sanitizeObject(target.extra) : undefined,
      },
      context: req
        ? {
            route: req.originalUrl || req.url,
            method: req.method,
            query: sanitizeObject(req.query),
            body: sanitizeObject(req.body),
            params: sanitizeObject(req.params),
          }
        : sanitizeObject(context),
      changes: changes
        ? {
            before: changes.before ? sanitizeObject(changes.before) : undefined,
            after: changes.after ? sanitizeObject(changes.after) : undefined,
            fields: Array.isArray(changes.fields) ? changes.fields.slice(0, 100) : undefined,
          }
        : undefined,
      tags,
      correlationId: correlationId || req?.headers['x-correlation-id'] || randomUUID(),
    });

    await eventDoc.save();
  } catch (err) {
    // Swallow logging errors to avoid breaking the main flow
    console.error('⚠️ Event logging failed:', err.message);
  }
}

module.exports = {
  logEvent,
  sanitizeObject,
};
