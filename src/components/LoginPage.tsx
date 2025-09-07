import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Container,
  Avatar,
  Divider,
  TextField,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Google as GoogleIcon, Microsoft as MicrosoftIcon, Visibility, VisibilityOff } from '@mui/icons-material';
// Removed API imports - using simple localStorage-based auth
import logo from '../assets/logo.svg';

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: string;
}

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // Clear any session data when arriving at login page
  useEffect(() => {
    // Clear localStorage and sessionStorage but preserve userEmail
    const savedEmail = localStorage.getItem('userEmail');
    localStorage.clear();
    sessionStorage.clear();
    
    // Restore the saved email if it exists
    if (savedEmail) {
      localStorage.setItem('userEmail', savedEmail);
      console.log('🔧 Preserved userEmail after clear:', savedEmail);
    }

    // Remove sessionId and other parameters from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    let shouldUpdateUrl = false;

    if (urlParams.has('sessionId')) {
      urlParams.delete('sessionId');
      shouldUpdateUrl = true;
    }

    // Keep prompt parameter for account selection
    // if (urlParams.has('prompt')) {
    //   urlParams.delete('prompt');
    //   shouldUpdateUrl = true;
    // }

    if (shouldUpdateUrl) {
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);
  const [user, setUser] = useState<User | null>(null);
  // Removed email state and validation - using Google login only

  // Removed email handling - using Google login only

  // No need to check auth status - App.tsx handles it

  // Removed handleEmailLogin - using Google login only

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build Google OAuth URL to open Google authentication
      const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: '230216937198-4e1gs2k1lepumm2ea3n949u897vnda2m.apps.googleusercontent.com',
        redirect_uri: 'https://contractorcrm-api.onrender.com/auth/google/callback',
        scope: 'profile email',
        access_type: 'offline',
        prompt: 'select_account consent' // Force account selection and password entry
      });

      const fullUrl = `${googleAuthUrl}?${params.toString()}`;
      console.log('🔐 Redirecting to Google OAuth URL:', fullUrl);

      // Redirect to Google OAuth
      window.location.href = fullUrl;
    } catch (error) {
      console.error('Error with Google OAuth:', error);
      setError('שגיאה בחיבור לשרת. אנא נסה שוב.');
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    setError(null);

    // TODO: Implement Microsoft OAuth
    setError('התחברות עם Microsoft עדיין לא זמינה');
    setLoading(false);
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setEmail(value);
    
    if (value && !validateEmail(value)) {
      setEmailError('כתובת אימייל לא תקינה');
    } else {
      setEmailError('');
    }
  };

  const handleContactLogin = () => {
    if (!email) {
      setEmailError('נא להזין כתובת אימייל');
      return;
    }
    
    if (!validateEmail(email)) {
      setEmailError('כתובת אימייל לא תקינה');
      return;
    }

    // Navigate to contact login with email parameter
    window.location.href = `/contact-login?email=${encodeURIComponent(email)}`;
  };

  // Removed handleLogout - using simple localStorage clear

  if (user) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Avatar
            src={user.picture}
            alt={user.name}
            sx={{ width: 80, height: 80, mx: 'auto', mb: 2 }}
          />
          <Typography variant="h5" gutterBottom>
            ברוך הבא, {user.name}!
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {user.email}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            תפקיד: {user.role === 'admin' ? 'מנהל' : 'משתמש'}
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            onClick={() => window.location.href = '/contractor'}
            sx={{ mb: 2 }}
          >
            כניסה למערכת
          </Button>

          {/* Removed logout button - using simple localStorage clear */}
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ color: 'primary.main', mr: 2 }}>
            מערכת ניהול קבלנים
          </Typography>
          <Box
            component="img"
            src={logo}
            alt="שוקו לוגו"
            sx={{
              height: 48,
              width: 48,
              objectFit: 'contain'
            }}
          />
        </Box>

        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          התחברות למערכת {/* Updated with email validation */}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Email Field */}
        {/* Removed email input and divider - using Google login only */}

        {/* Social Login Buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />}
            onClick={handleGoogleLogin}
            disabled={loading}
            sx={{
              py: 1.5,
              bgcolor: '#4285f4',
              '&:hover': {
                bgcolor: '#357ae8'
              },
              '& .MuiButton-startIcon': {
                marginRight: '16px' // Increased spacing between icon and text
              }
            }}
          >
            {loading ? 'מתחבר...' : 'התחבר עם Google'}
          </Button>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Alert severity="info" sx={{ mt: 2, textAlign: 'right' }}>
            <Typography variant="body2">
              <strong>אם נתקעת בעמוד הלוגאין של גוגל:</strong>
              <br />
              1. נקה את ה-cookies והמטמון של הדפדפן
              <br />
              2. נסה בחלון פרטי (Incognito)
              <br />
              3. ודא שאתה בוחר בחשבון הנכון
            </Typography>
          </Alert>

          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<MicrosoftIcon />}
            onClick={handleMicrosoftLogin}
            disabled={loading}
            sx={{
              py: 1.5,
              bgcolor: '#00a1f1',
              '&:hover': {
                bgcolor: '#0088cc'
              },
              '& .MuiButton-startIcon': {
                marginRight: '16px' // Increased spacing between icon and text
              }
            }}
          >
            התחבר עם Microsoft
          </Button>

          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              או
            </Typography>
          </Divider>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              fullWidth
              label="כתובת אימייל"
              type="email"
              variant="outlined"
              size="small"
              value={email}
              onChange={handleEmailChange}
              error={!!emailError}
              helperText={emailError}
              sx={{ mb: 1 }}
            />
            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={handleContactLogin}
              disabled={loading}
              sx={{
                py: 1.5,
                borderColor: '#1976d2',
                color: '#1976d2',
                '&:hover': {
                  borderColor: '#1565c0',
                  backgroundColor: 'rgba(25, 118, 210, 0.04)'
                }
              }}
            >
              התחבר כנציג חברה
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginPage;
