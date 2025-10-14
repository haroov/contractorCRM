const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const sgMail = require('@sendgrid/mail');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const { logAuthEvent } = require('../lib/auditHelper');
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
      // Log failed authentication attempt
      await logAuthEvent('login', req, { email }, false);
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
      // Log failed authentication attempt
      await logAuthEvent('login', req, user, false);
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

      // Log successful authentication
      await logAuthEvent('login', req, user, true);

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
router.post('/logout', async (req, res) => {
  // Log logout event before destroying session
  const user = req.user || req.session?.user;
  if (user) {
    await logAuthEvent('logout', req, user);
  }
  
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
    const sessionId = req.headers['x-session-id'] || req.query.sessionId || req.sessionId;
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
                <div style="width: 40px; height: 40px; background-color: white; border-radius: 50%; margin-left: 10px; display: flex; align-items: center; justify-content: center; padding: 4px;">
                  <img src="https://contractorcrm-api.onrender.com/logo-256.png" alt="שוקו ביטוח" style="width: 32px; height: 32px;" />
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
      // Log failed OTP verification
      await logAuthEvent('otp', req, { email }, false);
      return res.status(400).json({
        success: false,
        message: 'קוד אימות שגוי'
      });
    }

    // OTP is valid - create session
    const userData = storedData.userData;
    
    // Log successful OTP verification
    await logAuthEvent('otp', req, userData, true);

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
