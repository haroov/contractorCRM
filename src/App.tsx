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
          console.log('🔍 Setting user state with:', {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            picture: userData.picture
          });
          setUser(userData);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.log('❌ Could not get user from server (URL session):', error);
      }

      // No fallback user - let server handle authentication
      console.log('❌ No user data from server, redirecting to login');
      console.log('🔍 Setting user to null (no server data)');
      setUser(null);
      setLoading(false);
      return;
    }

    // Check if we have a stored sessionId
    const storedSessionId = localStorage.getItem('sessionId');
    if (storedSessionId) {
      console.log('✅ User already authenticated with sessionId:', storedSessionId);
      // Try to get user info from server
      try {
        const response = await fetch(`https://contractorcrm-api.onrender.com/auth/me`, {
          credentials: 'include',
          headers: {
            'X-Session-ID': storedSessionId
          }
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('✅ Got user data from server (stored session):', userData);
          console.log('🔍 Setting user state with (stored session):', {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            picture: userData.picture
          });
          setUser(userData);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.log('❌ Could not get user from server (stored session):', error);
      }
    }

    console.log('❌ No authentication found');
    console.log('🔍 Setting user to null (no auth)');
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
    console.log('🔍 App.tsx - user object details:', {
      id: user?.id,
      email: user?.email,
      name: user?.name,
      role: user?.role,
      picture: user?.picture
    });
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
              path="/contractor"
              element={
                <ProtectedRoute>
                  <ContractorDetailsPage currentUser={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/project"
              element={
                <ProtectedRoute>
                  <ProjectDetailsPage currentUser={user} />
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