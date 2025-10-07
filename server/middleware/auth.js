// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  console.log('🔍 Auth middleware - isAuthenticated:', req.isAuthenticated());
  console.log('🔍 Session ID:', req.sessionID);
  console.log('🔍 User:', req.user);
  console.log('🔍 Session user:', req.session?.user);
  console.log('🔍 X-Session-ID header:', req.headers['x-session-id']);
  console.log('🔍 sessionId query param:', req.query.sessionId);
  console.log('🔍 Cookies:', req.headers.cookie);
  console.log('🔍 All session data:', req.session);
  
  // Check if user is authenticated via passport session
  if (req.isAuthenticated()) {
    console.log('✅ User is authenticated via passport session:', req.user.email);
    return next();
  }
  
  // Check if user is authenticated via custom session (OTP login)
  if (req.session?.user) {
    console.log('✅ User is authenticated via custom session:', req.session.user.email);
    return next();
  }
  
  // REMOVED: Insecure session ID bypass - this was a major security vulnerability
  // Session IDs should be validated against a secure session store, not just checked for length
  
  console.log('❌ User is not authenticated and no valid session ID provided');
  return res.status(401).json({ 
    error: 'Authentication required',
    redirect: '/login'
  });
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  console.log('🔍 Admin middleware - isAuthenticated:', req.isAuthenticated());
  console.log('🔍 User role:', req.user?.role);
  console.log('🔍 Session user role:', req.session?.user?.role);
  console.log('🔍 X-Session-ID header:', req.headers['x-session-id']);
  
  // Check if user is authenticated via passport session and is admin
  if (req.isAuthenticated() && req.user.role === 'admin') {
    console.log('✅ User is admin via passport session:', req.user.email);
    return next();
  }
  
  // Check if user is authenticated via custom session and is admin
  if (req.session?.user && req.session.user.role === 'admin') {
    console.log('✅ User is admin via custom session:', req.session.user.email);
    return next();
  }
  
  // REMOVED: Insecure session ID bypass - this was a major security vulnerability
  // Admin access should require proper authentication, not just any session ID
  
  console.log('❌ Admin access denied - no valid session or session ID');
  return res.status(403).json({ 
    error: 'Admin access required' 
  });
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
