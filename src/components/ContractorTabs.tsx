import { useState, useEffect } from "react";
import ProjectsList from './ProjectsList';
import { projectsAPI } from '../services/api';
import type { ProjectDocument } from '../types/database';
import type { Contractor, Activity, ManagementContact } from '../types/contractor';
import {
    Box,
    Tabs,
    Tab,
    Card,
    CardContent,
    CardHeader,
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Checkbox,
    FormControlLabel,
    Typography,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Alert,
    Autocomplete,
    Grid,
    Snackbar
} from "@mui/material";
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Save as SaveIcon,
    Refresh as RefreshIcon,
    Add as NewIcon,
    Close as CloseIcon
} from "@mui/icons-material";


// Types
type Project = ProjectDocument;

type Errors = {
    name?: string;
    nameEnglish?: string;
    company_id?: string;
    companyType?: string;
    numberOfEmployees?: string;
    foundationDate?: string;
    city?: string;
    address?: string;
    email?: string;
    phone?: string;
    website?: string;
    sector?: string;
    segment?: string;
    activityType?: string;
    description?: string;
    safetyStars?: string;
    notes?: string;
};

interface ContractorTabsProps {
    contractor?: Contractor;
    onSave?: (contractor: Contractor) => void;
    onClose?: () => void;
}

export default function ContractorTabs({ contractor: initialContractor, onSave, onClose }: ContractorTabsProps) {
    const [contractor, setContractor] = useState<Contractor>(initialContractor || {
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
        safetyStars: 0,
        iso45001: false,
        activities: [],
        management_contacts: [],
        projects: [],
        notes: ''
    });

    const [errors, setErrors] = useState<Errors>({});
    const [activeTab, setActiveTab] = useState(0);
    const [editingProject, setEditingProject] = useState<ProjectDocument | null>(null);
    const [editingProjectIndex, setEditingProjectIndex] = useState<number | null>(null);
    const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });

    // Load projects when contractor changes
    useEffect(() => {
        if (contractor.contractor_id) {
            loadProjects();
        }
    }, [contractor.contractor_id]);

    // Load sample data for testing
    useEffect(() => {
        if (!initialContractor) {
            // Load sample data for testing
            const sampleContractor: Contractor = {
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
            };
            setContractor(sampleContractor);
        }
    }, [initialContractor]);

    const loadProjects = async () => {
        try {
            const projects = await projectsAPI.getByContractor(contractor.contractor_id);
            setContractor(prev => ({ ...prev, projects }));
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    };

    const saveProject = async (project: ProjectDocument) => {
        try {
            const savedProject = await projectsAPI.create(project);
            setContractor(prev => ({
                ...prev,
                projects: [...prev.projects, savedProject]
            }));
            return savedProject;
        } catch (error) {
            console.error('Error saving project:', error);
            throw error;
        }
    };

    const updateProject = async (project: ProjectDocument) => {
        try {
            const updatedProject = await projectsAPI.update(project._id!, project);
            setContractor(prev => ({
                ...prev,
                projects: prev.projects.map(p => p._id === project._id ? updatedProject : p)
            }));
            return updatedProject;
        } catch (error) {
            console.error('Error updating project:', error);
            throw error;
        }
    };

    const deleteProject = async (projectId: string) => {
        try {
            await projectsAPI.delete(projectId);
            setContractor(prev => ({
                ...prev,
                projects: prev.projects.filter(p => p._id !== projectId)
            }));
        } catch (error) {
            console.error('Error deleting project:', error);
            throw error;
        }
    };

    const handleChange = (field: keyof Contractor, value: any) => {
        setContractor(prev => ({ ...prev, [field]: value }));

        // Clear error when user starts typing
        if (errors[field as keyof Errors]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }

        // Validate company name for inappropriate words
        if (field === 'name' && value && containsInappropriateWords(value)) {
            setErrors(prev => ({ ...prev, name: "שם החברה מכיל מילים לא הולמות" }));
        }
    };

    const handleEnglishNameChange = (value: string) => {
        handleChange('nameEnglish', value);

        if (errors.nameEnglish) {
            setErrors(prev => ({ ...prev, nameEnglish: undefined }));
        }
    };

    const handleEnglishNameBlur = () => {
        if (contractor.nameEnglish && !validateEnglishName(contractor.nameEnglish)) {
            setErrors(prev => ({ ...prev, nameEnglish: containsInappropriateWords(contractor.nameEnglish) ? "השם מכיל מילים לא הולמות" : "שם לא תקני" }));
        }
    };

    const handleFoundationDateChange = (value: string) => {
        setContractor(prev => ({ ...prev, foundationDate: value }));

        if (errors.foundationDate) {
            setErrors(prev => ({ ...prev, foundationDate: undefined }));
        }
    };

    const handleFoundationDateBlur = () => {
        if (contractor.foundationDate && !validateFoundationDate(contractor.foundationDate)) {
            setErrors(prev => ({ ...prev, foundationDate: "תאריך לא תקין. אנא הכנס תאריך בין 1/1/1990 להיום." }));
        }
    };

    const handleAddProject = () => {
        const newProject: ProjectDocument = {
            contractorId: contractor.contractor_id,
            startDate: '',
            projectName: '',
            description: '',
            value: 0,
            isClosed: false,
            status: 'future',
            createdAt: new Date(),
            updatedAt: new Date()
        };
        setEditingProject(newProject);
        setEditingProjectIndex(null);
        setIsProjectDialogOpen(true);
    };

    const handleEditProject = (project: ProjectDocument, index: number) => {
        setEditingProject({ ...project });
        setEditingProjectIndex(index);
        setIsProjectDialogOpen(true);
    };

    const handleDeleteProject = async (projectId: string) => {
        if (window.confirm('האם אתה בטוח שברצונך למחוק פרויקט זה?')) {
            try {
                await deleteProject(projectId);
                setSnackbar({ open: true, message: 'פרויקט נמחק בהצלחה', severity: 'success' });
            } catch (error) {
                setSnackbar({ open: true, message: 'שגיאה במחיקת הפרויקט', severity: 'error' });
            }
        }
    };

    const handleSaveProject = async () => {
        if (!editingProject) return;

        try {
            if (editingProjectIndex !== null) {
                // Update existing project
                await updateProject(editingProject);
                setSnackbar({ open: true, message: 'פרויקט עודכן בהצלחה', severity: 'success' });
            } else {
                // Create new project
                await saveProject(editingProject);
                setSnackbar({ open: true, message: 'פרויקט נוסף בהצלחה', severity: 'success' });
            }
            setIsProjectDialogOpen(false);
            setEditingProject(null);
            setEditingProjectIndex(null);
        } catch (error) {
            setSnackbar({ open: true, message: 'שגיאה בשמירת הפרויקט', severity: 'error' });
        }
    };

    const handleCancelProject = () => {
        setIsProjectDialogOpen(false);
        setEditingProject(null);
        setEditingProjectIndex(null);
    };

    const handleSave = () => {
        const newErrors: Errors = {};

        // Validate required fields
        if (!contractor.name.trim()) {
            newErrors.name = "שם הקבלן הוא שדה חובה";
        } else if (containsInappropriateWords(contractor.name)) {
            newErrors.name = "שם החברה מכיל מילים לא הולמות";
        }

        if (!contractor.company_id.trim()) {
            newErrors.company_id = "מספר חברה הוא שדה חובה";
        }

        if (!contractor.city.trim()) {
            newErrors.city = "עיר היא שדה חובה";
        }

        if (!contractor.email.trim()) {
            newErrors.email = "אימייל הוא שדה חובה";
        } else if (!validateEmail(contractor.email)) {
            newErrors.email = "אימייל לא תקין";
        }

        if (!contractor.phone.trim()) {
            newErrors.phone = "טלפון הוא שדה חובה";
        }

        // Validate English name
        if (contractor.nameEnglish && !validateEnglishName(contractor.nameEnglish)) {
            newErrors.nameEnglish = containsInappropriateWords(contractor.nameEnglish) ? "השם מכיל מילים לא הולמות" : "שם לא תקני";
        }

        // Validate foundation date
        if (contractor.foundationDate && !validateFoundationDate(contractor.foundationDate)) {
            newErrors.foundationDate = "תאריך לא תקין. אנא הכנס תאריך בין 1/1/1990 להיום.";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        if (onSave) {
            onSave(contractor);
        }
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    // Validation functions
    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validateEnglishName = (name: string): boolean => {
        return /^[a-zA-Z\s\-'&.()]+$/.test(name);
    };

    const validateFoundationDate = (date: string): boolean => {
        const inputDate = new Date(date);
        const minDate = new Date('1990-01-01');
        const maxDate = new Date();
        return inputDate >= minDate && inputDate <= maxDate;
    };

    const containsInappropriateWords = (text: string): boolean => {
        const inappropriateWords = [
            'bad', 'inappropriate', 'offensive', 'shit', 'fuck', 'bitch', 'ass', 'dick', 'pussy',
            'שרמוטה', 'זונה', 'כלב', 'בן זונה', 'בת זונה', 'מזדיין', 'זין', 'כוס', 'תחת'
        ];
        return inappropriateWords.some(word => text.toLowerCase().includes(word.toLowerCase()));
    };

    const validateCity = (city: string): boolean => {
        return city.length >= 2 && /^[\u0590-\u05FF\s]+$/.test(city);
    };

    const handleCompanyIdBlur = async () => {
        if (contractor.company_id && !validateCompanyId(contractor.company_id)) {
            setErrors(prev => ({ ...prev, company_id: "מספר חברה לא תקין." }));
            return;
        }

        if (contractor.company_id) {
            try {
                setSnackbar({ open: true, message: 'טוען נתונים...', severity: 'success' });

                // Fetch from Companies Registry
                const companiesResponse = await fetch(`https://data.gov.il/api/3/action/datastore_search?resource_id=f004176c-b85f-4542-8901-7b3176f9a054&q=${contractor.company_id}`);
                const companiesData = await companiesResponse.json();

                // Fetch from Contractors Registry
                const contractorsResponse = await fetch(`https://data.gov.il/api/3/action/datastore_search?resource_id=4eb61bd6-18cf-4e7c-9f9c-e166dfa0a2d8&q=${contractor.company_id}`);
                const contractorsData = await contractorsResponse.json();

                if (companiesData.success && companiesData.result.records.length > 0) {
                    const companyData = companiesData.result.records[0];
                    console.log('Company data from API:', companyData);
                    const newCompanyType = getCompanyTypeByCompanyId(contractor.company_id);

                    setContractor(prev => ({
                        ...prev,
                        name: companyData['שם חברה'] || prev.name,
                        nameEnglish: companyData['שם באנגלית'] || prev.nameEnglish,
                        city: companyData['שם עיר'] || prev.city,
                        address: `${companyData['שם רחוב'] || ''} ${companyData['מספר בית'] || ''}`.trim() || prev.address,
                        phone: formatPhoneNumber(companyData['מספר טלפון'] || prev.phone),
                        email: companyData['אימייל'] || prev.email,
                        website: companyData['אתר אינטרנט'] || generateWebsiteFromEmail(companyData['אימייל']) || prev.website,
                        companyType: newCompanyType || prev.companyType,
                        foundationDate: companyData['תאריך התאגדות'] ? convertHebrewDate(companyData['תאריך התאגדות']) : prev.foundationDate
                    }));

                    setSnackbar({ open: true, message: 'פרטי החברה נטענו בהצלחה', severity: 'success' });
                }

                if (contractorsData.success && contractorsData.result.records.length > 0) {
                    const contractorData = contractorsData.result.records[0];
                    console.log('Contractor data from API:', contractorData);

                    // Create activities array from contractor data
                    const activities: Activity[] = [];

                    // Add main contractor activity
                    if (contractorData['SIVUG'] || contractorData['TEUR_ANAF']) {
                        activities.push({
                            id: '1',
                            activity_type: contractorData['TEUR_ANAF'] || '',
                            classification: contractorData['SIVUG'] || '',
                            sector: contractorData['TEUR_ANAF'] || '',
                            field: contractorData['KVUTZA'] || '',
                            contractor_license: contractorData['MISPAR_KABLAN'] || '',
                            license_number: contractorData['MISPAR_KABLAN'] || '',
                            license_expiry: contractorData['TARICH_SUG'] ? new Date(contractorData['TARICH_SUG']).toISOString().split('T')[0] : '',
                            insurance_company: '',
                            insurance_policy: '',
                            insurance_expiry: ''
                        });
                    }

                    setContractor(prev => ({
                        ...prev,
                        contractor_id: contractorData['MISPAR_KABLAN'] || prev.contractor_id,
                        sector: contractorData['TEUR_ANAF'] || prev.sector,
                        activityType: contractorData['KVUTZA'] || prev.activityType,
                        email: contractorData['EMAIL'] || prev.email, // Add email from contractors registry
                        website: prev.website || generateWebsiteFromEmail(contractorData['EMAIL'] || ''), // Generate website from email if empty
                        activities: activities
                    }));

                    setSnackbar({ open: true, message: 'פרטי הקבלן נטענו בהצלחה', severity: 'success' });
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                setSnackbar({ open: true, message: 'שגיאה בטעינת הנתונים', severity: 'error' });
            }
        }
    };

    const validateCompanyId = (companyId: string): boolean => {
        // Basic regex for a 9-digit number
        const companyIdRegex = /^\d{9}$/;
        return companyIdRegex.test(companyId);
    };

    const getCompanyTypeByCompanyId = (companyId: string): string => {
        if (companyId.startsWith('50')) return 'חברה ממשלתית';
        if (companyId.startsWith('51')) return 'חברה פרטית';
        if (companyId.startsWith('52')) return 'חברה ציבורית';
        if (companyId.startsWith('53')) return 'חברה זרה';
        if (companyId.startsWith('54')) return 'אגודה שיתופית';
        if (companyId.startsWith('55')) return 'עמותה';
        if (companyId.startsWith('6')) return 'עוסק מורשה';
        if (companyId.startsWith('7')) return 'עוסק פטור';
        if (companyId.startsWith('8')) return 'שותפות';
        return 'בע"מ';
    };

    const formatPhoneNumber = (phone: string): string => {
        if (!phone) return phone;
        // Remove all non-digits
        const digits = phone.replace(/\D/g, '');
        // Add leading 0 if missing
        const withLeadingZero = digits.startsWith('0') ? digits : `0${digits}`;

        // Israeli phone number formatting
        if (withLeadingZero.length === 10) {
            // Mobile: 050-1234567, 052-1234567, etc.
            return `${withLeadingZero.slice(0, 3)}-${withLeadingZero.slice(3)}`;
        }
        if (withLeadingZero.length === 9) {
            // Landline: 02-1234567, 03-1234567, etc.
            return `${withLeadingZero.slice(0, 2)}-${withLeadingZero.slice(2)}`;
        }
        if (withLeadingZero.length === 8) {
            // Landline without leading 0: 2-1234567, 3-1234567, etc.
            return `0${withLeadingZero.slice(0, 1)}-${withLeadingZero.slice(1)}`;
        }
        return withLeadingZero;
    };

    const generateWebsiteFromEmail = (email: string): string => {
        if (!email) return '';
        const domain = email.split('@')[1];
        if (!domain) return '';

        const freeEmailProviders = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'walla.co.il', 'nana10.co.il'];
        if (freeEmailProviders.includes(domain.toLowerCase())) {
            return '';
        }

        return `www.${domain}`;
    };

    const convertHebrewDate = (hebrewDate: string): string => {
        if (!hebrewDate) return '';

        // Convert Hebrew date format "dd/mm/yyyy" to ISO format "yyyy-mm-dd"
        const parts = hebrewDate.split('/');
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            return `${year}-${month}-${day}`;
        }

        return hebrewDate;
    };

    const refreshContractorActivities = async () => {
        if (!contractor.company_id) {
            setSnackbar({ open: true, message: 'נא להזין מספר חברה תחילה', severity: 'error' });
            return;
        }

        try {
            setSnackbar({ open: true, message: 'מרענן נתונים מפנקס הקבלנים...', severity: 'success' });

            const contractorsResponse = await fetch(`https://data.gov.il/api/3/action/datastore_search?resource_id=4eb61bd6-18cf-4e7c-9f9c-e166dfa0a2d8&q=${contractor.company_id}`);
            const contractorsData = await contractorsResponse.json();

            if (contractorsData.success && contractorsData.result.records.length > 0) {
                const contractorData = contractorsData.result.records[0];

                // Create activities array from contractor data
                const activities: Activity[] = [];

                // Add main contractor activity
                if (contractorData['SIVUG'] || contractorData['TEUR_ANAF']) {
                    activities.push({
                        id: '1',
                        activity_type: contractorData['TEUR_ANAF'] || '',
                        classification: contractorData['SIVUG'] || '',
                        sector: contractorData['TEUR_ANAF'] || '',
                        field: contractorData['KVUTZA'] || '',
                        contractor_license: contractorData['MISPAR_KABLAN'] || '',
                        license_number: contractorData['MISPAR_KABLAN'] || '',
                        license_expiry: contractorData['TARICH_SUG'] ? new Date(contractorData['TARICH_SUG']).toISOString().split('T')[0] : '',
                        insurance_company: '',
                        insurance_policy: '',
                        insurance_expiry: ''
                    });
                }

                setContractor(prev => ({
                    ...prev,
                    contractor_id: contractorData['MISPAR_KABLAN'] || prev.contractor_id,
                    sector: contractorData['TEUR_ANAF'] || prev.sector,
                    activityType: contractorData['KVUTZA'] || prev.activityType,
                    email: contractorData['EMAIL'] || prev.email, // Add email from contractors registry
                    website: prev.website || generateWebsiteFromEmail(contractorData['EMAIL'] || ''), // Generate website from email if empty
                    activities: activities
                }));

                setSnackbar({ open: true, message: 'הנתונים רועננו בהצלחה', severity: 'success' });
            } else {
                setSnackbar({ open: true, message: 'לא נמצאו נתונים בפנקס הקבלנים', severity: 'error' });
            }
        } catch (error) {
            console.error('Error refreshing contractor data:', error);
            setSnackbar({ open: true, message: 'שגיאה ברענון הנתונים', severity: 'error' });
        }
    };

    return (
        <Box sx={{ width: '100%', typography: 'body1' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={handleTabChange} aria-label="contractor tabs">
                    <Tab label="פרטי חברה" />
                    <Tab label="סגמנטים" />
                    <Tab label="אנשי קשר" />
                    <Tab label="פרויקטים" />
                    <Tab label="הערות" />
                </Tabs>
            </Box>

            {/* Company Details Tab */}
            {activeTab === 0 && (
                <Box sx={{ p: 3 }}>
                    {/* Company General Details Section */}
                    <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>פרטי חברה כללים</Typography>
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="מספר חברה (ח״פ) *"
                                value={contractor.company_id}
                                onChange={(e) => handleChange('company_id', e.target.value)}
                                onBlur={handleCompanyIdBlur}
                                error={!!errors.company_id}
                                helperText={errors.company_id}
                                required
                                InputLabelProps={{
                                    sx: { backgroundColor: 'white', paddingRight: '4px' }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="מספר קבלן"
                                value={contractor.contractor_id || ''}
                                onChange={(e) => handleChange('contractor_id', e.target.value)}
                                error={!!errors.contractor_id}
                                helperText={errors.contractor_id}
                                InputLabelProps={{
                                    sx: { backgroundColor: 'white', paddingRight: '4px' }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="שם החברה *"
                                value={contractor.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                error={!!errors.name}
                                helperText={errors.name}
                                required
                                InputLabelProps={{
                                    shrink: true,
                                    sx: { backgroundColor: 'white', paddingRight: '4px' }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="שם באנגלית"
                                value={contractor.nameEnglish}
                                onChange={(e) => handleEnglishNameChange(e.target.value)}
                                onBlur={handleEnglishNameBlur}
                                error={!!errors.nameEnglish}
                                helperText={errors.nameEnglish}
                                InputLabelProps={{
                                    sx: { backgroundColor: 'white', paddingRight: '4px' }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel sx={{ backgroundColor: 'white', paddingRight: '4px' }}>סוג חברה</InputLabel>
                                <Select
                                    value={contractor.companyType}
                                    onChange={(e) => handleChange('companyType', e.target.value)}
                                    error={!!errors.companyType}
                                >
                                    <MenuItem value="חברה פרטית">חברה פרטית</MenuItem>
                                    <MenuItem value="חברה ציבורית">חברה ציבורית</MenuItem>
                                    <MenuItem value="חברה ממשלתית">חברה ממשלתית</MenuItem>
                                    <MenuItem value="חברה זרה">חברה זרה</MenuItem>
                                    <MenuItem value="אגודה שיתופית">אגודה שיתופית</MenuItem>
                                    <MenuItem value="עמותה">עמותה</MenuItem>
                                    <MenuItem value="עוסק מורשה">עוסק מורשה</MenuItem>
                                    <MenuItem value="עוסק פטור">עוסק פטור</MenuItem>
                                    <MenuItem value="שותפות">שותפות</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="מספר עובדים"
                                type="number"
                                value={contractor.numberOfEmployees}
                                onChange={(e) => handleChange('numberOfEmployees', parseInt(e.target.value) || 0)}
                                error={!!errors.numberOfEmployees}
                                helperText={errors.numberOfEmployees}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="תאריך הקמה"
                                type="date"
                                value={contractor.foundationDate}
                                onChange={(e) => handleFoundationDateChange(e.target.value)}
                                onBlur={handleFoundationDateBlur}
                                error={!!errors.foundationDate}
                                helperText={errors.foundationDate}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>

                    {/* Contact Information Section */}
                    <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>פרטי קשר</Typography>
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="עיר *"
                                value={contractor.city}
                                onChange={(e) => handleChange('city', e.target.value)}
                                error={!!errors.city}
                                helperText={errors.city}
                                required
                                InputLabelProps={{
                                    sx: { backgroundColor: 'white', paddingRight: '4px' }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="כתובת"
                                value={contractor.address}
                                onChange={(e) => handleChange('address', e.target.value)}
                                error={!!errors.address}
                                helperText={errors.address}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="אימייל *"
                                type="email"
                                value={contractor.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                error={!!errors.email}
                                helperText={errors.email}
                                required
                                InputLabelProps={{
                                    sx: { backgroundColor: 'white', paddingRight: '4px' }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="טלפון *"
                                value={contractor.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                error={!!errors.phone}
                                helperText={errors.phone}
                                required
                                InputLabelProps={{
                                    sx: { backgroundColor: 'white', paddingRight: '4px' }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="אתר אינטרנט"
                                value={contractor.website}
                                onChange={(e) => handleChange('website', e.target.value)}
                                error={!!errors.website}
                                helperText={errors.website}
                            />
                        </Grid>
                    </Grid>
                </Box>
            )}

            {/* Segments Tab */}
            {activeTab === 1 && (
                <Box sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>סגמנטים ופעילויות</Typography>

                    {/* Safety Section */}
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>בטיחות ואיכות</Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="דירוג בטיחות (1-5)"
                                    type="number"
                                    inputProps={{ min: 1, max: 5 }}
                                    value={contractor.safetyStars}
                                    onChange={(e) => handleChange('safetyStars', parseInt(e.target.value) || 0)}
                                    error={!!errors.safetyStars}
                                    helperText={errors.safetyStars}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={contractor.iso45001}
                                            onChange={(e) => handleChange('iso45001', e.target.checked)}
                                        />
                                    }
                                    label="תקן ISO 45001"
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Activities Section */}
                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ color: 'primary.main' }}>פעילויות מפנקס הקבלנים</Typography>
                            <Button
                                variant="contained"
                                startIcon={<RefreshIcon />}
                                onClick={refreshContractorActivities}
                            >
                                רענן נתונים
                            </Button>
                        </Box>

                        {contractor.activities.length === 0 ? (
                            <Card sx={{ mb: 2 }}>
                                <CardContent>
                                    <Typography variant="body1" color="text.secondary" align="center">
                                        אין פעילויות זמינות. לחץ על "רענן נתונים" כדי לטעון את הנתונים מפנקס הקבלנים.
                                    </Typography>
                                </CardContent>
                            </Card>
                        ) : (
                            contractor.activities.map((activity, index) => (
                                <Card key={activity.id} sx={{ mb: 2 }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>פעילות {index + 1}</Typography>

                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    label="סיווג"
                                                    value={activity.classification || ''}
                                                    InputProps={{ readOnly: true }}
                                                    variant="outlined"
                                                />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    label="סקטור"
                                                    value={activity.sector || ''}
                                                    InputProps={{ readOnly: true }}
                                                    variant="outlined"
                                                />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    label="תחום"
                                                    value={activity.field || ''}
                                                    InputProps={{ readOnly: true }}
                                                    variant="outlined"
                                                />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    label="מספר רישיון קבלן"
                                                    value={activity.contractor_license || ''}
                                                    InputProps={{ readOnly: true }}
                                                    variant="outlined"
                                                />
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <TextField
                                                    fullWidth
                                                    label="תוקף רישיון"
                                                    value={activity.license_expiry || ''}
                                                    InputProps={{ readOnly: true }}
                                                    variant="outlined"
                                                />
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </Box>
                </Box>
            )}

            {/* Management Contacts Tab */}
            {activeTab === 2 && (
                <Box sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">אנשי קשר ניהוליים</Typography>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => {
                                const newContact: ManagementContact = {
                                    id: Date.now().toString(),
                                    fullName: '',
                                    role: '',
                                    email: '',
                                    mobile: '',
                                    permissions: 'full'
                                };
                                setContractor(prev => ({
                                    ...prev,
                                    management_contacts: [...prev.management_contacts, newContact]
                                }));
                            }}
                        >
                            הוסף איש קשר
                        </Button>
                    </Box>

                    {contractor.management_contacts.map((contact, index) => (
                        <Card key={contact.id} sx={{ mb: 2 }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Typography variant="h6">איש קשר {index + 1}</Typography>
                                    <IconButton
                                        onClick={() => {
                                            setContractor(prev => ({
                                                ...prev,
                                                management_contacts: prev.management_contacts.filter((_, i) => i !== index)
                                            }));
                                        }}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </Box>

                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="שם מלא"
                                            value={contact.fullName}
                                            onChange={(e) => {
                                                const updatedContacts = [...contractor.management_contacts];
                                                updatedContacts[index] = { ...contact, fullName: e.target.value };
                                                setContractor(prev => ({ ...prev, management_contacts: updatedContacts }));
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="תפקיד"
                                            value={contact.role}
                                            onChange={(e) => {
                                                const updatedContacts = [...contractor.management_contacts];
                                                updatedContacts[index] = { ...contact, role: e.target.value };
                                                setContractor(prev => ({ ...prev, management_contacts: updatedContacts }));
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="אימייל"
                                            type="email"
                                            value={contact.email}
                                            onChange={(e) => {
                                                const updatedContacts = [...contractor.management_contacts];
                                                updatedContacts[index] = { ...contact, email: e.target.value };
                                                setContractor(prev => ({ ...prev, management_contacts: updatedContacts }));
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="טלפון נייד"
                                            value={contact.mobile}
                                            onChange={(e) => {
                                                const updatedContacts = [...contractor.management_contacts];
                                                updatedContacts[index] = { ...contact, mobile: e.target.value };
                                                setContractor(prev => ({ ...prev, management_contacts: updatedContacts }));
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <FormControl fullWidth>
                                            <InputLabel>הרשאות</InputLabel>
                                            <Select
                                                value={contact.permissions}
                                                onChange={(e) => {
                                                    const updatedContacts = [...contractor.management_contacts];
                                                    updatedContacts[index] = { ...contact, permissions: e.target.value as any };
                                                    setContractor(prev => ({ ...prev, management_contacts: updatedContacts }));
                                                }}
                                            >
                                                <MenuItem value="full">הרשאות מלאות</MenuItem>
                                                <MenuItem value="project_manager">מנהל פרויקטים</MenuItem>
                                                <MenuItem value="technical">טכני</MenuItem>
                                                <MenuItem value="view_only">צפייה בלבד</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            )}

            {/* Projects Tab */}
            {activeTab === 3 && (
                <Box sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">פרויקטים</Typography>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleAddProject}
                        >
                            הוסף פרויקט
                        </Button>
                    </Box>

                    <ProjectsList
                        projects={contractor.projects as any}
                        onEditProject={handleEditProject}
                        onDeleteProject={handleDeleteProject}
                    />

                    {/* Project Dialog */}
                    <Dialog open={isProjectDialogOpen} onClose={handleCancelProject} maxWidth="md" fullWidth>
                        <DialogTitle>
                            {editingProjectIndex !== null ? 'ערוך פרויקט' : 'הוסף פרויקט חדש'}
                        </DialogTitle>
                        <DialogContent>
                            {editingProject && (
                                <Grid container spacing={2} sx={{ mt: 1 }}>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="שם הפרויקט"
                                            value={editingProject.projectName}
                                            onChange={(e) => setEditingProject(prev => prev ? { ...prev, projectName: e.target.value } : null)}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="תאריך התחלה"
                                            type="date"
                                            value={editingProject.startDate}
                                            onChange={(e) => setEditingProject(prev => prev ? { ...prev, startDate: e.target.value } : null)}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="תיאור הפרויקט"
                                            multiline
                                            rows={3}
                                            value={editingProject.description}
                                            onChange={(e) => setEditingProject(prev => prev ? { ...prev, description: e.target.value } : null)}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="שווי הפרויקט (₪)"
                                            type="number"
                                            value={editingProject.value}
                                            onChange={(e) => setEditingProject(prev => prev ? { ...prev, value: parseInt(e.target.value) || 0 } : null)}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={editingProject.isClosed}
                                                    onChange={(e) => setEditingProject(prev => prev ? { ...prev, isClosed: e.target.checked } : null)}
                                                />
                                            }
                                            label="פרויקט סגור"
                                        />
                                    </Grid>
                                </Grid>
                            )}
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCancelProject}>ביטול</Button>
                            <Button onClick={handleSaveProject} variant="contained">שמור</Button>
                        </DialogActions>
                    </Dialog>
                </Box>
            )}

            {/* Safety Tab */}
            {activeTab === 3 && (
                <Box sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>בטיחות ואיכות</Typography>

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="דירוג בטיחות (1-5)"
                                type="number"
                                inputProps={{ min: 1, max: 5 }}
                                value={contractor.safetyStars}
                                onChange={(e) => handleChange('safetyStars', parseInt(e.target.value) || 0)}
                                error={!!errors.safetyStars}
                                helperText={errors.safetyStars}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={contractor.iso45001}
                                        onChange={(e) => handleChange('iso45001', e.target.checked)}
                                    />
                                }
                                label="תקן ISO 45001"
                            />
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 3 }}>
                        <Typography variant="h6" gutterBottom>סוגי פעילות</Typography>
                        {contractor.activities.map((activity, index) => (
                            <Card key={activity.id} sx={{ mb: 2 }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Typography variant="h6">פעילות {index + 1}</Typography>
                                        <IconButton
                                            onClick={() => {
                                                setContractor(prev => ({
                                                    ...prev,
                                                    activities: prev.activities.filter((_, i) => i !== index)
                                                }));
                                            }}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Box>

                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                fullWidth
                                                label="סוג פעילות"
                                                value={activity.activity_type}
                                                onChange={(e) => {
                                                    const updatedActivities = [...contractor.activities];
                                                    updatedActivities[index] = { ...activity, activity_type: e.target.value };
                                                    setContractor(prev => ({ ...prev, activities: updatedActivities }));
                                                }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                fullWidth
                                                label="סיווג"
                                                value={activity.classification}
                                                onChange={(e) => {
                                                    const updatedActivities = [...contractor.activities];
                                                    updatedActivities[index] = { ...activity, classification: e.target.value };
                                                    setContractor(prev => ({ ...prev, activities: updatedActivities }));
                                                }}
                                            />
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        ))}

                        <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            onClick={() => {
                                const newActivity: Activity = {
                                    id: Date.now().toString(),
                                    activity_type: '',
                                    classification: ''
                                };
                                setContractor(prev => ({
                                    ...prev,
                                    activities: [...prev.activities, newActivity]
                                }));
                            }}
                        >
                            הוסף פעילות
                        </Button>
                    </Box>
                </Box>
            )}

            {/* Notes Tab */}
            {activeTab === 4 && (
                <Box sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>הערות</Typography>
                    <TextField
                        fullWidth
                        label="הערות"
                        multiline
                        rows={6}
                        value={contractor.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        error={!!errors.notes}
                        helperText={errors.notes}
                    />
                </Box>
            )}

            {/* Action Buttons */}
            <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                {onClose && (
                    <Button onClick={onClose} variant="outlined">
                        ביטול
                    </Button>
                )}
                <Button onClick={handleSave} variant="contained">
                    שמור
                </Button>
            </Box>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
