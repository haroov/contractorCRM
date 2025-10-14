/**
 * Authentication middleware
 */

// Check if user is authenticated
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({
    success: false,
    message: 'Authentication required'
  });
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    
    res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
};

// Check if user is active
const requireActiveUser = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    if (req.user && req.user.isActive) {
      return next();
    }
    
    res.status(403).json({
      success: false,
      message: 'Account is inactive'
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
};

module.exports = {
  requireAuth,
  requireAdmin,
  requireActiveUser
};