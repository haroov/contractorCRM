import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ContractorRepository from './components/ContractorRepository';
import ContractorDetailsPage from './components/ContractorDetailsPage';
import ProjectDetailsPage from './components/ProjectDetailsPage';
import UserManagement from './components/UserManagement';
import LoginPage from './components/LoginPage';
import { API_CONFIG } from './config/api';

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

  useEffect(() => {
    checkAuthStatus();
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
      // Set user as authenticated if we have a session ID
      setUser({
        id: 'temp-id',
        email: 'liav@chocoinsurance.com',
        name: 'Liav Geffen',
        role: 'admin'
      });
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch(API_CONFIG.AUTH_STATUS_URL(), {
        credentials: 'include'
      });
      
      console.log('📡 Auth status response:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Auth data:', data);
        if (data.authenticated) {
          console.log('✅ User authenticated:', data.user);
          setUser(data.user);
        } else {
          console.log('❌ User not authenticated');
          setUser(null);
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
      return <div>Loading...</div>;
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
