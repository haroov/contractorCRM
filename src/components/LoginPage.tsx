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
import { API_CONFIG } from '../config/api';
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

  // Clear any session data when arriving at login page
  useEffect(() => {
    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
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
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle email change with validation
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);

    if (value && !validateEmail(value)) {
      setEmailError('אנא הזן כתובת מייל תקינה');
    } else {
      setEmailError('');
    }
  };

  // Check if email is valid
  const isEmailValid = email && validateEmail(email) && !emailError;

  // Check if user is already logged in
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(API_CONFIG.AUTH_STATUS_URL(), {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const handleEmailLogin = async () => {
    setLoading(true);
    setError(null);

    if (!isEmailValid) {
      setError('אנא הזן כתובת מייל תקינה');
      setLoading(false);
      return;
    }

    // TODO: Send styled email with one-time password
    setError('שליחת מייל עם סיסמה חד פעמית עדיין לא זמינה. אנא השתמש בגוגל קונקט');
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if we should force account selection (from logout)
      const urlParams = new URLSearchParams(window.location.search);
      const forceAccountSelection = urlParams.get('prompt') === 'select_account';
      
      // Direct redirect to Google OAuth with account selection if needed
      let googleUrl = API_CONFIG.AUTH_GOOGLE_URL();
      if (forceAccountSelection) {
        googleUrl += '?prompt=select_account';
      }
      
      window.location.href = googleUrl;
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

  const handleLogout = async () => {
    try {
      const response = await fetch(API_CONFIG.AUTH_LOGOUT_URL(), {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        setUser(null);
        setError(null);
      } else {
        setError('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      setError('Logout failed');
    }
  };

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

          <Button
            variant="outlined"
            color="secondary"
            fullWidth
            onClick={handleLogout}
          >
            התנתקות
          </Button>
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
          התחברות למערכת
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Email Field */}
        <Box sx={{ mb: 3, textAlign: 'right' }}>
          <TextField
            fullWidth
            label="אימייל"
            type="email"
            value={email}
            onChange={handleEmailChange}
            error={!!emailError}
            helperText={emailError}
            sx={{ mb: 2 }}
            dir="ltr"
          />

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleEmailLogin}
            disabled={loading || !isEmailValid}
            sx={{
              mb: 3,
              bgcolor: isEmailValid ? 'primary.main' : 'grey.400',
              '&:hover': {
                bgcolor: isEmailValid ? 'primary.dark' : 'grey.500'
              }
            }}
          >
            התחבר
          </Button>
        </Box>

        {/* Divider */}
        <Divider sx={{ my: 3 }}>
          <Typography variant="body2" color="text.secondary">
            או
          </Typography>
        </Divider>

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
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginPage;
