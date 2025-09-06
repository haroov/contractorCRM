import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import LoginPage from './components/LoginPage';
import ContractorRepository from './components/ContractorRepository';
import ContractorDetailsPage from './components/ContractorDetailsPage';
import ProjectDetailsPage from './components/ProjectDetailsPage';
import UserManagement from './components/UserManagement';
import SkeletonLoader from './components/SkeletonLoader';
// Removed API imports - using simple localStorage-based auth

const theme = createTheme({
  direction: 'rtl',
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  role: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('App component rendering...');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    console.log('🔍 Checking auth status...');

    // Check if there's a session ID in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');

    if (sessionId) {
      console.log('🔑 Found session ID in URL:', sessionId);
      localStorage.setItem('sessionId', sessionId);
      // Remove sessionId from URL to clean it up
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Try to get user info from server first
      try {
        const response = await fetch(`https://contractorcrm-api.onrender.com/auth/me`, {
          credentials: 'include',
          headers: {
            'X-Session-ID': sessionId
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('✅ Got user data from server:', userData);
          console.log('🔍 Server user email:', userData.email, 'Role:', userData.role);
          
                        // Use the user data from server as-is
                        console.log('✅ Using user data from server:', userData);
                        setUser(userData);
                        setLoading(false);
                        return;
        }
      } catch (error) {
        console.log('❌ Could not get user from server:', error);
      }
      
                // No fallback user - let server handle authentication
                console.log('❌ No user data from server, redirecting to login');
                setUser(null);
                setLoading(false);
                return;
    }

    // Check if we have a stored sessionId
    const storedSessionId = localStorage.getItem('sessionId');
    if (storedSessionId) {
      console.log('✅ User already authenticated with sessionId:', storedSessionId);
      const user = {
        id: storedSessionId,
        email: 'liav@chocoinsurance.com', // Default to admin for now
        name: 'Liav Geffen (Admin)',
        picture: 'https://lh3.googleusercontent.com/a-/ALV-UjVmCkU_9mCrBtn6KJUJWXigIT_hFh48RPhi2gezJnt2ML6M7H6975EVeqCXb1X7_L17zfL3HPz2DDP-WHdRYcFARM64v_OfeiNfHHMTzIeEl2ByEUGFcaMjR8RT-2mG1jfSeCxRcmxTdmNcQg0EYQiXndV3rqEeEGvm96XRLm_0jSSiEfe-nwYokBTkkDkmd6XADpGoCi2EZGj3J2G9xGTxohRN12vYza-jIjgQuXm3zuNkCkV4npsyPJf5yLip-3mAXUjlL9M04Zjqsi9jcagFH-nmsyHrOZFjp1aM2PVnOVutnHLMMqsPm3hNDGOCRVGPdTNHjNoNJkAZs_pWaLsoZi4FDrJ433HHRVmqnkXlboT1mwshuz0l3SHONHK7y19tCvqNmOnLIfJj5zjKfxa9juRL79Euu7yLtaWpFxfcRoNH5pcqXBH-eQ7nWvr9n_O9Tx2ioci2wrOLCkPTGJlgAajrpXzHEkTsOvfWBW5niSYrT2tvu8kbiwE_lZreksq7Uhe8Fz8YInqDOasWS2PDo-CSedWgnoa1nrU_FTHgQwvO_bOPaIc4TnPW2osD69scgHkWGyP2oDdMZNiyBB-xmRuHwihV2AIvGcEK0pL5qETA236v3ySyvu8G4g6Cpjq4v5czD-fWvbpWMpUuUAQTPDdmIWb_Wuk96BrUhQqd-JxisfAOGxKMN2rj4EnryDsJMdL-eL1xsKDhukZs_mKo2dEYXqFJvG6ylLG9ys-z3FDhf9InTvi9uCjz471OR08JlXmlNwiIQ7tgWTr8Ec1Cb4QclGI6eahtbAAysNRRGq5EfzpPtviHju_c2FJ6rdn60J1hYYOhNaenXGKuxItNfsk2dQHwZVlFNls_91eFWDCYrMIXcKK-_P4xX72at0AQ97jfMpXexcE--ahZBmasYWyqHcD0bkWH4ND7HS3YtyYekT733pR_QJmKmglDRvgPoBMy10eYB1pWIUyJFRKYXXQ3a5A=s96-c',
        role: 'admin'
      };
      
      setUser(user);
      setLoading(false);
      return;
    }

    console.log('❌ No authentication found');
    setUser(null);
    setLoading(false);
  };

  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (loading) {
      return <SkeletonLoader />;
    }

    if (!user) {
      return <Navigate to="/login" replace />;
    }

    console.log('ProtectedRoute - loading:', loading, 'user:', user);
    console.log('User authenticated, rendering children');
    return <>{children}</>;
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <ContractorRepository currentUser={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contractor/:id"
              element={
                <ProtectedRoute>
                  <ContractorDetailsPage currentUser={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/project/:id"
              element={
                <ProtectedRoute>
                  <ProjectDetailsPage currentUser={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <UserManagement currentUser={user} />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;