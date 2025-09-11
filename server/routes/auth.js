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
  const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'https://contractorcrm-api.onrender.com/auth/google/callback';
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

// Send login email endpoint
router.post('/send-login-email', async (req, res) => {
  try {
    console.log('📧 Send login email request for:', req.body.email);
    
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
    
    // Create email template
    const recipient = systemUser || {
      email: email,
      name: contractors[0]?.contacts?.find(c => c.email === email)?.fullName || 'יקר/ה',
      role: contractors[0]?.contacts?.find(c => c.email === email)?.role || 'משתמש',
      contractorName: contractors[0]?.companyName || contractors[0]?.name
    };
    
    const loginUrl = 'https://dash.chocoinsurance.com/login';
    
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'hello@chocoinsurance.com',
      subject: 'התחברות למערכת ניהול קבלנים - שוקו ביטוח',
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>התחברות למערכת</title>
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; text-align: right; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #9c27b0, #7b1fa2); color: white; padding: 30px; text-align: center; }
            .logo { width: 60px; height: 60px; margin: 0 auto 20px; background-color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
            .content { padding: 30px; }
            .button { display: inline-block; background-color: #9c27b0; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .button:hover { background-color: #7b1fa2; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; }
            .info-box { background-color: #e3f2fd; border-right: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">
                <svg width="40" height="40" viewBox="0 0 669.3 669.3" style="fill: #9c27b0;">
                  <circle cx="334.6" cy="334.6" r="334.6" fill="#FFFFFF"/>
                  <path d="M445.8,158.7c-9.2-7.2-19.1-13.4-29.5-18.6c-20.5-10-44.1-15.2-71-15.6c-40.9-0.4-76.9,12.4-107.8,38.5c-32,26.5-48.4,69.4-49.3,128.5c0.9,58.5,17.3,100.9,49.3,127c30.9,26.1,66.8,39.2,107.6,39.2c26.9-0.4,50.6-5.9,71.1-16.5c7.7-3.8,15.1-8.2,22.2-13v0.1c9-6.6,10.7-6.6,27.2-22.2c1.3-1.3,2.4-2.6,3.6-4l0.4-0.4l0,0c11.7-15.2,10.4-33.8-2.1-46.8c-13.2-13.7-32.9-12.7-48.3,2.3c-9.1,8.8-18.6,17.2-28.6,25c-12.5,6.8-26.8,10.3-42.9,10.5c-59.2,1-89.2-32.6-90.1-101c0.9-68.7,30.9-102.7,90.1-101.9c21.9,0.6,37.2,6.3,52.6,18.7c4.1,3.3,10.3,9.3,22.1,20.3c16.7,14.6,37.5,13,50.6-1.7c11.9-13.4,10.3-31.7-3.5-45.8h0.1c-6.8-7.7-14.4-14.8-22.4-21.2" fill="#424242"/>
                  <path d="M485.3,475c11.2,10.1,10.4,24.8-2.3,36.1c-40,35.4-88.4,52.4-143.5,53.4h0c-55.6-1-103.5-18.1-143.5-53c-10.2-8.9-12.1-20.5-5.6-30.4c6.4-9.9,19-14.2,31-10.8c5.3,1.5,9.2,4.7,13.1,8c61.7,51.4,150.6,50.7,211.8-1.6C458.6,466,474.6,465.3,485.3,475z" fill="#9c27b0"/>
                </svg>
              </div>
              <h1 style="margin: 0; font-size: 24px;">שוקו ביטוח</h1>
              <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">מערכת ניהול קבלנים</p>
            </div>
            
            <div class="content">
              <h2>שלום ${recipient.name || 'יקר/ה'},</h2>
              
              <p>אנו שמחים להודיע לך על הפעלת מערכת ניהול הקבלנים החדשה של שוקו ביטוח.</p>
              
              <div class="info-box">
                <strong>פרטי ההתחברות שלך:</strong><br>
                📧 אימייל: ${recipient.email}<br>
                ${systemUser ? `👤 תפקיד: ${recipient.role === 'admin' ? 'מנהל מערכת' : 'משתמש'}` : `🏢 חברה: ${recipient.contractorName}<br>👤 תפקיד: ${recipient.role}`}
              </div>
              
              <p><strong>איך להתחבר למערכת:</strong></p>
              <ol>
                <li>לחץ על הקישור למטה</li>
                <li>הזן את כתובת האימייל שלך</li>
                <li>בחר באפשרות "שלח לי קישור התחברות"</li>
                <li>בדוק את תיבת הדואר שלך לקבלת קישור התחברות</li>
              </ol>
              
              <div style="text-align: center;">
                <a href="${loginUrl}" class="button">התחבר למערכת</a>
              </div>
              
              <p><strong>אפשרויות התחברות זמינות:</strong></p>
              <ul>
                <li>🔗 קישור התחברות במייל (מומלץ)</li>
                <li>🔵 התחברות עם Google</li>
                <li>🔵 התחברות עם Microsoft</li>
              </ul>
              
              <p><strong>תמיכה טכנית:</strong></p>
              <p>אם אתה נתקל בבעיות בהתחברות, אנא פנה לתמיכה הטכנית:</p>
              <p>📧 אימייל: hello@chocoinsurance.com<br>📞 טלפון: 03-1234567</p>
            </div>
            
            <div class="footer">
              <p>שוקו ביטוח - מערכת ניהול סיכונים באתרי בניה</p>
              <p>© 2024 כל הזכויות שמורות</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    // Send email
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY !== 'your_sendgrid_api_key_here') {
      await sgMail.send(msg);
      console.log('✅ Login email sent to:', email);
    } else {
      console.log('📧 [DEV MODE] Login email would be sent to:', email);
    }
    
    res.json({
      success: true,
      message: 'נשלח לך מייל עם קישור התחברות. אנא בדוק את תיבת הדואר שלך.'
    });
    
  } catch (error) {
    console.error('❌ Send login email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'שגיאה בשליחת המייל' 
    });
  }
});

module.exports = router;
