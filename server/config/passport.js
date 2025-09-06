const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Function to check if email is allowed (from database)
const isEmailAllowed = async (email) => {
  try {
    console.log('🔍 Searching for user with email:', email.toLowerCase());
    const user = await User.findOne({ email: email.toLowerCase() });
    console.log('🔍 User found:', !!user);
    if (user) {
      console.log('🔍 User details:', { id: user._id, name: user.name, role: user.role, isActive: user.isActive });
    }
    return !!user; // Return true if user exists in database
  } catch (error) {
    console.error('❌ Error checking email permission:', error);
    return false;
  }
};

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || "https://contractorcrm-api.onrender.com/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  console.log('🔐 Google Strategy called');
  console.log('🔐 Client ID exists:', !!process.env.GOOGLE_CLIENT_ID);
  console.log('🔐 Client Secret exists:', !!process.env.GOOGLE_CLIENT_SECRET);
  console.log('🔐 Callback URL:', process.env.GOOGLE_CALLBACK_URL || "https://contractorcrm-api.onrender.com/auth/google/callback");
  console.log('🔐 Full profile:', JSON.stringify(profile, null, 2));

  try {
    // Check if profile and emails exist
    if (!profile || !profile.emails || !profile.emails[0]) {
      console.error('❌ Invalid profile data:', profile);
      return done(new Error('Invalid profile data from Google'), null);
    }

    console.log('🔐 Google OAuth Profile:', profile.emails[0].value);

    // Check if email is allowed (from database)
    const email = profile.emails[0].value.toLowerCase();
    console.log('🔐 Checking if email is allowed:', email);

    const emailAllowed = await isEmailAllowed(email);
    console.log('🔐 Email allowed result:', emailAllowed);

    if (!emailAllowed) {
      console.log('❌ Email not allowed:', email);
      // For specific emails, create them automatically
      if (email === 'liav@facio.io') {
        console.log('🔧 Auto-creating liav@facio.io user');
        const newUser = new User({
          email: email,
          name: 'Liav Geffen',
          role: 'user',
          isActive: false,
          createdAt: new Date(),
          lastLogin: null
        });
        await newUser.save();
        console.log('✅ Auto-created liav@facio.io user');
        // Continue with authentication
      } else {
        return done(null, false, { message: 'Email not authorized for this system' });
      }
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
