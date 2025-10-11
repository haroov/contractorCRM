import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Paper, Typography, Button, TextField, InputAdornment, Avatar, IconButton, Menu, MenuItem, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, CircularProgress, Tooltip } from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, Archive as ArchiveIcon, Delete as DeleteIcon, MoreVert as MoreVertIcon, AccountCircle as AccountCircleIcon, Close as CloseIcon, Engineering as EngineeringIcon } from '@mui/icons-material';
import type { Contractor } from '../types/contractor';
// import ContractorService from '../services/contractorService';
import UserManagement from './UserManagement';
import SkeletonLoader from './SkeletonLoader';
import ContractorTabsSimple from './ContractorTabsSimple';

interface UnifiedContractorViewProps {
  currentUser?: any;
}

export default function UnifiedContractorView({ currentUser }: UnifiedContractorViewProps) {

  const { id } = useParams();
  const contractorTabsRef = useRef<any>(null);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractorToDelete, setContractorToDelete] = useState<Contractor | null>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [user, setUser] = useState<{ name: string, picture: string, role: string, email: string } | null>(null);
  const [isContactUser, setIsContactUser] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    role: 'user',
    phone: ''
  });
  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');

  // Snackbar helper function
  const setSnackbar = (options: { open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }) => {
    setSnackbarOpen(options.open);
    setSnackbarMessage(options.message);
    setSnackbarSeverity(options.severity);
  };

  // New state for contractor details
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [contractorMode, setContractorMode] = useState<'view' | 'edit' | 'new'>('view');
  const [showContractorDetails, setShowContractorDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // State for API status indicators
  const [contractorStatusIndicators, setContractorStatusIndicators] = useState<{ [key: string]: string }>({});

  // State for view mode (contractors vs projects)
  const [viewMode, setViewMode] = useState<'contractors' | 'projects'>('contractors');
  const [projects, setProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsFilter, setProjectsFilter] = useState<'all' | 'active' | 'future' | 'closed'>('all');

  // Function to get tooltip text for status indicator
  const getStatusTooltipText = (statusIndicator: string): string => {
    switch (statusIndicator) {
      case '🔴':
        return 'חברה לא פעילה - סטטוס החברה ברשם החברות אינו "פעילה"';
      case '🟡':
        return 'חברה עם בעיות - יש הפרות או דוח שנתי ישן (מעל שנתיים)';
      case '🟢':
        return 'חברה תקינה - פעילה, ללא הפרות, דוח שנתי עדכני';
      default:
        return 'אין מידע זמין על מצב החברה';
    }
  };

  // Load contractors from MongoDB
  useEffect(() => {
    loadContractors();
    loadUserData();
  }, []);

  // Check if user management should be opened after refresh
  useEffect(() => {
    const shouldOpenUserManagement = localStorage.getItem('openUserManagement');
    if (shouldOpenUserManagement === 'true') {
      console.log('🔍 Opening user management after refresh');
      setUserManagementOpen(true);
      localStorage.removeItem('openUserManagement');
    }
  }, []);

  // Auto-navigate contact users to their contractor card
  useEffect(() => {
    if (isContactUser && contractors.length > 0) {
      const contactUserData = localStorage.getItem('contactUser');
      if (contactUserData) {
        try {
          const contactUser = JSON.parse(contactUserData);
          const userContractor = contractors.find(contractor =>
            contractor._id === contactUser.contractorId
          );

          if (userContractor) {
            // Determine mode based on permissions
            const mode = contactUser.permissions === 'contactAdmin' ? 'edit' : 'view';
            handleContractorSelect(userContractor, mode);
          }
        } catch (error) {
          console.error('Error parsing contact user data for auto-navigation:', error);
        }
      }
    }
  }, [isContactUser, contractors]);

  // Load status indicators for all contractors
  useEffect(() => {
    if (contractors.length > 0) {
      loadAllContractorStatusIndicators();
    }
  }, [contractors]);

  // Handle URL parameters for contractor selection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const contractorId = urlParams.get('contractor_id');
    const companyId = urlParams.get('companyId');
    const tab = urlParams.get('tab');

    if ((contractorId || companyId) && contractors.length > 0) {
      if (mode === 'new') {
        handleAddNewContractor();
      } else {
        // Try to find contractor by _id first (primary identifier), then by external identifiers
        let contractor = null;
        if (contractorId) {
          // Primary lookup by _id (ObjectId)
          contractor = contractors.find(c => c._id === contractorId);
          // Fallback to external identifiers for backward compatibility
          if (!contractor) {
            contractor = contractors.find(c => c.contractor_id === contractorId);
          }
        }
        if (!contractor && companyId) {
          // Primary lookup by _id (ObjectId)
          contractor = contractors.find(c => c._id === companyId);
          // Fallback to companyId for backward compatibility
          if (!contractor) {
            contractor = contractors.find(c => (c.companyId || c.company_id) === companyId);
          }
        }

        if (contractor) {
          // If no mode specified, default to 'view'
          const viewMode = mode || 'view';
          handleContractorSelect(contractor, viewMode as 'view' | 'edit');

          // Store the tab parameter for ContractorTabsSimple to use
          // Only set tab if there's no existing tab stored (to preserve tab on refresh)
          const existingTab = sessionStorage.getItem('contractor_active_tab');
          if (tab === 'projects' && !existingTab) {
            console.log('🔍 Setting contractor_active_tab to 2 for projects tab');
            sessionStorage.setItem('contractor_active_tab', '2');
          }
        } else {
          console.log('❌ No contractor found for ID:', contractorId || companyId);
          console.log('❌ Available contractors:', contractors.map(c => ({ _id: c._id, contractor_id: c.contractor_id, companyId: c.companyId, company_id: c.company_id, name: c.name })));
        }
      }

      // Keep URL parameters for page refresh support
      // Don't clean up URL parameters to allow F5 refresh to work
    }
  }, [contractors]);

  // Auto-select contact user's contractor (but NOT for system users)
  useEffect(() => {
    const contactUserAuthenticated = localStorage.getItem('contactUserAuthenticated');
    if (contactUserAuthenticated === 'true' && contractors.length > 0) {
      const contactUserData = localStorage.getItem('contactUser');
      if (contactUserData) {
        try {
          const contactUser = JSON.parse(contactUserData);
          console.log('🔍 Contact user data:', contactUser);

          // Check if this is a system user - if so, don't auto-select contractor
          if (contactUser.userType === 'system') {
            console.log('🔍 This is a system user, not auto-selecting contractor');
            return;
          }

          console.log('🔍 Available contractors:', contractors.map(c => ({ _id: c._id, contractor_id: c.contractor_id, name: c.name })));

          // Try to find contractor by _id first (primary identifier), then by contractor_id (external registry ID)
          const contractor = contractors.find(c =>
            c._id === contactUser.contractorId ||
            c.contractor_id === contactUser.contractorId
          );

          if (contractor) {
            console.log('✅ Found contractor for contact user:', contractor.name);
            handleContractorSelect(contractor, 'view');
          } else {
            console.log('❌ No contractor found for contact user contractorId:', contactUser.contractorId);
          }
        } catch (error) {
          console.error('Error parsing contact user data:', error);
        }
      }
    }
  }, [contractors]);

  const loadContractors = async () => {
    try {
      setLoading(true);
      const { default: ContractorService } = await import('../services/contractorService');
      const contractorsData = await ContractorService.getAll();

      // Check if user is a contact user (not system admin)
      const contactUserCheck = localStorage.getItem('contactUserAuthenticated') === 'true';
      const contactUserData = localStorage.getItem('contactUser');

      let isRealContactUser = false;
      if (contactUserCheck && contactUserData) {
        try {
          const contactUser = JSON.parse(contactUserData);
          console.log('🔍 Contact user data for type check:', contactUser);
          // Treat as contact user if userType is 'contact' OR 'contractor' (both are contact users)
          isRealContactUser = contactUser.userType === 'contact' || contactUser.userType === 'contractor';
          console.log('🔍 Is real contact user:', isRealContactUser);
        } catch (error) {
          console.error('Error parsing contact user data:', error);
          isRealContactUser = false;
        }
      }

      // Update state
      setIsContactUser(isRealContactUser);

      let filteredContractors;
      if (isRealContactUser && contactUserData) {
        try {
          const contactUser = JSON.parse(contactUserData);
          console.log('🔍 Contact user data for filtering:', contactUser);
          console.log('🔍 Available contractors for filtering:', contractorsData.map(c => ({ _id: c._id, contractor_id: c.contractor_id, name: c.name, isActive: c.isActive })));

          // For contact users, show only their associated contractor
          // Try to find by _id first (MongoDB ObjectId), then by contractor_id (external registry ID)
          filteredContractors = contractorsData.filter(contractor =>
            (contractor._id === contactUser.contractorId || contractor.contractor_id === contactUser.contractorId) &&
            contractor.isActive === true
          );
          console.log('📋 Filtered contractors for contact user:', filteredContractors.length, 'contractorId:', contactUser.contractorId);
        } catch (error) {
          console.error('Error parsing contact user data:', error);
          filteredContractors = [];
        }
      } else {
        // For system users (admin/regular), show all active contractors
        filteredContractors = contractorsData.filter(contractor => contractor.isActive === true);
        console.log('📋 Loaded all active contractors for system user:', filteredContractors.length);
      }

      setContractors(filteredContractors);

      // If we have projects loaded, update contractor stats
      if (projects.length > 0) {
        updateContractorStatsFromProjects(projects);
      }
    } catch (error) {
      console.error('Error loading contractors:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load projects from MongoDB
  const loadProjects = async () => {
    try {
      setProjectsLoading(true);
      const response = await fetch('https://contractorcrm-api.onrender.com/api/projects');
      if (response.ok) {
        const data = await response.json();
        // Handle both array response and object with projects property
        const projectsData = Array.isArray(data) ? data : (data.projects || []);

        // Classify projects by status
        const classifiedProjects = projectsData.map((project: any) => {
          const today = new Date();
          const startDate = new Date(project.startDate);
          const isClosed = project.isClosed === true;
          const status = project.status;

          let projectStatus = 'open'; // default

          if (isClosed || status === 'closed') {
            projectStatus = 'closed';
          } else if (status === 'current') {
            // If status is 'current', always classify as 'active' regardless of start date
            projectStatus = 'active';
          } else if (startDate > today) {
            projectStatus = 'future';
          }

          return {
            ...project,
            projectStatus // Add our classification
          };
        });

        console.log('Loaded and classified projects:', classifiedProjects);
        setProjects(classifiedProjects);

        // Update contractor statistics based on real projects
        updateContractorStatsFromProjects(classifiedProjects);
      } else {
        console.error('Failed to load projects');
        setProjects([]);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  // Update contractor statistics based on real projects
  const updateContractorStatsFromProjects = (projectsData: any[]) => {
    setContractors(prevContractors => {
      return prevContractors.map(contractor => {
        // Find projects for this contractor
        const contractorProjects = projectsData.filter(project => {
          // Check if project belongs to this contractor by multiple methods
          let matches = false;

          // Method 1: Check by mainContractor field
          matches = project.mainContractor === contractor._id ||
            project.mainContractor === contractor.contractor_id ||
            project.contractorName === contractor.name ||
            // Special case for צ.מ.ח המרמן - check for specific ObjectId and name
            (contractor.name === 'צ.מ.ח המרמן בע"מ' &&
              (project.mainContractor === '68b6e04d4cbe489fccf6151e' ||
                project.mainContractor === 'צ.מ.ח המרמן בע"מ' ||
                project.mainContractor === contractor.name));

          // Method 2: Check by projectIds array in contractor
          if (!matches && contractor.projectIds && Array.isArray(contractor.projectIds)) {
            matches = contractor.projectIds.includes(project._id);
          }

          // Method 3: Check by projectIds array in contractor (string comparison)
          if (!matches && contractor.projectIds && Array.isArray(contractor.projectIds)) {
            matches = contractor.projectIds.some(projectId =>
              projectId === project._id ||
              projectId === project.id ||
              projectId.toString() === project._id?.toString()
            );
          }

          if (contractor.name === 'צ.מ.ח המרמן בע"מ') {
            console.log(`🔍 Checking project ${project.projectName} for ${contractor.name}:`, {
              projectId: project._id,
              projectMainContractor: project.mainContractor,
              contractorId: contractor._id,
              contractorId2: contractor.contractor_id,
              contractorName: contractor.name,
              projectContractorName: project.contractorName,
              projectStatus: project.projectStatus,
              contractorProjectIds: contractor.projectIds,
              matches
            });
          }

          return matches;
        });

        // Count active and future projects
        const activeProjects = contractorProjects.filter(p => p.projectStatus === 'active' || p.projectStatus === 'current');
        const futureProjects = contractorProjects.filter(p => p.projectStatus === 'future');

        // Calculate values
        const activeProjectsValue = activeProjects.reduce((sum, p) => sum + (p.valueNis || 0), 0);
        const futureProjectsValue = futureProjects.reduce((sum, p) => sum + (p.valueNis || 0), 0);

        if (contractor.name === 'צ.מ.ח המרמן בע"מ') {
          console.log(`📊 Updated stats for ${contractor.name}:`, {
            totalProjects: contractorProjects.length,
            activeProjects: activeProjects.length,
            futureProjects: futureProjects.length,
            activeValue: activeProjectsValue,
            futureValue: futureProjectsValue,
            allProjects: contractorProjects.map(p => ({ name: p.projectName, status: p.projectStatus, mainContractor: p.mainContractor }))
          });
        }

        return {
          ...contractor,
          current_projects: activeProjects.length,
          current_projects_value_nis: activeProjectsValue,
          forcast_projects: futureProjects.length,
          forcast_projects_value_nis: futureProjectsValue
        };
      });
    });
  };

  // Load status indicators for all contractors
  const loadAllContractorStatusIndicators = async () => {
    const indicators: { [key: string]: string } = {};

    // Load indicators for all contractors with company_id
    const promises = contractors
      .filter(contractor => contractor.companyId || contractor.company_id)
      .map(async (contractor) => {
        try {
          const companyId = contractor.companyId || contractor.company_id;
          const response = await fetch(`/api/search-company/${companyId}`);
          const result = await response.json();

          if (result.success && result.data.statusIndicator) {
            indicators[companyId!] = result.data.statusIndicator;
          }
        } catch (error) {
          const companyId = contractor.companyId || contractor.company_id;
          console.error(`Error loading status for contractor ${companyId}:`, error);
        }
      });

    await Promise.all(promises);
    setContractorStatusIndicators(indicators);
    console.log('✅ Loaded status indicators for all contractors:', indicators);
  };

  const loadUserData = async () => {
    try {
      // Check if user is a contact user
      const contactUserAuthenticated = localStorage.getItem('contactUserAuthenticated');
      if (contactUserAuthenticated === 'true') {
        const contactUserData = localStorage.getItem('contactUser');
        if (contactUserData) {
          const contactUser = JSON.parse(contactUserData);
          setUser({
            name: contactUser.name || 'משתמש',
            picture: contactUser.picture || '',
            role: contactUser.role || 'contactUser',
            email: contactUser.email || ''
          });
          return;
        }
      }

      // For regular users, try to get from server
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        const response = await fetch(`/auth/me`, {
          credentials: 'include',
          headers: {
            'X-Session-ID': sessionId
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser({
            name: userData.name || 'משתמש',
            picture: userData.picture || '',
            role: userData.role || 'user',
            email: userData.email || ''
          });
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      // Set default user if loading fails
      setUser({
        name: 'משתמש',
        picture: '',
        role: 'user',
        email: ''
      });
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleContractorSelect = (contractor: Contractor, mode: 'view' | 'edit' | 'new' = 'view') => {
    console.log('🔍 Contractor selected:', contractor.name, 'mode:', mode);
    console.log('🔍 Setting selectedContractor to:', contractor);
    console.log('🔍 Setting contractorMode to:', mode);
    console.log('🔍 Setting showContractorDetails to: true');
    console.log('🔍 Contractor ID:', contractor._id || contractor.contractor_id);
    setSelectedContractor(contractor);
    setContractorMode(mode);
    setShowContractorDetails(true);

    // Update URL with contractor information for page refresh support
    const urlParams = new URLSearchParams(window.location.search);
    if (mode === 'new') {
      urlParams.set('mode', 'new');
    } else {
      // Use _id as primary identifier in URL
      urlParams.set('contractor_id', contractor._id || '');
      // Keep external identifiers for display purposes
      if (contractor.contractor_id) {
        urlParams.set('contractor_registry_id', contractor.contractor_id);
      }
      if (contractor.companyId || contractor.company_id) {
        urlParams.set('companyId', contractor.companyId || contractor.company_id);
      }
      urlParams.delete('mode'); // Remove mode for existing contractors
    }

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.pushState({}, document.title, newUrl);
    console.log('🔍 URL updated:', newUrl);

    console.log('🔍 State updated successfully');
  };

  const handleArchiveContractor = async (contractor: Contractor) => {
    const confirmed = window.confirm(`האם אתה בטוח שברצונך לארכב את הקבלן "${contractor.name}"?`);
    if (confirmed) {
      try {
        console.log('🔍 Archiving contractor:', contractor);
        console.log('🔍 Contractor ID:', contractor._id);
        console.log('🔍 Contractor ID type:', typeof contractor._id);

        const { default: ContractorService } = await import('../services/contractorService');
        // Archive contractor by setting isActive to false (CRM status)
        // Note: This is different from company status from Companies Registry
        console.log('🔍 Calling ContractorService.update with:', String(contractor._id), { isActive: false });
        await ContractorService.update(String(contractor._id), { isActive: false });
        console.log('✅ Contractor archived successfully');
        setSnackbar({ open: true, message: 'הקבלן נארכב בהצלחה', severity: 'success' });
        // Refresh the contractors list
        loadContractors();
      } catch (error) {
        console.error('❌ Error archiving contractor:', error);
        console.error('❌ Error details:', error.message);
        setSnackbar({ open: true, message: 'שגיאה בארכוב הקבלן', severity: 'error' });
      }
    }
  };

  const handleDeleteContractor = async (contractor: Contractor) => {
    const confirmed = window.confirm(`האם אתה בטוח שברצונך למחוק את הקבלן "${contractor.name}" לצמיתות? פעולה זו לא ניתנת לביטול!`);
    if (confirmed) {
      try {
        const { default: ContractorService } = await import('../services/contractorService');
        await ContractorService.delete(String(contractor._id));
        setSnackbar({ open: true, message: 'הקבלן נמחק בהצלחה', severity: 'success' });
        // Refresh the contractors list
        loadContractors();
      } catch (error) {
        console.error('Error deleting contractor:', error);
        setSnackbar({ open: true, message: 'שגיאה במחיקת הקבלן', severity: 'error' });
      }
    }
  };

  const confirmDeleteContractor = async () => {
    if (!contractorToDelete) return;

    try {
      const { default: ContractorService } = await import('../services/contractorService');
      const success = await ContractorService.delete(contractorToDelete.contractor_id);
      if (success) {
        setContractors(contractors.filter(c => c.contractor_id !== contractorToDelete.contractor_id));
        setSnackbarMessage('הקבלן נמחק בהצלחה');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        setSnackbarMessage('שגיאה במחיקת הקבלן');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error deleting contractor:', error);
      setSnackbarMessage('שגיאה במחיקת הקבלן');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setDeleteDialogOpen(false);
      setContractorToDelete(null);
    }
  };

  const handleUserMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleProfileClick = () => {
    setProfileDialogOpen(true);
    handleUserMenuClose();
  };

  const handleUserManagementClick = () => {
    // Save current location before opening user management
    const currentUrl = window.location.href;
    localStorage.setItem('userManagementReturnUrl', currentUrl);
    // Set flag to remember user management mode for refresh
    localStorage.setItem('userManagementMode', 'true');
    setUserManagementOpen(true);
    handleUserMenuClose();
  };

  const handleLogout = () => {
    // Clear localStorage and redirect to login
    localStorage.clear();
    window.location.href = '/login';
  };

  const handleViewModeToggle = () => {
    if (viewMode === 'contractors') {
      setViewMode('projects');
      loadProjects();
    } else {
      setViewMode('contractors');
    }
    handleUserMenuClose();
  };

  const handleCloseContractorDetails = () => {
    setShowContractorDetails(false);
    setSelectedContractor(null);
    setContractorMode('view');

    // Reset URL to main contractors list
    window.history.pushState({}, '', '/');
  };

  const handleSaveContractor = async (updatedContractor: Contractor, skipCompanyIdCheck = false) => {
    console.log('💾 Starting save process for contractor:', {
      companyId: updatedContractor.companyId,
      name: updatedContractor.name,
      contractorId: updatedContractor.contractorId,
      mode: contractorMode
    });
    console.log('🔍 Full updatedContractor object received:', updatedContractor);
    console.log('🔍 Object keys:', Object.keys(updatedContractor));
    console.log('🔍 companyId field exists:', 'companyId' in updatedContractor);
    console.log('🔍 company_id field exists:', 'company_id' in updatedContractor);
    console.log('🔍 companyId value:', updatedContractor.companyId);
    console.log('🔍 company_id value:', updatedContractor.company_id);
    console.log('🔍 companyId type:', typeof updatedContractor.companyId);
    console.log('🔍 company_id type:', typeof updatedContractor.company_id);

    // SIMPLE FIX: Check if this is a PointerEvent (button click) instead of contractor data
    if (updatedContractor && updatedContractor.type === 'click') {
      console.log('🚨 ERROR: Received PointerEvent instead of contractor data!');
      console.log('🚨 This means the onSave is being called incorrectly');
      return; // Exit early to prevent saving wrong data
    }

    setIsSaving(true);
    try {
      const { default: ContractorService } = await import('../services/contractorService');

      // Don't save if companyId is empty or undefined
      console.log('🔍 Validation check - updatedContractor:', updatedContractor);
      console.log('🔍 Validation check - updatedContractor.companyId:', updatedContractor.companyId);
      console.log('🔍 Validation check - updatedContractor.company_id:', updatedContractor.company_id);
      console.log('🔍 Validation check - updatedContractor keys:', Object.keys(updatedContractor));
      console.log('🔍 Validation check - updatedContractor has companyId:', 'companyId' in updatedContractor);
      console.log('🔍 Validation check - updatedContractor has company_id:', 'company_id' in updatedContractor);

      // Try different ways to access companyId
      const companyId1 = updatedContractor.companyId;
      const companyId2 = updatedContractor.company_id;
      const companyId3 = updatedContractor['companyId'];
      const companyId4 = updatedContractor['company_id'];

      console.log('🔍 Validation check - companyId1 (direct):', companyId1);
      console.log('🔍 Validation check - companyId2 (direct):', companyId2);
      console.log('🔍 Validation check - companyId3 (bracket):', companyId3);
      console.log('🔍 Validation check - companyId4 (bracket):', companyId4);

      const companyId = companyId1 || companyId2 || companyId3 || companyId4;
      console.log('🔍 Validation check - companyId (final):', companyId);
      console.log('🔍 Validation check - companyId type:', typeof companyId);
      console.log('🔍 Validation check - companyId length:', companyId?.length);
      console.log('🔍 Validation check - companyId trim:', companyId?.trim());

      // Check if companyId is valid
      if (companyId && companyId.trim() !== '') {
        console.log('🔍 Validation check - companyId is NOT empty or undefined. Proceeding with save.');
      } else {
        console.log('🔍 Validation check - companyId IS empty or undefined. This should not happen!');
      }
      if (!companyId || companyId.trim() === '') {
        console.log('❌ Save failed: Company ID is empty');
        setSnackbarMessage('נא להזין מספר חברה לפני השמירה');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setIsSaving(false);
        return;
      }

      if (contractorMode === 'new' && !skipCompanyIdCheck) {
        // Check if companyId already exists in the database
        const existingContractor = contractors.find(c => (c.companyId || c.company_id) === companyId);

        if (existingContractor) {
          // Company ID already exists - load existing contractor for editing
          console.log('✅ Company ID already exists, loading existing contractor for editing:', existingContractor.name);
          setSelectedContractor(existingContractor);
          setContractorMode('edit');
          setSnackbarMessage(`הח"פ ${companyId} כבר קיים במערכת. נטען הקבלן "${existingContractor.name}" עם כל הנתונים לעריכה.`);
          setSnackbarSeverity('info');
          setSnackbarOpen(true);
          setIsSaving(false);
          return;
        }

        // Double-check with API to see if company exists in MongoDB
        try {
          const response = await fetch(`/api/search-company/${companyId}`);
          const result = await response.json();

          if (result.success && result.source === 'mongodb') {
            // Company exists in MongoDB - load it for editing
            console.log('✅ Company exists in MongoDB, loading for editing:', result.data.name);

            // If contractor is archived (isActive: false), we'll make it active when saving
            const contractorData = result.data;
            if (contractorData.status === 'archived' || !contractorData.isActive) {
              console.log('📋 Contractor is archived, will be made active on save');
              setSnackbarMessage(`הח"פ ${companyId} קיים במערכת אך ארכיב. הקבלן יופעל מחדש בעת השמירה.`);
              setSnackbarSeverity('info');
              setSnackbarOpen(true);
            } else {
              setSnackbarMessage(`הח"פ ${companyId} כבר קיים במערכת. נטען הקבלן "${contractorData.name}" עם כל הנתונים לעריכה.`);
              setSnackbarSeverity('info');
              setSnackbarOpen(true);
            }

            // Set the contractor data and switch to edit mode
            setSelectedContractor(contractorData);
            setContractorMode('edit');
            setIsSaving(false);
            return;
          }
        } catch (error) {
          console.error('Error checking company existence:', error);
          // Continue with creating new contractor if API check fails
        }

        console.log('💾 Creating new contractor in MongoDB...');
        const newContractor = await ContractorService.create(updatedContractor);
        console.log('✅ New contractor created successfully:', newContractor);
        setContractors([...contractors, newContractor]);

        // After successful creation, switch to edit mode and update URL
        setSelectedContractor(newContractor);
        setContractorMode('edit');

        // Update URL with the new contractor's _id
        const newUrl = `/?id=${newContractor._id}&mode=edit`;
        window.history.pushState({}, '', newUrl);

        setSnackbarMessage('הקבלן נוצר בהצלחה');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        console.log('💾 Updating existing contractor in MongoDB...');

        // Ensure contractor is active when saving
        const contractorToUpdate = {
          ...updatedContractor,
          isActive: true, // Always make contractor active when saving
          status: 'פעילה' // Set status to active
        };

        // Use the correct ID for updating - try _id first, then contractorId, then contractor_id
        const updateId = contractorToUpdate._id || contractorToUpdate.contractorId || contractorToUpdate.contractor_id;
        console.log('🔍 Using updateId for contractor update:', updateId);
        console.log('🔍 Available IDs:', {
          _id: contractorToUpdate._id,
          contractorId: contractorToUpdate.contractorId,
          contractor_id: contractorToUpdate.contractor_id
        });

        if (!updateId) {
          console.error('❌ No valid ID found for contractor update');
          setSnackbarMessage('שגיאה: לא נמצא מזהה קבלן לעדכון');
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
          setIsSaving(false);
          return;
        }

        const updated = await ContractorService.update(updateId, contractorToUpdate);
        if (updated) {
          console.log('✅ Contractor updated successfully:', updated);

          // Update contractors list - add if not exists, update if exists
          const existingIndex = contractors.findIndex(c =>
            c._id === updateId || c.contractorId === updateId || c.contractor_id === updateId
          );
          if (existingIndex >= 0) {
            // Update existing contractor in list
            setContractors(contractors.map(c =>
              (c._id === updateId || c.contractorId === updateId || c.contractor_id === updateId) ? updated : c
            ));
          } else {
            // Add contractor to list (was archived, now active)
            setContractors([...contractors, updated]);
          }

          setSelectedContractor(updated);
          setSnackbarMessage('הקבלן עודכן בהצלחה');
          setSnackbarSeverity('success');
          setSnackbarOpen(true);
        } else {
          console.log('❌ Failed to update contractor');
          setSnackbarMessage('שגיאה בעדכון הקבלן');
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
        }
      }
    } catch (error) {
      console.error('Error saving contractor:', error);

      // More detailed error handling
      let errorMessage = 'שגיאה בשמירת הקבלן';

      if (error instanceof Error) {
        if (error.message.includes('429') || error.message.includes('Too many requests')) {
          errorMessage = 'יותר מדי בקשות לשרת. נסה שוב בעוד כמה דקות.';
        } else if (error.message.includes('JSON') || error.message.includes('Unexpected token')) {
          errorMessage = 'שגיאה בעיבוד הנתונים. נסה שוב.';
        } else if (error.message.includes('Network') || error.message.includes('fetch')) {
          errorMessage = 'שגיאת רשת. בדוק את החיבור לאינטרנט.';
        } else {
          errorMessage = `שגיאה בשמירת הקבלן: ${error.message}`;
        }
      }

      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      console.log('💾 Save process completed, setting isSaving to false');
      setIsSaving(false);
    }
  };

  const handleAddNewContractor = () => {
    const newContractor: any = {
      // Don't set contractorId or contractor_id for new contractors - they should be empty
      // These will be populated from external APIs when companyId is entered
      contractorId: '',
      contractor_id: '',
      companyId: '', // Set empty string for new contractors
      company_id: '', // Also set old field for backward compatibility
      name: '',
      nameEnglish: '',
      companyType: 'private_company',
      numberOfEmployees: 0,
      foundationDate: '',
      city: '',
      address: '',
      email: '',
      phone: '',
      website: '',
      sector: '',
      segment: '',
      activityType: '',
      description: '',
      contacts: [],
      notes: '',
      safetyRating: 0,
      classifications: [],
      iso45001: false,
      isActive: true,
      projectIds: [],
      projects: [],
      current_projects: 0,
      current_projects_value_nis: 0,
      forcast_projects: 0,
      forcast_projects_value_nis: 0,
      status: 'פעילה',
      violator: false,
      restrictions: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      _id: ''
    };
    handleContractorSelect(newContractor, 'new');
  };

  if (loading) {
    return <SkeletonLoader />;
  }

  // Filter contractors based on search term
  const filteredContractors = contractors.filter(contractor => {
    // Filter out archived contractors (unless user is admin)
    const isAdmin = currentUser?.permissions === 'admin';
    if (contractor.isActive === false && !isAdmin) {
      return false;
    }

    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();

    // Search in basic contractor info
    const basicMatch =
      contractor.name?.toLowerCase().includes(searchLower) ||
      contractor.company_id?.toLowerCase().includes(searchLower) ||
      contractor.city?.toLowerCase().includes(searchLower) ||
      contractor.nameEnglish?.toLowerCase().includes(searchLower);

    // Search in contacts
    const contactMatch = contractor.contacts?.some(contact =>
      contact.fullName?.toLowerCase().includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower) ||
      contact.mobile?.includes(searchTerm) ||
      contact.role?.toLowerCase().includes(searchLower)
    );

    // Search in projects
    const projectMatch = contractor.projects?.some(project =>
      project.projectName?.toLowerCase().includes(searchLower) ||
      project.description?.toLowerCase().includes(searchLower)
    );

    return basicMatch || contactMatch || projectMatch;
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header with Profile */}
      <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: 'white' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: (user?.role === 'user' || user?.role === 'admin') ? 'pointer' : 'default',
              borderRadius: 1,
              transition: 'background-color 0.2s ease',
              '&:hover': {
                backgroundColor: (user?.role === 'user' || user?.role === 'admin') ? 'rgba(156, 39, 176, 0.04)' : 'transparent'
              }
            }}
              onClick={() => {
                // Navigate to CRM for user and admin types
                if (user?.role === 'user' || user?.role === 'admin') {
                  handleCloseContractorDetails();
                }
              }}
            >
              <img src="/assets/logo.svg" alt="שוקו ביטוח" style={{ width: '100%', height: '100%' }} />
            </Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#424242' }}>
              ניהול סיכונים באתרי בניה
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {user?.picture ? (
              <Avatar src={user.picture} alt={user.name} sx={{ width: 32, height: 32 }} />
            ) : (
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#6b47c1' }}>
                <AccountCircleIcon />
              </Avatar>
            )}
            <Typography variant="body2">{user?.name || 'משתמש'}</Typography>
            <IconButton onClick={handleUserMenuClick}>
              <MoreVertIcon />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {!showContractorDetails && !userManagementOpen ? (
        /* Main List View */
        <Box sx={{ p: 2 }}>
          {/* Search and Add Button */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <TextField
              size="small"
              placeholder={viewMode === 'contractors' ? "חיפוש קבלנים, אנשי קשר, עיר, שם פרויקט..." : "חיפוש פרויקטים..."}
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{
                bgcolor: 'white',
                borderRadius: 1,
                minWidth: 800
              }}
            />

            {/* Only show Add Contractor button for system users in contractors view */}
            {!isContactUser && viewMode === 'contractors' && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddNewContractor}
                sx={{ bgcolor: '#6b47c1' }}
              >
                הוסף קבלן
              </Button>
            )}

          </Box>

          {/* Statistics Cards */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            {viewMode === 'contractors' ? (
              <>
                <Paper sx={{ p: 2, flex: 1, textAlign: 'center', bgcolor: 'white', boxShadow: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#424242' }}>
                    {filteredContractors.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {searchTerm ? 'קבלנים נמצאו' : 'סה״כ קבלנים'}
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: 1, textAlign: 'center', bgcolor: 'white', boxShadow: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#424242' }}>
                    {filteredContractors.reduce((sum, c) => sum + (c.current_projects || 0), 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    פרויקטים פעילים
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ₪{filteredContractors.reduce((sum, c) => sum + (c.current_projects_value_nis || 0), 0).toLocaleString()}
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: 1, textAlign: 'center', bgcolor: 'white', boxShadow: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#424242' }}>
                    {filteredContractors.reduce((sum, c) => sum + (c.forcast_projects || 0), 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    פרויקטים עתידיים
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ₪{filteredContractors.reduce((sum, c) => sum + (c.forcast_projects_value_nis || 0), 0).toLocaleString()}
                  </Typography>
                </Paper>
              </>
            ) : (
              <>
                <Paper sx={{ p: 2, flex: 1, textAlign: 'center', bgcolor: 'white', boxShadow: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#424242' }}>
                    {projects.filter(p => {
                      if (projectsFilter === 'all') return true;
                      if (projectsFilter === 'active') return p.projectStatus === 'active' || p.projectStatus === 'current';
                      if (projectsFilter === 'future') return p.projectStatus === 'future';
                      return p.projectStatus === 'closed';
                    }).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {projectsFilter === 'all' ? 'סה״כ פרויקטים' : projectsFilter === 'active' ? 'פרויקטים פעילים' : projectsFilter === 'future' ? 'פרויקטים עתידיים' : 'פרויקטים סגורים'}
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: 1, textAlign: 'center', bgcolor: 'white', boxShadow: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#424242' }}>
                    {projects.filter(p => p.projectStatus === 'active' || p.projectStatus === 'current').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    פרויקטים פעילים
                  </Typography>
                </Paper>
                <Paper sx={{ p: 2, flex: 1, textAlign: 'center', bgcolor: 'white', boxShadow: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#424242' }}>
                    {projects.filter(p => p.projectStatus === 'future').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    פרויקטים עתידיים
                  </Typography>
                </Paper>
              </>
            )}
          </Box>

          {/* Filter Tabs for Projects */}
          {viewMode === 'projects' && (
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                variant={projectsFilter === 'all' ? 'contained' : 'outlined'}
                onClick={() => setProjectsFilter('all')}
                sx={{
                  bgcolor: projectsFilter === 'all' ? '#6b47c1' : 'transparent',
                  color: projectsFilter === 'all' ? 'white' : '#6b47c1',
                  borderColor: '#6b47c1',
                  '&:hover': {
                    bgcolor: projectsFilter === 'all' ? '#5a3aa1' : '#f3f0ff',
                    borderColor: '#6b47c1'
                  }
                }}
              >
                הכל
              </Button>
              <Button
                variant={projectsFilter === 'active' ? 'contained' : 'outlined'}
                onClick={() => setProjectsFilter('active')}
                sx={{
                  bgcolor: projectsFilter === 'active' ? '#6b47c1' : 'transparent',
                  color: projectsFilter === 'active' ? 'white' : '#6b47c1',
                  borderColor: '#6b47c1',
                  '&:hover': {
                    bgcolor: projectsFilter === 'active' ? '#5a3aa1' : '#f3f0ff',
                    borderColor: '#6b47c1'
                  }
                }}
              >
                פעילים
              </Button>
              <Button
                variant={projectsFilter === 'future' ? 'contained' : 'outlined'}
                onClick={() => setProjectsFilter('future')}
                sx={{
                  bgcolor: projectsFilter === 'future' ? '#6b47c1' : 'transparent',
                  color: projectsFilter === 'future' ? 'white' : '#6b47c1',
                  borderColor: '#6b47c1',
                  '&:hover': {
                    bgcolor: projectsFilter === 'future' ? '#5a3aa1' : '#f3f0ff',
                    borderColor: '#6b47c1'
                  }
                }}
              >
                עתידיים
              </Button>
              <Button
                variant={projectsFilter === 'closed' ? 'contained' : 'outlined'}
                onClick={() => setProjectsFilter('closed')}
                sx={{
                  bgcolor: projectsFilter === 'closed' ? '#6b47c1' : 'transparent',
                  color: projectsFilter === 'closed' ? 'white' : '#6b47c1',
                  borderColor: '#6b47c1',
                  '&:hover': {
                    bgcolor: projectsFilter === 'closed' ? '#5a3aa1' : '#f3f0ff',
                    borderColor: '#6b47c1'
                  }
                }}
              >
                סגור
              </Button>
            </Box>
          )}

          {/* Main List */}
          <Paper elevation={1} sx={{ p: 2, height: 'calc(100vh - 120px)', overflow: 'auto' }}>
            {viewMode === 'contractors' ? (
              <>
                {filteredContractors.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      {searchTerm ? 'לא נמצאו קבלנים התואמים לחיפוש' : 'אין קבלנים במערכת'}
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
                    <Table>
                      <TableBody>
                        {filteredContractors.map((contractor) => (
                          <TableRow
                            key={contractor.contractorId || contractor.contractor_id}
                            sx={{
                              '&:hover': { backgroundColor: '#f0f0f0' },
                              cursor: 'pointer',
                              backgroundColor: (selectedContractor && (
                                (selectedContractor.contractorId && contractor.contractorId && selectedContractor.contractorId === contractor.contractorId) ||
                                (selectedContractor.contractor_id && contractor.contractor_id && selectedContractor.contractor_id === contractor.contractor_id) ||
                                (selectedContractor._id && contractor._id && selectedContractor._id === contractor._id)
                              )) ? '#e3f2fd' : '#ffffff'
                            }}
                            onClick={(e) => {
                              console.log('🔥 Contractor row clicked!', contractor.name);
                              e.preventDefault();
                              e.stopPropagation();

                              const contactUserData = localStorage.getItem('contactUser');

                              console.log('🔥 Contact user check:', { isContactUser, hasContactUserData: !!contactUserData });

                              let mode: 'view' | 'edit' = 'view';

                              if (isContactUser && contactUserData) {
                                try {
                                  const userData = JSON.parse(contactUserData);
                                  const permissions = userData.permissions;
                                  const contractorId = userData.contractorId;

                                  // Check if this contact user has access to this contractor
                                  if (contractorId !== contractor._id) {
                                    console.log('🚫 Contact user does not have access to this contractor');
                                    return; // Don't open contractor details
                                  }

                                  // Contact admins can edit, contact users can only view
                                  mode = (permissions === 'contactAdmin') ? 'edit' : 'view';
                                } catch (error) {
                                  console.error('Error parsing contact user data:', error);
                                  mode = 'view';
                                }
                              } else {
                                // Regular users can edit
                                mode = 'edit';
                              }

                              console.log('🔥 Opening contractor in mode:', mode);
                              console.log('🔥 Calling handleContractorSelect with:', { contractor: contractor.name, mode });
                              handleContractorSelect(contractor, mode);
                            }}
                          >
                            {/* קבלן */}
                            <TableCell sx={{ textAlign: 'right' }}>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  {contractor.name}
                                </Typography>
                                {contractor.email && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                      display: 'block',
                                      cursor: 'pointer'
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.location.href = `mailto:${contractor.email}`;
                                    }}
                                  >
                                    📧                                 <span style={{
                                      textDecoration: 'underline'
                                    }}>{contractor.email}</span>
                                  </Typography>
                                )}
                                {contractor.phone && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{
                                      display: 'block',
                                      cursor: 'pointer'
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.location.href = `tel:${contractor.phone}`;
                                    }}
                                  >
                                    📞                                 <span style={{
                                      textDecoration: 'underline'
                                    }}>{contractor.phone}</span>
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>

                            {/* ח"פ */}
                            <TableCell sx={{ textAlign: 'right', paddingRight: 0 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', direction: 'rtl', width: '100%' }}>
                                {(contractor.companyId || contractor.company_id) && contractorStatusIndicators[contractor.companyId || contractor.company_id] && (
                                  <Tooltip
                                    title={getStatusTooltipText(contractorStatusIndicators[contractor.companyId || contractor.company_id])}
                                    arrow
                                    placement="top"
                                  >
                                    <Box sx={{ fontSize: '16px', lineHeight: 1, cursor: 'help', marginLeft: '4px' }}>
                                      {contractorStatusIndicators[contractor.companyId || contractor.company_id]}
                                    </Box>
                                  </Tooltip>
                                )}
                                <Typography variant="body2" sx={{ textAlign: 'right', margin: 0 }}>
                                  {contractor.companyId || contractor.company_id}
                                </Typography>
                              </Box>
                              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right', display: 'block' }}>
                                קבלן {contractor.contractorId || contractor.contractor_id}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right', display: 'block' }}>
                                {contractor.companyType === 'private_company' ? 'חברה פרטית' :
                                  contractor.companyType === 'public_company' ? 'חברה ציבורית' :
                                    contractor.companyType === 'authorized_dealer' ? 'עוסק מורשה' :
                                      contractor.companyType === 'exempt_dealer' ? 'עוסק פטור' :
                                        contractor.companyType === 'cooperative' ? 'אגודה שיתופית' :
                                          contractor.companyType || 'לא צוין'}
                              </Typography>
                            </TableCell>

                            {/* כתובת */}
                            <TableCell sx={{ textAlign: 'right' }}>
                              <Typography variant="body2">
                                {contractor.city}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {contractor.address}
                              </Typography>
                            </TableCell>

                            {/* פרויקטים פעילים */}
                            <TableCell sx={{ textAlign: 'right' }}>
                              <Typography variant="body2">
                                {contractor.current_projects || 0} פעילים
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ₪{(contractor.current_projects_value_nis || 0).toLocaleString()}
                              </Typography>
                            </TableCell>

                            {/* פרויקטים עתידיים */}
                            <TableCell sx={{ textAlign: 'right' }}>
                              <Typography variant="body2">
                                {contractor.forcast_projects || 0} עתידיים
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ₪{(contractor.forcast_projects_value_nis || 0).toLocaleString()}
                              </Typography>
                            </TableCell>

                            {/* דירוג בטיחות */}
                            <TableCell sx={{ textAlign: 'right' }}>
                              <Typography variant="body2">
                                {contractor.safetyRating || 0} כוכבים
                              </Typography>
                              {contractor.iso45001 && (
                                <Typography variant="caption" color="text.secondary">
                                  ISO45001
                                </Typography>
                              )}
                            </TableCell>

                            {/* פעולות - רק למשתמשי מערכת */}
                            {!isContactUser && (
                              <TableCell sx={{ textAlign: 'center' }}>
                                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                  {/* כפתור ארכב - לכל המשתמשים */}
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleArchiveContractor(contractor);
                                    }}
                                    sx={{
                                      color: '#5f6368',
                                      '&:hover': {
                                        backgroundColor: '#f1f3f4',
                                        color: '#202124'
                                      }
                                    }}
                                  >
                                    <ArchiveIcon fontSize="small" />
                                  </IconButton>

                                  {/* כפתור מחק - רק לאדמין */}
                                  {currentUser?.permissions === 'admin' && (
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteContractor(contractor);
                                      }}
                                      sx={{
                                        color: '#5f6368',
                                        '&:hover': {
                                          backgroundColor: '#fce8e6',
                                          color: '#d93025'
                                        }
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                </Box>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            ) : (
              <>
                {projectsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <>
                    {projects.filter(p => {
                      if (projectsFilter === 'all') return true;
                      return p.projectStatus === projectsFilter;
                    }).filter(p => {
                      if (!searchTerm) return true;
                      return p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.description?.toLowerCase().includes(searchTerm.toLowerCase());
                    }).length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                          {searchTerm ? 'לא נמצאו פרויקטים התואמים לחיפוש' : 'אין פרויקטים במערכת'}
                        </Typography>
                      </Box>
                    ) : (
                      <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ textAlign: 'right', fontWeight: 'bold' }}>שם פרויקט</TableCell>
                              <TableCell sx={{ textAlign: 'right', fontWeight: 'bold' }}>תיאור</TableCell>
                              <TableCell sx={{ textAlign: 'right', fontWeight: 'bold' }}>סטטוס</TableCell>
                              <TableCell sx={{ textAlign: 'right', fontWeight: 'bold' }}>תאריך יצירה</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {projects.filter(p => {
                              if (projectsFilter === 'all') return true;
                              return p.projectStatus === projectsFilter;
                            }).filter(p => {
                              if (!searchTerm) return true;
                              return p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                p.description?.toLowerCase().includes(searchTerm.toLowerCase());
                            }).map((project) => (
                              <TableRow
                                key={project._id}
                                sx={{
                                  cursor: 'pointer',
                                  '&:hover': {
                                    backgroundColor: '#f5f5f5'
                                  }
                                }}
                                onClick={() => {
                                  // Navigate to project details
                                  window.location.href = `/project-details?projectId=${project._id}&projectName=${encodeURIComponent(project.projectName || '')}`;
                                }}
                              >
                                <TableCell sx={{ textAlign: 'right' }}>
                                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                    {project.projectName || 'ללא שם'}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>
                                  <Typography variant="body2">
                                    {project.description || 'ללא תיאור'}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>
                                  <Box sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    px: 1.5,
                                    py: 0.5,
                                    borderRadius: '16px',
                                    bgcolor: (project.projectStatus === 'active' || project.projectStatus === 'current') ? '#e3f2fd' : project.projectStatus === 'future' ? '#fff3e0' : '#f0f0f0',
                                    color: (project.projectStatus === 'active' || project.projectStatus === 'current') ? '#2196f3' : project.projectStatus === 'future' ? '#f57c00' : '#666',
                                    fontWeight: 'bold',
                                    minWidth: '70px'
                                  }}>
                                    {(project.projectStatus === 'active' || project.projectStatus === 'current') ? 'פעיל' : project.projectStatus === 'future' ? 'עתידי' : 'סגור'}
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>
                                  <Typography variant="body2">
                                    {project.createdAt ? new Date(project.createdAt).toLocaleDateString('he-IL') : 'ללא תאריך'}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </>
                )}
              </>
            )}
          </Paper>
        </Box>
      ) : !userManagementOpen ? (
        /* Contractor Details View */
        <Box sx={{ p: 2 }}>
          <Paper elevation={1} sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
            {/* Contractor Header */}
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 1.5,
              bgcolor: 'white',
              color: 'black',
              border: '1px solid #e0e0e0',
              borderBottom: 'none',
              borderRadius: '4px 4px 0 0',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              flexShrink: 0
            }}>
              <Typography variant="h6" sx={{ fontWeight: 500, color: 'black' }}>
                {selectedContractor?.name || 'קבלן חדש'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {/* Show buttons based on user permissions */}
                {(() => {
                  if (isContactUser) {
                    console.log('🔧 Hiding buttons for contactUser');
                    return null;
                  }

                  return (
                    <>
                      <Button
                        variant="outlined"
                        onClick={handleCloseContractorDetails}
                        disabled={isSaving}
                        sx={{
                          minWidth: 'auto',
                          px: 2,
                          borderColor: '#6b47c1', // סגול שוקו
                          color: '#6b47c1', // סגול שוקו
                          '&:hover': {
                            borderColor: '#5a3aa1', // סגול כהה יותר בהובר
                            backgroundColor: 'rgba(136, 47, 215, 0.04)' // רקע בהיר בהובר
                          },
                          '&:disabled': {
                            borderColor: '#6b47c1',
                            color: '#6b47c1',
                            opacity: 0.7
                          }
                        }}
                      >
                        סגירה
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => {
                          console.log('🔘 Save button clicked - calling ContractorTabs handleSave');
                          if (contractorTabsRef.current && contractorTabsRef.current.handleSave) {
                            contractorTabsRef.current.handleSave();
                          } else {
                            console.log('🚨 ContractorTabs ref not available or handleSave not found');
                          }
                        }}
                        disabled={isSaving}
                        sx={{
                          minWidth: 'auto',
                          px: 2,
                          backgroundColor: '#6b47c1', // סגול שוקו
                          '&:hover': {
                            backgroundColor: '#5a3aa1' // סגול כהה יותר בהובר
                          },
                          '&:disabled': {
                            backgroundColor: '#6b47c1',
                            opacity: 0.7
                          }
                        }}
                      >
                        {isSaving ? 'שומר...' : 'שמירה'}
                      </Button>
                    </>
                  );
                })()}
              </Box>
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {console.log('🔧 UnifiedContractorView - Passing contractorMode to ContractorTabsSimple:', contractorMode)}
              <ContractorTabsSimple
                ref={contractorTabsRef}
                contractor={selectedContractor!}
                onSave={(contractorData) => {
                  console.log('🔧 onSave called with:', contractorData);
                  handleSaveContractor(contractorData);
                }}
                onClose={handleCloseContractorDetails}
                isContactUser={isContactUser}
                contractorMode={contractorMode}
                contactUserPermissions={(() => {
                  const contactUserData = localStorage.getItem('contactUser');
                  console.log('🔧 contactUserPermissions debug - localStorage data:', contactUserData);
                  if (contactUserData) {
                    try {
                      const contactUser = JSON.parse(contactUserData);
                      console.log('🔧 contactUserPermissions debug - parsed user:', contactUser);
                      console.log('🔧 contactUserPermissions debug - user keys:', Object.keys(contactUser));
                      console.log('🔧 contactUserPermissions debug - userType:', contactUser.userType);
                      console.log('🔧 contactUserPermissions debug - permissions:', contactUser.permissions);
                      // Check userType first to determine if this is a contact user
                      if (contactUser.userType === 'contact' || contactUser.userType === 'contractor') {
                        console.log('🔧 contactUserPermissions debug - this is a contact user, checking permissions');
                        // For contact users, use permissions field
                        if (contactUser.permissions) {
                          console.log('🔧 contactUserPermissions debug - using permissions:', contactUser.permissions);
                          return contactUser.permissions; // 'contactAdmin' or 'contactUser'
                        }
                        // If no permissions field, default to contactUser
                        console.log('🔧 contactUserPermissions debug - no permissions field, defaulting to contactUser');
                        return 'contactUser';
                      }
                      // For system users (admin/regular), use role instead of permissions
                      if (contactUser.role) {
                        console.log('🔧 contactUserPermissions debug - this is a system user, using role:', contactUser.role);
                        return contactUser.role; // 'admin' or 'user'
                      }
                      console.log('🔧 contactUserPermissions debug - defaulting to contactUser');
                      return 'contactUser';
                    } catch (error) {
                      console.error('Error parsing contact user data:', error);
                      return 'contactUser';
                    }
                  }
                  console.log('🔧 contactUserPermissions debug - no localStorage data, defaulting to contactUser');
                  return 'contactUser';
                })()}
                currentUser={currentUser}
                isSaving={isSaving}
                onUpdateContractor={setSelectedContractor}
                onShowNotification={setSnackbar}
              />
            </Box>
          </Paper>
        </Box>
      ) : null}

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleUserMenuClose}
      >
        <MenuItem onClick={handleProfileClick}>
          <AccountCircleIcon sx={{ mr: 1 }} />
          פרופיל
        </MenuItem>
        {/* Only show User Management for admin users */}
        {currentUser?.role === 'admin' && (
          <MenuItem onClick={handleUserManagementClick}>
            <AccountCircleIcon sx={{ mr: 1 }} />
            ניהול משתמשים
          </MenuItem>
        )}
        {/* Show view mode toggle for system users */}
        {(currentUser?.role === 'admin' || currentUser?.role === 'user') && (
          <MenuItem onClick={handleViewModeToggle}>
            <AccountCircleIcon sx={{ mr: 1 }} />
            {viewMode === 'contractors' ? 'פרוייקטים' : 'קבלנים'}
          </MenuItem>
        )}
        <MenuItem onClick={handleLogout}>
          <AccountCircleIcon sx={{ mr: 1 }} />
          התנתקות
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>מחיקת קבלן</DialogTitle>
        <DialogContent>
          <Typography>
            האם אתה בטוח שברצונך למחוק את הקבלן "{contractorToDelete?.name}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>ביטול</Button>
          <Button onClick={confirmDeleteContractor} color="error" variant="contained">
            מחק
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Management - Full Screen */}
      {userManagementOpen && (
        <Box sx={{
          position: 'fixed',
          top: '80px', // Start below the header
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1300,
          backgroundColor: 'background.default'
        }}>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 80px)', // Full height minus header
            p: 2
          }}>
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2
            }}>
              <Typography variant="h4" component="h1">
                ניהול משתמשים
              </Typography>
              <Button
                variant="outlined"
                onClick={() => {
                  setUserManagementOpen(false);
                  // Clear user management mode flag
                  localStorage.removeItem('userManagementMode');
                  // Return to the saved location
                  const returnUrl = localStorage.getItem('userManagementReturnUrl');
                  if (returnUrl) {
                    localStorage.removeItem('userManagementReturnUrl');
                    window.location.href = returnUrl;
                  }
                }}
              >
                סגירה
              </Button>
            </Box>
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <UserManagement />
            </Box>
          </Box>
        </Box>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
} 