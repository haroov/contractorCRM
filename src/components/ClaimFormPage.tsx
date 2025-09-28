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
    CircularProgress
} from '@mui/material';
import {
    Save as SaveIcon,
    Close as CloseIcon,
    ArrowBack as ArrowBackIcon
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
        <Box sx={{ 
            minHeight: '100vh', 
            bgcolor: '#f5f5f5',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <Paper sx={{ 
                p: 2, 
                mb: 2, 
                borderRadius: 0,
                boxShadow: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={handleBack}
                        sx={{ 
                            color: '#6b47c1',
                            borderColor: '#6b47c1',
                            '&:hover': {
                                borderColor: '#5a3aa1',
                                backgroundColor: 'rgba(136, 47, 215, 0.04)'
                            }
                        }}
                    >
                        חזרה
                    </Button>
                    <Typography variant="h5" sx={{ color: '#6b47c1', fontWeight: 'bold' }}>
                        {formData.projectName} - תביעה
                    </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="outlined"
                        startIcon={<CloseIcon />}
                        onClick={handleClose}
                        sx={{ 
                            color: '#6b47c1',
                            borderColor: '#6b47c1',
                            '&:hover': {
                                borderColor: '#5a3aa1',
                                backgroundColor: 'rgba(136, 47, 215, 0.04)'
                            }
                        }}
                    >
                        סגירה
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                        onClick={handleSave}
                        disabled={saving}
                        sx={{
                            backgroundColor: '#6b47c1',
                            '&:hover': {
                                backgroundColor: '#5a3aa1'
                            }
                        }}
                    >
                        {saving ? 'שומר...' : 'שמירה'}
                    </Button>
                </Box>
            </Paper>

            {/* Main Content */}
            <Box sx={{ flex: 1, p: 2 }}>
                <Paper sx={{ 
                    borderRadius: 2,
                    overflow: 'hidden',
                    boxShadow: 1
                }}>
                    {/* Tabs */}
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
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
                    <Box sx={{ p: 3 }}>
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
