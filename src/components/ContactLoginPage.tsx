import React, { useState, useEffect } from 'react';
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
  Paper,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface ContactLoginData {
  email: string;
  otp: string;
}

export default function ContactLoginPage() {
  const [searchParams] = useSearchParams();
  const [loginData, setLoginData] = useState<ContactLoginData>({
    email: '',
    otp: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0); // 0: email input, 1: OTP verification, 2: contractor selection
  const [emailSent, setEmailSent] = useState(false);
  const [contractors, setContractors] = useState<any[]>([]);
  const [selectedContractor, setSelectedContractor] = useState('');
  const navigate = useNavigate();

  // Get email from URL parameters
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setLoginData(prev => ({
        ...prev,
        email: emailParam
      }));
    }
  }, [searchParams]);

  const handleInputChange = (field: keyof ContactLoginData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setLoginData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setError(''); // Clear error when user types
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendOTP = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    if (!validateEmail(loginData.email)) {
      setError('אנא הזן כתובת אימייל תקינה');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/contact-auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: loginData.email }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEmailSent(true);
        setStep(1);
        console.log('✅ OTP sent successfully');
      } else {
        setError(data.error || 'שגיאה בשליחת קוד האימות');
      }
    } catch (error) {
      console.error('❌ Send OTP error:', error);
      setError('שגיאה בהתחברות לשרת');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    if (loginData.otp.length !== 6) {
      setError('אנא הזן קוד אימות בן 6 ספרות');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/contact-auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginData.email,
          otp: loginData.otp
        }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.multipleContractors) {
          // User has access to multiple contractors - show selection
          setContractors(data.contractors);
          setStep(2);
        } else {
          // Single contractor - proceed with login
          console.log('✅ Contact user logged in successfully:', data.user);
          navigate(`/contractor?mode=view&contractor_id=${data.user.contractorIdNumber}&contact_user=true`);
        }
      } else {
        setError(data.error || 'קוד האימות שגוי או פג תוקף');
      }
    } catch (error) {
      console.error('❌ Verify OTP error:', error);
      setError('שגיאה בהתחברות לשרת');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContractor = async () => {
    if (!selectedContractor) {
      setError('אנא בחר חברה');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/contact-auth/select-contractor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginData.email,
          contractorId: selectedContractor
        }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Contact user selected contractor:', data.user);
        navigate(`/contractor?mode=view&contractor_id=${data.user.contractorIdNumber}&contact_user=true`);
      } else {
        setError(data.error || 'שגיאה בבחירת החברה');
      }
    } catch (error) {
      console.error('❌ Select contractor error:', error);
      setError('שגיאה בהתחברות לשרת');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep(0);
    setEmailSent(false);
    setLoginData(prev => ({ ...prev, otp: '' }));
    setContractors([]);
    setSelectedContractor('');
    setError('');
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

        {/* Stepper */}
        <Stepper activeStep={step} sx={{ mb: 4 }}>
          <Step>
            <StepLabel>הזנת אימייל</StepLabel>
          </Step>
          <Step>
            <StepLabel>אימות קוד</StepLabel>
          </Step>
          {contractors.length > 1 && (
            <Step>
              <StepLabel>בחירת חברה</StepLabel>
            </Step>
          )}
        </Stepper>

        <Card>
          <CardContent>
            {step === 0 ? (
              <form onSubmit={handleSendOTP}>
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
                    helperText="הזן את כתובת האימייל שלך כפי שמופיעה במערכת"
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
                      'שלח קוד אימות'
                    )}
                  </Button>
                </Box>
              </form>
            ) : step === 1 ? (
              <form onSubmit={handleVerifyOTP}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                    שלחנו קוד אימות בן 6 ספרות לכתובת:
                    <br />
                    <strong>{loginData.email}</strong>
                  </Typography>

                  <TextField
                    fullWidth
                    label="קוד אימות"
                    type="text"
                    value={loginData.otp}
                    onChange={handleInputChange('otp')}
                    required
                    variant="outlined"
                    size="small"
                    inputProps={{ maxLength: 6 }}
                    helperText="הזן את הקוד בן 6 הספרות שקיבלת במייל"
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
                      'אמת קוד'
                    )}
                  </Button>

                  <Button
                    variant="text"
                    onClick={handleBackToEmail}
                    sx={{ mt: 1 }}
                  >
                    חזור להזנת אימייל
                  </Button>
                </Box>
              </form>
            ) : step === 2 ? (
              <form onSubmit={(e) => { e.preventDefault(); handleSelectContractor(); }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                    יש לך גישה למספר חברות. אנא בחר את החברה שברצונך לגשת אליה:
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {contractors.map((contractor) => (
                      <Box
                        key={contractor.contractorId}
                        sx={{
                          p: 2,
                          border: selectedContractor === contractor.contractorId ? '2px solid #1976d2' : '1px solid #ddd',
                          borderRadius: 1,
                          cursor: 'pointer',
                          backgroundColor: selectedContractor === contractor.contractorId ? 'rgba(25, 118, 210, 0.04)' : 'white',
                          '&:hover': {
                            backgroundColor: 'rgba(25, 118, 210, 0.04)'
                          }
                        }}
                        onClick={() => setSelectedContractor(contractor.contractorId)}
                      >
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {contractor.contractorName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          תפקיד: {contractor.contactRole}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          הרשאות: {contractor.contactPermissions === 'contact_manager' ? 'מנהל' : 'משתמש'}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

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
                    disabled={loading || !selectedContractor}
                    sx={{ mt: 2 }}
                  >
                    {loading ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      'המשך'
                    )}
                  </Button>

                  <Button
                    variant="text"
                    onClick={handleBackToEmail}
                    sx={{ mt: 1 }}
                  >
                    חזור להתחלה
                  </Button>
                </Box>
              </form>
            ) : null}
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
