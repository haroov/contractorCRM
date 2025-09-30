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
    IconButton,
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    Grid,
    IconButton as MuiIconButton
} from '@mui/material';
import {
    Save as SaveIcon,
    Close as CloseIcon,
    ArrowBack as ArrowBackIcon,
    MoreVert as MoreVertIcon,
    AccountCircle as AccountCircleIcon,
    Add as AddIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';

interface Witness {
    fullName: string;
    phone: string;
    email: string;
    notes: string;
}

interface AdditionalResponsible {
    fullName: string;
    phone: string;
    email: string;
    notes: string;
}

interface ClaimFormData {
    projectId: string;
    projectName: string;
    eventDate: string;
    eventTime: string;
    eventLocation: string;
    eventAddress: string;
    description: string;
    hasWitnesses: boolean;
    witnesses: Witness[];
    hasAdditionalResponsible: boolean;
    additionalResponsible: AdditionalResponsible[];
    status: string;
    parties: string;
    procedures: string;
    summary: string;
    createdAt: Date;
    updatedAt: Date;
}

interface ClaimFormPageProps {
    currentUser: any;
}

export default function ClaimFormPage({ currentUser }: ClaimFormPageProps) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState(0);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success' as 'success' | 'error' | 'warning' | 'info'
    });

    const [formData, setFormData] = useState<ClaimFormData>({
        projectId: searchParams.get('projectId') || '',
        projectName: searchParams.get('projectName') || '',
        eventDate: '',
        eventTime: '',
        eventLocation: '',
        eventAddress: '',
        description: '',
        hasWitnesses: false,
        witnesses: [],
        hasAdditionalResponsible: false,
        additionalResponsible: [],
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
        const claimId = searchParams.get('claimId');
        const mode = searchParams.get('mode');

        if (projectId && projectName) {
            setFormData(prev => ({
                ...prev,
                projectId,
                projectName: decodeURIComponent(projectName)
            }));
        }

        // If we have a claimId and mode is edit, load the existing claim
        if (claimId && mode === 'edit') {
            setIsEditMode(true);
            loadClaim(claimId);
        }
    }, [searchParams]);

    const loadClaim = async (claimId: string) => {
        setLoading(true);
        try {
            const response = await fetch(`https://contractorcrm-api.onrender.com/api/claims/${claimId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.claim) {
                    setFormData({
                        projectId: data.claim.projectId || '',
                        projectName: data.claim.projectName || '',
                        eventDate: data.claim.eventDate || '',
                        eventTime: data.claim.eventTime || '',
                        eventLocation: data.claim.eventLocation || '',
                        eventAddress: data.claim.eventAddress || '',
                        description: data.claim.description || '',
                        hasWitnesses: data.claim.hasWitnesses || false,
                        witnesses: data.claim.witnesses || [],
                        hasAdditionalResponsible: data.claim.hasAdditionalResponsible || false,
                        additionalResponsible: data.claim.additionalResponsible || [],
                        status: data.claim.status || 'open',
                        parties: data.claim.parties || '',
                        procedures: data.claim.procedures || '',
                        summary: data.claim.summary || '',
                        createdAt: data.claim.createdAt ? new Date(data.claim.createdAt) : new Date(),
                        updatedAt: data.claim.updatedAt ? new Date(data.claim.updatedAt) : new Date()
                    });
                }
            } else {
                throw new Error('Failed to load claim');
            }
        } catch (error) {
            console.error('Error loading claim:', error);
            setSnackbar({
                open: true,
                message: 'שגיאה בטעינת התביעה',
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    const handleFieldChange = (field: keyof ClaimFormData, value: string | boolean) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
            updatedAt: new Date()
        }));
    };

    const addWitness = () => {
        setFormData(prev => ({
            ...prev,
            witnesses: [...prev.witnesses, { fullName: '', phone: '', email: '', notes: '' }],
            updatedAt: new Date()
        }));
    };

    const removeWitness = (index: number) => {
        setFormData(prev => ({
            ...prev,
            witnesses: prev.witnesses.filter((_, i) => i !== index),
            updatedAt: new Date()
        }));
    };

    const updateWitness = (index: number, field: keyof Witness, value: string) => {
        setFormData(prev => ({
            ...prev,
            witnesses: prev.witnesses.map((witness, i) => 
                i === index ? { ...witness, [field]: value } : witness
            ),
            updatedAt: new Date()
        }));
    };

    const addAdditionalResponsible = () => {
        setFormData(prev => ({
            ...prev,
            additionalResponsible: [...prev.additionalResponsible, { fullName: '', phone: '', email: '', notes: '' }],
            updatedAt: new Date()
        }));
    };

    const removeAdditionalResponsible = (index: number) => {
        setFormData(prev => ({
            ...prev,
            additionalResponsible: prev.additionalResponsible.filter((_, i) => i !== index),
            updatedAt: new Date()
        }));
    };

    const updateAdditionalResponsible = (index: number, field: keyof AdditionalResponsible, value: string) => {
        setFormData(prev => ({
            ...prev,
            additionalResponsible: prev.additionalResponsible.map((person, i) => 
                i === index ? { ...person, [field]: value } : person
            ),
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
            const claimId = searchParams.get('claimId');
            const url = isEditMode && claimId ? `https://contractorcrm-api.onrender.com/api/claims/${claimId}` : 'https://contractorcrm-api.onrender.com/api/claims';
            const method = isEditMode && claimId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setSnackbar({
                    open: true,
                    message: isEditMode ? 'התביעה עודכנה בהצלחה' : 'התביעה נשמרה בהצלחה',
                    severity: 'success'
                });
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
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f8', width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
            {/* Main Header with System Name and Profile - Sticky */}
            <Paper elevation={2} sx={{
                p: { xs: 1, sm: 2 },
                bgcolor: 'white',
                width: '100%',
                maxWidth: '100%',
                position: 'sticky',
                top: 0,
                zIndex: 1001,
                flexShrink: 0
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

            {/* Claim Card - Same style as contractor card */}
            <Box sx={{ p: 2 }}>
                <Paper elevation={1} sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
                    {/* Claim Header and Tabs - Combined Sticky */}
                    <Box sx={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                        bgcolor: 'white',
                        flexShrink: 0
                    }}>
                        {/* Claim Header */}
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            bgcolor: 'white',
                            color: 'black',
                            flexWrap: 'wrap',
                            gap: 1,
                            p: 2
                        }}>
                            <Typography variant="h6" sx={{ fontWeight: 500, color: 'black', wordBreak: 'break-word', maxWidth: '60%' }}>
                                {formData.projectName} - תביעה {isEditMode ? '(עריכה)' : '(חדשה)'}
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
                                borderBottom: '1px solid #e0e0e0'
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
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <>
                                {activeTab === 0 && (
                                    <Box>
                                        <Typography variant="h6" gutterBottom sx={{ color: '#6b47c1', mb: 2 }}>
                                            פרטי התביעה
                                        </Typography>
                                        
                                        {/* Date and Time Fields */}
                                        <Grid container spacing={2} sx={{ mb: 3 }}>
                                            <Grid item xs={12} sm={6}>
                                                <TextField
                                                    fullWidth
                                                    type="date"
                                                    label="תאריך האירוע"
                                                    value={formData.eventDate}
                                                    onChange={(e) => handleFieldChange('eventDate', e.target.value)}
                                                    variant="outlined"
                                                    InputLabelProps={{ shrink: true }}
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
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <TextField
                                                    fullWidth
                                                    type="time"
                                                    label="שעת האירוע"
                                                    value={formData.eventTime}
                                                    onChange={(e) => handleFieldChange('eventTime', e.target.value)}
                                                    variant="outlined"
                                                    InputLabelProps={{ shrink: true }}
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
                                            </Grid>
                                        </Grid>

                                        {/* Location and Address Fields */}
                                        <Grid container spacing={2} sx={{ mb: 3 }}>
                                            <Grid item xs={12} sm={6}>
                                                <TextField
                                                    fullWidth
                                                    label="מקום האירוע"
                                                    value={formData.eventLocation}
                                                    onChange={(e) => handleFieldChange('eventLocation', e.target.value)}
                                                    variant="outlined"
                                                    placeholder="הזן מקום האירוע"
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
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <TextField
                                                    fullWidth
                                                    label="כתובת האירוע"
                                                    value={formData.eventAddress}
                                                    onChange={(e) => handleFieldChange('eventAddress', e.target.value)}
                                                    variant="outlined"
                                                    placeholder="הזן כתובת האירוע"
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
                                            </Grid>
                                        </Grid>

                                        {/* Event Description */}
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={6}
                                            label="תיאור מפורט"
                                            value={formData.description}
                                            onChange={(e) => handleFieldChange('description', e.target.value)}
                                            variant="outlined"
                                            placeholder="תאר את האירוע בפירוט..."
                                            sx={{
                                                mb: 3,
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

                                        {/* Witnesses Section */}
                                        <Box sx={{ mb: 3 }}>
                                            <FormControl component="fieldset" sx={{ mb: 2 }}>
                                                <FormLabel component="legend" sx={{ color: '#6b47c1', fontWeight: 'bold' }}>
                                                    האם יש עדי ראייה?
                                                </FormLabel>
                                                <RadioGroup
                                                    row
                                                    value={formData.hasWitnesses}
                                                    onChange={(e) => handleFieldChange('hasWitnesses', e.target.value === 'true')}
                                                >
                                                    <FormControlLabel value={false} control={<Radio sx={{ color: '#6b47c1' }} />} label="לא" />
                                                    <FormControlLabel value={true} control={<Radio sx={{ color: '#6b47c1' }} />} label="כן" />
                                                </RadioGroup>
                                            </FormControl>

                                            {formData.hasWitnesses && (
                                                <Box>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                                        <Typography variant="subtitle1" sx={{ color: '#6b47c1', fontWeight: 'bold' }}>
                                                            פרטי עדי ראייה
                                                        </Typography>
                                                        <Button
                                                            variant="outlined"
                                                            startIcon={<AddIcon />}
                                                            onClick={addWitness}
                                                            sx={{
                                                                color: '#6b47c1',
                                                                borderColor: '#6b47c1',
                                                                '&:hover': {
                                                                    borderColor: '#5a3aa1',
                                                                    backgroundColor: 'rgba(107, 71, 193, 0.04)'
                                                                }
                                                            }}
                                                        >
                                                            הוסף עד
                                                        </Button>
                                                    </Box>
                                                    {formData.witnesses.map((witness, index) => (
                                                        <Paper key={index} elevation={1} sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0' }}>
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                                                <Typography variant="subtitle2" sx={{ color: '#6b47c1' }}>
                                                                    עד {index + 1}
                                                                </Typography>
                                                                <MuiIconButton
                                                                    onClick={() => removeWitness(index)}
                                                                    sx={{ color: '#f44336' }}
                                                                >
                                                                    <DeleteIcon />
                                                                </MuiIconButton>
                                                            </Box>
                                                            <Grid container spacing={2}>
                                                                <Grid item xs={12} sm={6}>
                                                                    <TextField
                                                                        fullWidth
                                                                        label="שם מלא"
                                                                        value={witness.fullName}
                                                                        onChange={(e) => updateWitness(index, 'fullName', e.target.value)}
                                                                        variant="outlined"
                                                                        size="small"
                                                                    />
                                                                </Grid>
                                                                <Grid item xs={12} sm={6}>
                                                                    <TextField
                                                                        fullWidth
                                                                        label="טלפון נייד"
                                                                        value={witness.phone}
                                                                        onChange={(e) => updateWitness(index, 'phone', e.target.value)}
                                                                        variant="outlined"
                                                                        size="small"
                                                                    />
                                                                </Grid>
                                                                <Grid item xs={12} sm={6}>
                                                                    <TextField
                                                                        fullWidth
                                                                        label="אימייל"
                                                                        type="email"
                                                                        value={witness.email}
                                                                        onChange={(e) => updateWitness(index, 'email', e.target.value)}
                                                                        variant="outlined"
                                                                        size="small"
                                                                    />
                                                                </Grid>
                                                                <Grid item xs={12} sm={6}>
                                                                    <TextField
                                                                        fullWidth
                                                                        label="הערות"
                                                                        value={witness.notes}
                                                                        onChange={(e) => updateWitness(index, 'notes', e.target.value)}
                                                                        variant="outlined"
                                                                        size="small"
                                                                    />
                                                                </Grid>
                                                            </Grid>
                                                        </Paper>
                                                    ))}
                                                </Box>
                                            )}
                                        </Box>

                                        {/* Additional Responsible Section */}
                                        <Box sx={{ mb: 3 }}>
                                            <FormControl component="fieldset" sx={{ mb: 2 }}>
                                                <FormLabel component="legend" sx={{ color: '#6b47c1', fontWeight: 'bold' }}>
                                                    האם יש גורם נוסף אפשרי שאחראי לאירוע?
                                                </FormLabel>
                                                <RadioGroup
                                                    row
                                                    value={formData.hasAdditionalResponsible}
                                                    onChange={(e) => handleFieldChange('hasAdditionalResponsible', e.target.value === 'true')}
                                                >
                                                    <FormControlLabel value={false} control={<Radio sx={{ color: '#6b47c1' }} />} label="לא" />
                                                    <FormControlLabel value={true} control={<Radio sx={{ color: '#6b47c1' }} />} label="כן" />
                                                </RadioGroup>
                                            </FormControl>

                                            {formData.hasAdditionalResponsible && (
                                                <Box>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                                        <Typography variant="subtitle1" sx={{ color: '#6b47c1', fontWeight: 'bold' }}>
                                                            פרטי גורם נוסף
                                                        </Typography>
                                                        <Button
                                                            variant="outlined"
                                                            startIcon={<AddIcon />}
                                                            onClick={addAdditionalResponsible}
                                                            sx={{
                                                                color: '#6b47c1',
                                                                borderColor: '#6b47c1',
                                                                '&:hover': {
                                                                    borderColor: '#5a3aa1',
                                                                    backgroundColor: 'rgba(107, 71, 193, 0.04)'
                                                                }
                                                            }}
                                                        >
                                                            הוסף גורם
                                                        </Button>
                                                    </Box>
                                                    {formData.additionalResponsible.map((person, index) => (
                                                        <Paper key={index} elevation={1} sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0' }}>
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                                                <Typography variant="subtitle2" sx={{ color: '#6b47c1' }}>
                                                                    גורם {index + 1}
                                                                </Typography>
                                                                <MuiIconButton
                                                                    onClick={() => removeAdditionalResponsible(index)}
                                                                    sx={{ color: '#f44336' }}
                                                                >
                                                                    <DeleteIcon />
                                                                </MuiIconButton>
                                                            </Box>
                                                            <Grid container spacing={2}>
                                                                <Grid item xs={12} sm={6}>
                                                                    <TextField
                                                                        fullWidth
                                                                        label="שם מלא"
                                                                        value={person.fullName}
                                                                        onChange={(e) => updateAdditionalResponsible(index, 'fullName', e.target.value)}
                                                                        variant="outlined"
                                                                        size="small"
                                                                    />
                                                                </Grid>
                                                                <Grid item xs={12} sm={6}>
                                                                    <TextField
                                                                        fullWidth
                                                                        label="טלפון נייד"
                                                                        value={person.phone}
                                                                        onChange={(e) => updateAdditionalResponsible(index, 'phone', e.target.value)}
                                                                        variant="outlined"
                                                                        size="small"
                                                                    />
                                                                </Grid>
                                                                <Grid item xs={12} sm={6}>
                                                                    <TextField
                                                                        fullWidth
                                                                        label="אימייל"
                                                                        type="email"
                                                                        value={person.email}
                                                                        onChange={(e) => updateAdditionalResponsible(index, 'email', e.target.value)}
                                                                        variant="outlined"
                                                                        size="small"
                                                                    />
                                                                </Grid>
                                                                <Grid item xs={12} sm={6}>
                                                                    <TextField
                                                                        fullWidth
                                                                        label="הערות"
                                                                        value={person.notes}
                                                                        onChange={(e) => updateAdditionalResponsible(index, 'notes', e.target.value)}
                                                                        variant="outlined"
                                                                        size="small"
                                                                    />
                                                                </Grid>
                                                            </Grid>
                                                        </Paper>
                                                    ))}
                                                </Box>
                                            )}
                                        </Box>
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
                            </>
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
