import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Paper, Typography, Button, TextField, InputAdornment, Avatar, IconButton, Menu, MenuItem, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert } from '@mui/material';
import { Search as SearchIcon, Add as AddIcon, Delete as DeleteIcon, MoreVert as MoreVertIcon, AccountCircle as AccountCircleIcon, Close as CloseIcon, Engineering as EngineeringIcon } from '@mui/icons-material';
import { Contractor } from '../types/contractor';
import ContractorService from '../services/contractorService';
import ContractorTabs from './ContractorTabs';
import UserManagement from './UserManagement';

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

  // New state for contractor details
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [contractorMode, setContractorMode] = useState<'view' | 'edit' | 'new'>('view');
  const [showContractorDetails, setShowContractorDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load contractors from MongoDB
  useEffect(() => {
    loadContractors();
  }, []);

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
      const contractorsData = await ContractorService.getAll();
      setContractors(contractorsData);
    } catch (error) {
      console.error('Error loading contractors:', error);
    } finally {
      setLoading(false);
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

  const handleDeleteContractor = (contractor: Contractor) => {
    setContractorToDelete(contractor);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteContractor = async () => {
    if (!contractorToDelete) return;

    try {
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

  const handleSaveContractor = async (updatedContractor: Contractor) => {
    setIsSaving(true);
    try {
      if (contractorMode === 'new') {
        const newContractor = await ContractorService.create(updatedContractor);
        setContractors([...contractors, newContractor]);
        setSnackbarMessage('הקבלן נוצר בהצלחה');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        const updated = await ContractorService.update(updatedContractor.contractor_id, updatedContractor);
        if (updated) {
          setContractors(contractors.map(c => c.contractor_id === updatedContractor.contractor_id ? updated : c));
          setSelectedContractor(updated);
          setSnackbarMessage('הקבלן עודכן בהצלחה');
          setSnackbarSeverity('success');
          setSnackbarOpen(true);
        }
      }
    } catch (error) {
      console.error('Error saving contractor:', error);
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

  // Filter contractors based on search term
  const filteredContractors = contractors.filter(contractor =>
    contractor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contractor.company_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contractor.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              justifyContent: 'center'
            }}>
              <img src="/src/assets/logo.svg" alt="שוקו ביטוח" style={{ width: '100%', height: '100%' }} />
            </Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#424242' }}>
              ניהול סיכונים באתרי בניה
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: '#882DD7' }}>
              <AccountCircleIcon />
            </Avatar>
            <Typography variant="body2">משתמש</Typography>
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
                {contractors.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                סה״כ קבלנים
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1, textAlign: 'center', bgcolor: 'white', boxShadow: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#424242' }}>
                {contractors.reduce((sum, c) => sum + (c.current_projects || 0), 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                פרויקטים פעילים
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ₪{contractors.reduce((sum, c) => sum + (c.current_projects_value_nis || 0), 0).toLocaleString()}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, flex: 1, textAlign: 'center', bgcolor: 'white', boxShadow: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#424242' }}>
                {contractors.reduce((sum, c) => sum + (c.forcast_projects || 0), 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                פרויקטים עתידיים
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ₪{contractors.reduce((sum, c) => sum + (c.forcast_projects_value_nis || 0), 0).toLocaleString()}
              </Typography>
            </Paper>
          </Box>

          {/* Contractor List */}
          <Paper elevation={1} sx={{ p: 2, height: 'calc(100vh - 120px)', overflow: 'auto' }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <EngineeringIcon />
              רשימת קבלנים
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
                      {['קבלן', 'ח"פ', 'כתובת', 'פרויקטים', 'דירוג בטיחות', 'פעולות'].map((header, index) => (
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
                          <Box>
                            <Chip
                              label={contractor.company_id}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              קבלן {contractor.contractor_id}
                            </Typography>
                          </Box>
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
              bgcolor: '#882DD7',
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
                    console.error('Error parsing contact user data:', error);
                    return 'contact_user';
                  }
                }
                return 'contact_user';
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
          <AccountCircleIcon sx={{ mr: 1 }} />
          פרופיל
        </MenuItem>
        <MenuItem onClick={handleUserManagementClick}>
          <AccountCircleIcon sx={{ mr: 1 }} />
          ניהול משתמשים
        </MenuItem>
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

      {/* User Management Dialog */}
      {userManagementOpen && (
        <UserManagement />
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