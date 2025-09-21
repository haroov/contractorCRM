import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import LoginPage from './components/LoginPage';
import ContactLoginPage from './components/ContactLoginPage';
import ProjectDetailsPage from './components/ProjectDetailsPage';
import UserManagement from './components/UserManagement';
import SkeletonLoader from './components/SkeletonLoader';
import UnifiedContractorView from './components/UnifiedContractorView';
// Removed API imports - using simple localStorage-based auth

const theme = createTheme({
  direction: 'rtl',
  palette: {
    primary: {
      main: '#6B46C1', // סגול שוקו
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Assistant", "Arial", sans-serif',
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '&.Mui-focused fieldset': {
              borderColor: '#6B46C1', // סגול שוקו
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#6B46C1', // סגול שוקו
            },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '&.Mui-focused fieldset': {
            borderColor: '#6B46C1', // סגול שוקו
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#6B46C1', // סגול שוקו
          },
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '&.Mui-focused fieldset': {
              borderColor: '#6B46C1', // סגול שוקו
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#6B46C1', // סגול שוקו
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          '&.Mui-focused fieldset': {
            borderColor: '#6B46C1', // סגול שוקו
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#6B46C1', // סגול שוקו
          },
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '&.Mui-focused fieldset': {
              borderColor: '#6B46C1', // סגול שוקו
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#6B46C1', // סגול שוקו
            },
          },
        },
      },
    },
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

  // Additional effect to handle contact user state updates
  useEffect(() => {
    const handleStorageChange = () => {
      const contactUserAuthenticated = localStorage.getItem('contactUserAuthenticated');
      if (contactUserAuthenticated === 'true' && !user) {
        console.log('🔄 Storage change detected, re-checking auth status');
        checkAuthStatus();
      }
    };

    // Check for contact user in localStorage periodically
    const interval = setInterval(() => {
      const contactUserAuthenticated = localStorage.getItem('contactUserAuthenticated');
      if (contactUserAuthenticated === 'true' && !user) {
        console.log('🔄 Periodic check: contact user found in localStorage, updating state');
        checkAuthStatus();
      }
    }, 1000); // Check every second

    // Listen for storage changes
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user]);

  const checkAuthStatus = async () => {
    console.log('🔍 Checking auth status...');

    // First check if user is a contact user (check localStorage)
    const contactUserAuthenticated = localStorage.getItem('contactUserAuthenticated');
    console.log('🔍 Contact user authenticated flag:', contactUserAuthenticated);

    if (contactUserAuthenticated === 'true') {
      const contactUserData = localStorage.getItem('contactUser');
      console.log('🔍 Contact user data from localStorage:', contactUserData);

      if (contactUserData) {
        try {
          const contactUser = JSON.parse(contactUserData);
          console.log('✅ Contact user authenticated from localStorage:', contactUser);

          // Check if this is actually a system user (userType: "system")
          if (contactUser.userType === 'system') {
            console.log('🔍 This is a system user, treating as system user');
            // For system users who came through contact login, use their data directly
            // since they already have valid session data
            const userState = {
              id: contactUser.id,
              email: contactUser.email,
              name: contactUser.name,
              role: contactUser.role,
              picture: contactUser.picture || ''
            };
            console.log('🔍 Setting system user state from contact login data:', userState);
            setUser(userState);
            setLoading(false);
            console.log('✅ System user state set from contact login, returning early');
            return;
          } else {
            // This is a real contact user
            console.log('🔍 This is a contact user');
            const userState = {
              id: contactUser.id,
              email: contactUser.email,
              name: contactUser.name,
              role: contactUser.role,
              picture: contactUser.picture || ''
            };
            console.log('🔍 Setting user state to:', userState);
            setUser(userState);
            setLoading(false);
            console.log('✅ Contact user state set, returning early');
            return;
          }
        } catch (error) {
          console.log('❌ Error parsing contact user data:', error);
          localStorage.removeItem('contactUser');
          localStorage.removeItem('contactUserAuthenticated');
        }
      } else {
        console.log('❌ No contact user data found in localStorage');
      }
    } else {
      console.log('❌ Contact user not authenticated');
    }

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
        const response = await fetch(`/auth/me`, {
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
        const response = await fetch(`/auth/me`, {
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
    console.log('🔍 ProtectedRoute check - loading:', loading, 'user:', user);

    // Check if user is authenticated via localStorage (for contact users)
    const contactUserAuthenticated = localStorage.getItem('contactUserAuthenticated');
    const contactUserData = localStorage.getItem('contactUser');

    console.log('🔍 ProtectedRoute - localStorage check:', {
      contactUserAuthenticated,
      hasContactUserData: !!contactUserData
    });


    if (loading) {
      console.log('⏳ ProtectedRoute - still loading, showing skeleton');
      return <SkeletonLoader />;
    }

    // If no user in state but we have contact user in localStorage, wait a bit for state to update
    if (!user && contactUserAuthenticated === 'true' && contactUserData) {
      console.log('⏳ ProtectedRoute - contact user found in localStorage, waiting for state update');
      return <SkeletonLoader />;
    }

    if (!user) {
      console.log('❌ ProtectedRoute - no user found, redirecting to login');
      return <Navigate to="/login" replace />;
    }

    console.log('✅ ProtectedRoute - user authenticated, rendering children');
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
            <Route path="/contact-login" element={<ContactLoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <UnifiedContractorView currentUser={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contractor"
              element={
                <ProtectedRoute>
                  <UnifiedContractorView currentUser={user} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contractor/:id"
              element={
                <ProtectedRoute>
                  <UnifiedContractorView currentUser={user} />
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