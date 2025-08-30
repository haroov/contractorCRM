import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Button,
    IconButton,
    AppBar,
    Toolbar
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import type { Contractor } from '../types/contractor';
import ContractorTabs from './ContractorTabs';

export default function ContractorDetailsPage() {
    const [searchParams] = useSearchParams();
    const [contractor, setContractor] = useState<Contractor | null>(null);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<'view' | 'edit' | 'new'>('view');

    useEffect(() => {
        const loadContractorData = () => {
            const urlMode = searchParams.get('mode') as 'view' | 'edit' | 'new';
            const contractorId = searchParams.get('contractor_id');

            setMode(urlMode || 'view');

            if (urlMode === 'new') {
                // Create new contractor
                const newContractor: Contractor = {
                    contractor_id: '',
                    company_id: '',
                    companyname: '',
                    nameEnglish: '',
                    companyType: '',
                    foundationDate: Date,
                    city: '',
                    address: '',
                    email: '',
                    phone: '',
                    website: '',
                    activities: [],
                    contacts: [],
                    projects: [],
                    notes: ''
                };
                setContractor(newContractor);
            } else if (contractorId && contractorId !== 'new') {
                // Load existing contractor from sessionStorage
                const storedData = sessionStorage.getItem('contractor_data');
                if (storedData) {
                    try {
                        const contractorData = JSON.parse(storedData);
                        setContractor(contractorData);
                    } catch (error) {
                        console.error('Error parsing contractor data:', error);
                    }
                }
            }

            setLoading(false);
        };

        loadContractorData();
    }, [searchParams]);

    const handleSave = () => {
        // TODO: Implement save functionality
        console.log('Saving contractor:', contractor);
        // Close window after save
        window.close();
    };

    const handleClose = () => {
        window.close();
    };

    const handleBack = () => {
        window.history.back();
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Typography>טוען פרטי קבלן...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <AppBar position="static" sx={{ direction: 'rtl' }}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={handleBack}
                        sx={{ mr: 2 }}
                    >
                        <ArrowBackIcon />
                    </IconButton>

                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        {mode === 'new' ? 'קבלן חדש' : contractor?.name || 'פרטי קבלן'}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {mode === 'edit' && (
                            <Button
                                variant="contained"
                                startIcon={<SaveIcon />}
                                onClick={handleSave}
                                color="success"
                            >
                                שמור
                            </Button>
                        )}
                        <IconButton
                            color="inherit"
                            onClick={handleClose}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Content */}
            <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
                <Paper sx={{ height: '100%', direction: 'rtl' }}>
                    {contractor && (
                        <ContractorTabs
                            contractor={contractor}
                            setContractor={setContractor}
                            mode={mode}
                        />
                    )}
                </Paper>
            </Box>
        </Box>
    );
}
