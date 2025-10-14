const { logEvent, sanitizeObject } = require('../services/eventLogger');

// Utility to infer domain and action if not explicitly set
function inferDomainAndAction(req) {
  // Domain: first path segment after optional leading '/api'
  const url = req.originalUrl || req.url || '';
  const clean = url.replace(/^\/?api\/?/, '');
  const first = clean.split('?')[0].split('/').filter(Boolean)[0] || 'system';

  // Action from method
  const method = (req.method || 'GET').toUpperCase();
  let action = 'request';
  if (method === 'POST') action = 'create';
  else if (method === 'PUT' || method === 'PATCH') action = 'update';
  else if (method === 'DELETE') action = 'delete';

  return { domain: first, action };
}

function auditMiddleware() {
  return (req, res, next) => {
    const startedAt = Date.now();

    // Expose helpers for routes to provide richer context
    const auditState = {
      domain: null,
      action: null,
      target: null,
      changes: null,
      tags: null,
      correlationId: null,
    };

    req.audit = {
      setDomain(domain) { auditState.domain = domain; },
      setAction(action) { auditState.action = action; },
      setTarget(target) { auditState.target = target; },
      setChanges(changes) { auditState.changes = changes; },
      setTags(tags) { auditState.tags = tags; },
      setCorrelationId(id) { auditState.correlationId = id; },
      getState() { return { ...auditState }; },
    };

    // After response finishes, log if needed
    res.on('finish', async () => {
      try {
        const method = (req.method || 'GET').toUpperCase();
        const shouldAutoLog = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
        const explicit = auditState.domain || auditState.action;
        if (!shouldAutoLog && !explicit) return;

        const { domain: inferredDomain, action: inferredAction } = inferDomainAndAction(req);

        // Build default target from route
        const firstSegment = (req.originalUrl || req.url || '').replace(/^\/?api\/?/, '').split('?')[0].split('/').filter(Boolean)[0] || null;
        const defaultTarget = {
          collection: firstSegment,
          id: req.params?.id ? String(req.params.id) : null,
          idType: req.params?.id ? (req.params.id.length === 24 ? 'objectId' : 'string') : null,
        };

        await logEvent({
          domain: auditState.domain || inferredDomain,
          action: auditState.action || inferredAction,
          req,
          target: auditState.target || defaultTarget,
          context: {
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt,
          },
          changes: auditState.changes || undefined,
          tags: auditState.tags || undefined,
          correlationId: auditState.correlationId || undefined,
        });
      } catch (err) {
        // Never throw from logger
        // eslint-disable-next-line no-console
        console.error('⚠️ Audit middleware logging failed:', err.message);
      }
    });

    next();
  };
}

module.exports = { auditMiddleware };
