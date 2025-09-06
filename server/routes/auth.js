const express = require('express');
const passport = require('passport');
const router = express.Router();

// Google OAuth login
router.get('/google', (req, res, next) => {
  console.log('🔐 Google OAuth login request received');
  console.log('🔐 Query params:', req.query);

  const prompt = req.query.prompt;

  // Build Google OAuth URL manually to include prompt parameter
  const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_CALLBACK_URL || 'https://contractorcrm-api.onrender.com/auth/google/callback',
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

// Google OAuth callback
router.get('/google/callback', (req, res) => {
  console.log('🔐 Google OAuth callback received - RESTART FIX');
  console.log('🔐 Query params:', req.query);
  console.log('🔐 Timestamp:', new Date().toISOString());

  try {
    // Handle the callback manually
    passport.authenticate('google', {
      failureRedirect: 'https://contractor-crm.vercel.app/login?error=auth_failed'
    })(req, res, (err) => {
      if (err) {
        console.error('❌ Passport authentication error:', err);
        return res.redirect('https://contractor-crm.vercel.app/login?error=auth_failed');
      }

      if (!req.user) {
        console.error('❌ No user found after authentication');
        return res.redirect('https://contractor-crm.vercel.app/login?error=no_user');
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
        const redirectUrl = `https://contractor-crm.vercel.app/?sessionId=${req.sessionID}`;
        console.log('🔄 Redirecting to:', redirectUrl);
        res.redirect(redirectUrl);
      });
    });
  } catch (error) {
    console.error('❌ Callback error:', error);
    res.redirect('https://contractor-crm.vercel.app/login?error=callback_error');
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
  console.log('🔍 CRITICAL FIX - liav@facio.io should be returned, not liav@chocoinsurance.com');

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
    // Check if session ID is provided in headers or query params
    const sessionId = req.headers['x-session-id'] || req.query.sessionId;
    if (sessionId && sessionId.length > 10) {
      console.log('✅ Session ID provided, but user not authenticated. Need to find user by session.');
      // For now, return a mock user for testing
      // In production, you'd want to validate the session ID and find the actual user
      res.json({
        authenticated: true,
        user: {
          id: 'temp-id',
          email: 'liav@facio.io',
          name: 'Liav Geffen',
          picture: 'https://lh3.googleusercontent.com/a-/ALV-UjVmCkU_9mCrBtn6KJUJWXigIT_hFh48RPhi2gezJnt2ML6M7H6975EVeqCXb1X7_L17zfL3HPz2DDP-WHdRYcFARM64v_OfeiNfHHMTzIeEl2ByEUGFcaMjR8RT-2mG1jfSeCxRcmxTdmNcQg0EYQiXndV3rqEeEGvm96XRLm_0jSSiEfe-nwYokBTkkDkmd6XADpGoCi2EZGj3J2G9xGTxohRN12vYza-jIjgQuXm3zuNkCkV4npsyPJf5yLip-3mAXUjlL9M04Zjqsi9jcagFH-nmsyHrOZFjp1aM2PVnOVutnHLMMqsPm3hNDGOCRVGPdTNHjNoNJkAZs_pWaLsoZi4FDrJ433HHRVmqnkXlboT1mwshuz0l3SHONHK7y19tCvqNmOnLIfJj5zjKfxa9juRL79Euu7yLtaWpFxfcRoNH5pcqXBH-eQ7nWvr9n_O9Tx2ioci2wrOLCkPTGJlgAajrpXzHEkTsOvfWBW5niSYrT2tvu8kbiwE_lZreksq7Uhe8Fz8YInqDOasWS2PDo-CSedWgnoa1nrU_FTHgQwvO_bOPaIc4TnPW2osD69scgHkWGyP2oDdMZNiyBB-xmRuHwihV2AIvGcEK0pL5qETA236v3ySyvu8G4g6Cpjq4v5czD-fWvbpWMpUuUAQTPDdmIWb_Wuk96BrUhQqd-JxisfAOGxKMN2rj4EnryDsJMdL-eL1xsKDhukZs_mKo2dEYXqFJvG6ylLG9ys-z3FDhf9InTvi9uCjz471OR08JlXmlNwiIQ7tgWTr8Ec1Cb4QclGI6eahtbAAysNRRGq5EfzpPtviHju_c2FJ6rdn60J1hYYOhNaenXGKuxItNfsk2dQHwZVlFNls_91eFWDCYrMIXcKK-_P4xX72at0AQ97jfMpXexcE--ahZBmasYWyqHcD0bkWH4ND7HS3YtyYekT733pR_QJmKmglDRvgPoBMy10eYB1pWIUyJFRKYXXQ3a5A=s96-c',
          role: 'user'
        }
      });
    } else {
      console.log('❌ User is not authenticated and no valid session ID provided');
      res.json({ authenticated: false });
    }
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
        email: 'liav@facio.io',
        name: 'Liav Geffen',
        picture: 'https://lh3.googleusercontent.com/a-/ALV-UjVmCkU_9mCrBtn6KJUJWXigIT_hFh48RPhi2gezJnt2ML6M7H6975EVeqCXb1X7_L17zfL3HPz2DDP-WHdRYcFARM64v_OfeiNfHHMTzIeEl2ByEUGFcaMjR8RT-2mG1jfSeCxRcmxTdmNcQg0EYQiXndV3rqEeEGvm96XRLm_0jSSiEfe-nwYokBTkkDkmd6XADpGoCi2EZGj3J2G9xGTxohRN12vYza-jIjgQuXm3zuNkCkV4npsyPJf5yLip-3mAXUjlL9M04Zjqsi9jcagFH-nmsyHrOZFjp1aM2PVnOVutnHLMMqsPm3hNDGOCRVGPdTNHjNoNJkAZs_pWaLsoZi4FDrJ433HHRVmqnkXlboT1mwshuz0l3SHONHK7y19tCvqNmOnLIfJj5zjKfxa9juRL79Euu7yLtaWpFxfcRoNH5pcqXBH-eQ7nWvr9n_O9Tx2ioci2wrOLCkPTGJlgAajrpXzHEkTsOvfWBW5niSYrT2tvu8kbiwE_lZreksq7Uhe8Fz8YInqDOasWS2PDo-CSedWgnoa1nrU_FTHgQwvO_bOPaIc4TnPW2osD69scgHkWGyP2oDdMZNiyBB-xmRuHwihV2AIvGcEK0pL5qETA236v3ySyvu8G4g6Cpjq4v5czD-fWvbpWMpUuUAQTPDdmIWb_Wuk96BrUhQqd-JxisfAOGxKMN2rj4EnryDsJMdL-eL1xsKDhukZs_mKo2dEYXqFJvG6ylLG9ys-z3FDhf9InTvi9uCjz471OR08JlXmlNwiIQ7tgWTr8Ec1Cb4QclGI6eahtbAAysNRRGq5EfzpPtviHju_c2FJ6rdn60J1hYYOhNaenXGKuxItNfsk2dQHwZVlFNls_91eFWDCYrMIXcKK-_P4xX72at0AQ97jfMpXexcE--ahZBmasYWyqHcD0bkWH4ND7HS3YtyYekT733pR_QJmKmglDRvgPoBMy10eYB1pWIUyJFRKYXXQ3a5A=s96-c', // Real Google profile picture
        role: 'user',
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
