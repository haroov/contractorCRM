import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Paper, Typography, Button, TextField, InputAdornment, Avatar, IconButton, Menu, MenuItem, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, CircularProgress, Tooltip } from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, Archive as ArchiveIcon, Delete as DeleteIcon, MoreVert as MoreVertIcon, AccountCircle as AccountCircleIcon, Close as CloseIcon, Engineering as EngineeringIcon } from '@mui/icons-material';
import type { Contractor } from '../types/contractor';
// import ContractorService from '../services/contractorService';
import UserManagement from './UserManagement';
import SkeletonLoader from './SkeletonLoader';

const ContractorTabs = lazy(() => import('./ContractorTabsSimple'));

interface UnifiedContractorViewProps {
  currentUser?: any;
}

export default function UnifiedContractorView({ currentUser }: UnifiedContractorViewProps) {

  const { id } = useParams();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractorToDelete, setContractorToDelete] = useState<Contractor | null>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [user, setUser] = useState<{ name: string, picture: string, role: string, email: string } | null>(null);
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

    if (mode && contractorId && contractors.length > 0) {
      if (mode === 'new') {
        handleAddNewContractor();
      } else {
        const contractor = contractors.find(c => c.contractor_id === contractorId || c._id === contractorId);
        if (contractor) {
          handleContractorSelect(contractor, mode as 'view' | 'edit');
        }
      }

      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [contractors]);

  // Auto-select contact user's contractor
  useEffect(() => {
    const contactUserAuthenticated = localStorage.getItem('contactUserAuthenticated');
    if (contactUserAuthenticated === 'true' && contractors.length > 0) {
      const contactUserData = localStorage.getItem('contactUser');
      if (contactUserData) {
        try {
          const contactUser = JSON.parse(contactUserData);
          const contractor = contractors.find(c => c._id === contactUser.contractorId);
          if (contractor) {
            handleContractorSelect(contractor, 'view');
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
      const isContactUser = localStorage.getItem('contactUserAuthenticated') === 'true';
      const contactUserData = localStorage.getItem('contactUser');
      
      let filteredContractors;
      if (isContactUser && contactUserData) {
        try {
          const contactUser = JSON.parse(contactUserData);
          // Only filter for actual contact users, not system users
          if (contactUser.userType === 'contact') {
            // For contact users, show only their associated contractor
            filteredContractors = contractorsData.filter(contractor =>
              contractor._id === contactUser.contractorId && contractor.isActive === true
            );
            console.log('📋 Filtered contractors for contact user:', filteredContractors.length);
          } else {
            // For system users (admin/regular), show all contractors
            filteredContractors = contractorsData;
            console.log('📋 Showing all contractors for system user:', filteredContractors.length);
          }
        } catch (error) {
          console.error('Error parsing contact user data:', error);
          filteredContractors = contractorsData;
        }
      } else {
        // For regular users, show all active contractors
        filteredContractors = contractorsData.filter(contractor => contractor.isActive === true);
        console.log('📋 Loaded all active contractors:', filteredContractors.length);
      }

      setContractors(filteredContractors);
    } catch (error) {
      console.error('Error loading contractors:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load status indicators for all contractors
  const loadAllContractorStatusIndicators = async () => {
    const indicators: { [key: string]: string } = {};

    // Load indicators for all contractors with company_id
    const promises = contractors
      .filter(contractor => contractor.company_id)
      .map(async (contractor) => {
        try {
          const response = await fetch(`/api/search-company/${contractor.company_id}`);
          const result = await response.json();

          if (result.success && result.data.statusIndicator) {
            indicators[contractor.company_id!] = result.data.statusIndicator;
          }
        } catch (error) {
          console.error(`Error loading status for contractor ${contractor.company_id}:`, error);
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
    setSelectedContractor(contractor);
    setContractorMode(mode);
    setShowContractorDetails(true);
    console.log('🔍 State updated successfully');
  };

  const handleArchiveContractor = async (contractor: Contractor) => {
    const confirmed = window.confirm(`האם אתה בטוח שברצונך לארכב את הקבלן "${contractor.name}"?`);
    if (confirmed) {
      try {
        const { default: ContractorService } = await import('../services/contractorService');
        // Archive contractor by setting isActive to false (CRM status)
        // Note: This is different from company status from Companies Registry
        await ContractorService.update(String(contractor._id), { isActive: false });
        setSnackbar({ open: true, message: 'הקבלן נארכב בהצלחה', severity: 'success' });
        // Refresh the contractors list
        loadContractors();
      } catch (error) {
        console.error('Error archiving contractor:', error);
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
    setUserManagementOpen(true);
    handleUserMenuClose();
  };

  const handleLogout = () => {
    // Clear localStorage and redirect to login
    localStorage.clear();
    window.location.href = '/login';
  };

  const handleCloseContractorDetails = () => {
    setShowContractorDetails(false);
    setSelectedContractor(null);
  };

  const handleSaveContractor = async (updatedContractor: Contractor, skipCompanyIdCheck = false) => {
    console.log('💾 Starting save process for contractor:', {
      company_id: updatedContractor.company_id,
      name: updatedContractor.name,
      contractor_id: updatedContractor.contractor_id,
      mode: contractorMode
    });

    setIsSaving(true);
    try {
      const { default: ContractorService } = await import('../services/contractorService');

      // Don't save if company_id is empty or undefined
      if (!updatedContractor.company_id || updatedContractor.company_id.trim() === '') {
        console.log('❌ Save failed: Company ID is empty');
        setSnackbarMessage('נא להזין מספר חברה לפני השמירה');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        setIsSaving(false);
        return;
      }

      if (contractorMode === 'new' && !skipCompanyIdCheck) {
        // Check if company_id already exists in the database
        const existingContractor = contractors.find(c => c.company_id === updatedContractor.company_id);

        if (existingContractor) {
          // Company ID already exists - load existing contractor for editing
          console.log('✅ Company ID already exists, loading existing contractor for editing:', existingContractor.name);
          setSelectedContractor(existingContractor);
          setContractorMode('edit');
          setSnackbarMessage(`הח"פ ${updatedContractor.company_id} כבר קיים במערכת. נטען הקבלן "${existingContractor.name}" עם כל הנתונים לעריכה.`);
          setSnackbarSeverity('info');
          setSnackbarOpen(true);
          setIsSaving(false);
          return;
        }

        // Double-check with API to see if company exists in MongoDB
        try {
          const response = await fetch(`/api/search-company/${updatedContractor.company_id}`);
          const result = await response.json();

          if (result.success && result.source === 'mongodb') {
            // Company exists in MongoDB - load it for editing
            console.log('✅ Company exists in MongoDB, loading for editing:', result.data.name);

            // If contractor is archived (isActive: false), we'll make it active when saving
            const contractorData = result.data;
            if (contractorData.status === 'archived' || !contractorData.isActive) {
              console.log('📋 Contractor is archived, will be made active on save');
              setSnackbarMessage(`הח"פ ${updatedContractor.company_id} קיים במערכת אך ארכיב. הקבלן יופעל מחדש בעת השמירה.`);
              setSnackbarSeverity('info');
              setSnackbarOpen(true);
            } else {
              setSnackbarMessage(`הח"פ ${updatedContractor.company_id} כבר קיים במערכת. נטען הקבלן "${contractorData.name}" עם כל הנתונים לעריכה.`);
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

        const updated = await ContractorService.update(contractorToUpdate.contractor_id, contractorToUpdate);
        if (updated) {
          console.log('✅ Contractor updated successfully:', updated);

          // Update contractors list - add if not exists, update if exists
          const existingIndex = contractors.findIndex(c => c.contractor_id === updatedContractor.contractor_id);
          if (existingIndex >= 0) {
            // Update existing contractor in list
            setContractors(contractors.map(c => c.contractor_id === updatedContractor.contractor_id ? updated : c));
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
      contractor_id: Date.now().toString(),
      company_id: undefined, // Don't set empty string to avoid duplicate key error
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
      safetyRating: 1,
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

    return basicMatch || contactMatch;
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
              <Avatar sx={{ width: 32, height: 32, bgcolor: '#882DD7' }}>
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

      {!showContractorDetails ? (
        /* Contractor List View */
        <Box sx={{ p: 2 }}>
          {/* Search and Add Button */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <TextField
              size="small"
              placeholder="חיפוש קבלנים, אנשי קשר, עיר..."
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

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddNewContractor}
              sx={{ bgcolor: '#882DD7' }}
            >
              הוסף קבלן
            </Button>
          </Box>

          {/* Statistics Cards */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
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
          </Box>

          {/* Contractor List */}
          <Paper elevation={1} sx={{ p: 2, height: 'calc(100vh - 120px)', overflow: 'auto' }}>

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
                        key={contractor.contractor_id}
                        sx={{
                          '&:hover': { backgroundColor: '#f5f5f5' },
                          cursor: 'pointer',
                          backgroundColor: selectedContractor?.contractor_id === contractor.contractor_id ? '#e3f2fd' : 'inherit'
                        }}
                        onClick={(e) => {
                          console.log('🔥 Contractor row clicked!', contractor.name);
                          e.preventDefault();
                          e.stopPropagation();

                          const isContactUser = localStorage.getItem('contactUserAuthenticated') === 'true';
                          const contactUserData = localStorage.getItem('contactUser');

                          console.log('🔥 Contact user check:', { isContactUser, hasContactUserData: !!contactUserData });

                          let mode: 'view' | 'edit' = 'view';

                          if (isContactUser && contactUserData) {
                            try {
                              const userData = JSON.parse(contactUserData);
                              const permissions = userData.permissions;
                              // Contact managers and admins can edit, contact users can only view
                              mode = (permissions === 'contactAdmin' || permissions === 'admin') ? 'edit' : 'view';
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
                        <TableCell sx={{ textAlign: 'right', paddingRight: '8px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                            <Typography variant="body2" sx={{ textAlign: 'right' }}>
                              {contractor.company_id}
                            </Typography>
                            {contractor.company_id && contractorStatusIndicators[contractor.company_id] && (
                              <Tooltip
                                title={getStatusTooltipText(contractorStatusIndicators[contractor.company_id])}
                                arrow
                                placement="top"
                              >
                                <Box sx={{ fontSize: '16px', lineHeight: 1, cursor: 'help' }}>
                                  {contractorStatusIndicators[contractor.company_id]}
                                </Box>
                              </Tooltip>
                            )}
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right', display: 'block' }}>
                            קבלן {contractor.contractor_id}
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

                        {/* פעולות */}
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Box>
      ) : (
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
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleCloseContractorDetails}
                  sx={{
                    minWidth: 'auto',
                    px: 2,
                    borderColor: '#9c27b0', // סגול שוקו
                    color: '#9c27b0',
                    '&:hover': {
                      borderColor: '#7b1fa2',
                      backgroundColor: 'rgba(156, 39, 176, 0.04)'
                    }
                  }}
                >
                  סגירה
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    console.log('🔘 Save button clicked');
                    // Trigger save from ContractorTabs
                    const saveEvent = new CustomEvent('saveContractor');
                    window.dispatchEvent(saveEvent);
                  }}
                  disabled={isSaving}
                  startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : null}
                  sx={{
                    minWidth: 'auto',
                    px: 2,
                    backgroundColor: '#9c27b0', // סגול שוקו
                    '&:hover': {
                      backgroundColor: '#7b1fa2' // סגול כהה יותר בהובר
                    },
                    '&:disabled': {
                      backgroundColor: '#9c27b0',
                      opacity: 0.7
                    }
                  }}
                >
                  {isSaving ? 'שומר...' : 'שמירה'}
                </Button>
              </Box>
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <Suspense fallback={<SkeletonLoader />}>
                <ContractorTabs
                  contractor={selectedContractor!}
                  onSave={handleSaveContractor}
                  onClose={handleCloseContractorDetails}
                  isContactUser={localStorage.getItem('contactUserAuthenticated') === 'true'}
                  contactUserPermissions={(() => {
                    const contactUserData = localStorage.getItem('contactUser');
                    if (contactUserData) {
                      try {
                        const contactUser = JSON.parse(contactUserData);
                        // For system users (admin/regular), use role instead of permissions
                        if (contactUser.role) {
                          return contactUser.role; // 'admin' or 'user'
                        }
                        // For contact users, use permissions
                        return contactUser.permissions || 'contactUser';
                      } catch (error) {
                        console.error('Error parsing contact user data:', error);
                        return 'contactUser';
                      }
                    }
                    return 'contactUser';
                  })()}
                  currentUser={currentUser}
                  isSaving={isSaving}
                  onUpdateContractor={setSelectedContractor}
                />
              </Suspense>
            </Box>
          </Paper>
        </Box>
      )}

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
                onClick={() => setUserManagementOpen(false)}
                startIcon={<CloseIcon />}
              >
                סגור
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