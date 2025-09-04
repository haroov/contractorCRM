import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ContractorRepository from './components/ContractorRepository';
import ContractorDetailsPage from './components/ContractorDetailsPage';
import ProjectDetailsPage from './components/ProjectDetailsPage';
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

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(API_CONFIG.AUTH_STATUS_URL(), {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Protected Route Component
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (loading) {
      return <div>Loading...</div>;
    }
    
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    
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
        </Routes>
      </Router>
    );
  } catch (error) {
    console.error('❌ Error in App component:', error);
    return <div>Error loading application</div>;
  }
}
