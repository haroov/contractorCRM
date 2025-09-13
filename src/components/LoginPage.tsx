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
  Link
} from '@mui/material';
import { Google as GoogleIcon, Microsoft as MicrosoftIcon } from '@mui/icons-material';
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
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Force deployment update
  console.log('LoginPage component loaded with email validation');

  // Timer effect for resend OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (otpSent && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [otpSent, resendTimer]);

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
      // Use absolute URL for redirect_uri - this is the key fix!
      const redirectUri = 'https://contractorcrm-api.onrender.com/auth/google/callback';
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: '230216937198-4e1gs2k1lepumm2ea3n949u897vnda2m.apps.googleusercontent.com',
        redirect_uri: redirectUri,
        scope: 'profile email',
        access_type: 'offline',
        prompt: 'select_account consent' // Force account selection and password entry
      });

      const fullUrl = `${googleAuthUrl}?${params.toString()}`;
      console.log('🔐 Redirecting to Google OAuth URL:', fullUrl);
      console.log('🔐 Using absolute redirect_uri:', redirectUri);

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

  const handleEmailLogin = async () => {
    if (!email) {
      setEmailError('נא להזין כתובת אימייל');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('כתובת אימייל לא תקינה');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Send OTP email to authorized user
      const response = await fetch('/api/auth/send-login-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setOtpSent(true);
        setResendTimer(120); // 2 minutes = 120 seconds
        setCanResend(false);
        setError('נשלח לך מייל עם קוד אימות. אנא בדוק את תיבת הדואר שלך.');
      } else {
        setError(data.message || 'שגיאה בשליחת המייל');
      }
    } catch (error) {
      console.error('Error sending OTP email:', error);
      setError('שגיאה בהתחברות לשרת. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerification = async () => {
    if (!otp || otp.length !== 6) {
      setError('נא להזין קוד אימות בן 6 ספרות');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Verify OTP
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Login successful - store user data and session ID
        localStorage.setItem('contactUser', JSON.stringify(data.user));
        localStorage.setItem('contactUserAuthenticated', 'true');
        if (data.sessionId) {
          localStorage.setItem('sessionId', data.sessionId);
        }
        window.location.href = '/';
      } else {
        setError(data.message || 'קוד אימות שגוי');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setError('שגיאה בהתחברות לשרת. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    
    setLoading(true);
    setError(null);

    try {
      // Send OTP email again
      const response = await fetch('/api/auth/send-login-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResendTimer(120); // Reset timer to 2 minutes
        setCanResend(false);
        setError('נשלח לך מייל חדש עם קוד אימות. אנא בדוק את תיבת הדואר שלך.');
      } else {
        setError(data.message || 'שגיאה בשליחת המייל');
      }
    } catch (error) {
      console.error('Error resending OTP email:', error);
      setError('שגיאה בהתחברות לשרת. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
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
            onClick={() => window.location.href = '/'}
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
          <Box
            component="img"
            src={logo}
            alt="שוקו לוגו"
            sx={{
              height: 48,
              width: 48,
              objectFit: 'contain',
              mr: 2
            }}
          />
          <Typography variant="h4" sx={{ color: 'primary.main' }}>
            ניהול סיכונים באתרי בניה
          </Typography>
        </Box>

        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          התחברות למערכת
        </Typography>


        {/* Email Field First */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          {!otpSent ? (
            <>
              <TextField
                fullWidth
                label="כתובת אימייל"
                  type="email"
                  variant="outlined"
                  value={email}
                  onChange={handleEmailChange}
                  error={!!emailError}
                  helperText={emailError}
                  placeholder="הזן את כתובת האימייל שלך"
                  autoComplete="email"
                  sx={{ mb: 1 }}
                />
                {error && (
                  <Alert severity={error.includes('נשלח לך מייל') ? 'success' : 'error'} sx={{ mt: 1, mb: 1 }}>
                    {error}
                  </Alert>
                )}
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                  onClick={handleEmailLogin}
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    bgcolor: '#9c27b0',
                    '&:hover': {
                      bgcolor: '#7b1fa2'
                    }
                  }}
                >
                  {loading ? 'שולח מייל...' : 'שלח לי קוד אימות'}
                </Button>
              </>
            ) : (
              <>
                <Typography variant="h6" sx={{ textAlign: 'center', mb: 2 }}>
                  הזן קוד אימות
                </Typography>
                <Typography variant="body2" sx={{ textAlign: 'center', mb: 2, color: 'text.secondary' }}>
                  נשלח קוד אימות בן 6 ספרות לכתובת:
                  <br />
                  <strong>{email}</strong>
                </Typography>
                <TextField
                  fullWidth
                  label="קוד אימות"
                  type="text"
                  variant="outlined"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  inputProps={{
                    style: { textAlign: 'center', fontSize: '24px', letterSpacing: '8px' }
                  }}
                  sx={{ mb: 1 }}
                />
                {error && (
                  <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
                    {error}
                  </Alert>
                )}
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                  onClick={handleOtpVerification}
                  disabled={loading || otp.length !== 6}
                  sx={{
                    py: 1.5,
                    bgcolor: '#9c27b0',
                    '&:hover': {
                      bgcolor: '#7b1fa2'
                    }
                  }}
                >
                  {loading ? 'מאמת...' : 'התחבר'}
                </Button>
                
                {/* Resend OTP Section */}
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  {resendTimer > 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      ניתן לשלוח קוד חדש בעוד: {Math.floor(resendTimer / 60)}:{(resendTimer % 60).toString().padStart(2, '0')}
                    </Typography>
                  ) : canResend ? (
                    <Button
                      variant="text"
                      size="small"
                      onClick={handleResendOtp}
                      disabled={loading}
                      sx={{
                        color: '#9c27b0',
                        textDecoration: 'underline',
                        '&:hover': {
                          backgroundColor: 'rgba(156, 39, 176, 0.04)',
                          textDecoration: 'underline'
                        }
                      }}
                    >
                      שלח קוד חדש
                    </Button>
                  ) : null}
                </Box>
              </>
            )}
          </Box>

        {/* Divider */}
        <Divider sx={{ my: 3 }}>
          <Typography variant="body2" color="text.secondary">
            או
          </Typography>
        </Divider>

        {/* Social Login Buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<GoogleIcon />}
            onClick={handleGoogleLogin}
            disabled={loading}
            sx={{
              py: 1.5,
              bgcolor: '#4285f4',
              '&:hover': {
                bgcolor: '#357ae8'
              },
              '& .MuiButton-startIcon': {
                marginRight: '8px'
              }
            }}
          >
            התחבר עם Google
          </Button>

          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<MicrosoftIcon />}
            onClick={handleMicrosoftLogin}
            disabled={true}
            sx={{
              py: 1.5,
              bgcolor: '#9e9e9e',
              color: '#fff',
              '&:hover': {
                bgcolor: '#9e9e9e'
              },
              '& .MuiButton-startIcon': {
                marginRight: '8px'
              }
            }}
          >
            התחבר עם Microsoft
          </Button>
        </Box>
        
        {/* Terms and Privacy Links */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            <Link
              href="/termsOfService.html"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              תנאי השימוש
            </Link>
            {' | '}
            <Link
              href="/privacyPolicy.html"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              מדיניות המידע והפרטיות
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginPage;
