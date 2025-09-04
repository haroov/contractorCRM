// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  } else {
    return res.status(401).json({ 
      error: 'Authentication required',
      redirect: '/login'
    });
  }
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

export {
  requireAuth,
  requireAdmin,
  requireEmail
};
