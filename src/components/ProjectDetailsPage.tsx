import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Button,
    IconButton,
    AppBar,
    Toolbar,
    Tabs,
    Tab,
    TextField,
    MenuItem,
    CircularProgress,
    Avatar,
    Menu,
    MenuItem as MenuItemComponent,
    ListItemIcon,
    ListItemText
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
    Close as CloseIcon,
    AccountCircle as AccountCircleIcon,
    Logout as LogoutIcon,
    Person as PersonIcon,
    MoreVert as MoreVertIcon
} from '@mui/icons-material';
import type { Project } from '../types/contractor';
import SkeletonLoader from './SkeletonLoader';

interface ProjectDetailsPageProps {
    currentUser: any;
}

export default function ProjectDetailsPage({ currentUser }: ProjectDetailsPageProps) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [mode, setMode] = useState<'view' | 'edit' | 'new'>('view');
    const [activeTab, setActiveTab] = useState(0);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [contractorName, setContractorName] = useState<string>('');

    // Check if user is a contact user
    const [isContactUser, setIsContactUser] = useState(false);
    const [contactUserPermissions, setContactUserPermissions] = useState<string>('contactUser');

    useEffect(() => {
        const checkContactUser = () => {
            const contactUserCheck = localStorage.getItem('contactUserAuthenticated') === 'true';
            const contactUserData = localStorage.getItem('contactUser');
            
            let isRealContactUser = false;
            let permissions = 'contactUser';
            
            if (contactUserCheck && contactUserData) {
                try {
                    const contactUser = JSON.parse(contactUserData);
                    isRealContactUser = contactUser.userType === 'contact' || contactUser.userType === 'contractor';
                    
                    if (isRealContactUser) {
                        permissions = contactUser.permissions || 'contactUser';
                    }
                } catch (error) {
                    console.error('Error parsing contact user data:', error);
                }
            }
            
            setIsContactUser(isRealContactUser);
            setContactUserPermissions(permissions);
            
            console.log('🔧 ProjectDetailsPage contact user check:', {
                isContactUser: isRealContactUser,
                permissions,
                contactUserData
            });
        };

        checkContactUser();
    }, []);

    // Check if user can edit based on contact user permissions
    const canEdit = !isContactUser || contactUserPermissions === 'contactAdmin';

    // Function to load contractor name
    const loadContractorName = async (contractorId: string) => {
        if (!contractorId) {
            console.log('🔍 loadContractorName - no contractorId provided');
            return;
        }
        
        console.log('🔍 loadContractorName - loading contractor:', contractorId);
        
        try {
            const { default: ContractorService } = await import('../services/contractorService');
            console.log('🔍 loadContractorName - calling ContractorService.getById with:', contractorId);
            const contractor = await ContractorService.getById(contractorId);
            console.log('🔍 loadContractorName - contractor data:', contractor);
            
            if (contractor) {
                const name = contractor.name || contractor.nameEnglish || '';
                setContractorName(name);
                console.log('✅ Loaded contractor name:', name);
            } else {
                console.log('❌ No contractor found for ID:', contractorId);
            }
        } catch (error) {
            console.error('❌ Error loading contractor name:', error);
            console.error('❌ Error details:', error.message);
        }
    };

    useEffect(() => {
        const loadProjectData = () => {
            const urlMode = searchParams.get('mode') as 'view' | 'edit' | 'new';
            const projectId = searchParams.get('project_id');

            setMode(urlMode || 'view');
            setLoading(true);

            if (urlMode === 'new') {
                // Get contractor information from URL or sessionStorage
                const contractorId = searchParams.get('contractorId');
                const projectData = sessionStorage.getItem('project_data');
                
                console.log('🔍 ProjectDetailsPage - NEW mode - contractorId:', contractorId);
                console.log('🔍 ProjectDetailsPage - NEW mode - projectData:', projectData);
                
                let contractorName = '';
                if (projectData) {
                    try {
                        const parsedProject = JSON.parse(projectData);
                        contractorName = parsedProject.contractorName || '';
                        console.log('🔍 ProjectDetailsPage - NEW mode - contractorName from sessionStorage:', contractorName);
                    } catch (error) {
                        console.error('Error parsing project data from sessionStorage:', error);
                    }
                }
                
                // Create new project with contractor information
                const newProject: Project = {
                    id: '',
                    projectName: '',
                    description: '',
                    startDate: '',
                    durationMonths: 0,
                    valueNis: 0,
                    city: '',
                    isClosed: false,
                    status: 'future',
                    mainContractor: contractorName,
                    contractorName: contractorName
                };
                setProject(newProject);
                
                // Set contractor name in state
                setContractorName(contractorName);
                
                // Also load contractor name from API if we have contractorId
                if (contractorId) {
                    loadContractorName(contractorId);
                }
                
                setLoading(false);
            } else if (projectId && projectId !== 'new') {
                // Load existing project from server
                const loadProjectFromServer = async () => {
                    try {
                        console.log('Loading project from server:', projectId);
                        const { projectsAPI } = await import('../services/api');
                        const projectData = await projectsAPI.getById(projectId);
                        if (projectData) {
                            console.log('✅ Project loaded from server:', projectData);
                            setProject(projectData);
                            
                            // Load contractor name if we have contractor ID
                            const contractorId = projectData.contractorId || projectData.mainContractor;
                            console.log('🔍 Project loaded - contractorId:', contractorId);
                            console.log('🔍 Project loaded - projectData.contractorId:', projectData.contractorId);
                            console.log('🔍 Project loaded - projectData.mainContractor:', projectData.mainContractor);
                            
                            if (contractorId) {
                                loadContractorName(contractorId);
                            } else {
                                console.log('❌ No contractor ID found in project data');
                            }
                        } else {
                            console.error('❌ Project not found on server');
                            // Fallback to sessionStorage
                            const storedData = sessionStorage.getItem('project_data');
                            if (storedData) {
                                try {
                                    const fallbackData = JSON.parse(storedData);
                                    setProject(fallbackData);
                                    
                                    // Load contractor name if we have contractor ID
                                    const contractorId = fallbackData.contractorId || fallbackData.mainContractor;
                                    if (contractorId) {
                                        loadContractorName(contractorId);
                                    }
                                } catch (error) {
                                    console.error('Error parsing fallback project data:', error);
                                }
                            }
                        }
                    } catch (error) {
                        console.error('❌ Error loading project from server:', error);
                        // Fallback to sessionStorage
                        const storedData = sessionStorage.getItem('project_data');
                        if (storedData) {
                            try {
                                const fallbackData = JSON.parse(storedData);
                                setProject(fallbackData);
                                
                                // Load contractor name if we have contractor ID
                                const contractorId = fallbackData.contractorId || fallbackData.mainContractor;
                                if (contractorId) {
                                    loadContractorName(contractorId);
                                }
                            } catch (parseError) {
                                console.error('Error parsing fallback project data:', parseError);
                            }
                        }
                    } finally {
                        setLoading(false);
                    }
                };
                loadProjectFromServer();
            } else {
                setLoading(false);
            }
        };

        loadProjectData();
    }, [searchParams]);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    const handleFieldChange = (field: keyof Project, value: any) => {
        if (project) {
            setProject({
                ...project,
                [field]: value
            });
        }
    };

    const handleSave = async () => {
        try {

            if (!project) {
                console.error('No project to save');
                return;
            }

            // Set saving state
            setSaving(true);

            // Use projectsAPI to save the project
            const { projectsAPI } = await import('../services/api');

            if (mode === 'new') {
                // Create new project
                const savedProject = await projectsAPI.create(project);
                console.log('✅ Project created:', savedProject);
            } else {
                // Update existing project - send only the fields that can be updated
                const updateData = {
                    projectName: project.projectName,
                    description: project.description,
                    startDate: project.startDate,
                    durationMonths: project.durationMonths,
                    valueNis: typeof project.valueNis === 'number' ? project.valueNis : 0,
                    city: project.city,
                    isClosed: project.isClosed,
                    status: project.status,
                    mainContractor: project.mainContractor
                };
                const projectId = project._id || project.id;
                const updatedProject = await projectsAPI.update(projectId, updateData);
                console.log('✅ Project updated:', updatedProject);
            }

            // Don't navigate away - just show success message
            console.log('✅ Project saved successfully');

        } catch (error) {
            console.error('❌ Error saving project:', error);
            alert('שגיאה בשמירת הפרויקט: ' + error.message);
        } finally {
            // Reset saving state
            setSaving(false);
        }
    };

    const handleClose = () => {
        console.log('🔍 handleClose - function called');
        console.log('🔍 handleClose - current URL:', window.location.href);
        console.log('🔍 handleClose - searchParams:', searchParams.toString());
        console.log('🔍 handleClose - project data:', project);
        
        // Navigate back to the contractor card that opened this project
        let contractorId = searchParams.get('contractorId') || searchParams.get('contractor_id');
        
        console.log('🔍 handleClose - contractorId from URL:', contractorId);
        
        // If no contractorId from URL, try to get it from project data
        if (!contractorId && project) {
            console.log('🔍 handleClose - no contractorId from URL, checking project data');
            console.log('🔍 handleClose - project.mainContractor:', project.mainContractor);
            console.log('🔍 handleClose - project.contractorId:', project.contractorId);
            
            // ALWAYS prioritize mainContractor (ObjectId) for navigation
            if (project.mainContractor) {
                contractorId = project.mainContractor;
                console.log('🔍 handleClose - using mainContractor as contractorId:', contractorId);
            } else if (project.contractorId) {
                contractorId = project.contractorId;
                console.log('🔍 handleClose - using contractorId as fallback:', contractorId);
            }
            console.log('🔍 handleClose - final contractorId from project:', contractorId);
        }
        
        if (contractorId) {
            // Navigate back to contractor details with projects tab
            const navigationUrl = `/?contractor_id=${contractorId}&tab=projects`;
            console.log('🔍 handleClose - navigating to:', navigationUrl);
            console.log('🔍 handleClose - about to call navigate()');
            navigate(navigationUrl);
        } else {
            // Fallback to main view if no contractor ID
            console.log('🔍 handleClose - no contractorId found, navigating to main view');
            navigate('/');
        }
    };

    const handleBack = () => {
        navigate('/');
    };

    const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleUserMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        // Clear localStorage for contact users
        localStorage.clear();
        // Navigate to login
        navigate('/login');
    };

    if (loading) {
        return <SkeletonLoader />;
    }

    if (!project) {
        return <SkeletonLoader />;
    }

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f8' }}>
            {/* Main Header with System Name and Profile - Same as contractor card */}
            <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: 'white' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Left side - Logo and title */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onClick={() => {
                                // Navigate to CRM for user and admin types
                                if (currentUser?.role === 'user' || currentUser?.role === 'admin') {
                                    handleBack();
                                }
                            }}
                        >
                            <img src="/assets/logo.svg" alt="שוקו ביטוח" style={{ width: '100%', height: '100%' }} />
                        </Box>
                        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#424242' }}>
                            ניהול סיכונים באתרי בניה
                        </Typography>
                    </Box>

                    {/* Right side - User profile */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {currentUser?.picture ? (
                            <Avatar src={currentUser.picture} alt={currentUser.name} sx={{ width: 32, height: 32 }} />
                        ) : (
                            <Avatar sx={{ width: 32, height: 32, bgcolor: '#882DD7' }}>
                                <AccountCircleIcon />
                            </Avatar>
                        )}
                        <Typography variant="body2">{currentUser?.name || 'משתמש'}</Typography>
                        <IconButton onClick={handleUserMenuOpen}>
                            <MoreVertIcon />
                        </IconButton>
                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleUserMenuClose}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                        >
                            <MenuItemComponent onClick={handleUserMenuClose}>
                                <ListItemIcon>
                                    <PersonIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>פרופיל</ListItemText>
                            </MenuItemComponent>
                            <MenuItemComponent onClick={handleLogout}>
                                <ListItemIcon>
                                    <LogoutIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>התנתק</ListItemText>
                            </MenuItemComponent>
                        </Menu>
                    </Box>
                </Box>
            </Paper>

            {/* Project Card - Same style as contractor card */}
            <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Paper elevation={1} sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Project Header */}
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
                            {mode === 'new' ? 'פרויקט חדש' : project?.projectName || 'פרטי פרויקט'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {/* Show buttons based on user permissions */}
                            {(() => {
                                console.log('🔧 ProjectDetailsPage button logic:', {
                                    isContactUser,
                                    contactUserPermissions
                                });

                                // contactUser: show only Close button to return to contractor
                                if (isContactUser && contactUserPermissions === 'contactUser') {
                                    console.log('🔧 ProjectDetailsPage: contactUser - only Close button');
                                    return (
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => {
                                                console.log('🔍 Close button clicked - contactUser');
                                                handleClose();
                                            }}
                                            sx={{
                                                minWidth: 'auto',
                                                px: 2,
                                                borderColor: '#882fd7', // סגול שוקו
                                                color: '#882fd7',
                                                '&:hover': {
                                                    borderColor: '#6a1b9a',
                                                    bgcolor: 'rgba(136, 47, 215, 0.04)'
                                                }
                                            }}
                                        >
                                            סגירה
                                        </Button>
                                    );
                                }

                                // contactAdmin: show only Save button, no Close button
                                if (isContactUser && contactUserPermissions === 'contactAdmin') {
                                    console.log('🔧 ProjectDetailsPage: contactAdmin - only Save button');
                                    return (
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={handleSave}
                                            disabled={saving}
                                            sx={{
                                                minWidth: 'auto',
                                                px: 2,
                                                bgcolor: '#882fd7',
                                                '&:hover': {
                                                    bgcolor: '#6a1b9a'
                                                }
                                            }}
                                        >
                                            {saving ? 'שומר...' : 'שמירה'}
                                        </Button>
                                    );
                                }

                                // System users: show both buttons
                                console.log('🔧 ProjectDetailsPage: system user - both buttons');
                                return (
                                    <>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => {
                                                console.log('🔍 Close button clicked - systemUser');
                                                handleClose();
                                            }}
                                            sx={{
                                                minWidth: 'auto',
                                                px: 2,
                                                borderColor: '#882fd7', // סגול שוקו
                                                color: '#882fd7',
                                                '&:hover': {
                                                    borderColor: '#6a1b9a',
                                                    backgroundColor: 'rgba(136, 47, 215, 0.04)'
                                                }
                                            }}
                                        >
                                            סגירה
                                        </Button>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={handleSave}
                                            disabled={saving}
                                            sx={{
                                                minWidth: 'auto',
                                                px: 2,
                                                bgcolor: '#882fd7',
                                                '&:hover': {
                                                    bgcolor: '#6a1b9a'
                                                }
                                            }}
                                        >
                                            {saving ? 'שומר...' : 'שמירה'}
                                        </Button>
                                    </>
                                );
                            })()}
                        </Box>
                    </Box>

                    {/* Tabs */}
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs value={activeTab} onChange={handleTabChange} aria-label="project tabs">
                            <Tab label="כללי" />
                            <Tab label="מפרט" />
                            <Tab label="מסמכים" />
                            <Tab label="ביטוח" />
                            <Tab label="הרשאות" />
                            <Tab label="הערות" />
                            {(project?.status === 'current' || project?.status === 'completed') && (
                                <Tab label="דשבורד" />
                            )}
                        </Tabs>
                    </Box>

                    {/* Tab Content */}
                    <Box sx={{ p: 3, pb: 6, flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {activeTab === 0 && (
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
                                    מידע כללי
                                </Typography>

                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3, flex: 1, bgcolor: 'white', p: 2, borderRadius: 1 }}>
                                    <TextField
                                        fullWidth
                                        label="שם הפרויקט"
                                        value={project?.projectName || ''}
                                        onChange={(e) => handleFieldChange('projectName', e.target.value)}
                                        disabled={mode === 'view' || !canEdit}
                                    />

                                    <TextField
                                        fullWidth
                                        label="תיאור הפרויקט"
                                        value={project?.description || ''}
                                        onChange={(e) => handleFieldChange('description', e.target.value)}
                                        disabled={mode === 'view' || !canEdit}
                                        multiline
                                        rows={3}
                                    />

                                    <TextField
                                        fullWidth
                                        label="תאריך התחלה"
                                        type="date"
                                        value={project?.startDate || ''}
                                        onChange={(e) => handleFieldChange('startDate', e.target.value)}
                                        disabled={mode === 'view' || !canEdit}
                                        InputLabelProps={{ shrink: true }}
                                    />

                                    <TextField
                                        fullWidth
                                        label="משך הפרויקט (חודשים)"
                                        type="number"
                                        value={project?.durationMonths || 0}
                                        onChange={(e) => handleFieldChange('durationMonths', parseInt(e.target.value) || 0)}
                                        disabled={mode === 'view' || !canEdit}
                                    />

                                    <TextField
                                        fullWidth
                                        label="עיר"
                                        value={project?.city || ''}
                                        onChange={(e) => handleFieldChange('city', e.target.value)}
                                        disabled={mode === 'view' || !canEdit}
                                    />

                                    <TextField
                                        fullWidth
                                        label="ערך הפרויקט (₪)"
                                        type="number"
                                        value={project?.valueNis || project?.value || 0}
                                        onChange={(e) => handleFieldChange('valueNis', parseInt(e.target.value) || 0)}
                                        disabled={mode === 'view' || !canEdit}
                                    />


                                    <TextField
                                        fullWidth
                                        label="קבלן ראשי"
                                        value={contractorName || project?.mainContractor || ''}
                                        onChange={(e) => handleFieldChange('mainContractor', e.target.value)}
                                        disabled={mode === 'view' || !canEdit || mode === 'new'}
                                        InputProps={{ readOnly: true }}
                                        sx={{ backgroundColor: '#f5f5f5' }}
                                    />
                                </Box>
                            </Box>
                        )}

                        {activeTab === 1 && (
                            <Box>
                                <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
                                    מפרט טכני
                                </Typography>

                                {/* Project General Information */}
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="h6" gutterBottom sx={{ color: 'text.secondary', mb: 2 }}>
                                        פרטי פרויקט
                                    </Typography>

                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
                                        <Box>
                                            <TextField
                                                fullWidth
                                                label="שם הפרויקט"
                                                value={project.projectName || ''}
                                                onChange={(e) => handleFieldChange('projectName', e.target.value)}
                                                variant="outlined"
                                                size="small"
                                            />
                                        </Box>

                                        <Box>
                                            <TextField
                                                fullWidth
                                                label="עיר"
                                                value={project.city || ''}
                                                onChange={(e) => handleFieldChange('city', e.target.value)}
                                                variant="outlined"
                                                size="small"
                                            />
                                        </Box>

                                        <Box>
                                            <TextField
                                                fullWidth
                                                label="תאריך התחלת הפרויקט"
                                                type="date"
                                                value={project.startDate || ''}
                                                onChange={(e) => handleFieldChange('startDate', e.target.value)}
                                                variant="outlined"
                                                size="small"
                                                InputLabelProps={{ shrink: true }}
                                            />
                                        </Box>

                                        <Box>
                                            <TextField
                                                fullWidth
                                                label="משך הפרויקט (חודשים)"
                                                type="number"
                                                value={project.durationMonths || ''}
                                                onChange={(e) => handleFieldChange('durationMonths', parseInt(e.target.value) || 0)}
                                                variant="outlined"
                                                size="small"
                                            />
                                        </Box>

                                        <Box>
                                            <TextField
                                                fullWidth
                                                label="שווי הפרויקט"
                                                type="text"
                                                value={project.valueNis ? `${project.valueNis.toLocaleString('he-IL')} ₪` : ''}
                                                onChange={(e) => {
                                                    const numericValue = e.target.value.replace(/[^\d]/g, '');
                                                    const numValue = numericValue ? parseInt(numericValue) : 0;
                                                    handleFieldChange('valueNis', numValue);
                                                }}
                                                onKeyDown={(e) => {
                                                    // Allow: backspace, delete, tab, escape, enter, home, end, left, right, up, down
                                                    if ([8, 9, 27, 13, 46, 35, 36, 37, 38, 39, 40].indexOf(e.keyCode) !== -1 ||
                                                        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                                                        (e.keyCode === 65 && e.ctrlKey === true) ||
                                                        (e.keyCode === 67 && e.ctrlKey === true) ||
                                                        (e.keyCode === 86 && e.ctrlKey === true) ||
                                                        (e.keyCode === 88 && e.ctrlKey === true)) {
                                                        return;
                                                    }
                                                    // Ensure that it is a number and stop the keypress
                                                    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                                                        e.preventDefault();
                                                    }
                                                }}
                                                variant="outlined"
                                                size="small"
                                            />
                                        </Box>

                                        <Box>
                                            <TextField
                                                fullWidth
                                                label="סטטוס"
                                                select
                                                value={project.status || 'future'}
                                                onChange={(e) => handleFieldChange('status', e.target.value)}
                                                variant="outlined"
                                                size="small"
                                            >
                                                <MenuItem value="future">עתידי</MenuItem>
                                                <MenuItem value="current">פעיל</MenuItem>
                                                <MenuItem value="completed">הושלם</MenuItem>
                                            </TextField>
                                        </Box>

                                        <Box>
                                            <TextField
                                                fullWidth
                                                label="שם הקבלן הראשי"
                                                value={contractorName || project.contractorName || ''}
                                                onChange={(e) => handleFieldChange('contractorName', e.target.value)}
                                                variant="outlined"
                                                size="small"
                                                disabled={mode === 'view' || !canEdit || mode === 'new'}
                                                InputProps={{ readOnly: true }}
                                                sx={{ backgroundColor: '#f5f5f5' }}
                                            />
                                        </Box>

                                        <Box>
                                            <TextField
                                                fullWidth
                                                label="מזהה קבלן ראשי"
                                                value={project.contractorId || ''}
                                                onChange={(e) => handleFieldChange('contractorId', e.target.value)}
                                                variant="outlined"
                                                size="small"
                                                disabled={mode === 'view' || !canEdit || mode === 'new'}
                                                InputProps={{ readOnly: true }}
                                                sx={{ backgroundColor: '#f5f5f5' }}
                                            />
                                        </Box>

                                        <Box sx={{ gridColumn: '1 / -1' }}>
                                            <TextField
                                                fullWidth
                                                label="תיאור הפרויקט"
                                                value={project.description || ''}
                                                onChange={(e) => handleFieldChange('description', e.target.value)}
                                                variant="outlined"
                                                multiline
                                                rows={4}
                                            />
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        )}

                        {activeTab === 2 && (
                            <Box>
                                <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
                                    מסמכים
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    תוכן טכני יוצג כאן בעתיד...
                                </Typography>
                            </Box>
                        )}

                        {activeTab === 3 && (
                            <Box>
                                <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
                                    ביטוח
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    ניהול מסמכים יוצג כאן בעתיד...
                                </Typography>
                            </Box>
                        )}

                        {activeTab === 4 && (
                            <Box>
                                <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
                                    הרשאות
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    ניהול הרשאות יוצג כאן בעתיד...
                                </Typography>
                            </Box>
                        )}

                        {activeTab === 5 && (
                            <Box>
                                <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
                                    הערות
                                </Typography>
                                <TextField
                                    fullWidth
                                    label="הערות כלליות"
                                    value={project?.notes || ''}
                                    onChange={(e) => handleFieldChange('notes', e.target.value)}
                                    disabled={mode === 'view'}
                                    multiline
                                    rows={6}
                                    placeholder="הוסף הערות על הפרויקט..."
                                />
                            </Box>
                        )}

                        {activeTab === 6 && (project?.status === 'current' || project?.status === 'completed') && (
                            <Box>
                                <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
                                    דשבורד ניהול סיכונים
                                </Typography>
                                
                                {/* Safety Coins */}
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', mb: 2 }}>
                                        Safety Coins
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <Box sx={{ 
                                            width: 40, 
                                            height: 40, 
                                            borderRadius: '50%', 
                                            bgcolor: '#FFD700', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            border: '2px solid #FFA500'
                                        }}>
                                            🛡️
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Box sx={{ 
                                                height: 20, 
                                                bgcolor: '#e0e0e0', 
                                                borderRadius: 10, 
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}>
                                                <Box sx={{ 
                                                    height: '100%', 
                                                    width: '66%', 
                                                    bgcolor: '#882fd7', 
                                                    borderRadius: 10,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'flex-end',
                                                    pr: 1
                                                }}>
                                                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>
                                                        3,309
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                    Earned: 3,309
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                    Available: 1,701
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>

                                {/* Project Progress */}
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', mb: 2 }}>
                                        התקדמות פרויקט
                                    </Typography>
                                    <Box sx={{ 
                                        height: 8, 
                                        bgcolor: '#e0e0e0', 
                                        borderRadius: 4, 
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        <Box sx={{ 
                                            height: '100%', 
                                            width: '51%', 
                                            bgcolor: '#2196F3', 
                                            borderRadius: 4
                                        }} />
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            Proj. Start: 22/04/2023
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                                            51%
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            Est. Delivery: 10/06/2027
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Risk Monitors Grid */}
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
                                    {/* Safety Monitor */}
                                    <Box sx={{ 
                                        p: 3, 
                                        border: '1px solid #e0e0e0', 
                                        borderRadius: 2, 
                                        bgcolor: 'background.paper'
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                            <Box sx={{ 
                                                width: 40, 
                                                height: 40, 
                                                borderRadius: '50%', 
                                                bgcolor: '#4CAF50', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center'
                                            }}>
                                                🛡️
                                            </Box>
                                            <Typography variant="h6" sx={{ color: 'text.primary' }}>
                                                בטיחות
                                            </Typography>
                                            <Box sx={{ ml: 'auto' }}>
                                                <Typography variant="h6" sx={{ color: '#882fd7', fontWeight: 'bold' }}>
                                                    Avg. Score 8.5
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ height: 200, bgcolor: '#f5f5f5', borderRadius: 1, p: 2 }}>
                                            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 8 }}>
                                                גרף בטיחות יוצג כאן
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Security Monitor */}
                                    <Box sx={{ 
                                        p: 3, 
                                        border: '1px solid #e0e0e0', 
                                        borderRadius: 2, 
                                        bgcolor: 'background.paper'
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                            <Box sx={{ 
                                                width: 40, 
                                                height: 40, 
                                                borderRadius: '50%', 
                                                bgcolor: '#FF9800', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center'
                                            }}>
                                                🔒
                                            </Box>
                                            <Typography variant="h6" sx={{ color: 'text.primary' }}>
                                                ביטחון וגישה
                                            </Typography>
                                            <Box sx={{ ml: 'auto' }}>
                                                <Typography variant="h6" sx={{ color: '#882fd7', fontWeight: 'bold' }}>
                                                    Avg. Score 9.5
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ height: 200, bgcolor: '#f5f5f5', borderRadius: 1, p: 2 }}>
                                            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 8 }}>
                                                גרף ביטחון יוצג כאן
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Fire System Monitor */}
                                    <Box sx={{ 
                                        p: 3, 
                                        border: '1px solid #e0e0e0', 
                                        borderRadius: 2, 
                                        bgcolor: 'background.paper'
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                            <Box sx={{ 
                                                width: 40, 
                                                height: 40, 
                                                borderRadius: '50%', 
                                                bgcolor: '#F44336', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center'
                                            }}>
                                                🔥
                                            </Box>
                                            <Typography variant="h6" sx={{ color: 'text.primary' }}>
                                                מערכת כיבוי אש
                                            </Typography>
                                            <Box sx={{ ml: 'auto' }}>
                                                <Typography variant="h6" sx={{ color: '#882fd7', fontWeight: 'bold' }}>
                                                    Avg. Score 8.1
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ height: 200, bgcolor: '#f5f5f5', borderRadius: 1, p: 2 }}>
                                            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 8 }}>
                                                גרף מערכת אש יוצג כאן
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Water System Monitor */}
                                    <Box sx={{ 
                                        p: 3, 
                                        border: '1px solid #e0e0e0', 
                                        borderRadius: 2, 
                                        bgcolor: 'background.paper'
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                            <Box sx={{ 
                                                width: 40, 
                                                height: 40, 
                                                borderRadius: '50%', 
                                                bgcolor: '#2196F3', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center'
                                            }}>
                                                💧
                                            </Box>
                                            <Typography variant="h6" sx={{ color: 'text.primary' }}>
                                                מערכת מים
                                            </Typography>
                                            <Box sx={{ ml: 'auto' }}>
                                                <Typography variant="h6" sx={{ color: '#882fd7', fontWeight: 'bold' }}>
                                                    Avg. Score 7.9
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ height: 200, bgcolor: '#f5f5f5', borderRadius: 1, p: 2 }}>
                                            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 8 }}>
                                                גרף מערכת מים יוצג כאן
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Structural Vibration Monitor */}
                                    <Box sx={{ 
                                        p: 3, 
                                        border: '1px solid #e0e0e0', 
                                        borderRadius: 2, 
                                        bgcolor: 'background.paper'
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                            <Box sx={{ 
                                                width: 40, 
                                                height: 40, 
                                                borderRadius: '50%', 
                                                bgcolor: '#9C27B0', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center'
                                            }}>
                                                🏗️
                                            </Box>
                                            <Typography variant="h6" sx={{ color: 'text.primary' }}>
                                                רעידות מבניות
                                            </Typography>
                                            <Box sx={{ ml: 'auto' }}>
                                                <Typography variant="h6" sx={{ color: '#882fd7', fontWeight: 'bold' }}>
                                                    Avg. Score 8.9
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ height: 200, bgcolor: '#f5f5f5', borderRadius: 1, p: 2 }}>
                                            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 8 }}>
                                                גרף רעידות יוצג כאן
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        )}
                    </Box>
                </Paper>
            </Box>

        </Box>
    );
}
