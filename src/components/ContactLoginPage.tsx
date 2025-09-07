import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  Paper
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface ContactLoginData {
  email: string;
  password: string;
  contractorId: string;
}

export default function ContactLoginPage() {
  const [loginData, setLoginData] = useState<ContactLoginData>({
    email: '',
    password: '',
    contractorId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (field: keyof ContactLoginData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setLoginData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setError(''); // Clear error when user types
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/contact-auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Contact user logged in successfully:', data.user);
        // Redirect to contractor details page
        navigate(`/contractor?mode=view&contractor_id=${data.user.contractorIdNumber}&contact_user=true`);
      } else {
        setError(data.error || 'התחברות נכשלה');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setError('שגיאה בהתחברות לשרת');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            התחברות משתמש קשר
          </Typography>
          <Typography variant="body1" color="text.secondary">
            התחבר למערכת כנציג חברה
          </Typography>
        </Box>

        <Card>
          <CardContent>
            <form onSubmit={handleLogin}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  fullWidth
                  label="כתובת אימייל"
                  type="email"
                  value={loginData.email}
                  onChange={handleInputChange('email')}
                  required
                  variant="outlined"
                  size="small"
                />

                <TextField
                  fullWidth
                  label="סיסמה"
                  type="password"
                  value={loginData.password}
                  onChange={handleInputChange('password')}
                  required
                  variant="outlined"
                  size="small"
                  helperText="השתמש במספר הטלפון שלך כסיסמה"
                />

                <TextField
                  fullWidth
                  label="מספר קבלן"
                  value={loginData.contractorId}
                  onChange={handleInputChange('contractorId')}
                  required
                  variant="outlined"
                  size="small"
                  helperText="מספר הקבלן של החברה שלך"
                />

                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'התחבר'
                  )}
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Button
            variant="text"
            onClick={() => navigate('/login')}
            sx={{ textDecoration: 'underline' }}
          >
            חזור להתחברות רגילה
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
