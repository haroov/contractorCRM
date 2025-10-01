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
    IconButton as MuiIconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
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
    // Main Damages
    propertyDamageInsured: boolean | null;
    propertyDamageThirdParty: boolean | null;
    bodilyInjuryThirdParty: boolean | null;
    bodilyInjuryEmployee: boolean | null;
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
        // Main Damages
        propertyDamageInsured: null,
        propertyDamageThirdParty: null,
        bodilyInjuryThirdParty: null,
        bodilyInjuryEmployee: null,
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

        // If we have a claimId but no mode, it might be from a redirect after save
        if (claimId && !mode) {
            setIsEditMode(true);
            loadClaim(claimId);
        }
    }, [searchParams]);

    const loadClaim = async (claimId: string) => {
        console.log('🔍 Loading claim with ID:', claimId);
        setLoading(true);
        try {
            const response = await fetch(`https://contractorcrm-api.onrender.com/api/claims/${claimId}`);
            console.log('🔍 Load claim response status:', response.status);
            if (response.ok) {
                const data = await response.json();
                console.log('🔍 Loaded claim data:', data);
                if (data.success && data.claim) {
                    setFormData({
                        projectId: data.claim.projectId || '',
                        projectName: data.claim.projectName || '',
                        eventDate: data.claim.eventDate || '',
                        eventTime: data.claim.eventTime || '',
                        eventLocation: data.claim.eventLocation || '',
                        eventAddress: data.claim.eventAddress || '',
                        description: data.claim.description || '',
                        // Main Damages
                        propertyDamageInsured: data.claim.propertyDamageInsured !== undefined ? data.claim.propertyDamageInsured : null,
                        propertyDamageThirdParty: data.claim.propertyDamageThirdParty !== undefined ? data.claim.propertyDamageThirdParty : null,
                        bodilyInjuryThirdParty: data.claim.bodilyInjuryThirdParty !== undefined ? data.claim.bodilyInjuryThirdParty : null,
                        bodilyInjuryEmployee: data.claim.bodilyInjuryEmployee !== undefined ? data.claim.bodilyInjuryEmployee : null,
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

    const handleFieldChange = (field: keyof ClaimFormData, value: string | boolean | null) => {
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
        if (window.confirm('האם אתה בטוח שברצונך למחוק את העד?')) {
            setFormData(prev => ({
                ...prev,
                witnesses: prev.witnesses.filter((_, i) => i !== index),
                updatedAt: new Date()
            }));
        }
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
        if (window.confirm('האם אתה בטוח שברצונך למחוק את הגורם הנוסף?')) {
            setFormData(prev => ({
                ...prev,
                additionalResponsible: prev.additionalResponsible.filter((_, i) => i !== index),
                updatedAt: new Date()
            }));
        }
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

        if (!formData.eventDate.trim()) {
            setSnackbar({
                open: true,
                message: 'נא למלא את תאריך האירוע',
                severity: 'error'
            });
            return;
        }

        setSaving(true);
        try {
            const claimId = searchParams.get('claimId');
            const url = isEditMode && claimId ? `https://contractorcrm-api.onrender.com/api/claims/${claimId}` : 'https://contractorcrm-api.onrender.com/api/claims';
            const method = isEditMode && claimId ? 'PUT' : 'POST';

            console.log('🔍 Sending claim data:', formData);
            console.log('🔍 URL:', url);
            console.log('🔍 Method:', method);

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const responseData = await response.json();
                console.log('🔍 Save response:', responseData);

                setSnackbar({
                    open: true,
                    message: isEditMode ? 'התביעה עודכנה בהצלחה' : 'התביעה נשמרה בהצלחה',
                    severity: 'success'
                });

                // If this was a new claim creation, redirect to edit mode with the claim ID
                if (!isEditMode && responseData.claimId) {
                    console.log('🔍 Redirecting to edit mode with claim ID:', responseData.claimId);
                    const currentUrl = new URL(window.location.href);
                    currentUrl.searchParams.set('claimId', responseData.claimId);
                    currentUrl.searchParams.set('mode', 'edit');
                    window.history.replaceState({}, '', currentUrl.toString());
                    setIsEditMode(true);
                }
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
                                {formData.projectName} - תביעה {isEditMode ? (formData.eventDate ? `(${new Date(formData.eventDate).toLocaleDateString('he-IL')})` : '(עריכה)') : '(חדשה)'}
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
                            <Tab label="נזק" />
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
                                                    required
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
                                        <Box sx={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: 2,
                                            mb: 3
                                        }}>
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
                                        </Box>

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

                                        {/* Main Damages Section */}
                                        <Box sx={{ mb: 3 }}>
                                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                                ראשי נזק
                                            </Typography>

                                            <Box sx={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: 2
                                            }}>
                                                {/* Row 1 - Property Damage to Insured */}
                                                <Box sx={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    justifyContent: 'flex-end'
                                                }}>
                                                    <Box sx={{
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '4px',
                                                        backgroundColor: 'white',
                                                        minHeight: '56px',
                                                        padding: '0 14px',
                                                        direction: 'rtl',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        width: '100%'
                                                    }}>
                                                        <Typography sx={{
                                                            fontSize: '1rem',
                                                            color: 'text.secondary',
                                                            marginRight: '10px'
                                                        }}>
                                                            נזק לרכוש המבוטח
                                                        </Typography>
                                                        <Box sx={{
                                                            display: 'flex',
                                                            gap: 0,
                                                            alignItems: 'center',
                                                            justifyContent: 'flex-start',
                                                            marginLeft: '10px'
                                                        }}>
                                                            <Button
                                                                variant="text"
                                                                onClick={() => handleFieldChange('propertyDamageInsured', false)}
                                                                sx={{
                                                                    borderRadius: '0 4px 4px 0',
                                                                    border: '1px solid #d1d5db',
                                                                    borderLeft: 'none',
                                                                    backgroundColor: formData.propertyDamageInsured === false ? '#6b47c1' : 'transparent',
                                                                    color: formData.propertyDamageInsured === false ? 'white' : '#6b47c1',
                                                                    '&:hover': {
                                                                        backgroundColor: formData.propertyDamageInsured === false ? '#5a3aa1' : '#f3f4f6',
                                                                    },
                                                                    minWidth: '50px',
                                                                    height: '32px',
                                                                    textTransform: 'none',
                                                                    fontSize: '0.875rem',
                                                                    marginRight: '0px'
                                                                }}
                                                            >
                                                                לא
                                                            </Button>
                                                            <Button
                                                                variant="text"
                                                                onClick={() => handleFieldChange('propertyDamageInsured', true)}
                                                                sx={{
                                                                    borderRadius: '4px 0 0 4px',
                                                                    border: '1px solid #d1d5db',
                                                                    backgroundColor: formData.propertyDamageInsured === true ? '#6b47c1' : 'transparent',
                                                                    color: formData.propertyDamageInsured === true ? 'white' : '#6b47c1',
                                                                    '&:hover': {
                                                                        backgroundColor: formData.propertyDamageInsured === true ? '#5a3aa1' : '#f3f4f6',
                                                                    },
                                                                    minWidth: '50px',
                                                                    height: '32px',
                                                                    textTransform: 'none',
                                                                    fontSize: '0.875rem'
                                                                }}
                                                            >
                                                                כן
                                                            </Button>
                                                        </Box>
                                                    </Box>
                                                </Box>

                                                {/* Row 1 - Empty Column */}
                                                <Box></Box>

                                                {/* Row 2 - Property Damage to Third Party */}
                                                <Box sx={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    justifyContent: 'flex-end'
                                                }}>
                                                    <Box sx={{
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '4px',
                                                        backgroundColor: 'white',
                                                        minHeight: '56px',
                                                        padding: '0 14px',
                                                        direction: 'rtl',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        width: '100%'
                                                    }}>
                                                        <Typography sx={{
                                                            fontSize: '1rem',
                                                            color: 'text.secondary',
                                                            marginRight: '10px'
                                                        }}>
                                                            נזק לרכוש צד שלישי
                                                        </Typography>
                                                        <Box sx={{
                                                            display: 'flex',
                                                            gap: 0,
                                                            alignItems: 'center',
                                                            justifyContent: 'flex-start',
                                                            marginLeft: '10px'
                                                        }}>
                                                            <Button
                                                                variant="text"
                                                                onClick={() => handleFieldChange('propertyDamageThirdParty', false)}
                                                                sx={{
                                                                    borderRadius: '0 4px 4px 0',
                                                                    border: '1px solid #d1d5db',
                                                                    borderLeft: 'none',
                                                                    backgroundColor: formData.propertyDamageThirdParty === false ? '#6b47c1' : 'transparent',
                                                                    color: formData.propertyDamageThirdParty === false ? 'white' : '#6b47c1',
                                                                    '&:hover': {
                                                                        backgroundColor: formData.propertyDamageThirdParty === false ? '#5a3aa1' : '#f3f4f6',
                                                                    },
                                                                    minWidth: '50px',
                                                                    height: '32px',
                                                                    textTransform: 'none',
                                                                    fontSize: '0.875rem',
                                                                    marginRight: '0px'
                                                                }}
                                                            >
                                                                לא
                                                            </Button>
                                                            <Button
                                                                variant="text"
                                                                onClick={() => handleFieldChange('propertyDamageThirdParty', true)}
                                                                sx={{
                                                                    borderRadius: '4px 0 0 4px',
                                                                    border: '1px solid #d1d5db',
                                                                    backgroundColor: formData.propertyDamageThirdParty === true ? '#6b47c1' : 'transparent',
                                                                    color: formData.propertyDamageThirdParty === true ? 'white' : '#6b47c1',
                                                                    '&:hover': {
                                                                        backgroundColor: formData.propertyDamageThirdParty === true ? '#5a3aa1' : '#f3f4f6',
                                                                    },
                                                                    minWidth: '50px',
                                                                    height: '32px',
                                                                    textTransform: 'none',
                                                                    fontSize: '0.875rem'
                                                                }}
                                                            >
                                                                כן
                                                            </Button>
                                                        </Box>
                                                    </Box>
                                                </Box>

                                                {/* Row 2 - Bodily Injury to Third Party */}
                                                <Box sx={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    justifyContent: 'flex-end'
                                                }}>
                                                    <Box sx={{
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '4px',
                                                        backgroundColor: 'white',
                                                        minHeight: '56px',
                                                        padding: '0 14px',
                                                        direction: 'rtl',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        width: '100%'
                                                    }}>
                                                        <Typography sx={{
                                                            fontSize: '1rem',
                                                            color: 'text.secondary',
                                                            marginRight: '10px'
                                                        }}>
                                                            נזק גוף לצד שלישי
                                                        </Typography>
                                                        <Box sx={{
                                                            display: 'flex',
                                                            gap: 0,
                                                            alignItems: 'center',
                                                            justifyContent: 'flex-start',
                                                            marginLeft: '10px'
                                                        }}>
                                                            <Button
                                                                variant="text"
                                                                onClick={() => handleFieldChange('bodilyInjuryThirdParty', false)}
                                                                sx={{
                                                                    borderRadius: '0 4px 4px 0',
                                                                    border: '1px solid #d1d5db',
                                                                    borderLeft: 'none',
                                                                    backgroundColor: formData.bodilyInjuryThirdParty === false ? '#6b47c1' : 'transparent',
                                                                    color: formData.bodilyInjuryThirdParty === false ? 'white' : '#6b47c1',
                                                                    '&:hover': {
                                                                        backgroundColor: formData.bodilyInjuryThirdParty === false ? '#5a3aa1' : '#f3f4f6',
                                                                    },
                                                                    minWidth: '50px',
                                                                    height: '32px',
                                                                    textTransform: 'none',
                                                                    fontSize: '0.875rem',
                                                                    marginRight: '0px'
                                                                }}
                                                            >
                                                                לא
                                                            </Button>
                                                            <Button
                                                                variant="text"
                                                                onClick={() => handleFieldChange('bodilyInjuryThirdParty', true)}
                                                                sx={{
                                                                    borderRadius: '4px 0 0 4px',
                                                                    border: '1px solid #d1d5db',
                                                                    backgroundColor: formData.bodilyInjuryThirdParty === true ? '#6b47c1' : 'transparent',
                                                                    color: formData.bodilyInjuryThirdParty === true ? 'white' : '#6b47c1',
                                                                    '&:hover': {
                                                                        backgroundColor: formData.bodilyInjuryThirdParty === true ? '#5a3aa1' : '#f3f4f6',
                                                                    },
                                                                    minWidth: '50px',
                                                                    height: '32px',
                                                                    textTransform: 'none',
                                                                    fontSize: '0.875rem'
                                                                }}
                                                            >
                                                                כן
                                                            </Button>
                                                        </Box>
                                                    </Box>
                                                </Box>

                                                {/* Row 3 - Bodily Injury to Employee */}
                                                <Box sx={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    justifyContent: 'flex-end'
                                                }}>
                                                    <Box sx={{
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '4px',
                                                        backgroundColor: 'white',
                                                        minHeight: '56px',
                                                        padding: '0 14px',
                                                        direction: 'rtl',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        width: '100%'
                                                    }}>
                                                        <Typography sx={{
                                                            fontSize: '1rem',
                                                            color: 'text.secondary',
                                                            marginRight: '10px'
                                                        }}>
                                                            נזק גוף לעובד
                                                        </Typography>
                                                        <Box sx={{
                                                            display: 'flex',
                                                            gap: 0,
                                                            alignItems: 'center',
                                                            justifyContent: 'flex-start',
                                                            marginLeft: '10px'
                                                        }}>
                                                            <Button
                                                                variant="text"
                                                                onClick={() => handleFieldChange('bodilyInjuryEmployee', false)}
                                                                sx={{
                                                                    borderRadius: '0 4px 4px 0',
                                                                    border: '1px solid #d1d5db',
                                                                    borderLeft: 'none',
                                                                    backgroundColor: formData.bodilyInjuryEmployee === false ? '#6b47c1' : 'transparent',
                                                                    color: formData.bodilyInjuryEmployee === false ? 'white' : '#6b47c1',
                                                                    '&:hover': {
                                                                        backgroundColor: formData.bodilyInjuryEmployee === false ? '#5a3aa1' : '#f3f4f6',
                                                                    },
                                                                    minWidth: '50px',
                                                                    height: '32px',
                                                                    textTransform: 'none',
                                                                    fontSize: '0.875rem',
                                                                    marginRight: '0px'
                                                                }}
                                                            >
                                                                לא
                                                            </Button>
                                                            <Button
                                                                variant="text"
                                                                onClick={() => handleFieldChange('bodilyInjuryEmployee', true)}
                                                                sx={{
                                                                    borderRadius: '4px 0 0 4px',
                                                                    border: '1px solid #d1d5db',
                                                                    backgroundColor: formData.bodilyInjuryEmployee === true ? '#6b47c1' : 'transparent',
                                                                    color: formData.bodilyInjuryEmployee === true ? 'white' : '#6b47c1',
                                                                    '&:hover': {
                                                                        backgroundColor: formData.bodilyInjuryEmployee === true ? '#5a3aa1' : '#f3f4f6',
                                                                    },
                                                                    minWidth: '50px',
                                                                    height: '32px',
                                                                    textTransform: 'none',
                                                                    fontSize: '0.875rem'
                                                                }}
                                                            >
                                                                כן
                                                            </Button>
                                                        </Box>
                                                    </Box>
                                                </Box>

                                                {/* Row 3 - Empty Column */}
                                                <Box></Box>
                                            </Box>
                                        </Box>

                                        {/* Witnesses Section */}
                                        <Box sx={{ mb: 3 }}>
                                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                                פרטי עדי ראייה
                                            </Typography>

                                            <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                                                <Table>
                                                    <TableHead>
                                                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '25%' }}>שם מלא</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '20%' }}>טלפון נייד</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '25%' }}>אימייל</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '20%' }}>הערות</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', width: '10%' }}>פעולות</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {formData.witnesses.map((witness, index) => (
                                                            <TableRow key={index}>
                                                                <TableCell sx={{ borderBottom: '1px solid #e0e0e0' }}>
                                                                    <TextField
                                                                        fullWidth
                                                                        value={witness.fullName}
                                                                        onChange={(e) => updateWitness(index, 'fullName', e.target.value)}
                                                                        variant="outlined"
                                                                        size="small"
                                                                        placeholder="הזן שם מלא"
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
                                                                            }
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell sx={{ borderBottom: '1px solid #e0e0e0' }}>
                                                                    <TextField
                                                                        fullWidth
                                                                        value={witness.phone}
                                                                        onChange={(e) => updateWitness(index, 'phone', e.target.value)}
                                                                        variant="outlined"
                                                                        size="small"
                                                                        placeholder="הזן טלפון"
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
                                                                            }
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell sx={{ borderBottom: '1px solid #e0e0e0' }}>
                                                                    <TextField
                                                                        fullWidth
                                                                        type="email"
                                                                        value={witness.email}
                                                                        onChange={(e) => updateWitness(index, 'email', e.target.value)}
                                                                        variant="outlined"
                                                                        size="small"
                                                                        placeholder="הזן אימייל"
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
                                                                            }
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell sx={{ borderBottom: '1px solid #e0e0e0' }}>
                                                                    <TextField
                                                                        fullWidth
                                                                        value={witness.notes}
                                                                        onChange={(e) => updateWitness(index, 'notes', e.target.value)}
                                                                        variant="outlined"
                                                                        size="small"
                                                                        placeholder="הזן הערות"
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
                                                                            }
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell sx={{ textAlign: 'center', borderBottom: '1px solid #e0e0e0' }}>
                                                                    <MuiIconButton
                                                                        onClick={() => removeWitness(index)}
                                                                        sx={{
                                                                            color: '#f44336',
                                                                            '&:hover': {
                                                                                backgroundColor: '#ffebee',
                                                                                color: '#d32f2f'
                                                                            }
                                                                        }}
                                                                    >
                                                                        <img src="/assets/icon-trash.svg" alt="מחק" style={{ width: '16px', height: '16px' }} />
                                                                    </MuiIconButton>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}

                                                        {/* Add button row */}
                                                        <TableRow>
                                                            <TableCell colSpan={5} sx={{ textAlign: 'center', py: 2 }}>
                                                                <Button
                                                                    variant="outlined"
                                                                    onClick={addWitness}
                                                                    sx={{
                                                                        borderColor: '#6b47c1',
                                                                        color: '#6b47c1',
                                                                        '&:hover': {
                                                                            borderColor: '#5a3aa1',
                                                                            backgroundColor: '#F3F4F6'
                                                                        }
                                                                    }}
                                                                >
                                                                    + הוספה
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </Box>

                                        {/* Additional Responsible Section */}
                                        <Box sx={{ mb: 3 }}>
                                            <Box sx={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                justifyContent: 'flex-end',
                                                mb: 2
                                            }}>
                                                <Box sx={{
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: '4px',
                                                    backgroundColor: 'white',
                                                    minHeight: '56px',
                                                    padding: '0 14px',
                                                    direction: 'rtl',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    width: '100%'
                                                }}>
                                                    <Typography sx={{
                                                        fontSize: '1rem',
                                                        color: 'text.secondary',
                                                        marginRight: '10px'
                                                    }}>
                                                        האם יש גורם נוסף אפשרי שאחראי לאירוע?
                                                    </Typography>
                                                    <Box sx={{
                                                        display: 'flex',
                                                        gap: 0,
                                                        alignItems: 'center',
                                                        justifyContent: 'flex-start',
                                                        marginLeft: '10px'
                                                    }}>
                                                        <Button
                                                            variant="text"
                                                            onClick={() => handleFieldChange('hasAdditionalResponsible', false)}
                                                            sx={{
                                                                borderRadius: '0 4px 4px 0',
                                                                border: '1px solid #d1d5db',
                                                                borderLeft: 'none',
                                                                backgroundColor: formData.hasAdditionalResponsible === false ? '#6b47c1' : 'transparent',
                                                                color: formData.hasAdditionalResponsible === false ? 'white' : '#6b47c1',
                                                                '&:hover': {
                                                                    backgroundColor: formData.hasAdditionalResponsible === false ? '#5a3aa1' : '#f3f4f6',
                                                                },
                                                                minWidth: '50px',
                                                                height: '32px',
                                                                textTransform: 'none',
                                                                fontSize: '0.875rem',
                                                                marginRight: '0px'
                                                            }}
                                                        >
                                                            לא
                                                        </Button>
                                                        <Button
                                                            variant="text"
                                                            onClick={() => handleFieldChange('hasAdditionalResponsible', true)}
                                                            sx={{
                                                                borderRadius: '4px 0 0 4px',
                                                                border: '1px solid #d1d5db',
                                                                backgroundColor: formData.hasAdditionalResponsible === true ? '#6b47c1' : 'transparent',
                                                                color: formData.hasAdditionalResponsible === true ? 'white' : '#6b47c1',
                                                                '&:hover': {
                                                                    backgroundColor: formData.hasAdditionalResponsible === true ? '#5a3aa1' : '#f3f4f6',
                                                                },
                                                                minWidth: '50px',
                                                                height: '32px',
                                                                textTransform: 'none',
                                                                fontSize: '0.875rem'
                                                            }}
                                                        >
                                                            כן
                                                        </Button>
                                                    </Box>
                                                </Box>
                                            </Box>

                                            {formData.hasAdditionalResponsible && (
                                                <Box>
                                                    <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                                                        <Table>
                                                            <TableHead>
                                                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '25%' }}>שם מלא</TableCell>
                                                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '20%' }}>טלפון נייד</TableCell>
                                                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '25%' }}>אימייל</TableCell>
                                                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '20%' }}>הערות</TableCell>
                                                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', width: '10%' }}>פעולות</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {formData.additionalResponsible.map((person, index) => (
                                                                    <TableRow key={index}>
                                                                        <TableCell sx={{ borderBottom: '1px solid #e0e0e0' }}>
                                                                            <TextField
                                                                                fullWidth
                                                                                value={person.fullName}
                                                                                onChange={(e) => updateAdditionalResponsible(index, 'fullName', e.target.value)}
                                                                                variant="outlined"
                                                                                size="small"
                                                                                placeholder="הזן שם מלא"
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
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell sx={{ borderBottom: '1px solid #e0e0e0' }}>
                                                                            <TextField
                                                                                fullWidth
                                                                                value={person.phone}
                                                                                onChange={(e) => updateAdditionalResponsible(index, 'phone', e.target.value)}
                                                                                variant="outlined"
                                                                                size="small"
                                                                                placeholder="הזן טלפון"
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
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell sx={{ borderBottom: '1px solid #e0e0e0' }}>
                                                                            <TextField
                                                                                fullWidth
                                                                                type="email"
                                                                                value={person.email}
                                                                                onChange={(e) => updateAdditionalResponsible(index, 'email', e.target.value)}
                                                                                variant="outlined"
                                                                                size="small"
                                                                                placeholder="הזן אימייל"
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
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell sx={{ borderBottom: '1px solid #e0e0e0' }}>
                                                                            <TextField
                                                                                fullWidth
                                                                                value={person.notes}
                                                                                onChange={(e) => updateAdditionalResponsible(index, 'notes', e.target.value)}
                                                                                variant="outlined"
                                                                                size="small"
                                                                                placeholder="הזן הערות"
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
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell sx={{ textAlign: 'center', borderBottom: '1px solid #e0e0e0' }}>
                                                                            <MuiIconButton
                                                                                onClick={() => removeAdditionalResponsible(index)}
                                                                                sx={{
                                                                                    color: '#f44336',
                                                                                    '&:hover': {
                                                                                        backgroundColor: '#ffebee',
                                                                                        color: '#d32f2f'
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <img src="/assets/icon-trash.svg" alt="מחק" style={{ width: '16px', height: '16px' }} />
                                                                            </MuiIconButton>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}

                                                                {/* Add button row */}
                                                                <TableRow>
                                                                    <TableCell colSpan={5} sx={{ textAlign: 'center', py: 2 }}>
                                                                        <Button
                                                                            variant="outlined"
                                                                            onClick={addAdditionalResponsible}
                                                                            sx={{
                                                                                borderColor: '#6b47c1',
                                                                                color: '#6b47c1',
                                                                                '&:hover': {
                                                                                    borderColor: '#5a3aa1',
                                                                                    backgroundColor: '#F3F4F6'
                                                                                }
                                                                            }}
                                                                        >
                                                                            + הוספת גורם
                                                                        </Button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            </TableBody>
                                                        </Table>
                                                    </TableContainer>
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
