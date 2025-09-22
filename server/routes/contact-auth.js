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
