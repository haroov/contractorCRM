import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Chip,
    TextField,
    InputAdornment,
    Card,
    CardContent,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import {
    Search as SearchIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Add as AddIcon,
    Refresh as RefreshIcon,
    Business as BusinessIcon,
    LocationOn as LocationIcon,
    Phone as PhoneIcon,
    Email as EmailIcon
} from '@mui/icons-material';
import type { ContractorDocument as Contractor } from '../types/contractor';
import { ContractorService } from '../services/contractorService';

interface ContractorRepositoryProps {
    onContractorSelect?: (contractor: Contractor) => void;
}

export default function ContractorRepository({ onContractorSelect }: ContractorRepositoryProps) {
    const [contractors, setContractors] = useState<Contractor[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [contractorToDelete, setContractorToDelete] = useState<Contractor | null>(null);

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

    // Auto-refresh when page gains focus
    useEffect(() => {
        const handleFocus = async () => {
            try {
                console.log('Page gained focus - refreshing contractors list...');
                const data = await ContractorService.getAll();
                console.log('Refreshed contractors from MongoDB:', data);
                setContractors(data);
            } catch (error) {
                console.error('❌ Error refreshing contractors from MongoDB:', error);
            }
        };

        const handleVisibilityChange = async () => {
            if (!document.hidden) {
                try {
                    console.log('Page became visible - refreshing contractors list...');
                    const data = await ContractorService.getAll();
                    console.log('Refreshed contractors from MongoDB:', data);
                    setContractors(data);
                } catch (error) {
                    console.error('❌ Error refreshing contractors from MongoDB:', error);
                }
            }
        };

        // Add event listeners for focus and visibility change
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup event listeners on unmount
        return () => {
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const filteredContractors = contractors.filter(contractor => {
        const searchLower = searchTerm.toLowerCase();

        // 1. חיפוש בשם החברה (עדיפות ראשונה)
        const nameMatch = (contractor.name?.toLowerCase() || '').includes(searchLower);

        // 2. חיפוש בעיר (עדיפות שנייה)
        const cityMatch = (contractor.city?.toLowerCase() || '').includes(searchLower);

        // 3. חיפוש בשמות אנשי קשר (עדיפות שלישית)
        const contactMatch = contractor.contacts?.some(contact =>
            (contact.fullName?.toLowerCase() || '').includes(searchLower) ||
            (contact.role?.toLowerCase() || '').includes(searchLower)
        ) || false;

        // 4. חיפוש בח"פ (עדיפות רביעית)
        const companyIdMatch = (contractor.company_id || '').includes(searchTerm);

        // 5. חיפוש בסקטור (עדיפות חמישית)
        const sectorMatch = (contractor.sector?.toLowerCase() || '').includes(searchLower);

        // לוג לדיבוג
        if (searchTerm && (nameMatch || cityMatch || contactMatch || companyIdMatch || sectorMatch)) {
            console.log('🔍 Found match for:', searchTerm, 'in contractor:', contractor.name);
            console.log('  - nameMatch (1st priority):', nameMatch);
            console.log('  - cityMatch (2nd priority):', cityMatch);
            console.log('  - contactMatch (3rd priority):', contactMatch);
            console.log('  - companyIdMatch (4th priority):', companyIdMatch);
            console.log('  - sectorMatch (5th priority):', sectorMatch);
            if (contactMatch) {
                console.log('  - contacts:', contractor.contacts);
            }
        }

        // לוג ספציפי לפרשקובסקי
        if (searchTerm.toLowerCase().includes('פרשקובסקי')) {
            console.log('🔍 Searching for Prashkovski in contractor:', contractor.name);
            console.log('  - contractor name:', contractor.name);
            console.log('  - contacts:', contractor.contacts);
        }

        return nameMatch || cityMatch || contactMatch || companyIdMatch || sectorMatch;
    }).sort((a, b) => {
        // מיון לפי סדר העדיפויות
        const searchLower = searchTerm.toLowerCase();

        const getPriority = (contractor: any) => {
            const nameMatch = (contractor.name?.toLowerCase() || '').includes(searchLower);
            const cityMatch = (contractor.city?.toLowerCase() || '').includes(searchLower);
            const contactMatch = contractor.contacts?.some((contact: any) =>
                (contact.fullName?.toLowerCase() || '').includes(searchLower) ||
                (contact.role?.toLowerCase() || '').includes(searchLower)
            ) || false;
            const companyIdMatch = (contractor.company_id || '').includes(searchTerm);
            const sectorMatch = (contractor.sector?.toLowerCase() || '').includes(searchLower);

            if (nameMatch) return 1; // עדיפות ראשונה
            if (cityMatch) return 2; // עדיפות שנייה
            if (contactMatch) return 3; // עדיפות שלישית
            if (companyIdMatch) return 4; // עדיפות רביעית
            if (sectorMatch) return 5; // עדיפות חמישית
            return 6; // ללא התאמה
        };

        const priorityA = getPriority(a);
        const priorityB = getPriority(b);

        // לוג למיון
        if (searchTerm && priorityA !== 6 && priorityB !== 6) {
            console.log(`📊 Sorting: ${a.name} (priority ${priorityA}) vs ${b.name} (priority ${priorityB})`);
        }

        return priorityA - priorityB;
    });

    // לוג כל הקבלנים לדיבוג
    useEffect(() => {
        if (contractors.length > 0) {
            console.log('📋 All contractors in system:', contractors.map(c => ({
                name: c.name,
                company_id: c.company_id,
                contacts: c.contacts?.map(contact => contact.fullName) || []
            })));

            // חיפוש ספציפי לפרשקובסקי
            const prashkovski = contractors.find(c =>
                c.name?.toLowerCase().includes('פרשקובסקי') ||
                c.contacts?.some(contact =>
                    contact.fullName?.toLowerCase().includes('פרשקובסקי')
                )
            );

            if (prashkovski) {
                console.log('✅ Found Prashkovski contractor:', prashkovski);
            } else {
                console.log('❌ Prashkovski contractor not found in system');
            }
        }
    }, [contractors]);

    const openContractorInNewWindow = (contractor: Contractor, mode: 'view' | 'edit' | 'new') => {
        // Get session ID from current URL
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('sessionId');
        
        // Create URL parameters for the contractor data
        const params = new URLSearchParams();
        params.set('mode', mode);
        
        // Add session ID to the new window URL
        if (sessionId) {
            params.set('sessionId', sessionId);
        }

        if (mode === 'new') {
            params.set('contractor_id', 'new');
        } else {
            params.set('contractor_id', contractor.contractor_id);
            // Store contractor data in sessionStorage for the new window to access
            sessionStorage.setItem('contractor_data', JSON.stringify(contractor));
        }

        // Open new window with contractor details
        const newWindow = window.open(
            `/contractor?${params.toString()}`,
            '_blank',
            'width=1200,height=800,scrollbars=yes,resizable=yes'
        );

        if (onContractorSelect) {
            onContractorSelect(contractor);
        }
    };

    const handleEditContractor = (contractor: Contractor) => {
        openContractorInNewWindow(contractor, 'edit');
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
            } catch (error) {
                console.error('❌ Error deleting contractor:', error);
            }
        }
    };

    const cancelDelete = () => {
        setDeleteDialogOpen(false);
        setContractorToDelete(null);
    };

    // Function to refresh contractors list
    const refreshContractorsList = async () => {
        try {
            console.log('Refreshing contractors list from MongoDB...');
            const data = await ContractorService.getAll();
            console.log('Refreshed contractors from MongoDB:', data);
            setContractors(data);
        } catch (error) {
            console.error('❌ Error refreshing contractors from MongoDB:', error);
        }
    };

    const handleAddNewContractor = () => {
        const newContractor: Partial<Contractor> = {
            contractor_id: '',
            company_id: '',
            name: '',
            nameEnglish: '',
            companyType: '',
            city: '',
            address: '',
            email: '',
            phone: '',
            website: '',
            sector: '',
            segment: '',
            classifications: [],
            contacts: [],
            projects: [],
            notes: ''
        };
        openContractorInNewWindow(newContractor as Contractor, 'new');
    };

    const getSafetyStarsColor = (stars: number) => {
        if (stars >= 4) return 'success';
        if (stars >= 3) return 'warning';
        return 'error';
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <Typography>טוען קבלנים...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, direction: 'rtl' }}>
            {/* Header */}
            <Box sx={{ mb: 3, textAlign: 'right' }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                    מאגר קבלנים
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    ניהול וצפייה בכל הקבלנים במערכת
                </Typography>
            </Box>

            {/* Search and Actions */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                    placeholder="חיפוש לפי שם קבלן, עיר או שם איש קשר..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ flexGrow: 1 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                        style: { textAlign: 'right' }
                    }}
                />
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddNewContractor}
                    sx={{ gap: 1 }}
                >
                    הוסף קבלן חדש
                </Button>
            </Box>

            {/* Statistics Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
                <Card sx={{
                    backgroundColor: '#fafafa',
                    border: '1px solid #e0e0e0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    borderRadius: 2
                }}>
                    <CardContent sx={{ textAlign: 'right', padding: '16px' }}>
                        <Typography variant="h6" sx={{ color: '#666', fontWeight: 500, mb: 0.5 }}>
                            {contractors.length}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#999', fontSize: '0.875rem' }}>
                            סך הכל קבלנים
                        </Typography>
                    </CardContent>
                </Card>
                <Card sx={{
                    backgroundColor: '#fafafa',
                    border: '1px solid #e0e0e0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    borderRadius: 2
                }}>
                    <CardContent sx={{ textAlign: 'right', padding: '16px' }}>
                        <Typography variant="h6" sx={{ color: '#666', fontWeight: 500, mb: 0.5 }}>
                            {contractors.filter(c => c.safetyRating && c.safetyRating >= 4).length}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#999', fontSize: '0.875rem' }}>
                            קבלנים עם דירוג גבוה
                        </Typography>
                    </CardContent>
                </Card>
                <Card sx={{
                    backgroundColor: '#fafafa',
                    border: '1px solid #e0e0e0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    borderRadius: 2
                }}>
                    <CardContent sx={{ textAlign: 'right', padding: '16px' }}>
                        <Typography variant="h6" sx={{ color: '#666', fontWeight: 500, mb: 0.5 }}>
                            0
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#999', fontSize: '0.875rem' }}>
                            עם תקן ISO 45001
                        </Typography>
                    </CardContent>
                </Card>
                <Card sx={{
                    backgroundColor: '#fafafa',
                    border: '1px solid #e0e0e0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    borderRadius: 2
                }}>
                    <CardContent sx={{ textAlign: 'right', padding: '16px' }}>
                        <Typography variant="h6" sx={{ color: '#666', fontWeight: 500, mb: 0.5 }}>
                            {contractors.filter(c => c.safetyRating && c.safetyRating < 3).length}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#999', fontSize: '0.875rem' }}>
                            דורש שיפור בטיחות
                        </Typography>
                    </CardContent>
                </Card>
            </Box>

            {/* Contractors Table */}
            <TableContainer component={Paper} sx={{
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                borderRadius: 2,
                backgroundColor: '#fafafa'
            }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableCell sx={{ color: '#666', fontWeight: 500, textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>קבלן</TableCell>
                            <TableCell sx={{ color: '#666', fontWeight: 500, textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>ח״פ</TableCell>
                            <TableCell sx={{ color: '#666', fontWeight: 500, textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>כתובת</TableCell>
                            <TableCell sx={{ color: '#666', fontWeight: 500, textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>סקטור</TableCell>
                            <TableCell sx={{ color: '#666', fontWeight: 500, textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>דירוג בטיחות</TableCell>
                            <TableCell sx={{ color: '#666', fontWeight: 500, textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>פעולות</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredContractors.map((contractor) => (
                            <TableRow key={contractor.contractor_id} hover sx={{
                                '&:hover': { backgroundColor: '#f8f9fa' },
                                borderBottom: '1px solid #f0f0f0'
                            }}>
                                <TableCell sx={{ textAlign: 'right', padding: '16px 8px' }}>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={500} sx={{ color: '#333', mb: 0.5 }}>
                                            {contractor.name}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                            <PhoneIcon sx={{ fontSize: 14, color: '#999' }} />
                                            <Typography
                                                variant="body2"
                                                color="#666"
                                                sx={{
                                                    cursor: 'pointer',
                                                    textDecoration: 'none',
                                                    '&:hover': { color: '#333', textDecoration: 'underline' }
                                                }}
                                                onClick={() => {
                                                    if (contractor.phone) {
                                                        window.open(`callto://${contractor.phone.replace(/\D/g, '')}`, '_blank');
                                                    }
                                                }}
                                            >
                                                {contractor.phone}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <EmailIcon sx={{ fontSize: 14, color: '#999' }} />
                                            <Typography
                                                variant="body2"
                                                color="#666"
                                                sx={{
                                                    cursor: 'pointer',
                                                    textDecoration: 'none',
                                                    '&:hover': { color: '#333', textDecoration: 'underline' }
                                                }}
                                                onClick={() => {
                                                    if (contractor.email) {
                                                        window.open(`mailto:${contractor.email}`, '_blank');
                                                    }
                                                }}
                                            >
                                                {contractor.email}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell sx={{ textAlign: 'right', padding: '16px 8px' }}>
                                    <Box>
                                        <Typography variant="body2" fontWeight={400} sx={{ color: '#666' }}>
                                            {contractor.company_id}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: '#999',
                                                fontSize: '0.7rem',
                                                display: 'block',
                                                mt: 0.5
                                            }}
                                        >
                                            {contractor.contractor_id ? `קבלן ${contractor.contractor_id}` : 'אינו קבלן רשום'}
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell sx={{ textAlign: 'right', padding: '16px 8px' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <LocationIcon sx={{ fontSize: 14, color: '#999' }} />
                                        <Box>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    cursor: 'pointer',
                                                    textDecoration: 'none',
                                                    color: '#666',
                                                    '&:hover': { color: '#333', textDecoration: 'underline' }
                                                }}
                                                onClick={() => {
                                                    if (contractor.address && contractor.city) {
                                                        const address = `${contractor.address}, ${contractor.city}, ישראל`;
                                                        const encodedAddress = encodeURIComponent(address);
                                                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
                                                    }
                                                }}
                                            >
                                                {contractor.address}
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    cursor: 'pointer',
                                                    textDecoration: 'none',
                                                    color: '#999',
                                                    '&:hover': { color: '#666', textDecoration: 'underline' }
                                                }}
                                                onClick={() => {
                                                    if (contractor.city) {
                                                        const encodedCity = encodeURIComponent(`${contractor.city}, ישראל`);
                                                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodedCity}`, '_blank');
                                                    }
                                                }}
                                            >
                                                {contractor.city}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell sx={{ textAlign: 'right', padding: '16px 8px' }}>
                                    <Chip
                                        label={contractor.sector}
                                        size="small"
                                        sx={{
                                            backgroundColor: '#f0f0f0',
                                            color: '#666',
                                            border: '1px solid #e0e0e0',
                                            fontWeight: 400,
                                            fontSize: '0.75rem'
                                        }}
                                    />
                                    <Typography variant="body2" sx={{ color: '#999', mt: 0.5, fontSize: '0.75rem' }}>
                                        {contractor.segment}
                                    </Typography>
                                </TableCell>
                                <TableCell sx={{ textAlign: 'right', padding: '16px 8px' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Chip
                                            label={`${contractor.safetyRating || 0} כוכבים`}
                                            size="small"
                                            sx={{
                                                backgroundColor: contractor.safetyRating && contractor.safetyRating >= 4 ? '#e8f5e8' :
                                                    contractor.safetyRating && contractor.safetyRating >= 3 ? '#fff3cd' : '#ffe6e6',
                                                color: contractor.safetyRating && contractor.safetyRating >= 4 ? '#2e7d32' :
                                                    contractor.safetyRating && contractor.safetyRating >= 3 ? '#856404' : '#d32f2f',
                                                border: '1px solid #e0e0e0',
                                                fontWeight: 400,
                                                fontSize: '0.75rem'
                                            }}
                                        />
                                    </Box>
                                </TableCell>
                                <TableCell sx={{ textAlign: 'right', padding: '16px 8px' }}>
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        <IconButton
                                            size="small"
                                            sx={{
                                                color: '#999',
                                                '&:hover': {
                                                    color: '#666',
                                                    backgroundColor: '#f5f5f5'
                                                },
                                                padding: '4px'
                                            }}
                                            onClick={() => handleEditContractor(contractor)}
                                            title="עריכת פרטים"
                                        >
                                            <EditIcon sx={{ fontSize: 18 }} />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            sx={{
                                                color: '#999',
                                                '&:hover': {
                                                    color: '#d32f2f',
                                                    backgroundColor: '#fff5f5'
                                                },
                                                padding: '4px'
                                            }}
                                            onClick={() => handleDeleteContractor(contractor)}
                                            title="מחיקת קבלן"
                                        >
                                            <DeleteIcon sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={cancelDelete}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ textAlign: 'center', color: 'error.main' }}>
                    אישור מחיקה
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ textAlign: 'center', mb: 2 }}>
                        האם אתה בטוח שברצונך למחוק את הקבלן:
                    </Typography>
                    <Typography variant="h6" sx={{ textAlign: 'center', fontWeight: 600, color: 'primary.main' }}>
                        {contractorToDelete?.name}
                    </Typography>
                    <Typography variant="body2" sx={{ textAlign: 'center', mt: 1, color: 'text.secondary' }}>
                        פעולה זו אינה הפיכה!
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 3 }}>
                    <Button
                        variant="outlined"
                        onClick={cancelDelete}
                        sx={{ minWidth: 100 }}
                    >
                        ביטול
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={confirmDelete}
                        sx={{ minWidth: 100 }}
                    >
                        מחק
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
