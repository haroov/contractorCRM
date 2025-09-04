// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  console.log('🔍 Auth middleware - isAuthenticated:', req.isAuthenticated());
  console.log('🔍 Session ID:', req.sessionID);
  console.log('🔍 User:', req.user);
  console.log('🔍 X-Session-ID header:', req.headers['x-session-id']);
  console.log('🔍 sessionId query param:', req.query.sessionId);
  
  // Check if user is authenticated via session
  if (req.isAuthenticated()) {
    console.log('✅ User is authenticated via session:', req.user.email);
    return next();
  }
  
  // Check if session ID is provided in headers or query params
  const sessionId = req.headers['x-session-id'] || req.query.sessionId;
  if (sessionId && sessionId.length > 10) {
    console.log('✅ Session ID provided, allowing access:', sessionId);
    // For now, allow access if session ID is provided
    // In production, you'd want to validate the session ID properly
    return next();
  }
  
  console.log('❌ User is not authenticated and no valid session ID provided');
  return res.status(401).json({ 
    error: 'Authentication required',
    redirect: '/login'
  });
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  } else {
    return res.status(403).json({ 
      error: 'Admin access required' 
    });
  }
};

// Middleware to check if user has specific email
const requireEmail = (allowedEmails) => {
  return (req, res, next) => {
    if (req.isAuthenticated() && allowedEmails.includes(req.user.email)) {
      return next();
    } else {
      return res.status(403).json({ 
        error: 'Access denied for this email' 
      });
    }
  };
};

module.exports = {
  requireAuth,
  requireAdmin,
  requireEmail
};
