import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ContractorRepository from './components/ContractorRepository';
import ContractorDetailsPage from './components/ContractorDetailsPage';
import ProjectDetailsPage from './components/ProjectDetailsPage';

export default function App() {
  console.log('🚀 App component rendering...');

  try {
    return (
      <Router>
        <Routes>
          <Route path="/" element={<ContractorRepository />} />
          <Route path="/contractor" element={<ContractorDetailsPage />} />
          <Route path="/project" element={<ProjectDetailsPage />} />
        </Routes>
      </Router>
    );
  } catch (error) {
    console.error('❌ Error in App component:', error);
    return <div>Error loading application</div>;
  }
}
