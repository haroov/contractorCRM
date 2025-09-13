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

    useEffect(() => {
        const loadProjectData = () => {
            const urlMode = searchParams.get('mode') as 'view' | 'edit' | 'new';
            const projectId = searchParams.get('project_id');

            setMode(urlMode || 'view');
            setLoading(true);

            if (urlMode === 'new') {
                // Create new project
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
                    mainContractor: '',
                    contractorName: ''
                };
                setProject(newProject);
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
                        } else {
                            console.error('❌ Project not found on server');
                            // Fallback to sessionStorage
                            const storedData = sessionStorage.getItem('project_data');
                            if (storedData) {
                                try {
                                    const fallbackData = JSON.parse(storedData);
                                    setProject(fallbackData);
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

            // Navigate back to main view after successful save
            navigate('/');

        } catch (error) {
            console.error('❌ Error saving project:', error);
            alert('שגיאה בשמירת הפרויקט: ' + error.message);
        } finally {
            // Reset saving state
            setSaving(false);
        }
    };

    const handleClose = () => {
        // Navigate back to the contractor card that opened this project
        const contractorId = searchParams.get('contractorId');
        if (contractorId) {
            navigate(`/?contractor=${contractorId}&tab=projects`);
        } else {
            // Fallback to main view if no contractor ID
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
            <Box sx={{ p: 2 }}>
                <Paper elevation={1} sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
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
                                            onClick={handleClose}
                                            sx={{
                                                minWidth: 'auto',
                                                px: 2,
                                                borderColor: '#9c27b0', // סגול שוקו
                                                color: '#9c27b0',
                                                '&:hover': {
                                                    borderColor: '#7b1fa2',
                                                    bgcolor: 'rgba(156, 39, 176, 0.04)'
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
                                                bgcolor: '#9c27b0',
                                                '&:hover': {
                                                    bgcolor: '#7b1fa2'
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
                                            onClick={handleClose}
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
                                            onClick={handleSave}
                                            disabled={saving}
                                            sx={{
                                                minWidth: 'auto',
                                                px: 2,
                                                bgcolor: '#9c27b0',
                                                '&:hover': {
                                                    bgcolor: '#7b1fa2'
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
                        </Tabs>
                    </Box>

                    {/* Tab Content */}
                    <Box sx={{ p: 3, pb: 6 }}>
                        {activeTab === 0 && (
                            <Box>
                                <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
                                    מידע כללי
                                </Typography>

                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
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
                                        label="סטטוס"
                                        select
                                        value={project?.status || 'future'}
                                        onChange={(e) => handleFieldChange('status', e.target.value)}
                                        disabled={mode === 'view' || !canEdit}
                                    >
                                        <MenuItem value="future">עתידי</MenuItem>
                                        <MenuItem value="current">פעיל</MenuItem>
                                        <MenuItem value="completed">הושלם</MenuItem>
                                    </TextField>

                                    <TextField
                                        fullWidth
                                        label="קבלן ראשי"
                                        value={project?.mainContractor || ''}
                                        onChange={(e) => handleFieldChange('mainContractor', e.target.value)}
                                        disabled={mode === 'view' || !canEdit}
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
                                                value={project.contractorName || ''}
                                                onChange={(e) => handleFieldChange('contractorName', e.target.value)}
                                                variant="outlined"
                                                size="small"
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
                    </Box>
                </Paper>
            </Box>

        </Box>
    );
}
