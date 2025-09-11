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
      subject: 'קוד אימות למערכת ניהול קבלנים',
      text: `שלום,\n\nקיבלת בקשה להתחבר למערכת ניהול קבלנים.\n\nקוד האימות שלך הוא: ${otp}\n\nקוד זה תקף למשך 10 דקות.\n\nאם לא ביקשת להתחבר למערכת, אנא התעלם ממייל זה.\n\nזהו מייל אוטומטי, אנא אל תשיב עליו.`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
          <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header with Logo -->
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="display: inline-flex; align-items: center; background-color: #882DD7; color: white; padding: 15px 25px; border-radius: 50px; margin-bottom: 20px;">
                <div style="width: 40px; height: 40px; background-color: white; border-radius: 50%; margin-left: 10px; display: flex; align-items: center; justify-content: center; padding: 8px;">
                  <svg width="24" height="24" viewBox="0 0 669.3 669.3" style="fill: #882DD7;">
                    <circle cx="334.6" cy="334.6" r="334.6" fill="#FFFFFF"/>
                    <path d="M445.8,158.7c-9.2-7.2-19.1-13.4-29.5-18.6c-20.5-10-44.1-15.2-71-15.6c-40.9-0.4-76.9,12.4-107.8,38.5c-32,26.5-48.4,69.4-49.3,128.5c0.9,58.5,17.3,100.9,49.3,127c30.9,26.1,66.8,39.2,107.6,39.2c26.9-0.4,50.6-5.9,71.1-16.5c7.7-3.8,15.1-8.2,22.2-13v0.1c9-6.6,10.7-6.6,27.2-22.2c1.3-1.3,2.4-2.6,3.6-4l0.4-0.4l0,0c11.7-15.2,10.4-33.8-2.1-46.8c-13.2-13.7-32.9-12.7-48.3,2.3c-9.1,8.8-18.6,17.2-28.6,25c-12.5,6.8-26.8,10.3-42.9,10.5c-59.2,1-89.2-32.6-90.1-101c0.9-68.7,30.9-102.7,90.1-101.9c21.9,0.6,37.2,6.3,52.6,18.7c4.1,3.3,10.3,9.3,22.1,20.3c16.7,14.6,37.5,13,50.6-1.7c11.9-13.4,10.3-31.7-3.5-45.8h0.1c-6.8-7.7-14.4-14.8-22.4-21.2" fill="#424242"/>
                    <path d="M485.3,475c11.2,10.1,10.4,24.8-2.3,36.1c-40,35.4-88.4,52.4-143.5,53.4h0c-55.6-1-103.5-18.1-143.5-53c-10.2-8.9-12.1-20.5-5.6-30.4c6.4-9.9,19-14.2,31-10.8c5.3,1.5,9.2,4.7,13.1,8c61.7,51.4,150.6,50.7,211.8-1.6C458.6,466,474.6,465.3,485.3,475z" fill="#882DD7"/>
                  </svg>
                </div>
                <span style="font-size: 18px; font-weight: bold;">שוקו ביטוח</span>
              </div>
              <h1 style="color: #1976d2; margin: 0; font-size: 24px;">מערכת ניהול קבלנים</h1>
            </div>
            
            <!-- Main Content -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #333; margin-bottom: 20px;">קוד אימות למערכת</h2>
              <p style="color: #666; font-size: 16px; margin-bottom: 25px;">שלום,</p>
              <p style="color: #666; font-size: 16px; margin-bottom: 25px;">קיבלת בקשה להתחבר למערכת ניהול קבלנים.</p>
              
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
                © 2024 שוקו ביטוח - מערכת ניהול קבלנים
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
