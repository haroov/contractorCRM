const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');

// MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI);

// Contact user login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password, contractorId } = req.body;
    
    if (!email || !password || !contractorId) {
      return res.status(400).json({ error: 'Email, password, and contractor ID are required' });
    }

    const db = client.db('contractor-crm');
    
    // Find contractor by ID
    const contractor = await db.collection('contractors').findOne({
      $or: [
        { contractor_id: contractorId },
        { _id: new ObjectId(contractorId) }
      ]
    });

    if (!contractor) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    // Find contact user in contractor's contacts
    const contact = contractor.contacts?.find(c => 
      c.email === email && 
      (c.permissions === 'contact_manager' || c.permissions === 'contact_user')
    );

    if (!contact) {
      return res.status(401).json({ error: 'Contact user not found or not authorized' });
    }

    // For now, we'll use a simple password check
    // In production, you'd want to hash passwords and store them securely
    // For demo purposes, we'll use the contact's mobile number as password
    if (password !== contact.mobile) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Create session data for contact user
    const sessionData = {
      type: 'contact_user',
      contactId: contact.id,
      contactName: contact.fullName,
      contactEmail: contact.email,
      contactRole: contact.role,
      contactPermissions: contact.permissions,
      contractorId: contractor._id.toString(),
      contractorName: contractor.name,
      contractorIdNumber: contractor.contractor_id
    };

    // Store session data in req.session
    req.session.contactUser = sessionData;
    
    console.log('✅ Contact user logged in:', contact.fullName, 'for contractor:', contractor.name);

    res.json({
      success: true,
      user: {
        id: contact.id,
        name: contact.fullName,
        email: contact.email,
        role: contact.role,
        permissions: contact.permissions,
        contractorId: contractor._id.toString(),
        contractorName: contractor.name,
        contractorIdNumber: contractor.contractor_id,
        type: 'contact_user'
      }
    });

  } catch (error) {
    console.error('❌ Contact login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Check contact user authentication status
router.get('/status', (req, res) => {
  if (req.session.contactUser) {
    res.json({
      authenticated: true,
      user: req.session.contactUser
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Contact user logout
router.post('/logout', (req, res) => {
  req.session.contactUser = null;
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
