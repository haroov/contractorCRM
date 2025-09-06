import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔐 Auth callback received');
        
        // Get the authorization code from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        
        if (error) {
          console.error('❌ OAuth error:', error);
          setError(`שגיאה בהתחברות: ${error}`);
          setLoading(false);
          return;
        }
        
        if (!code) {
          console.error('❌ No authorization code received');
          setError('לא התקבל קוד הרשאה מגוגל');
          setLoading(false);
          return;
        }
        
        console.log('🔐 Authorization code received:', code);
        
        // Exchange code for token (simplified - in production you'd do this server-side)
        // For now, we'll create a mock sessionId
        const mockSessionId = 'mock_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        console.log('🔐 Created mock sessionId:', mockSessionId);
        
        // Save to localStorage
        localStorage.setItem('sessionId', mockSessionId);
        
        // Redirect to main page
        navigate('/?sessionId=' + mockSessionId);
        
      } catch (err) {
        console.error('❌ Callback error:', err);
        setError('שגיאה בעיבוד ההתחברות');
        setLoading(false);
      }
    };
    
    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        gap: 2
      }}>
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          {error}
        </Alert>
        <button 
          onClick={() => navigate('/login')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          חזור לעמוד התחברות
        </button>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      gap: 2
    }}>
      <CircularProgress size={60} />
      <Typography variant="h6" color="text.secondary">
        מעבד התחברות...
      </Typography>
    </Box>
  );
};

export default AuthCallback;
