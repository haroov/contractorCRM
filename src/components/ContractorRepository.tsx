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
    Button
} from '@mui/material';
import {
    Search as SearchIcon,
    Edit as EditIcon,
    Visibility as ViewIcon,
    Add as AddIcon,
    Business as BusinessIcon,
    LocationOn as LocationIcon,
    Phone as PhoneIcon,
    Email as EmailIcon
} from '@mui/icons-material';
import type { Contractor } from '../types/contractor';
import { contractorsAPI } from '../services/api';

interface ContractorRepositoryProps {
    onContractorSelect?: (contractor: Contractor) => void;
}

export default function ContractorRepository({ onContractorSelect }: ContractorRepositoryProps) {
    const [contractors, setContractors] = useState<Contractor[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // Load contractors from API
    useEffect(() => {
        const loadContractors = async () => {
            try {
                const data = await contractorsAPI.getAll();
                setContractors(data);
            } catch (error) {
                console.error('❌ Error loading contractors:', error);
                // Fallback to sample data if API fails
                const sampleContractors: Contractor[] = [
                    {
                        contractor_id: 'sample-contractor-1',
                        company_id: '123456789',
                        name: 'קבלן בנייה איכותי בע"מ',
                        nameEnglish: 'Quality Construction Contractor Ltd',
                        companyType: 'בע"מ',
                        numberOfEmployees: 150,
                        foundationDate: '2010-01-15',
                        city: 'תל אביב',
                        address: 'רחוב הרצל 123, תל אביב',
                        email: 'info@quality-construction.co.il',
                        phone: '03-1234567',
                        website: 'www.quality-construction.co.il',
                        sector: 'בנייה',
                        segment: 'קבלן ראשי',
                        activityType: 'בנייה והנדסה',
                        description: 'חברת בנייה מובילה המתמחה בבניית מבני מגורים ומסחר',
                        safetyStars: 4,
                        iso45001: true,
                        activities: [
                            { id: '1', activity_type: 'בנייה', classification: 'קבלן ראשי' },
                            { id: '2', activity_type: 'הנדסה', classification: 'תכנון' }
                        ],
                        management_contacts: [
                            {
                                id: '1',
                                fullName: 'דוד כהן',
                                role: 'מנכ"ל',
                                email: 'david@quality-construction.co.il',
                                mobile: '050-1234567',
                                permissions: 'full'
                            }
                        ],
                        projects: [],
                        notes: 'קבלן אמין עם ניסיון רב'
                    },
                    {
                        contractor_id: 'sample-contractor-2',
                        company_id: '987654321',
                        name: 'קבלן חשמל מתקדם בע"מ',
                        nameEnglish: 'Advanced Electrical Contractor Ltd',
                        companyType: 'בע"מ',
                        numberOfEmployees: 75,
                        foundationDate: '2015-03-20',
                        city: 'חיפה',
                        address: 'רחוב אלנבי 456, חיפה',
                        email: 'info@advanced-electrical.co.il',
                        phone: '04-7654321',
                        website: 'www.advanced-electrical.co.il',
                        sector: 'חשמל',
                        segment: 'קבלן משנה',
                        activityType: 'חשמל ואלקטרוניקה',
                        description: 'חברת חשמל מתמחה בהתקנות חשמל מתקדמות',
                        safetyStars: 5,
                        iso45001: true,
                        activities: [
                            { id: '1', activity_type: 'חשמל', classification: 'קבלן משנה' }
                        ],
                        management_contacts: [
                            {
                                id: '1',
                                fullName: 'שרה לוי',
                                role: 'מנהלת פרויקטים',
                                email: 'sarah@advanced-electrical.co.il',
                                mobile: '050-7654321',
                                permissions: 'project_manager'
                            }
                        ],
                        projects: [],
                        notes: 'מומחים בחשמל תעשייתי'
                    },
                    {
                        contractor_id: 'sample-contractor-3',
                        company_id: '555666777',
                        name: 'קבלן אינסטלציה מהיר בע"מ',
                        nameEnglish: 'Quick Plumbing Contractor Ltd',
                        companyType: 'בע"מ',
                        numberOfEmployees: 45,
                        foundationDate: '2018-07-10',
                        city: 'ירושלים',
                        address: 'רחוב יפו 789, ירושלים',
                        email: 'info@quick-plumbing.co.il',
                        phone: '02-9876543',
                        website: 'www.quick-plumbing.co.il',
                        sector: 'אינסטלציה',
                        segment: 'קבלן משנה',
                        activityType: 'אינסטלציה ומים',
                        description: 'חברת אינסטלציה המתמחה בעבודות מים וביוב',
                        safetyStars: 3,
                        iso45001: false,
                        activities: [
                            { id: '1', activity_type: 'אינסטלציה', classification: 'קבלן משנה' }
                        ],
                        management_contacts: [
                            {
                                id: '1',
                                fullName: 'משה גולדברג',
                                role: 'מנהל טכני',
                                email: 'moshe@quick-plumbing.co.il',
                                mobile: '050-9876543',
                                permissions: 'technical'
                            }
                        ],
                        projects: [],
                        notes: 'מהירים ואמינים בעבודות אינסטלציה'
                    }
                ];

                setContractors(sampleContractors);
            }
            setLoading(false);
        };

        loadContractors();
    }, []);

    const filteredContractors = contractors.filter(contractor =>
        contractor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contractor.company_id.includes(searchTerm) ||
        contractor.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contractor.sector.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openContractorInNewWindow = (contractor: Contractor, mode: 'view' | 'edit' | 'new') => {
        // Create URL parameters for the contractor data
        const params = new URLSearchParams();
        params.set('mode', mode);

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

    const handleViewContractor = (contractor: Contractor) => {
        openContractorInNewWindow(contractor, 'view');
    };

    const handleEditContractor = (contractor: Contractor) => {
        openContractorInNewWindow(contractor, 'edit');
    };

    const handleAddNewContractor = () => {
        const newContractor: Contractor = {
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
            activityType: '',
            description: '',
            activities: [],
            management_contacts: [],
            projects: [],
            notes: ''
        };
        openContractorInNewWindow(newContractor, 'new');
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
            <Box sx={{ mb: 3 }}>
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
                    placeholder="חיפוש לפי שם, ח״פ, עיר או סקטור..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ flexGrow: 1 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                />
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddNewContractor}
                >
                    הוסף קבלן חדש
                </Button>
            </Box>

            {/* Statistics Cards */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" color="primary">
                            {contractors.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            סך הכל קבלנים
                        </Typography>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <Typography variant="h6" color="success.main">
                            {contractors.filter(c => c.safetyStars && c.safetyStars >= 4).length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            קבלנים עם דירוג גבוה
                        </Typography>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <Typography variant="h6" color="info.main">
                            {contractors.filter(c => c.iso45001).length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            עם תקן ISO 45001
                        </Typography>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent>
                        <Typography variant="h6" color="warning.main">
                            {contractors.filter(c => c.safetyStars && c.safetyStars < 3).length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            דורש שיפור בטיחות
                        </Typography>
                    </CardContent>
                </Card>
            </Box>

            {/* Contractors Table */}
            <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: 'primary.main' }}>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>קבלן</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>ח״פ</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>כתובת</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>סקטור</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>דירוג בטיחות</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 600 }}>פעולות</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredContractors.map((contractor) => (
                            <TableRow key={contractor.contractor_id} hover>
                                <TableCell>
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight={600}>
                                            {contractor.name}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                            <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            <Typography variant="body2" color="text.secondary">
                                                {contractor.phone}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            <Typography variant="body2" color="text.secondary">
                                                {contractor.email}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontWeight={500}>
                                        {contractor.company_id}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <LocationIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                        <Box>
                                            <Typography variant="body2">
                                                {contractor.address}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {contractor.city}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={contractor.sector}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                    />
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                        {contractor.segment}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Chip
                                            label={`${contractor.safetyStars} כוכבים`}
                                            size="small"
                                            color={getSafetyStarsColor(contractor.safetyStars || 0) as any}
                                        />
                                        {contractor.iso45001 && (
                                            <Chip
                                                label="ISO 45001"
                                                size="small"
                                                color="success"
                                                variant="outlined"
                                            />
                                        )}
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={() => handleViewContractor(contractor)}
                                            title="צפייה בפרטים"
                                        >
                                            <ViewIcon />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            color="secondary"
                                            onClick={() => handleEditContractor(contractor)}
                                            title="עריכת פרטים"
                                        >
                                            <EditIcon />
                                        </IconButton>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
