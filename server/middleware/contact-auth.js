// Middleware to check if user is a contact user (manager or user)
const requireContactAuth = (req, res, next) => {
  console.log('🔍 Contact auth middleware - checking contact user authentication');
  console.log('🔍 Session contactUser:', req.session.contactUser);
  console.log('🔍 Session ID:', req.sessionID);
  console.log('🔍 Session keys:', Object.keys(req.session));
  console.log('🔍 Request headers:', req.headers);
  console.log('🔍 Cookies:', req.headers.cookie);
  
  // Check for contact user in session first
  if (req.session.contactUser) {
    console.log('✅ Contact user is authenticated via session:', req.session.contactUser.contactName);
    return next();
  }
  
  // Check for contact user in request headers (from localStorage)
  const contactUserHeader = req.headers['x-contact-user'];
  if (contactUserHeader) {
    try {
      // Decode the URI encoded contact user data
      const decodedContactUser = decodeURIComponent(contactUserHeader);
      const contactUser = JSON.parse(decodedContactUser);
      console.log('✅ Contact user is authenticated via header:', contactUser.contactName);
      // Store in session for this request
      req.session.contactUser = contactUser;
      return next();
    } catch (error) {
      console.log('❌ Error parsing contact user header:', error);
    }
  }
  
  console.log('❌ Contact user is not authenticated');
  return res.status(401).json({ 
    error: 'Contact user authentication required',
    redirect: '/contact-login'
  });
};

// Middleware to check if contact user is a manager (can edit)
const requireContactManager = (req, res, next) => {
  console.log('🔍 Contact manager middleware - checking manager permissions');
  
  if (req.session.contactUser && req.session.contactUser.contactPermissions === 'contact_manager') {
    console.log('✅ Contact manager is authenticated:', req.session.contactUser.contactName);
    return next();
  }
  
  console.log('❌ Contact manager permissions required');
  return res.status(403).json({ 
    error: 'Contact manager permissions required'
  });
};

// Middleware to check if contact user can access specific contractor
const requireContactContractorAccess = (req, res, next) => {
  console.log('🔍 Contact contractor access middleware');
  
  if (!req.session.contactUser) {
    return res.status(401).json({ error: 'Contact user authentication required' });
  }

  const requestedContractorId = req.params.id || req.params.contractorId || req.body.contractorId;
  const userContractorId = req.session.contactUser.contractorId;

  if (requestedContractorId && requestedContractorId !== userContractorId) {
    console.log('❌ Contact user trying to access different contractor');
    return res.status(403).json({ 
      error: 'Access denied - can only access your own contractor data'
    });
  }

  console.log('✅ Contact user has access to contractor:', userContractorId);
  return next();
};

module.exports = {
  requireContactAuth,
  requireContactManager,
  requireContactContractorAccess
};
