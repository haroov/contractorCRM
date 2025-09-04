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
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
    
    if (!email || !password) {
      setError('אנא מלא את כל השדות');
      setLoading(false);
      return;
    }
    
    // TODO: Implement email/password login
    setError('התחברות עם אימייל וסיסמה עדיין לא זמינה');
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First check if Google OAuth is configured
      const response = await fetch(API_CONFIG.AUTH_GOOGLE_URL(), {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'not_configured') {
          setError('Google OAuth לא מוגדר עדיין. אנא פנה למנהל המערכת.');
          setLoading(false);
          return;
        }
      }
      
      // If configured, redirect to Google OAuth
      window.location.href = API_CONFIG.AUTH_GOOGLE_URL();
    } catch (error) {
      console.error('Error checking Google OAuth:', error);
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
        <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
          מערכת ניהול קבלנים
        </Typography>
        
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          התחברות למערכת
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Email and Password Fields */}
        <Box sx={{ mb: 3, textAlign: 'right' }}>
          <TextField
            fullWidth
            label="אימייל"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
            dir="ltr"
          />
          
          <TextField
            fullWidth
            label="סיסמה"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
            dir="ltr"
          />
          
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleEmailLogin}
            disabled={loading}
            sx={{ mb: 3 }}
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
                marginRight: '14px' // 6px more than before (8px + 6px = 14px)
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
                marginRight: '8px'
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
