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
import { ContractorService } from '../services/contractorService';
import ContractorTabs from './ContractorTabs';
import SkeletonLoader from './SkeletonLoader';

export default function ContractorDetailsPage() {
    const [searchParams] = useSearchParams();
    const [contractor, setContractor] = useState<Contractor | null>(null);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<'view' | 'edit' | 'new'>('view');
    const [isContactUser, setIsContactUser] = useState(false);
    const [contactUserPermissions, setContactUserPermissions] = useState<'contact_manager' | 'contact_user' | null>(null);

    useEffect(() => {
        const loadContractorData = () => {
            const urlMode = searchParams.get('mode') as 'view' | 'edit' | 'new';
            const contractorId = searchParams.get('contractor_id');
            const isContactUserParam = searchParams.get('contact_user') === 'true';
            
            // Check if this is a contact user session
            setIsContactUser(isContactUserParam);
            
            // Check contact user permissions from session
            if (isContactUserParam) {
                // In a real app, you'd check the session here
                // For now, we'll assume contact_manager for demo
                setContactUserPermissions('contact_manager');
            }

            setMode(urlMode || 'view');

            if (urlMode === 'new') {
                // Create new contractor
                console.log('🔍 Creating new contractor');
                const newContractor: Contractor = {
                    contractor_id: '',
                    company_id: '',
                    name: '',
                    nameEnglish: '',
                    companyType: 'בע"מ',
                    numberOfEmployees: 0,
                    foundationDate: '',
                    city: '',
                    address: '',
                    email: '',
                    phone: '',
                    website: '',
                    sector: '',
                    segment: '',
                    activityType: '',
                    description: '',
                    classifications: [],
                    contacts: [],
                    projectIds: [],
                    projects: [],
                    notes: '',
                    safetyRating: 0,
                    iso45001: false,
                    isActive: true,
                    status: null,
                    violator: null,
                    restrictions: null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as Contractor;
                console.log('✅ New contractor created:', newContractor);
                setContractor(newContractor);
                setLoading(false);
            } else if (contractorId && contractorId !== 'new') {
                // Load existing contractor from server
                const loadContractorFromServer = async () => {
                    try {
                        console.log('🔍 Loading contractor from server:', contractorId);
                        console.log('🔍 Is contact user:', isContactUser);
                        
                        // Use different API endpoint for contact users
                        const contractorData = isContactUser 
                            ? await ContractorService.getByIdForContactUser(contractorId)
                            : await ContractorService.getById(contractorId);
                            
                        if (contractorData) {
                            console.log('✅ Contractor loaded from server:', contractorData);
                            setContractor(contractorData);
                            // Also store in sessionStorage for consistency
                            sessionStorage.setItem('contractor_data', JSON.stringify(contractorData));
                        } else {
                            console.error('❌ Contractor not found on server');
                            // Fallback to sessionStorage if server fails
                            const storedData = sessionStorage.getItem('contractor_data');
                            if (storedData) {
                                try {
                                    const contractorData = JSON.parse(storedData);
                                    console.log('✅ Using contractor from sessionStorage:', contractorData);
                                    setContractor(contractorData);
                                } catch (error) {
                                    console.error('Error parsing contractor data:', error);
                                }
                            }
                        }
                    } catch (error) {
                        console.error('❌ Error loading contractor from server:', error);
                        // Fallback to sessionStorage if server fails
                        const storedData = sessionStorage.getItem('contractor_data');
                        if (storedData) {
                            try {
                                const contractorData = JSON.parse(storedData);
                                console.log('✅ Using contractor from sessionStorage (fallback):', contractorData);
                                setContractor(contractorData);
                            } catch (error) {
                                console.error('Error parsing contractor data:', error);
                            }
                        }
                    } finally {
                        setLoading(false);
                    }
                };

                loadContractorFromServer();
            } else {
                setLoading(false);
            }
        };

        loadContractorData();
    }, [searchParams]);

    const handleSave = async () => {
        // This function is now handled by ContractorTabs
        console.log('Save function called from ContractorDetailsPage - delegating to ContractorTabs');
    };

    const handleClose = () => {
        window.close();
    };

    const handleBack = () => {
        window.history.back();
    };

    if (loading) {
        return <SkeletonLoader />;
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
                            onSave={handleSave}
                            onClose={handleClose}
                            isContactUser={isContactUser}
                            contactUserPermissions={contactUserPermissions}
                        />
                    )}
                </Paper>
            </Box>
        </Box>
    );
}
