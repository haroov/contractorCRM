const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Allowed emails for the system
const ALLOWED_EMAILS = [
  'liav@chocoinsurance.com',
  'roey@chocoinsurance.com',
  'uriel@chocoinsurance.com',
  'shlomo@chocoinsurance.com',
  'finkelmanyael@gmail.com',
  'shifra.sankewitz@gmail.com',
  'mor@cns-law.co.il',
  'idan@yozmot.net',
  'liav@facio.io'
];

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || "https://contractorcrm-api.onrender.com/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('🔐 Google OAuth Profile:', profile.emails[0].value);
    
    // Check if email is allowed
    const email = profile.emails[0].value.toLowerCase();
    if (!ALLOWED_EMAILS.includes(email)) {
      console.log('❌ Email not allowed:', email);
      return done(null, false, { message: 'Email not authorized for this system' });
    }

    // Check if user already exists by email first (for users with temporary googleId)
    let user = await User.findOne({ email: email });
    
    if (user) {
      // Update existing user with real Google data
      user.googleId = profile.id;
      user.name = profile.displayName;
      user.picture = profile.photos[0]?.value;
      user.lastLogin = new Date();
      user.isActive = true; // Activate user when they first log in
      await user.save();
      console.log('✅ Existing user updated and logged in:', user.email);
      return done(null, user);
    } else {
      // Create new user
      user = new User({
        googleId: profile.id,
        email: email,
        name: profile.displayName,
        picture: profile.photos[0]?.value,
        role: email === 'liav@chocoinsurance.com' ? 'admin' : 'user',
        isActive: true,
        lastLogin: new Date()
      });
      
      await user.save();
      console.log('✅ New user created:', user.email);
      return done(null, user);
    }
  } catch (error) {
    console.error('❌ OAuth error:', error);
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
