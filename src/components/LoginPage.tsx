import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Container,
  Card,
  CardContent,
  Avatar,
  Divider
} from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
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

  const handleGoogleLogin = () => {
    setLoading(true);
    setError(null);
    
    // Redirect to Google OAuth
    window.location.href = API_CONFIG.AUTH_GOOGLE_URL();
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
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          התחבר באמצעות חשבון Google שלך
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              מיילים מורשים:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              • liav@chocoinsurance.com
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              • roey@chocoinsurance.com
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              • uriel@chocoinsurance.com
            </Typography>
          </CardContent>
        </Card>

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
            }
          }}
        >
          {loading ? 'מתחבר...' : 'התחבר עם Google'}
        </Button>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          רק משתמשים עם מיילים מורשים יכולים להתחבר למערכת
        </Typography>
      </Paper>
    </Container>
  );
};

export default LoginPage;
