const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');
const sgMail = require('@sendgrid/mail');

// MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI);

// SendGrid configuration
// Required environment variables:
// SENDGRID_API_KEY - Your SendGrid API key
// SENDGRID_FROM_EMAIL - Verified sender email address
if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'your_sendgrid_api_key_here') {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  sgMail.setDataResidency('eu'); // Set EU data residency
  console.log('✅ SendGrid configured successfully with EU data residency');
} else {
  console.log('⚠️ SendGrid not configured - OTP emails will be logged to console only');
}

// In-memory storage for OTPs (in production, use Redis or database)
const otpStorage = new Map();

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Check if email exists in system
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'כתובת אימייל נדרשת' });
    }

    const db = client.db('contractor-crm');
    
    // Check if email exists in contractors.contacts
    const contractors = await db.collection('contractors').find({
      'contacts.email': email,
      'contacts.permissions': { $in: ['admin', 'user', 'contact_manager', 'contact_user'] }
    }).toArray();

    if (contractors.length > 0) {
      res.json({ exists: true, message: 'כתובת האימייל נמצאה במערכת' });
    } else {
      res.json({ exists: false, message: 'כתובת האימייל לא נמצאה במערכת' });
    }
  } catch (error) {
    console.error('❌ Check email error:', error);
    res.status(500).json({ error: 'שגיאה בבדיקת כתובת האימייל' });
  }
});

// Send OTP email endpoint
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'נדרש אימייל' });
    }

    const db = client.db('contractor-crm');
    
    // Find contact user in any contractor's contacts
    const contractors = await db.collection('contractors').find({
      'contacts.email': email,
      'contacts.permissions': { $in: ['admin', 'user', 'contact_manager', 'contact_user'] }
    }).toArray();

    if (contractors.length === 0) {
      return res.status(404).json({ 
        error: 'כתובת האימייל לא נמצאה במערכת. אנא פנה למנהל המערכת.' 
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP
    otpStorage.set(email, {
      otp,
      expiresAt,
      contractors: contractors.map(c => ({
        contractorId: c._id.toString(),
        contractorName: c.name,
        contractorIdNumber: c.contractor_id,
        contact: c.contacts.find(contact => contact.email === email)
      }))
    });

    // Send email via SendGrid
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@contractor-crm.com',
      subject: 'קוד אימות למערכת ניהול קבלנים',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1976d2;">קוד אימות למערכת ניהול קבלנים</h2>
          <p>שלום,</p>
          <p>קיבלת בקשה להתחבר למערכת ניהול קבלנים.</p>
          <p><strong>קוד האימות שלך הוא: ${otp}</strong></p>
          <p>קוד זה תקף למשך 10 דקות.</p>
          <p>אם לא ביקשת להתחבר למערכת, אנא התעלם ממייל זה.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            זהו מייל אוטומטי, אנא אל תשיב עליו.
          </p>
        </div>
      `
    };

    try {
      await sgMail.send(msg);
      console.log('✅ OTP email sent to:', email);
      
      res.json({
        success: true,
        message: 'קוד אימות נשלח לכתובת האימייל שלך'
      });
    } catch (emailError) {
      console.error('❌ SendGrid error:', emailError);
      res.status(500).json({ error: 'שגיאה בשליחת המייל' });
    }

  } catch (error) {
    console.error('❌ Send OTP error:', error);
    res.status(500).json({ error: 'שגיאה בשליחת קוד האימות' });
  }
});

// Verify OTP endpoint
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ error: 'נדרש אימייל וקוד אימות' });
    }

    // Check if OTP exists and is valid
    const storedData = otpStorage.get(email);
    
    if (!storedData) {
      return res.status(400).json({ error: 'קוד אימות לא נמצא או פג תוקף' });
    }

    if (new Date() > storedData.expiresAt) {
      otpStorage.delete(email);
      return res.status(400).json({ error: 'קוד האימות פג תוקף' });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ error: 'קוד האימות שגוי' });
    }

    // OTP is valid, check if user has access to multiple contractors
    if (storedData.contractors.length > 1) {
      // User has access to multiple contractors - return list for selection
      return res.json({
        success: true,
        multipleContractors: true,
        contractors: storedData.contractors.map(c => ({
          contractorId: c.contractorId,
          contractorName: c.contractorName,
          contractorIdNumber: c.contractorIdNumber,
          contactRole: c.contact.role,
          contactPermissions: c.contact.permissions
        }))
      });
    }

    // Single contractor - proceed with login
    const contractorData = storedData.contractors[0];
    const contact = contractorData.contact;

    // Create session data for contact user
    const sessionData = {
      type: 'contact_user',
      contactId: contact.id,
      contactName: contact.fullName,
      contactEmail: contact.email,
      contactRole: contact.role,
      contactPermissions: contact.permissions,
      contractorId: contractorData.contractorId,
      contractorName: contractorData.contractorName,
      contractorIdNumber: contractorData.contractorIdNumber
    };

    // Store session data in req.session
    req.session.contactUser = sessionData;
    
    // Clean up OTP
    otpStorage.delete(email);
    
    console.log('✅ Contact user logged in via OTP:', contact.fullName, 'for contractor:', contractorData.contractorName);

    res.json({
      success: true,
      user: {
        id: contact.id,
        name: contact.fullName,
        email: contact.email,
        role: contact.role,
        permissions: contact.permissions,
        contractorId: contractorData.contractorId,
        contractorName: contractorData.contractorName,
        contractorIdNumber: contractorData.contractorIdNumber,
        type: 'contact_user'
      }
    });

  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    res.status(500).json({ error: 'שגיאה באימות הקוד' });
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

// Select contractor for multi-contractor users
router.post('/select-contractor', async (req, res) => {
  try {
    const { email, contractorId } = req.body;
    
    if (!email || !contractorId) {
      return res.status(400).json({ error: 'נדרש אימייל ומזהה קבלן' });
    }

    // Get stored data
    const storedData = otpStorage.get(email);
    
    if (!storedData) {
      return res.status(400).json({ error: 'הסשן פג תוקף' });
    }

    // Find selected contractor
    const contractorData = storedData.contractors.find(c => c.contractorId === contractorId);
    
    if (!contractorData) {
      return res.status(400).json({ error: 'בחירת קבלן לא תקינה' });
    }

    const contact = contractorData.contact;

    // Create session data for contact user
    const sessionData = {
      type: 'contact_user',
      contactId: contact.id,
      contactName: contact.fullName,
      contactEmail: contact.email,
      contactRole: contact.role,
      contactPermissions: contact.permissions,
      contractorId: contractorData.contractorId,
      contractorName: contractorData.contractorName,
      contractorIdNumber: contractorData.contractorIdNumber
    };

    // Store session data in req.session
    req.session.contactUser = sessionData;
    
    // Clean up OTP
    otpStorage.delete(email);
    
    console.log('✅ Contact user selected contractor:', contact.fullName, 'for contractor:', contractorData.contractorName);

    res.json({
      success: true,
      user: {
        id: contact.id,
        name: contact.fullName,
        email: contact.email,
        role: contact.role,
        permissions: contact.permissions,
        contractorId: contractorData.contractorId,
        contractorName: contractorData.contractorName,
        contractorIdNumber: contractorData.contractorIdNumber,
        type: 'contact_user'
      }
    });

  } catch (error) {
    console.error('❌ Select contractor error:', error);
    res.status(500).json({ error: 'שגיאה בבחירת הקבלן' });
  }
});

// Contact user logout
router.post('/logout', (req, res) => {
  req.session.contactUser = null;
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
