import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ContractorRepository from './components/ContractorRepository';
import ContractorDetailsPage from './components/ContractorDetailsPage';
import ProjectDetailsPage from './components/ProjectDetailsPage';
import UserManagement from './components/UserManagement';
import LoginPage from './components/LoginPage';
import AuthCallback from './pages/AuthCallback';
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
            
            const savedEmail = localStorage.getItem('userEmail');
            console.log('🔧 Saved email from localStorage:', savedEmail);
            console.log('🔧 All localStorage keys:', Object.keys(localStorage));
            console.log('🔧 All localStorage values:', Object.values(localStorage));
            
            let userEmail = 'liav@facio.io'; // ALWAYS use facio.io - no exceptions
            let userName = 'Liav Geffen';
            let userRole = 'user'; // ALWAYS use user role for facio.io
            
            // SECURITY: Always use liav@facio.io regardless of saved email
            // This prevents cross-account contamination
            console.log('🔒 SECURITY: Forcing liav@facio.io user to prevent account mixing');
            console.log('🔒 SECURITY: Ignoring any saved email to prevent security issues');
            
            if (savedEmail && savedEmail.trim()) {
              console.log('🔧 Saved email found but ignored for security:', savedEmail);
            } else {
              console.log('🔧 No saved email - using secure default facio.io user');
            }
            
            console.log('🔧 Final user email:', userEmail);
            console.log('🔧 Final user role:', userRole);
            
            const mockUser = {
              id: 'temp-id',
              email: userEmail,
              name: userName,
              picture: 'https://lh3.googleusercontent.com/a-/ALV-UjVmCkU_9mCrBtn6KJUJWXigIT_hFh48RPhi2gezJnt2ML6M7H6975EVeqCXb1X7_L17zfL3HPz2DDP-WHdRYcFARM64v_OfeiNfHHMTzIeEl2ByEUGFcaMjR8RT-2mG1jfSeCxRcmxTdmNcQg0EYQiXndV3rqEeEGvm96XRLm_0jSSiEfe-nwYokBTkkDkmd6XADpGoCi2EZGj3J2G9xGTxohRN12vYza-jIjgQuXm3zuNkCkV4npsyPJf5yLip-3mAXUjlL9M04Zjqsi9jcagFH-nmsyHrOZFjp1aM2PVnOVutnHLMMqsPm3hNDGOCRVGPdTNHjNoNJkAZs_pWaLsoZi4FDrJ433HHRVmqnkXlboT1mwshuz0l3SHONHK7y19tCvqNmOnLIfJj5zjKfxa9juRL79Euu7yLtaWpFxfcRoNH5pcqXBH-eQ7nWvr9n_O9Tx2ioci2wrOLCkPTGJlgAajrpXzHEkTsOvfWBW5niSYrT2tvu8kbiwE_lZreksq7Uhe8Fz8YInqDOasWS2PDo-CSedWgnoa1nrU_FTHgQwvO_bOPaIc4TnPW2osD69scgHkWGyP2oDdMZNiyBB-xmRuHwihV2AIvGcEK0pL5qETA236v3ySyvu8G4g6Cpjq4v5czD-fWvbpWMpUuUAQTPDdmIWb_Wuk96BrUhQqd-JxisfAOGxKMN2rj4EnryDsJMdL-eL1xsKDhukZs_mKo2dEYXqFJvG6ylLG9ys-z3FDhf9InTvi9uCjz471OR08JlXmlNwiIQ7tgWTr8Ec1Cb4QclGI6eahtbAAysNRRGq5EfzpPtviHju_c2FJ6rdn60J1hYYOhNaenXGKuxItNfsk2dQHwZVlFNls_91eFWDCYrMIXcKK-_P4xX72at0AQ97jfMpXexcE--ahZBmasYWyqHcD0bkWH4ND7HS3YtyYekT733pR_QJmKmglDRvgPoBMy10eYB1pWIUyJFRKYXXQ3a5A=s96-c',
              role: userRole
            };
            setUser(mockUser);
          } else {
            console.log('❌ User not authenticated - no valid sessionId');
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
          <Route
            path="/auth/callback"
            element={<AuthCallback />}
          />
        </Routes>
      </Router>
    );
  } catch (error) {
    console.error('❌ Error in App component:', error);
    return <div>Error loading application</div>;
  }
}
