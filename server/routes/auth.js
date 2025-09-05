const express = require('express');
const passport = require('passport');
const router = express.Router();

// Google OAuth login
router.get('/google', (req, res, next) => {
  console.log('🔐 Google OAuth login request received');
  console.log('🔐 Query params:', req.query);
  
  const prompt = req.query.prompt;
  const approvalPrompt = req.query.approval_prompt;
  const authOptions = {
    scope: ['profile', 'email']
  };
  
  // Add prompt parameter if provided (for account selection and consent)
  if (prompt) {
    authOptions.prompt = prompt;
    console.log('🔐 Added prompt:', prompt);
  }
  
  // approval_prompt is deprecated, use prompt=consent instead
  // if (approvalPrompt === 'force') {
  //   authOptions.approval_prompt = 'force';
  //   console.log('🔐 Added approval_prompt=force');
  // }
  
  console.log('🔐 Auth options:', authOptions);
  passport.authenticate('google', authOptions)(req, res, next);
});

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: 'https://contractor-crm.vercel.app/login?error=auth_failed'
  }),
  (req, res) => {
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
      const redirectUrl = `https://contractor-crm.vercel.app/?sessionId=${req.sessionID}`;
      console.log('🔄 Redirecting to:', redirectUrl);
      res.redirect(redirectUrl);
    });
  }
);

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

  if (req.isAuthenticated()) {
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
router.get('/me', (req, res) => {
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
    // Check if session ID is provided
    const sessionId = req.headers['x-session-id'] || req.query.sessionId;
    if (sessionId && sessionId.length > 10) {
      console.log('✅ /auth/me - Session ID provided, but user not authenticated. Need to find user by session.');
      // For now, return a mock user for testing
      // In production, you'd want to validate the session ID and find the actual user
      res.json({
        id: 'temp-id',
        email: 'liav@chocoinsurance.com',
        name: 'Liav Geffen',
        picture: 'https://lh3.googleusercontent.com/a/ACg8ocJ48hjNu2ZZL9vxzmW6m4KulzkcH317dCAZzqDGMaKqlJVHNDI=s96-c', // Real Google profile picture
        role: 'admin',
        lastLogin: new Date()
      });
    } else {
      console.log('❌ /auth/me - No authentication and no session ID');
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

module.exports = router;
