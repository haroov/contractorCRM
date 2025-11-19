const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');
const sgMail = require('@sendgrid/mail');

// MongoDB connection - create new client for each request to avoid connection issues
let mongoClient = null;

// Helper function to get MongoDB client
async function getMongoClient() {
  if (!mongoClient || !mongoClient.topology || !mongoClient.topology.isConnected()) {
    console.log('🔌 Creating new MongoDB connection');
    mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    console.log('✅ MongoDB connected');
  }
  return mongoClient;
}

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
    // Use case-insensitive search
    const emailLower = email.toLowerCase();

    // First, get all contractors that might have this email
    const allContractors = await db.collection('contractors').find({
      'contacts.permissions': { $in: ['admin', 'user', 'contact_manager', 'contact_user', 'contactAdmin', 'contactUser', 'manager'] }
    }).toArray();

    // Filter contractors where the email matches (case-insensitive)
    const contractors = allContractors.filter(contractor => {
      return contractor.contacts && contractor.contacts.some(contact =>
        contact.email && contact.email.toLowerCase() === emailLower &&
        ['admin', 'user', 'contact_manager', 'contact_user', 'contactAdmin', 'contactUser', 'manager'].includes(contact.permissions)
      );
    });

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
    console.log('📧 /api/contact-auth/send-otp called');
    const { email } = req.body;
    console.log('📧 Email received:', email);

    // Email validation removed - email comes from URL parameter
    if (!email) {
      console.log('❌ No email provided in request body');
      return res.status(400).json({ error: 'אימייל לא סופק' });
    }

    // Connect to MongoDB
    let client;
    try {
      client = await getMongoClient();
      console.log('✅ Connected to MongoDB');
    } catch (connectError) {
      console.error('❌ MongoDB connection error:', connectError);
      return res.status(500).json({ error: 'שגיאה בחיבור למסד הנתונים' });
    }

    const db = client.db('contractor-crm');

    // Find contact user in any contractor's contacts
    // Use case-insensitive search
    const emailLower = email.toLowerCase();

    // First, get all contractors that might have this email
    const allContractors = await db.collection('contractors').find({
      'contacts.permissions': { $in: ['admin', 'user', 'contact_manager', 'contact_user', 'contactAdmin', 'contactUser', 'manager'] }
    }).toArray();

    // Filter contractors where the email matches (case-insensitive)
    const contractors = allContractors.filter(contractor => {
      return contractor.contacts && contractor.contacts.some(contact =>
        contact.email && contact.email.toLowerCase() === emailLower &&
        ['admin', 'user', 'contact_manager', 'contact_user', 'contactAdmin', 'contactUser', 'manager'].includes(contact.permissions)
      );
    });

    console.log(`🔍 Searching for email: ${emailLower}`);
    console.log(`🔍 Total contractors with permissions: ${allContractors.length}`);
    console.log(`🔍 Found ${contractors.length} contractors with this email`);

    if (contractors.length > 0) {
      console.log(`✅ Contractors found:`, contractors.map(c => ({ name: c.name, id: c._id })));
    }

    if (contractors.length === 0) {
      console.log(`❌ No contractors found for email: ${emailLower}`);
      console.log(`🔍 Sample contacts from first contractor:`, allContractors[0]?.contacts?.slice(0, 2));
      // Don't close connection here - it's a shared connection
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
        contact: c.contacts.find(contact => contact.email && contact.email.toLowerCase() === emailLower)
      }))
    });

    console.log(`✅ OTP stored for ${email}, ${contractors.length} contractors`);

    // Don't close connection - it's a shared connection

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
                <div style="width: 40px; height: 40px; background-color: white; border-radius: 50%; margin-left: 10px; display: flex; align-items: center; justify-content: center; padding: 4px;">
                  <img src="https://contractorcrm-api.onrender.com/logo-256.png" alt="שוקו ביטוח" style="width: 32px; height: 32px;" />
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
      const firstContact = storedData.contractors[0].contact;
      return res.json({
        success: true,
        multipleContractors: true,
        contractors: storedData.contractors.map(c => ({
          contractorId: c.contractorId,
          contractorName: c.contractorName,
          contractorIdNumber: c.contractorIdNumber,
          contactRole: c.contact.role,
          contactPermissions: c.contact.permissions
        })),
        contactId: firstContact.id, // Include contact ID for reference
        contactEmail: firstContact.email,
        contactName: firstContact.fullName
      });
    }

    // Single contractor - proceed with login
    const contractorData = storedData.contractors[0];
    const contact = contractorData.contact;

    // Store all contractors the user has access to for switching
    const allContractors = storedData.contractors.map(c => ({
      contractorId: c.contractorId,
      contractorName: c.contractorName,
      contractorIdNumber: c.contractorIdNumber,
      contactRole: c.contact.role,
      contactPermissions: c.contact.permissions
    }));

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
      contractorIdNumber: contractorData.contractorIdNumber,
      allContractors: allContractors // Store all contractors for switching
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
        type: 'contact_user',
        allContractors: allContractors // Include all contractors for frontend
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

    // Store all contractors the user has access to for switching
    const allContractors = storedData.contractors.map(c => ({
      contractorId: c.contractorId,
      contractorName: c.contractorName,
      contractorIdNumber: c.contractorIdNumber,
      contactRole: c.contact.role,
      contactPermissions: c.contact.permissions
    }));

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
      contractorIdNumber: contractorData.contractorIdNumber,
      allContractors: allContractors // Store all contractors for switching
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
        type: 'contact_user',
        allContractors: allContractors // Include all contractors for frontend
      }
    });

  } catch (error) {
    console.error('❌ Select contractor error:', error);
    res.status(500).json({ error: 'שגיאה בבחירת הקבלן' });
  }
});

// Switch contractor for logged-in contact user
router.post('/switch-contractor', async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.session.contactUser) {
      return res.status(401).json({ error: 'לא מאומת' });
    }

    const { contractorId } = req.body;

    if (!contractorId) {
      return res.status(400).json({ error: 'נדרש מזהה קבלן' });
    }

    // Check if user has access to this contractor
    const userContractors = req.session.contactUser.allContractors || [];
    const contractorData = userContractors.find(c => c.contractorId === contractorId);

    if (!contractorData) {
      return res.status(403).json({ error: 'אין לך גישה לקבלן זה' });
    }

    // Update session with new contractor
    req.session.contactUser.contractorId = contractorData.contractorId;
    req.session.contactUser.contractorName = contractorData.contractorName;
    req.session.contactUser.contractorIdNumber = contractorData.contractorIdNumber;

    // Save session
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
        return res.status(500).json({ error: 'שגיאה בשמירת הסשן' });
      }

      console.log('✅ Contact user switched contractor:', req.session.contactUser.contactName, 'to contractor:', contractorData.contractorName);

      res.json({
        success: true,
        user: {
          id: req.session.contactUser.contactId,
          name: req.session.contactUser.contactName,
          email: req.session.contactUser.contactEmail,
          role: req.session.contactUser.contactRole,
          permissions: req.session.contactUser.contactPermissions,
          contractorId: contractorData.contractorId,
          contractorName: contractorData.contractorName,
          contractorIdNumber: contractorData.contractorIdNumber,
          type: 'contact_user',
          allContractors: userContractors
        }
      });
    });

  } catch (error) {
    console.error('❌ Switch contractor error:', error);
    res.status(500).json({ error: 'שגיאה בהחלפת הקבלן' });
  }
});

// Get all contractors for logged-in contact user
router.get('/my-contractors', async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.session.contactUser) {
      return res.status(401).json({ error: 'לא מאומת' });
    }

    let userContractors = req.session.contactUser.allContractors || [];

    // If allContractors is missing or empty, try to load from database
    if (!userContractors || userContractors.length === 0) {
      console.log('⚠️ allContractors missing in session, loading from database');
      try {
        const client = await getMongoClient();
        const db = client.db('contractor-crm');
        const email = req.session.contactUser.contactEmail;
        const emailLower = email.toLowerCase();

        // Get all contractors that have this email
        const allContractors = await db.collection('contractors').find({
          'contacts.permissions': { $in: ['admin', 'user', 'contact_manager', 'contact_user', 'contactAdmin', 'contactUser', 'manager'] }
        }).toArray();

        // Filter contractors where the email matches (case-insensitive)
        const contractors = allContractors.filter(contractor => {
          return contractor.contacts && contractor.contacts.some(contact =>
            contact.email && contact.email.toLowerCase() === emailLower &&
            ['admin', 'user', 'contact_manager', 'contact_user', 'contactAdmin', 'contactUser', 'manager'].includes(contact.permissions)
          );
        });

        if (contractors.length > 0) {
          userContractors = contractors.map(c => ({
            contractorId: c._id.toString(),
            contractorName: c.name,
            contractorIdNumber: c.contractor_id,
            contactRole: c.contacts.find(contact => contact.email && contact.email.toLowerCase() === emailLower)?.role || '',
            contactPermissions: c.contacts.find(contact => contact.email && contact.email.toLowerCase() === emailLower)?.permissions || ''
          }));

          // Update session with contractors
          req.session.contactUser.allContractors = userContractors;
          req.session.save();
          console.log('✅ Loaded contractors from database:', userContractors.length);
        }
      } catch (error) {
        console.error('Error loading contractors from database:', error);
      }
    }

    res.json({
      success: true,
      contractors: userContractors,
      currentContractorId: req.session.contactUser.contractorId
    });

  } catch (error) {
    console.error('❌ Get my contractors error:', error);
    res.status(500).json({ error: 'שגיאה בקבלת רשימת הקבלנים' });
  }
});

// Contact user logout
router.post('/logout', (req, res) => {
  req.session.contactUser = null;
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
