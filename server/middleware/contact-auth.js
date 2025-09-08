// Middleware to check if user is a contact user (manager or user)
const requireContactAuth = async (req, res, next) => {
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
      const contactUserData = JSON.parse(decodedContactUser);
      console.log('✅ Contact user is authenticated via header:', contactUserData.email);
      
      // Load full contact user data from database using ObjectId
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      const db = client.db('contractor-crm');
      
      const contractor = await db.collection('contractors').findOne({ 
        $or: [
          { contractor_id: contactUserData.contractorId },
          { _id: new (require('mongodb')).ObjectId(contactUserData.contractorId) }
        ]
      });
      
      if (contractor) {
        const contact = contractor.contacts.find(c => c.id === contactUserData.id);
        if (contact) {
          const fullContactUser = {
            type: 'contact_user',
            contactId: contact.id,
            contactName: contact.fullName,
            contactEmail: contact.email,
            contactRole: contact.role,
            contactPermissions: contact.permissions,
            contractorId: contractor.contractor_id || contractor._id.toString(),
            contractorName: contractor.companyName,
            contractorIdNumber: contractor.contractorIdNumber
          };
          
          console.log('✅ Full contact user data loaded:', fullContactUser.contactName);
          req.session.contactUser = fullContactUser;
          await client.close();
          return next();
        }
      }
      
      await client.close();
    } catch (error) {
      console.log('❌ Error parsing contact user header:', error);
      return res.status(500).json({ error: 'Internal server error' });
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

  console.log('🔍 Contractor ID comparison:');
  console.log('  - Requested:', requestedContractorId);
  console.log('  - User has access to:', userContractorId);
  console.log('  - Are they equal?', requestedContractorId === userContractorId);

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
