import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Button,
    TextField,
    Tabs,
    Tab,
    Snackbar,
    Alert,
    CircularProgress,
    Avatar,
    IconButton
} from '@mui/material';
import {
    Save as SaveIcon,
    Close as CloseIcon,
    ArrowBack as ArrowBackIcon,
    MoreVert as MoreVertIcon,
    AccountCircle as AccountCircleIcon
} from '@mui/icons-material';

interface ClaimFormData {
    projectId: string;
    projectName: string;
    description: string;
    status: string;
    parties: string;
    procedures: string;
    summary: string;
    createdAt: Date;
    updatedAt: Date;
}

export default function ClaimFormPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState(0);
    const [saving, setSaving] = useState(false);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error' | 'warning' | 'info'
    });
    const [currentUser, setCurrentUser] = useState<any>(null);

    const [formData, setFormData] = useState<ClaimFormData>({
        projectId: searchParams.get('projectId') || '',
        projectName: searchParams.get('projectName') || '',
        description: '',
        status: 'open',
        parties: '',
        procedures: '',
        summary: '',
        createdAt: new Date(),
        updatedAt: new Date()
    });

    useEffect(() => {
        const projectId = searchParams.get('projectId');
        const projectName = searchParams.get('projectName');
        
        if (projectId && projectName) {
            setFormData(prev => ({
                ...prev,
                projectId,
                projectName: decodeURIComponent(projectName)
            }));
        }
        
        // Load current user
        const loadCurrentUser = async () => {
            try {
                const response = await authenticatedFetch('/api/auth/me');
                if (response.ok) {
                    const userData = await response.json();
                    setCurrentUser(userData);
                }
            } catch (error) {
                console.error('Error loading current user:', error);
            }
        };
        
        loadCurrentUser();
    }, [searchParams]);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    const handleFieldChange = (field: keyof ClaimFormData, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
            updatedAt: new Date()
        }));
    };

    const handleSave = async () => {
        if (!formData.description.trim()) {
            setSnackbar({
                open: true,
                message: 'נא למלא את תאור האירוע',
                severity: 'error'
            });
            return;
        }

        setSaving(true);
        try {
            const response = await fetch('/api/claims', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setSnackbar({
                    open: true,
                    message: 'התביעה נשמרה בהצלחה',
                    severity: 'success'
                });
                
                // Navigate back to project after successful save
                setTimeout(() => {
                    navigate(-1);
                }, 2000);
            } else {
                throw new Error('Failed to save claim');
            }
        } catch (error) {
            console.error('Error saving claim:', error);
            setSnackbar({
                open: true,
                message: 'שגיאה בשמירת התביעה',
                severity: 'error'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        navigate(-1); // Go back to previous page (project details)
    };

    const handleBack = () => {
        navigate(-1); // Go back to previous page (project details)
    };

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f8', width: '100%', maxWidth: '100%', overflowX: 'hidden', overflowY: 'auto' }}>
            {/* Main Header with System Name and Profile - Same as contractor card */}
            <Paper elevation={2} sx={{
                p: { xs: 1, sm: 2 },
                mb: 2,
                bgcolor: 'white',
                width: '100%',
                maxWidth: '100%'
            }}>
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    maxWidth: '1200px',
                    mx: 'auto'
                }}>
                    {/* Left side - Logo and Title */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ 
                            width: 40, 
                            height: 40, 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <img src="/assets/logo.svg" alt="שוקו ביטוח" style={{ width: '100%', height: '100%' }} />
                        </Box>
                        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#424242', fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}>
                            ניהול סיכונים באתרי בניה
                        </Typography>
                    </Box>

                    {/* Right side - User profile */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {currentUser?.picture ? (
                            <Avatar src={currentUser.picture} alt={currentUser.name} sx={{ width: 32, height: 32 }} />
                        ) : (
                            <Avatar sx={{ width: 32, height: 32, bgcolor: '#6b47c1' }}>
                                <AccountCircleIcon />
                            </Avatar>
                        )}
                        <Typography variant="body2">{currentUser?.name || 'משתמש'}</Typography>
                        <IconButton>
                            <MoreVertIcon />
                        </IconButton>
                    </Box>
                </Box>
            </Paper>

            {/* Claim Card - Same style as project card */}
            <Box sx={{ p: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Paper elevation={1} sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Claim Header and Tabs - Combined Sticky */}
                    <Box sx={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 1000,
                        bgcolor: 'white',
                        borderBottom: '1px solid #e0e0e0',
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2
                    }}>
                        {/* Claim Title and Action Buttons */}
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            bgcolor: 'white',
                            color: 'black',
                            flexWrap: 'wrap',
                            gap: 1
                        }}>
                            <Typography variant="h6" sx={{ fontWeight: 500, color: 'black', wordBreak: 'break-word', maxWidth: '60%' }}>
                                {formData.projectName} - תביעה
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Button
                                    variant="outlined"
                                    onClick={handleClose}
                                    sx={{ 
                                        minWidth: 'auto',
                                        px: 2,
                                        color: '#6b47c1',
                                        borderColor: '#6b47c1',
                                        '&:hover': {
                                            borderColor: '#5a3aa1',
                                            backgroundColor: 'rgba(107, 71, 193, 0.04)'
                                        }
                                    }}
                                >
                                    סגירה
                                </Button>
                                <Button
                                    variant="contained"
                                    startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null}
                                    onClick={handleSave}
                                    disabled={saving}
                                    sx={{
                                        minWidth: 'auto',
                                        px: 2,
                                        bgcolor: '#6b47c1',
                                        '&:hover': {
                                            bgcolor: '#5a3aa1'
                                        }
                                    }}
                                >
                                    {saving ? 'שומר...' : 'שמירה'}
                                </Button>
                            </Box>
                        </Box>

                        {/* Tabs */}
                        <Tabs
                            value={activeTab}
                            onChange={handleTabChange}
                            sx={{
                                '& .MuiTab-root': {
                                    color: '#6B7280',
                                    '&.Mui-selected': {
                                        color: '#6b47c1',
                                    },
                                },
                                '& .MuiTabs-indicator': {
                                    backgroundColor: '#6b47c1',
                                },
                            }}
                        >
                            <Tab label="כללי" />
                            <Tab label="צדדים" />
                            <Tab label="הליכים" />
                            <Tab label="סיכום" />
                        </Tabs>
                    </Box>

                    {/* Tab Content */}
                    <Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
                        {activeTab === 0 && (
                            <Box>
                                <Typography variant="h6" gutterBottom sx={{ color: '#6b47c1', mb: 2 }}>
                                    פרטי התביעה
                                </Typography>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={12}
                                    label="תאור האירוע"
                                    value={formData.description}
                                    onChange={(e) => handleFieldChange('description', e.target.value)}
                                    variant="outlined"
                                    placeholder="תאר את האירוע בפירוט..."
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            '& fieldset': {
                                                borderColor: '#d0d0d0'
                                            },
                                            '&:hover fieldset': {
                                                borderColor: '#6b47c1'
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: '#6b47c1'
                                            }
                                        },
                                        '& .MuiInputLabel-root': {
                                            color: '#666666',
                                            '&.Mui-focused': {
                                                color: '#6b47c1'
                                            }
                                        }
                                    }}
                                />
                            </Box>
                        )}

                        {activeTab === 1 && (
                            <Box>
                                <Typography variant="h6" gutterBottom sx={{ color: '#6b47c1', mb: 2 }}>
                                    צדדים מעורבים
                                </Typography>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={12}
                                    label="פרטי הצדדים המעורבים"
                                    value={formData.parties}
                                    onChange={(e) => handleFieldChange('parties', e.target.value)}
                                    variant="outlined"
                                    placeholder="פרט את הצדדים המעורבים בתביעה..."
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            '& fieldset': {
                                                borderColor: '#d0d0d0'
                                            },
                                            '&:hover fieldset': {
                                                borderColor: '#6b47c1'
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: '#6b47c1'
                                            }
                                        },
                                        '& .MuiInputLabel-root': {
                                            color: '#666666',
                                            '&.Mui-focused': {
                                                color: '#6b47c1'
                                            }
                                        }
                                    }}
                                />
                            </Box>
                        )}

                        {activeTab === 2 && (
                            <Box>
                                <Typography variant="h6" gutterBottom sx={{ color: '#6b47c1', mb: 2 }}>
                                    הליכים משפטיים
                                </Typography>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={12}
                                    label="פרטי ההליכים המשפטיים"
                                    value={formData.procedures}
                                    onChange={(e) => handleFieldChange('procedures', e.target.value)}
                                    variant="outlined"
                                    placeholder="תאר את ההליכים המשפטיים..."
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            '& fieldset': {
                                                borderColor: '#d0d0d0'
                                            },
                                            '&:hover fieldset': {
                                                borderColor: '#6b47c1'
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: '#6b47c1'
                                            }
                                        },
                                        '& .MuiInputLabel-root': {
                                            color: '#666666',
                                            '&.Mui-focused': {
                                                color: '#6b47c1'
                                            }
                                        }
                                    }}
                                />
                            </Box>
                        )}

                        {activeTab === 3 && (
                            <Box>
                                <Typography variant="h6" gutterBottom sx={{ color: '#6b47c1', mb: 2 }}>
                                    סיכום התביעה
                                </Typography>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={12}
                                    label="סיכום התביעה"
                                    value={formData.summary}
                                    onChange={(e) => handleFieldChange('summary', e.target.value)}
                                    variant="outlined"
                                    placeholder="סיכום התביעה..."
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            '& fieldset': {
                                                borderColor: '#d0d0d0'
                                            },
                                            '&:hover fieldset': {
                                                borderColor: '#6b47c1'
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: '#6b47c1'
                                            }
                                        },
                                        '& .MuiInputLabel-root': {
                                            color: '#666666',
                                            '&.Mui-focused': {
                                                color: '#6b47c1'
                                            }
                                        }
                                    }}
                                />
                            </Box>
                        )}
                    </Box>
                </Paper>
            </Box>

            {/* Snackbar */}
            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={6000} 
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            >
                <Alert 
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
                    severity={snackbar.severity} 
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
