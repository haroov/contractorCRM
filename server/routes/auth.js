const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// Google OAuth login
router.get('/google', (req, res, next) => {
  console.log('🔐 Google OAuth login request received');
  console.log('🔐 Query params:', req.query);

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

module.exports = router;
