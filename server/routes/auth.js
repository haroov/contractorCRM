const express = require('express');
const passport = require('passport');
const router = express.Router();

// Google OAuth login
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

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
  if (req.isAuthenticated()) {
    res.json({
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      picture: req.user.picture,
      role: req.user.role,
      lastLogin: req.user.lastLogin
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

module.exports = router;
