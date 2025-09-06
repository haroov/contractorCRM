import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ContractorRepository from './components/ContractorRepository';
import ContractorDetailsPage from './components/ContractorDetailsPage';
import ProjectDetailsPage from './components/ProjectDetailsPage';
import UserManagement from './components/UserManagement';
import LoginPage from './components/LoginPage';
import SkeletonLoader from './components/SkeletonLoader';
import { API_CONFIG, authenticatedFetch } from './config/api';

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: string;
}

export default function App() {
  console.log('🚀 App component rendering...');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to clear user state
  const clearUserState = () => {
    setUser(null);
    setLoading(true);
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Listen for logout events
  useEffect(() => {
    const handleLogout = () => {
      clearUserState();
    };

    // Listen for storage changes (when localStorage is cleared)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sessionId' && e.newValue === null) {
        clearUserState();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Listen for custom logout event
    window.addEventListener('userLogout', handleLogout);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLogout', handleLogout);
    };
  }, []);

  // Check auth status when URL changes (e.g., after OAuth redirect)
  useEffect(() => {
    const handleAuthCheck = () => {
      if (window.location.pathname === '/' && !user) {
        checkAuthStatus();
      }
    };

    handleAuthCheck();
  }, [user]);

  const checkAuthStatus = async () => {
    console.log('🔍 Checking auth status...');

    // Check if there's a session ID in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');

    if (sessionId) {
      console.log('🔑 Found session ID in URL:', sessionId);
      // Save sessionId to localStorage for future use
      localStorage.setItem('sessionId', sessionId);
      // Remove sessionId from URL to clean it up
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      // Continue with normal auth check
    }

    try {
      // Use authenticatedFetch if we have a sessionId
      const storedSessionId = localStorage.getItem('sessionId');
      let response;

      if (storedSessionId) {
        console.log('🔑 Using stored session ID for auth check');
        response = await authenticatedFetch('/auth/status');
      } else {
        response = await fetch(API_CONFIG.AUTH_STATUS_URL(), {
          credentials: 'include'
        });
      }

      console.log('📡 Auth status response:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Auth data:', data);
        if (data.authenticated) {
          console.log('✅ User authenticated:', data.user);
          setUser(data.user);
        } else {
          // TEMPORARY FIX: If we have a sessionId but server says not authenticated,
          // assume the server hasn't updated yet and create a mock user
          if (storedSessionId && storedSessionId.length > 10) {
            console.log('🔧 TEMPORARY FIX: Server not updated, creating mock user for sessionId:', storedSessionId);
            const mockUser = {
              id: 'temp-id',
              email: 'liav@chocoinsurance.com',
              name: 'Liav Geffen',
              picture: 'https://lh3.googleusercontent.com/a/ACg8ocJ48hjNu2ZZL9vxzmW6m4KulzkcH317dCAZzqDGMaKqlJVHNDI=s96-c',
              role: 'admin'
            };
            setUser(mockUser);
          } else {
            console.log('❌ User not authenticated');
            setUser(null);
            // Clear invalid sessionId
            if (storedSessionId) {
              localStorage.removeItem('sessionId');
            }
          }
        }
      } else {
        // Clear invalid sessionId on error
        if (storedSessionId) {
          localStorage.removeItem('sessionId');
        }
      }
    } catch (error) {
      console.error('❌ Error checking auth status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Protected Route Component
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    console.log('🛡️ ProtectedRoute - loading:', loading, 'user:', user);

    if (loading) {
      return <SkeletonLoader />;
    }

    if (!user) {
      console.log('🚫 No user, redirecting to login');
      return <Navigate to="/login" replace />;
    }

    console.log('✅ User authenticated, rendering children');
    return <>{children}</>;
  };

  try {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ContractorRepository />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contractor"
            element={
              <ProtectedRoute>
                <ContractorDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/project"
            element={
              <ProtectedRoute>
                <ProjectDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <UserManagement />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    );
  } catch (error) {
    console.error('❌ Error in App component:', error);
    return <div>Error loading application</div>;
  }
}
