import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { Box, Paper, Grid, Typography, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Snackbar, Menu, MenuItem, Avatar, Chip, TextField, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Card, CardContent, CardActions, Divider } from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, Delete as DeleteIcon, MoreVert as MoreVertIcon, AccountCircle as AccountCircleIcon, Logout as LogoutIcon, Person as PersonIcon, Business as BusinessIcon, Engineering as EngineeringIcon, Assessment as AssessmentIcon, Note as NoteIcon, Close as CloseIcon } from '@mui/icons-material';
import { Contractor } from '../types/contractor';
import ContractorService from '../services/contractorService';
import ContractorTabs from './ContractorTabs';
import UserManagement from './UserManagement';

interface UnifiedContractorViewProps {
  currentUser?: any;
}

export default function UnifiedContractorView({ currentUser }: UnifiedContractorViewProps) {
  const [searchParams] = useSearchParams();
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

  // New state for contractor details
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [contractorMode, setContractorMode] = useState<'view' | 'edit' | 'new'>('view');
  const [showContractorDetails, setShowContractorDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load contractors from MongoDB
  useEffect(() => {
    const loadContractors = async () => {
      try {
        console.log('Loading contractors from localStorage...');

        // Initialize sample data if needed
        await ContractorService.initializeSampleData();

        const data = await ContractorService.getAll();
        console.log('Contractors from localStorage:', data);
        setContractors(data);

        // Check if this is a contact user and auto-select their contractor
        const contactUserAuthenticated = localStorage.getItem('contactUserAuthenticated');
        const contactUserData = localStorage.getItem('contactUser');
        
        if (contactUserAuthenticated === 'true' && contactUserData) {
          try {
            const contactUser = JSON.parse(contactUserData);
            console.log('🔍 Contact user detected:', contactUser);
            
            // Find the contractor for this contact user
            const userContractor = data.find(c => c._id === contactUser.contractorId);
            if (userContractor) {
              console.log('✅ Found contractor for contact user:', userContractor.name);
              setSelectedContractor(userContractor);
              setContractorMode('view');
              setShowContractorDetails(true);
            }
          } catch (error) {
            console.error('❌ Error parsing contact user data:', error);
          }
        }
      } catch (error) {
        console.error('❌ Error loading contractors from localStorage:', error);
        // Fallback to empty array if localStorage fails
        setContractors([]);
      } finally {
        setLoading(false);
      }
    };

    loadContractors();
  }, []);

  // Load user data from App.tsx context
  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
      setProfileData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        role: currentUser.role || 'user',
        phone: currentUser.phone || ''
      });
    }
  }, [currentUser]);

  // Handle URL parameters for contractor editing
  useEffect(() => {
    const handleUrlParams = async () => {
      const mode = searchParams.get('mode') as 'view' | 'edit' | 'new';
      const contractorId = searchParams.get('contractor_id') || id;
      
      if (mode && contractorId && contractors.length > 0) {
        console.log('🔍 URL params detected:', { mode, contractorId });
        
        // Find the contractor by ID
        const contractor = contractors.find(c => 
          c.contractor_id === contractorId || 
          c._id === contractorId ||
          c.id === contractorId
        );
        
        if (contractor) {
          console.log('✅ Found contractor for URL params:', contractor.name);
          setSelectedContractor(contractor);
          setContractorMode(mode);
          setShowContractorDetails(true);
          
          // Clean up URL parameters
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        } else {
          console.log('❌ Contractor not found for ID:', contractorId);
        }
      }
    };

    if (contractors.length > 0) {
      handleUrlParams();
    }
  }, [contractors, searchParams, id]);

  // Filter contractors based on search term
  const filteredContractors = contractors.filter(contractor =>
    contractor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contractor.contractor_id?.toString().includes(searchTerm) ||
    contractor.company_id?.toString().includes(searchTerm) ||
    contractor.nameEnglish?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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


  const handleDeleteContractor = (contractor: Contractor) => {
    setContractorToDelete(contractor);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (contractorToDelete) {
      try {
        await ContractorService.delete(contractorToDelete.contractor_id);
        setContractors(prev => prev.filter(c => c.contractor_id !== contractorToDelete.contractor_id));
        setDeleteDialogOpen(false);
        setContractorToDelete(null);
        
        // If we're viewing the deleted contractor, close the details
        if (selectedContractor?.contractor_id === contractorToDelete.contractor_id) {
          setShowContractorDetails(false);
          setSelectedContractor(null);
        }
        
        setSnackbarMessage('הקבלן נמחק בהצלחה');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } catch (error) {
        console.error('❌ Error deleting contractor:', error);
        setSnackbarMessage('שגיאה במחיקת הקבלן');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setContractorToDelete(null);
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

  const handleSaveContractor = async (updatedContractor: Contractor) => {
    setIsSaving(true);
    try {
      if (contractorMode === 'new') {
        // Create new contractor
        const newContractor = await ContractorService.create(updatedContractor);
        setContractors(prev => [...prev, newContractor]);
        setSelectedContractor(newContractor);
        setContractorMode('view');
        setSnackbarMessage('הקבלן נוצר בהצלחה');
      } else {
        // Update existing contractor
        const updated = await ContractorService.update(updatedContractor.contractor_id, updatedContractor);
        setContractors(prev => prev.map(c => c.contractor_id === updatedContractor.contractor_id ? updated : c));
        setSelectedContractor(updated);
        setContractorMode('view');
        setSnackbarMessage('הקבלן עודכן בהצלחה');
      }
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('❌ Error saving contractor:', error);
      setSnackbarMessage('שגיאה בשמירת הקבלן');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNewContractor = () => {
    const newContractor: Contractor = {
      contractor_id: Date.now().toString(),
      company_id: '',
      name: '',
      nameEnglish: '',
      companyType: 'חברה פרטית',
      numberOfEmployees: 0,
      foundationDate: '',
      city: '',
      address: '',
      email: '',
      phone: '',
      website: '',
      sector: '',
      segment: '',
      activities: [],
      contacts: [],
      notes: '',
      safetyRating: 1,
      classifications: [],
      iso45001: false,
      fullAddress: '',
      projectIds: [],
      projects: [],
      current_projects: 0,
      current_projects_value_nis: 0,
      forcast_projects: 0,
      forcast_projects_value_nis: 0,
      status: 'פעילה',
      violator: false,
      restrictions: null,
      temp: '',
      updatedAt: new Date().toISOString()
    };
    handleContractorSelect(newContractor, 'new');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>טוען...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header with Profile */}
      <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: 'white' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ 
              width: 40, 
              height: 40, 
              borderRadius: '50%', 
              bgcolor: '#882DD7', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1.2rem'
            }}>
              C
            </Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
              מאגר קבלנים ויזמים
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField
              size="small"
              placeholder="חיפוש קבלנים..."
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
                bgcolor: 'grey.50', 
                borderRadius: 1,
                minWidth: 200
              }}
            />
            
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddNewContractor}
              sx={{ bgcolor: '#1976d2' }}
            >
              הוסף קבלן
            </Button>
            
            {user && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar src={user.picture} alt={user.name} sx={{ width: 32, height: 32 }} />
                <Typography variant="body2">{user.name}</Typography>
                <IconButton onClick={handleUserMenuClick}>
                  <MoreVertIcon />
                </IconButton>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Main Content */}
      {!showContractorDetails ? (
        /* Contractor List View */
        <Box sx={{ p: 2 }}>
          <Paper elevation={1} sx={{ p: 2, height: 'calc(100vh - 120px)', overflow: 'auto' }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <EngineeringIcon />
              רשימת קבלנים ({filteredContractors.length})
            </Typography>
            
            {filteredContractors.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  {searchTerm ? 'לא נמצאו קבלנים התואמים לחיפוש' : 'אין קבלנים במערכת'}
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      {['פעולות', 'דירוג בטיחות', 'פרויקטים', 'כתובת', 'ח"פ', 'קבלן'].map((header, index) => (
                        <TableCell key={index} sx={{
                          fontWeight: 'bold',
                          backgroundColor: '#f8f9fa',
                          textAlign: 'center',
                          borderBottom: '2px solid #e0e0e0'
                        }}>
                          {header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
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
                          console.log('🔥 Event target:', e.target);
                          console.log('🔥 Current target:', e.currentTarget);
                          
                          // Prevent event bubbling
                          e.preventDefault();
                          e.stopPropagation();
                          
                          // Determine mode based on user permissions
                          const isContactUser = localStorage.getItem('contactUserAuthenticated') === 'true';
                          const contactUserData = localStorage.getItem('contactUser');
                          let mode: 'view' | 'edit' = 'view';
                          
                          if (isContactUser && contactUserData) {
                            try {
                              const userData = JSON.parse(contactUserData);
                              const permissions = userData.permissions;
                              // Contact managers and admins can edit, contact users can only view
                              mode = (permissions === 'contact_manager' || permissions === 'admin') ? 'edit' : 'view';
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
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {contractor.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {contractor.nameEnglish}
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        {/* ח"פ */}
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Chip 
                            label={contractor.company_id} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        </TableCell>
                        
                        {/* כתובת */}
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Typography variant="body2">
                            {contractor.city}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {contractor.address}
                          </Typography>
                        </TableCell>
                        
                        {/* פרויקטים */}
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Box>
                            <Chip 
                              label={`${contractor.current_projects || 0} פעילים`} 
                              size="small" 
                              color="success"
                            />
                            <br />
                            <Typography variant="caption" color="text.secondary">
                              ₪{(contractor.current_projects_value_nis || 0).toLocaleString()}
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        {/* דירוג בטיחות */}
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Chip 
                            label={`${contractor.safetyRating || 0} כוכבים`} 
                            size="small" 
                            color={contractor.safetyRating >= 4 ? 'success' : contractor.safetyRating >= 3 ? 'warning' : 'error'}
                          />
                        </TableCell>
                        
                        {/* פעולות */}
                        <TableCell sx={{ textAlign: 'center' }}>
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteContractor(contractor);
                            }}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
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
          <Paper elevation={1} sx={{ height: 'calc(100vh - 120px)', overflow: 'auto' }}>
            {/* Contractor Header */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              p: 2, 
              bgcolor: '#1976d2', 
              color: 'white',
              borderRadius: '4px 4px 0 0'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton 
                  onClick={handleCloseContractorDetails}
                  sx={{ color: 'white' }}
                >
                  <CloseIcon />
                </IconButton>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {selectedContractor?.name || 'קבלן חדש'}
                </Typography>
              </Box>
            </Box>
            
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
                    return contactUser.permissions;
                  } catch (error) {
                    console.error('Error parsing contact user permissions:', error);
                  }
                }
                return 'admin';
              })()}
              isSaving={isSaving}
            />
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
          <PersonIcon sx={{ mr: 1 }} />
          פרופיל
        </MenuItem>
        {user?.role === 'admin' && (
          <MenuItem onClick={handleUserManagementClick}>
            <AccountCircleIcon sx={{ mr: 1 }} />
            ניהול משתמשים
          </MenuItem>
        )}
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ mr: 1 }} />
          התנתק
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={cancelDelete}>
        <DialogTitle>מחיקת קבלן</DialogTitle>
        <DialogContent>
          <Typography>
            האם אתה בטוח שברצונך למחוק את הקבלן "{contractorToDelete?.name}"?
            פעולה זו לא ניתנת לביטול.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>ביטול</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            מחק
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Management Dialog */}
      {userManagementOpen && (
        <UserManagement
          open={userManagementOpen}
          onClose={() => setUserManagementOpen(false)}
        />
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
