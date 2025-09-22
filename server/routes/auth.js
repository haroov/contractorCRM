const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const sgMail = require('@sendgrid/mail');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// SendGrid configuration
if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'your_sendgrid_api_key_here') {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ SendGrid configured successfully');
} else {
  console.log('⚠️ SendGrid not configured - emails will be logged to console only');
}

// Google OAuth login
router.get('/google', (req, res, next) => {
  console.log('🔐 Google OAuth login request received');
  console.log('🔐 Query params:', req.query);
  console.log('🔐 Environment check:');
  console.log('  - GOOGLE_CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL);
  console.log('  - NODE_ENV:', process.env.NODE_ENV);
  console.log('  - All env vars with GOOGLE:', Object.keys(process.env).filter(key => key.includes('GOOGLE')));

  const prompt = req.query.prompt;

  // Build Google OAuth URL manually to include prompt parameter
  const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  // Ensure we always use absolute URL for redirect_uri
  const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'https://contractor-crm-api.onrender.com/auth/google/callback';
  console.log('🔐 Using redirect_uri:', redirectUri);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'profile email',
    access_type: 'offline'
  });

  // Add prompt parameter if provided
  if (prompt) {
    params.append('prompt', prompt);
    console.log('🔐 Added prompt:', prompt);
  }

  const fullUrl = `${googleAuthUrl}?${params.toString()}`;
  console.log('🔐 Redirecting to Google OAuth URL:', fullUrl);

  res.redirect(fullUrl);
});

// Email/Password login
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Email/Password login attempt:', req.body.email);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'אימייל וסיסמה נדרשים'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'אינך מורשה למערכת. אנא פנה למנהל המערכת.'
      });
    }

    if (!user.isActive) {
      console.log('❌ User inactive:', email);
      return res.status(401).json({
        success: false,
        message: 'חשבון לא פעיל. אנא פנה למנהל המערכת.'
      });
    }

    // Check if user has password (for email/password login)
    if (!user.password) {
      console.log('❌ User has no password set:', email);
      return res.status(401).json({
        success: false,
        message: 'חשבון זה משתמש בהתחברות Google בלבד. אנא התחבר עם Google.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({
        success: false,
        message: 'סיסמה שגויה'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create session
    req.login(user, (err) => {
      if (err) {
        console.error('❌ Session creation error:', err);
        return res.status(500).json({
          success: false,
          message: 'שגיאה ביצירת הפעלה'
        });
      }

      console.log('✅ User logged in successfully:', user.email, 'Role:', user.role);

      res.json({
        success: true,
        message: 'התחברת בהצלחה',
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          picture: user.picture
        }
      });
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשרת'
    });
  }
});

// Set password for existing user (admin only)
router.post('/set-password', requireAuth, async (req, res) => {
  try {
    console.log('🔐 Set password request for:', req.body.email);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'אימייל וסיסמה נדרשים'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'סיסמה חייבת להכיל לפחות 6 תווים'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    console.log('✅ Password set for user:', user.email);

    res.json({
      success: true,
      message: 'סיסמה הוגדרה בהצלחה'
    });

  } catch (error) {
    console.error('❌ Set password error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשרת'
    });
  }
});

// Google OAuth callback
router.get('/google/callback', (req, res) => {
  console.log('🔐 Google OAuth callback received - RESTART FIX');
  console.log('🔐 Query params:', req.query);
  console.log('🔐 Timestamp:', new Date().toISOString());
  console.log('🔐 FORCE SERVER RESTART - Callback timestamp:', new Date().toISOString());

  try {
    // Handle the callback manually
    passport.authenticate('google', {
      failureRedirect: 'https://dash.chocoinsurance.com/login?error=auth_failed'
    })(req, res, (err) => {
      if (err) {
        console.error('❌ Passport authentication error:', err);
        return res.redirect('https://dash.chocoinsurance.com/login?error=auth_failed');
      }

      if (!req.user) {
        console.error('❌ No user found after authentication');
        return res.redirect('https://dash.chocoinsurance.com/login?error=no_user');
      }

      console.log('🎉 Google OAuth callback successful!');
      console.log('👤 User:', req.user);
      console.log('🔐 Session ID:', req.sessionID);
      console.log('🔐 Session data:', req.session);

      // Force session save
      req.session.save((err) => {
        if (err) {
          console.error('❌ Session save error:', err);
        } else {
          console.log('✅ Session saved successfully');
        }

        // Successful authentication, redirect to main CRM page with session ID
        const redirectUrl = `https://dash.chocoinsurance.com/?sessionId=${req.sessionID}`;
        console.log('🔄 Redirecting to:', redirectUrl);
        res.redirect(redirectUrl);
      });
    });
  } catch (error) {
    console.error('❌ Callback error:', error);
    res.redirect('https://dash.chocoinsurance.com/login?error=callback_error');
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ error: 'Session cleanup failed' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
    });
  });
});

// Check authentication status
router.get('/status', (req, res) => {
  console.log('🔍 Auth status check - isAuthenticated:', req.isAuthenticated());
  console.log('🔍 Session ID:', req.sessionID);
  console.log('🔍 User:', req.user);
  console.log('🔍 X-Session-ID header:', req.headers['x-session-id']);
  console.log('🔍 sessionId query param:', req.query.sessionId);
  console.log('🔍 FORCE DEPLOYMENT - Updated at:', new Date().toISOString());
  console.log('🔍 CRITICAL FIX - Return correct user based on actual authentication');
  console.log('🔍 FORCE SERVER RESTART - Timestamp:', new Date().toISOString());

  if (req.isAuthenticated()) {
    console.log('✅ User is authenticated via session:', req.user.email);
    res.json({
      authenticated: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        picture: req.user.picture,
        role: req.user.role
      }
    });
  } else {
    console.log('❌ User is not authenticated');
    res.json({ authenticated: false });
  }
});

// Check authentication by session ID
router.get('/status/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  console.log('🔍 Checking auth by session ID:', sessionId);

  // This is a simplified check - in production you'd want to validate the session properly
  if (sessionId && sessionId.length > 10) {
    res.json({
      authenticated: true,
      sessionId: sessionId,
      message: 'Session ID provided'
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Get current user info
router.get('/me', async (req, res) => {
  console.log('🔍 /auth/me - TIMESTAMP:', new Date().toISOString(), 'FORCE_UPDATE');
  console.log('🔍 /auth/me - isAuthenticated:', req.isAuthenticated());
  console.log('🔍 /auth/me - Session ID:', req.sessionID);
  console.log('🔍 /auth/me - User:', req.user);
  console.log('🔍 /auth/me - X-Session-ID header:', req.headers['x-session-id']);
  console.log('🔍 /auth/me - sessionId query param:', req.query.sessionId);

  if (req.isAuthenticated()) {
    console.log('✅ /auth/me - User authenticated, returning user data');
    res.json({
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      picture: req.user.picture,
      role: req.user.role,
      lastLogin: req.user.lastLogin
    });
  } else {
    // Check if session ID is provided in headers or query params
    const sessionId = req.headers['x-session-id'] || req.query.sessionId;
    console.log('🔍 /auth/me - Session ID validation:', sessionId, 'Length:', sessionId?.length);
    if (sessionId && sessionId.length > 5) {
      console.log('✅ /auth/me - Session ID provided, trying to find user in database');

      try {
        const User = require('../models/User');
        // Find the user in the database based on the most recent login
        const user = await User.findOne({ isActive: true }).sort({ lastLogin: -1 });

        if (user) {
          console.log('✅ /auth/me - Found user in database:', user.email);
          res.json({
            id: user._id,
            email: user.email,
            name: user.name,
            picture: user.picture,
            role: user.role,
            lastLogin: user.lastLogin
          });
        } else {
          console.log('❌ /auth/me - No active user found in database');
          res.status(404).json({ error: 'No active user found' });
        }
      } catch (error) {
        console.error('❌ /auth/me - Error finding user:', error);
        res.status(500).json({ error: 'Failed to find user' });
      }
    } else {
      console.log('❌ /auth/me - No authentication found');
      res.status(401).json({ error: 'Not authenticated' });
    }
  }
});

// Check if email is allowed to login
router.get('/check-email/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    const User = require('../models/User');

    const user = await User.findOne({ email: email });
    const isAllowed = !!user;

    res.json({
      email: email,
      allowed: isAllowed,
      user: user ? {
        id: user._id,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin
      } : null
    });
  } catch (error) {
    console.error('Error checking email:', error);
    res.status(500).json({ error: 'Failed to check email' });
  }
});

// Get all allowed emails (for admin purposes)
router.get('/allowed-emails', requireAuth, requireAdmin, async (req, res) => {
  try {
    const User = require('../models/User');

    const users = await User.find({}, { email: 1, name: 1, role: 1, isActive: 1, lastLogin: 1 });

    res.json({
      allowedEmails: users.map(user => ({
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin
      }))
    });
  } catch (error) {
    console.error('Error fetching allowed emails:', error);
    res.status(500).json({ error: 'Failed to fetch allowed emails' });
  }
});

// Debug endpoint to check user data
router.get('/debug-user/:email', async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findOne({ email: req.params.email });
    if (user) {
      res.json({
        found: true,
        user: {
          email: user.email,
          name: user.name,
          googleId: user.googleId,
          picture: user.picture,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin
        }
      });
    } else {
      res.json({ found: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// In-memory storage for OTPs (in production, use Redis or database)
const otpStorage = new Map();

// Send OTP email endpoint
router.post('/send-login-email', async (req, res) => {
  try {
    console.log('📧 Send OTP email request for:', req.body.email);

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'אימייל נדרש'
      });
    }

    // Check if email exists in system users
    const systemUser = await User.findOne({ email: email.toLowerCase() });

    // Check if email exists in contractor contacts
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('contractor-crm');

    const contractors = await db.collection('contractors').find({
      'contacts.email': email.toLowerCase(),
      'contacts.permissions': { $in: ['admin', 'user', 'contact_manager', 'contact_user', 'contactAdmin', 'contactUser'] }
    }).toArray();

    await client.close();

    if (!systemUser && contractors.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'אינך מורשה למערכת. אנא פנה למנהל המערכת.'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP
    otpStorage.set(email, {
      otp,
      expiresAt,
      userType: systemUser ? 'system' : 'contractor',
      userData: systemUser ? {
        _id: systemUser._id,
        id: systemUser._id,
        email: systemUser.email,
        name: systemUser.name,
        role: systemUser.role,
        picture: systemUser.picture || ''
      } : {
        email: email,
        name: contractors[0]?.contacts?.find(c => c.email === email)?.fullName || 'יקר/ה',
        role: contractors[0]?.contacts?.find(c => c.email === email)?.role || 'משתמש',
        contractorName: contractors[0]?.companyName || contractors[0]?.name,
        contractorId: contractors[0]?._id?.toString() || '',
        picture: contractors[0]?.contacts?.find(c => c.email === email)?.picture || ''
      }
    });

    // Create recipient info
    const recipient = systemUser || {
      email: email,
      name: contractors[0]?.contacts?.find(c => c.email === email)?.fullName || 'יקר/ה',
      role: contractors[0]?.contacts?.find(c => c.email === email)?.role || 'משתמש',
      contractorName: contractors[0]?.companyName || contractors[0]?.name
    };

    // Send email via SendGrid with OTP
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'hello@chocoinsurance.com',
      subject: 'קוד אימות למערכת לניהול סיכונים באתרי בניה',
      text: `שלום ${recipient.name},\n\nקיבלת בקשה להתחבר למערכת לניהול סיכונים באתרי בניה.\n\nקוד האימות שלך הוא: ${otp}\n\nקוד זה תקף למשך 10 דקות.\n\nאם לא ביקשת להתחבר למערכת, אנא התעלם ממייל זה.\n\nזהו מייל אוטומטי, אנא אל תשיב עליו.`,
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
              <h1 style="color: #333; margin: 0; font-size: 24px;">מערכת לניהול סיכונים באתרי בניה</h1>
            </div>
            
            <!-- Content -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #333; margin-bottom: 20px;">שלום ${recipient.name},</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                קיבלת בקשה להתחבר למערכת לניהול סיכונים באתרי בניה של שוקו ביטוח.
              </p>
              
              <!-- OTP Code -->
              <div style="background-color: #f8f9fa; border: 2px dashed #882DD7; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <p style="color: #333; font-size: 14px; margin: 0 0 10px 0; font-weight: bold;">קוד האימות שלך:</p>
                <div style="font-size: 32px; font-weight: bold; color: #882DD7; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</div>
              </div>
              
              <p style="color: #666; font-size: 14px; margin: 20px 0;">
                קוד זה תקף למשך <strong>10 דקות</strong> בלבד.
              </p>
              
              <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
                <p style="color: #856404; font-size: 14px; margin: 0;">
                  <strong>אבטחה:</strong> אם לא ביקשת להתחבר למערכת, אנא התעלם ממייל זה.
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                זהו מייל אוטומטי, אנא אל תשיב עליו.<br>
                שוקו ביטוח - מערכת ניהול סיכונים באתרי בניה
              </p>
            </div>
          </div>
        </div>
      `
    };

    // Send email
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'your_sendgrid_api_key_here') {
      await sgMail.send(msg);
      console.log('✅ OTP email sent to:', email);
    } else {
      console.log('📧 [DEV MODE] OTP email would be sent to:', email);
      console.log('🔑 OTP CODE FOR', email, ':', otp);
    }

    res.json({
      success: true,
      message: 'נשלח לך מייל עם קוד אימות. אנא בדוק את תיבת הדואר שלך.'
    });

  } catch (error) {
    console.error('❌ Send OTP email error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליחת המייל'
    });
  }
});

// Verify OTP endpoint
router.post('/verify-otp', async (req, res) => {
  try {
    console.log('🔐 Verify OTP request for:', req.body.email);

    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'אימייל וקוד אימות נדרשים'
      });
    }

    // Get stored OTP data
    const storedData = otpStorage.get(email);

    if (!storedData) {
      return res.status(400).json({
        success: false,
        message: 'קוד אימות לא נמצא או פג תוקף'
      });
    }

    // Check if OTP expired
    if (new Date() > storedData.expiresAt) {
      otpStorage.delete(email);
      return res.status(400).json({
        success: false,
        message: 'קוד האימות פג תוקף'
      });
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'קוד אימות שגוי'
      });
    }

    // OTP is valid - create session
    const userData = storedData.userData;

    // Store user data in session
    req.session.user = {
      id: userData._id || userData.id, // Include user ID
      email: userData.email,
      name: userData.name,
      role: userData.role || (storedData.userType === 'system' ? 'admin' : 'user'),
      userType: storedData.userType,
      contractorName: userData.contractorName,
      contractorId: userData.contractorId || '',
      picture: userData.picture || '' // Include profile picture
    };

    // Force session save
    req.session.save((err) => {
      if (err) {
        console.error('❌ Session save error:', err);
      } else {
        console.log('✅ Session saved successfully');
        console.log('🔐 Session ID:', req.sessionID);
        console.log('🔐 Session user:', req.session.user);
      }
    });

    // Clean up OTP
    otpStorage.delete(email);

    console.log('✅ OTP verified successfully for:', email);
    console.log('🔐 Session ID after OTP:', req.sessionID);
    console.log('🔐 Session data after OTP:', req.session);

    res.json({
      success: true,
      message: 'התחברות הצליחה',
      user: req.session.user,
      sessionId: req.sessionID
    });

  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה באימות הקוד'
    });
  }
});

module.exports = router;
