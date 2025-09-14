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
  console.log('✅ SendGrid configured successfully');
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
      'contacts.permissions': { $in: ['admin', 'user', 'contact_manager', 'contact_user', 'contactAdmin', 'contactUser'] }
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

    // Email validation removed - email comes from URL parameter
    if (!email) {
      console.log('❌ No email provided in request body');
      return res.status(400).json({ error: 'אימייל לא סופק' });
    }

    const db = client.db('contractor-crm');

    // Find contact user in any contractor's contacts
    const contractors = await db.collection('contractors').find({
      'contacts.email': email,
      'contacts.permissions': { $in: ['admin', 'user', 'contact_manager', 'contact_user', 'contactAdmin', 'contactUser'] }
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
      from: process.env.SENDGRID_FROM_EMAIL || 'hello@chocoinsurance.com',
      subject: 'קוד אימות למערכת לניהול סיכונים באתרי בניה',
      text: `שלום,\n\nקיבלת בקשה להתחבר למערכת לניהול סיכונים באתרי בניה.\n\nקוד האימות שלך הוא: ${otp}\n\nקוד זה תקף למשך 10 דקות.\n\nאם לא ביקשת להתחבר למערכת, אנא התעלם ממייל זה.\n\nזהו מייל אוטומטי, אנא אל תשיב עליו.`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
          <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header with Logo -->
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-flex; align-items: center; background-color: #882DD7; color: white; padding: 15px 25px; border-radius: 50px; margin-bottom: 20px;">
                <div style="width: 40px; height: 40px; background-color: white; border-radius: 50%; margin-left: 10px; display: flex; align-items: center; justify-content: center; padding: 8px;">
                  <img src="data:image/png;base64,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" alt="שוקו ביטוח" style="width: 24px; height: 24px;" />
                </div>
                <span style="font-size: 18px; font-weight: bold;">שוקו ביטוח</span>
              </div>
              <h1 style="color: #1976d2; margin: 0; font-size: 24px;">מערכת לניהול סיכונים באתרי בניה</h1>
            </div>
            
            <!-- Main Content -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #333; margin-bottom: 20px;">קוד אימות למערכת</h2>
              <p style="color: #666; font-size: 16px; margin-bottom: 25px;">שלום,</p>
              <p style="color: #666; font-size: 16px; margin-bottom: 25px;">קיבלת בקשה להתחבר למערכת לניהול סיכונים באתרי בניה.</p>
              
              <!-- OTP Code Box -->
              <div style="background-color: #f0f8ff; border: 2px solid #1976d2; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <p style="color: #1976d2; font-size: 14px; margin: 0 0 10px 0;">קוד האימות שלך:</p>
                <div style="font-size: 32px; font-weight: bold; color: #1976d2; letter-spacing: 5px; font-family: 'Courier New', monospace;">${otp}</div>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-bottom: 20px;">קוד זה תקף למשך 10 דקות.</p>
              <p style="color: #999; font-size: 12px;">אם לא ביקשת להתחבר למערכת, אנא התעלם ממייל זה.</p>
            </div>
            
            <!-- Footer -->
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <div style="text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                זהו מייל אוטומטי, אנא אל תשיב עליו.<br>
                © 2024 שוקו ביטוח - מערכת לניהול סיכונים באתרי בניה
              </p>
            </div>
          </div>
        </div>
      `
    };

    try {
      console.log('🔍 SendGrid configuration check:');
      console.log('  - SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY);
      console.log('  - SENDGRID_FROM_EMAIL:', process.env.SENDGRID_FROM_EMAIL);
      console.log('  - Email to send to:', email);
      console.log('  - OTP generated:', otp);
      console.log('  - Message object:', JSON.stringify(msg, null, 2));

      // Check if SendGrid is properly configured
      if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY === 'your_sendgrid_api_key_here') {
        console.log('⚠️ SendGrid in development mode - logging OTP to console for:', email);
        console.log('🔑 OTP CODE FOR', email, ':', otp);
        console.log('📧 Email would be sent with beautiful design including Choco logo');
        res.json({
          success: true,
          message: 'קוד אימות נשלח לכתובת האימייל שלך'
        });
      } else {
        console.log('📧 Attempting to send email via SendGrid...');
        console.log('🔑 API Key first 10 chars:', process.env.SENDGRID_API_KEY?.substring(0, 10));
        console.log('📧 From email:', process.env.SENDGRID_FROM_EMAIL);
        // Send email using SendGrid v3 API
        await sgMail.send(msg)
          .then(() => {
            console.log('✅ OTP email sent to:', email);
            res.json({
              success: true,
              message: 'קוד אימות נשלח לכתובת האימייל שלך'
            });
          })
          .catch((error) => {
            console.error('❌ SendGrid error details:');
            console.error('  - Error message:', error.message);
            console.error('  - Error code:', error.code);
            console.error('  - Error response:', error.response?.body);
            console.error('  - Full error:', error);
            throw error; // Re-throw to be caught by outer catch
          });
      }
    } catch (emailError) {
      console.error('❌ SendGrid error:', emailError);
      console.error('❌ Error details:', {
        message: emailError.message,
        code: emailError.code,
        response: emailError.response?.body,
        stack: emailError.stack
      });
      res.status(500).json({
        error: 'שגיאה בשליחת המייל',
        details: emailError.message
      });
    }

  } catch (error) {
    console.error('❌ Send OTP error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      error: 'שגיאה בשליחת קוד האימות',
      details: error.message
    });
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
