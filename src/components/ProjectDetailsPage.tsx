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
    Person as PersonIcon
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

    useEffect(() => {
        const loadProjectData = () => {
            const urlMode = searchParams.get('mode') as 'view' | 'edit' | 'new';
            const projectId = searchParams.get('project_id');

            setMode(urlMode || 'view');

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
                    }
                };
                loadProjectFromServer();
            }

            setLoading(false);
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
        // Navigate back to the main contractor view
        navigate('/');
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
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Typography>טוען פרטי פרויקט...</Typography>
            </Box>
        );
    }

    if (!project) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Typography>פרויקט לא נמצא</Typography>
            </Box>
        );
    }

    if (loading) {
        return <SkeletonLoader />;
    }

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            {/* Header with Profile and Navigation */}
            <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: 'white' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Left side - Back button and title */}
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton
                            onClick={handleBack}
                            sx={{ mr: 2 }}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            {mode === 'new' ? 'פרויקט חדש' : project?.projectName || 'פרטי פרויקט'}
                        </Typography>
                    </Box>

                    {/* Right side - User profile */}
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body1" sx={{ mr: 2, fontWeight: 500 }}>
                            {currentUser?.name || 'משתמש'}
                        </Typography>
                        <IconButton
                            onClick={handleUserMenuOpen}
                            sx={{ p: 0 }}
                        >
                            <Avatar
                                src={currentUser?.picture}
                                sx={{ width: 40, height: 40 }}
                            >
                                <AccountCircleIcon />
                            </Avatar>
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

            {/* Content */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
                <Paper sx={{ height: '100%', direction: 'rtl' }}>
                    {/* Tabs */}
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs value={activeTab} onChange={handleTabChange} aria-label="project tabs">
                            <Tab label="דשבורד" />
                            <Tab label="מידע כללי" />
                            <Tab label="טכני" />
                            <Tab label="מסמכים" />
                            <Tab label="ביטוח" />
                        </Tabs>
                    </Box>

                    {/* Tab Content */}
                    <Box sx={{ p: 3, pb: 6 }}>
                        {activeTab === 0 && (
                            <Box>
                                {/* Project Header */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold" sx={{ color: 'primary.main', mb: 1 }}>
                                            {project.projectName || 'אכזיב, מגרש 3001'}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                                                (5x) צמח המרמן
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Typography key={star} sx={{ color: 'warning.main', fontSize: '1.2rem' }}>
                                                        ⭐
                                                    </Typography>
                                                ))}
                                            </Box>
                                        </Box>
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                                            Time Period
                                        </Typography>
                                        <Typography variant="body1" fontWeight="medium">
                                            22-Apr-2023 - Today
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Safety Coins Section */}
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="h6" gutterBottom sx={{ color: 'text.secondary', mb: 2 }}>
                                        Safety Coins
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <Typography variant="h4" fontWeight="bold" sx={{ color: 'warning.main' }}>
                                            🪙
                                        </Typography>
                                        <Box sx={{ flexGrow: 1 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2">Earned: 3,309</Typography>
                                                <Typography variant="body2">Available: 1,701</Typography>
                                            </Box>
                                            <Box sx={{ width: '100%', height: 8, bgcolor: 'grey.300', borderRadius: 4, overflow: 'hidden' }}>
                                                <Box sx={{
                                                    width: '66%',
                                                    height: '100%',
                                                    bgcolor: 'warning.main',
                                                    borderRadius: 4
                                                }} />
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>

                                {/* Project Progress Section */}
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="h6" gutterBottom sx={{ color: 'text.secondary', mb: 2 }}>
                                        Project Progress
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="body2" sx={{ color: 'success.main' }}>22/04/2023 Proj. Start</Typography>
                                        </Box>
                                        <Box sx={{ flexGrow: 1, height: 4, bgcolor: 'grey.300', borderRadius: 2, position: 'relative' }}>
                                            <Box sx={{
                                                width: '51%',
                                                height: '100%',
                                                bgcolor: 'success.main',
                                                borderRadius: 2
                                            }} />
                                            <Box sx={{
                                                position: 'absolute',
                                                left: '51%',
                                                top: '-8px',
                                                width: 12,
                                                height: 20,
                                                bgcolor: 'success.main',
                                                borderRadius: 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>
                                                    51%
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>Building</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                        <Typography variant="body2" sx={{ color: 'error.main' }}>
                                            Policy End 20/06/2027
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'success.main' }}>
                                            Est. Delivery 10/06/2027
                                        </Typography>
                                    </Box>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        startIcon={<Typography>+</Typography>}
                                        sx={{ mb: 2 }}
                                    >
                                        Extend Policy
                                    </Button>
                                </Box>

                                {/* Performance Charts Grid */}
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
                                    {/* Safety Chart */}
                                    <Paper sx={{ p: 2, height: 200 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                            <Typography sx={{ fontSize: '1.5rem' }}>⛑️</Typography>
                                            <Typography variant="h6">Safety</Typography>
                                            <Box sx={{ ml: 'auto' }}>
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Avg. Score</Typography>
                                                <Typography variant="h6" fontWeight="bold">8.5</Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ height: 120, bgcolor: 'grey.100', borderRadius: 1, p: 1 }}>
                                            {/* Placeholder for chart - would integrate with charting library */}
                                            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                    Chart: Safety Performance
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Paper>

                                    {/* Security & Access Chart */}
                                    <Paper sx={{ p: 2, height: 200 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                            <Typography sx={{ fontSize: '1.5rem' }}>⚙️</Typography>
                                            <Typography variant="h6">Security & Access</Typography>
                                            <Box sx={{ ml: 'auto' }}>
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Avg. Score</Typography>
                                                <Typography variant="h6" fontWeight="bold">9.5</Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ height: 120, bgcolor: 'grey.100', borderRadius: 1, p: 1 }}>
                                            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                    Chart: Security Performance
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Paper>

                                    {/* Fire System Chart */}
                                    <Paper sx={{ p: 2, height: 200 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                            <Typography sx={{ fontSize: '1.5rem' }}>🔥</Typography>
                                            <Typography variant="h6">Fire System</Typography>
                                            <Box sx={{ ml: 'auto' }}>
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Avg. Score</Typography>
                                                <Typography variant="h6" fontWeight="bold">8.1</Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ height: 120, bgcolor: 'grey.100', borderRadius: 1, p: 1 }}>
                                            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                    Chart: Fire System Performance
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Paper>

                                    {/* Water System Chart */}
                                    <Paper sx={{ p: 2, height: 200 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                            <Typography sx={{ fontSize: '1.5rem' }}>💧</Typography>
                                            <Typography variant="h6">Water System</Typography>
                                            <Box sx={{ ml: 'auto' }}>
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Avg. Score</Typography>
                                                <Typography variant="h6" fontWeight="bold">7.9</Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ height: 120, bgcolor: 'grey.100', borderRadius: 1, p: 1 }}>
                                            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                    Chart: Water System Performance
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Paper>

                                    {/* Structural Vibration Chart */}
                                    <Paper sx={{ p: 2, height: 200 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                            <Typography sx={{ fontSize: '1.5rem' }}>🏗️</Typography>
                                            <Typography variant="h6">Structural Vibration</Typography>
                                            <Box sx={{ ml: 'auto' }}>
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Avg. Score</Typography>
                                                <Typography variant="h6" fontWeight="bold">8.9</Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ height: 120, bgcolor: 'grey.100', borderRadius: 1, p: 1 }}>
                                            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                    Chart: Structural Vibration Performance
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Paper>
                                </Box>
                            </Box>
                        )}

                        {activeTab === 1 && (
                            <Box>
                                <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
                                    מידע כללי
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
                                    מידע טכני
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    תוכן טכני יוצג כאן בעתיד...
                                </Typography>
                            </Box>
                        )}

                        {activeTab === 3 && (
                            <Box>
                                <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
                                    מסמכים
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    ניהול מסמכים יוצג כאן בעתיד...
                                </Typography>
                            </Box>
                        )}

                        {activeTab === 4 && (
                            <Box>
                                <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
                                    ביטוח
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    מידע ביטוחי יוצג כאן בעתיד...
                                </Typography>
                            </Box>
                        )}
                    </Box>
                </Paper>
            </Box>

            {/* Footer Actions */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                    variant="outlined"
                    onClick={handleClose}
                    sx={{ minWidth: 100 }}
                >
                    ביטול
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving}
                    endIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                    sx={{ minWidth: 100 }}
                >
                    {saving ? 'שומר...' : 'שמור'}
                </Button>
            </Box>
        </Box>
    );
}
