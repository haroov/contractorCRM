
import { useState, useEffect } from "react";
import ProjectsList from './ProjectsList';
import RiskIndicator from './RiskIndicator';
import { projectsAPI } from '../services/api';
import type { ProjectDocument } from '../types/database';
import type { Contractor } from '../types/contractor';
import { ContractorService } from '../services/contractorService';
import { API_CONFIG, authenticatedFetch } from '../config/api';
import {
    containsForbiddenWords,
    validateEmail,
    validateIsraeliPhone,
    formatIsraeliPhone,
    validateHebrewName,
    validateHebrewRole,
    commonRoles,
    containsForbiddenEnglishWords
} from '../data/forbiddenWords';
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
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    CircularProgress
} from "@mui/material";
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Save as SaveIcon,
    Add as NewIcon,
    Close as CloseIcon,
    Refresh as RefreshIcon
} from "@mui/icons-material";


// Types
type Project = ProjectDocument;

type Errors = {
    name?: string;
    nameEnglish?: string;
    company_id?: string;
    contractor_id?: string;
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
        safetyStars: 0,
        iso45001: false,
        activities: [],
        contacts: [],
        projects: [],
        notes: ''
    });

    const [errors, setErrors] = useState<Errors>({});
    const [activeTab, setActiveTab] = useState(0);
    const [editingProject, setEditingProject] = useState<ProjectDocument | null>(null);
    const [editingProjectIndex, setEditingProjectIndex] = useState<number | null>(null);
    const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
    const [activeProjectTab, setActiveProjectTab] = useState<'all' | 'future' | 'active' | 'closed'>('all');
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });

    // State for contacts dialog
    const [isContactsDialogOpen, setIsContactsDialogOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null);
    const [isLoadingCompanyData, setIsLoadingCompanyData] = useState(false);
    const [validationLoading, setValidationLoading] = useState(false);
    const [validationMessage, setValidationMessage] = useState<string>('');
    const [statusValidated, setStatusValidated] = useState(false);

    // Update contractor state when initialContractor changes
    useEffect(() => {
        if (initialContractor) {
            setContractor(initialContractor);
            setStatusValidated(false); // Reset validation status for new contractor
        }
    }, [initialContractor]);

    // Load projects when contractor changes
    useEffect(() => {
        if (contractor.contractor_id) {
            loadProjects();
        }
    }, [contractor.contractor_id]);

    // Auto-validate contractor status when contractor is loaded
    useEffect(() => {
        if (contractor.contractor_id && contractor.company_id && !statusValidated) {
            // Auto-validate status if not already validated and not currently validating
            if ((contractor.status === null || contractor.violator === null || contractor.restrictions === null) && !validationLoading) {
                // Use setTimeout to avoid calling during render
                setTimeout(() => {
                    if ((contractor.status === null || contractor.violator === null || contractor.restrictions === null) && !statusValidated) {
                        handleValidateStatus();
                    }
                }, 100);
            }
        }
    }, [contractor.contractor_id, contractor.company_id, statusValidated]);

    // Load sample data for testing - REMOVED
    // System now only accepts manually entered data
    useEffect(() => {
        if (!initialContractor) {
            // Initialize empty contractor for new entries
            const emptyContractor: Contractor = {
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
                safetyRating: 0,
                iso45001: false,
                classifications: [],
                contacts: [],
                projects: [],
                notes: '',
                activityType: '',
                description: '',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            setContractor(emptyContractor);
        }
    }, [initialContractor]);

    const loadProjects = async () => {
        try {
            // Projects are now loaded with the contractor from the server
            // No need to make a separate API call
            console.log('Projects already loaded with contractor:', contractor.projects?.length || 0);
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    };

    const saveProject = async (project: Project) => {
        try {
            // Determine project status based on dates
            const projectStatus = getProjectStatus(project.startDate, project.duration || 0, project.isClosed);

            // Add contractor_id and status to the project before saving
            const projectToSave = {
                ...project,
                contractorId: contractor.contractor_id,
                status: projectStatus
            };

            const savedProject = await projectsAPI.create(projectToSave);

            // Update contractor statistics automatically
            await updateContractorStats();

            return savedProject;
        } catch (error) {
            console.error('Error saving project:', error);
            throw error;
        }
    };

    const updateProject = async (project: Project) => {
        try {
            // Update project via API
            await projectsAPI.update(project.id, project);

            // Update contractor statistics automatically
            await updateContractorStats();

            return project;
        } catch (error) {
            console.error('Error updating project:', error);
            throw error;
        }
    };

    const deleteProject = async (projectId: string) => {
        try {
            // Check if project exists in local state
            const projectExists = contractor.projects?.some(p => p._id === projectId || p.id === projectId);

            if (!projectExists) {
                setSnackbar({ open: true, message: 'הפרויקט כבר נמחק', severity: 'success' });
                return;
            }

            await projectsAPI.delete(projectId);

            // Update contractor statistics automatically
            await updateContractorStats();

            // Show success message
            setSnackbar({ open: true, message: 'פרויקט נמחק בהצלחה', severity: 'success' });

        } catch (error: any) {
            console.error('Error deleting project:', error);
            setSnackbar({ open: true, message: 'שגיאה במחיקת הפרויקט', severity: 'error' });
        }
    };

    // Function to update contractor statistics
    const updateContractorStats = async () => {
        try {
            if (contractor?.contractor_id) {
                const response = await authenticatedFetch(`/api/contractors/${contractor.contractor_id}/update-stats`, {
                    method: 'POST'
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Updated contractor stats:', result.stats);
                    
                    // Contractor stats updated successfully
                } else {
                    console.error('Failed to update contractor stats');
                }
            }
        } catch (error) {
            console.error('Error updating contractor stats:', error);
        }
    };

    // Function to refresh projects data from server

    const handleChange = (field: keyof Contractor, value: any) => {
        setContractor(prev => ({ ...prev, [field]: value }));

        // Clear error when user starts typing
        if (errors[field as keyof Errors]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }

        // Validate company name for inappropriate words
        if (field === 'name' && value && containsForbiddenWords(value)) {
            setErrors(prev => ({ ...prev, name: "שם החברה מכיל מילים לא הולמות" }));
        }

        // Validate English name for inappropriate words
        if (field === 'nameEnglish' && value && containsForbiddenEnglishWords(value)) {
            setErrors(prev => ({ ...prev, nameEnglish: "שם באנגלית מכיל מילים לא הולמות" }));
        }
    };

    const handleEnglishNameChange = (value: string) => {
        handleChange('nameEnglish', value);

        if (errors.nameEnglish) {
            setErrors(prev => ({ ...prev, nameEnglish: undefined }));
        }
    };

    const handleNameBlur = () => {
        if (contractor.name && !validateHebrewName(contractor.name)) {
            setErrors(prev => ({ ...prev, name: containsForbiddenWords(contractor.name) ? "השם מכיל מילים לא הולמות" : "השם אינו תקין" }));
        }
    };

    const handleEnglishNameBlur = () => {
        if (contractor.nameEnglish && !validateEnglishName(contractor.nameEnglish)) {
            setErrors(prev => ({ ...prev, nameEnglish: "שם לא תקני" }));
        } else if (contractor.nameEnglish && containsForbiddenEnglishWords(contractor.nameEnglish)) {
            setErrors(prev => ({ ...prev, nameEnglish: "השם מכיל מילים לא הולמות" }));
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
        const newProject: Project = {
            id: Date.now().toString(),
            projectName: '',
            startDate: '',
            description: '',
            durationMonths: 0,
            value: 0,
            city: '',
            isClosed: false
        };
        setEditingProject(newProject);
        setEditingProjectIndex(null);
        setIsProjectDialogOpen(true);
    };

    // Function to determine project status based on dates
    const getProjectStatus = (startDate: string, durationMonths: number, isClosed: boolean): string => {
        if (isClosed) return 'completed';

        if (!startDate) return 'future';

        const start = new Date(startDate);
        const now = new Date();
        const endDate = new Date(start);
        endDate.setMonth(start.getMonth() + durationMonths);

        if (now < start) return 'future';
        if (now >= start && now <= endDate) return 'current';
        return 'completed';
    };

    const handleEditProject = (project: any, index: number) => {
        // Convert ProjectDocument to Project format
        const projectToEdit: Project = {
            id: project.id || project._id || Date.now().toString(),
            projectName: project.projectName || project.name || '',
            startDate: project.startDate || project.start_date || '',
            description: project.description || '',
            durationMonths: project.durationMonths || 0,
            value: project.value || project.budget || 0,
            city: project.city || '',
            isClosed: project.isClosed || project.status === 'completed' || false
        };

        setEditingProject(projectToEdit);
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

    // Contact management functions
    const handleAddContact = () => {
        const newContact: ManagementContact = {
            id: Date.now().toString(),
            fullName: '',
            role: '',
            email: '',
            mobile: '',
            permissions: 'user'
        };
        setEditingContact(newContact);
        setEditingContactIndex(null);
        setIsContactsDialogOpen(true);
    };

    const handleEditContact = (contact: ManagementContact, index: number) => {
        setEditingContact({ ...contact });
        setEditingContactIndex(index);
        setIsContactsDialogOpen(true);
    };

    const handleDeleteContact = (index: number) => {
        if (window.confirm('האם אתה בטוח שברצונך למחוק איש קשר זה?')) {
            setContractor(prev => ({
                ...prev,
                contacts: (prev.contacts || []).filter((_, i) => i !== index)
            }));
            setSnackbar({ open: true, message: 'איש קשר נמחק בהצלחה', severity: 'success' });
        }
    };

    const handleSaveContact = () => {
        if (!editingContact) return;

        if (editingContactIndex !== null) {
            // Update existing contact
            setContractor(prev => ({
                ...prev,
                contacts: (prev.contacts || []).map((contact, index) =>
                    index === editingContactIndex ? editingContact : contact
                )
            }));
        } else {
            // Add new contact
            setContractor(prev => ({
                ...prev,
                contacts: [...(prev.contacts || []), editingContact]
            }));
        }

        setIsContactsDialogOpen(false);
        setEditingContact(null);
        setEditingContactIndex(null);
        setSnackbar({ open: true, message: 'איש קשר נשמר בהצלחה', severity: 'success' });
    };

    const handleCancelContact = () => {
        setIsContactsDialogOpen(false);
        setEditingContact(null);
        setEditingContactIndex(null);
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

    const handleSave = async () => {
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

        try {
            console.log('Saving contractor to MongoDB:', contractor);

            // Generate unique ID if not exists
            const contractorToSave = {
                ...contractor,
                contractor_id: contractor.contractor_id || `contractor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            };

            // Save to MongoDB
            let savedContractor;

            // Check if contractor exists by company_id (ח"פ) first
            if (contractor.company_id && contractor.company_id !== '') {
                const existingContractor = await ContractorService.getByCompanyId(contractor.company_id);
                if (existingContractor) {
                    // Update existing contractor by company_id
                    savedContractor = await ContractorService.update(existingContractor.contractor_id, contractorToSave);
                    console.log('Updated existing contractor by company_id:', savedContractor);
                } else {
                    // Create new contractor
                    savedContractor = await ContractorService.create(contractorToSave);
                    console.log('Created new contractor:', savedContractor);
                }
            } else if (contractor.contractor_id && contractor.contractor_id !== '') {
                // Check if contractor exists by contractor_id
                const existingContractor = await ContractorService.getById(contractor.contractor_id);
                if (existingContractor) {
                    // Update existing contractor
                    savedContractor = await ContractorService.update(contractor.contractor_id, contractorToSave);
                    console.log('Updated existing contractor by contractor_id:', savedContractor);
                } else {
                    // Create new contractor if not found
                    savedContractor = await ContractorService.create(contractorToSave);
                    console.log('Created new contractor (was trying to update):', savedContractor);
                }
            } else {
                // Create new contractor
                savedContractor = await ContractorService.create(contractorToSave);
                console.log('Created new contractor:', savedContractor);
            }

            console.log('Contractor saved successfully to MongoDB!', savedContractor);
            setSnackbar({ open: true, message: 'הקבלן נשמר בהצלחה!', severity: 'success' });

            // Call parent onSave if provided
            if (onSave) {
                onSave(savedContractor || contractorToSave);
            }

            // Close window after successful save
            setTimeout(() => {
                window.close();
            }, 1500); // Wait 1.5 seconds for user to see success message
        } catch (error) {
            console.error('Error saving contractor to MongoDB:', error);
            setSnackbar({ open: true, message: 'שגיאה בשמירת הקבלן', severity: 'error' });
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
        return /^[a-zA-Z\s\-'&.()0-9,]+$/.test(name);
    };

    const validateFoundationDate = (date: string): boolean => {
        const inputDate = new Date(date);
        const minDate = new Date('1900-01-01');
        const maxDate = new Date();
        return inputDate >= minDate && inputDate <= maxDate;
    };

    const containsInappropriateWords = (text: string): boolean => {
        if (!text) return false;
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
                setIsLoadingCompanyData(true);
                setSnackbar({ open: true, message: 'בודק אם הח"פ קיים במערכת...', severity: 'success' });

                console.log('Checking if company ID exists in database:', contractor.company_id);

                // First, check if the company ID already exists in our database
                const existingContractors = await ContractorService.getAll();
                const existingContractor = existingContractors.find(c => c.company_id === contractor.company_id);

                if (existingContractor) {
                    console.log('Company ID found in database:', existingContractor);

                    // Load existing contractor data from MongoDB
                    setContractor(existingContractor);

                    setSnackbar({ open: true, message: 'הקבלן נמצא במערכת - נטענים נתונים קיימים', severity: 'success' });
                    setIsLoadingCompanyData(false);
                    return;
                }

                // If not found in database, proceed with API calls
                setSnackbar({ open: true, message: 'טוען נתונים מה-APIs...', severity: 'success' });

                console.log('Fetching data for company ID:', contractor.company_id);

                // Fetch from Companies Registry
                const companiesResponse = await fetch(`https://data.gov.il/api/3/action/datastore_search?resource_id=f004176c-b85f-4542-8901-7b3176f9a054&q=${contractor.company_id}`);
                const companiesData = await companiesResponse.json();
                console.log('Companies Registry response:', companiesData);

                // Fetch from Contractors Registry
                const contractorsResponse = await fetch(`https://data.gov.il/api/3/action/datastore_search?resource_id=4eb61bd6-18cf-4e7c-9f9c-e166dfa0a2d8&q=${contractor.company_id}`);
                const contractorsData = await contractorsResponse.json();
                console.log('Contractors Registry response:', contractorsData);

                if (companiesData.success && companiesData.result.records.length > 0) {
                    const companyData = companiesData.result.records[0];
                    console.log('Company data from API:', companyData);

                    // Get company type from companies registry
                    const companyTypeFromRegistry = companyData['סוג תאגיד'] || '';
                    let newCompanyType = 'בע"מ'; // default

                    if (companyTypeFromRegistry.includes('ציבורית')) {
                        newCompanyType = 'חברה ציבורית';
                    } else if (companyTypeFromRegistry.includes('פרטית')) {
                        newCompanyType = 'חברה פרטית';
                    } else if (companyTypeFromRegistry.includes('ממשלתית')) {
                        newCompanyType = 'חברה ממשלתית';
                    } else if (companyTypeFromRegistry.includes('זרה')) {
                        newCompanyType = 'חברה זרה';
                    } else if (companyTypeFromRegistry.includes('אגודה')) {
                        newCompanyType = 'אגודה שיתופית';
                    } else if (companyTypeFromRegistry.includes('עמותה')) {
                        newCompanyType = 'עמותה';
                    }

                    console.log('Setting company data:', {
                        name: companyData['שם חברה'],
                        nameEnglish: companyData['שם באנגלית'],
                        city: companyData['שם עיר'],
                        email: companyData['אימייל'],
                        companyType: newCompanyType
                    });

                    setContractor(prev => {
                        const newContractor = {
                            ...prev,
                            name: (companyData['שם חברה'] || prev.name).replace(/בע~מ/g, 'בע״מ'),
                            nameEnglish: companyData['שם באנגלית'] || prev.nameEnglish,
                            city: companyData['שם עיר'] || prev.city,
                            address: `${companyData['שם רחוב'] || ''} ${companyData['מספר בית'] || ''}`.trim() || prev.address,
                            phone: formatPhoneNumber(companyData['מספר טלפון'] || prev.phone),
                            email: companyData['אימייל'] || prev.email,
                            website: companyData['אתר אינטרנט'] || generateWebsiteFromEmail(companyData['אימייל']) || prev.website,
                            companyType: newCompanyType,
                            foundationDate: companyData['תאריך התאגדות'] ? convertHebrewDate(companyData['תאריך התאגדות']) : prev.foundationDate
                        };
                        console.log('Updated contractor state after company data:', newContractor);
                        return newContractor;
                    });

                    setSnackbar({ open: true, message: 'פרטי החברה נטענו בהצלחה', severity: 'success' });
                }

                if (contractorsData.success && contractorsData.result.records.length > 0) {
                    console.log('Contractor data from API:', contractorsData.result.records);

                    // Create activities array from all contractor records
                    const activities: Activity[] = [];
                    let contractorId = '';
                    let email = '';

                    // Process all records to create activities
                    contractorsData.result.records.forEach((contractorData: any, index: number) => {
                        // Use the first record for basic contractor info
                        if (index === 0) {
                            email = contractorData['EMAIL'] || '';
                            contractorId = contractorData['MISPAR_KABLAN'] || '';

                            // Debug: Log all available fields from the API
                            console.log('All contractor data fields:', Object.keys(contractorData));
                            console.log('Full contractor data:', contractorData);

                            // Add phone from contractors registry with leading 0
                            const phoneFromRegistry = contractorData['MISPAR_TEL'] || contractorData['TELEFON'] || contractorData['טלפון'] || contractorData['PHONE'] || '';
                            console.log('Phone from contractors registry:', phoneFromRegistry);
                            if (phoneFromRegistry) {
                                const formattedPhone = formatPhoneNumber(phoneFromRegistry);
                                console.log('Formatted phone:', formattedPhone);
                                setContractor(prev => ({
                                    ...prev,
                                    phone: formattedPhone
                                }));
                            }

                            // Add contractor ID from contractors registry
                            if (contractorId) {
                                console.log('Contractor ID from registry:', contractorId);
                                setContractor(prev => ({
                                    ...prev,
                                    contractor_id: contractorId
                                }));
                            }
                        }

                        // Add activity for each record
                        if (contractorData['SIVUG'] || contractorData['TEUR_ANAF']) {
                            // Safely handle date conversion
                            let licenseExpiry = '';
                            if (contractorData['TARICH_SUG']) {
                                try {
                                    const date = new Date(contractorData['TARICH_SUG']);
                                    if (!isNaN(date.getTime())) {
                                        licenseExpiry = date.toISOString().split('T')[0];
                                    }
                                } catch (error) {
                                    console.warn('Invalid date format for TARICH_SUG:', contractorData['TARICH_SUG']);
                                }
                            }

                            activities.push({
                                id: (index + 1).toString(),
                                activity_type: contractorData['TEUR_ANAF'] || '',
                                classification: contractorData['SIVUG'] || '',
                                sector: contractorData['TEUR_ANAF'] || '',
                                field: contractorData['KVUTZA'] || '',
                                contractor_license: contractorData['MISPAR_KABLAN'] || '',
                                license_number: contractorData['MISPAR_KABLAN'] || '',
                                license_expiry: licenseExpiry,
                                insurance_company: '',
                                insurance_policy: '',
                                insurance_expiry: ''
                            });
                        }
                    });

                    console.log('Setting contractor data:', {
                        email: email,
                        activities_count: activities.length
                    });

                    setContractor(prev => {
                        const newContractor = {
                            ...prev,
                            contractor_id: contractorId || prev.contractor_id, // Add contractor ID from contractors registry
                            sector: contractorsData.result.records[0]['TEUR_ANAF'] || prev.sector,
                            email: email || prev.email, // Add email from contractors registry
                            website: prev.website || generateWebsiteFromEmail(email || ''), // Generate website from email if empty
                            activities: activities
                        };
                        console.log('Updated contractor state:', newContractor);
                        return newContractor;
                    });

                    setSnackbar({ open: true, message: `פרטי הקבלן נטענו בהצלחה (${activities.length} פעילויות)`, severity: 'success' });
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                setSnackbar({ open: true, message: 'שגיאה בטעינת הנתונים', severity: 'error' });
            } finally {
                setIsLoadingCompanyData(false);
                // Always close the loading snackbar
                setTimeout(() => {
                    setSnackbar(prev => prev.open ? { ...prev, open: false } : prev);
                }, 3000);
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
        if (freeEmailProviders.includes(domain?.toLowerCase() || '')) {
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
                console.log('Contractor data from API:', contractorsData.result.records);

                // Create activities array from all contractor records
                const activities: Activity[] = [];
                let contractorId = '';
                let email = '';

                // Process all records to create activities
                contractorsData.result.records.forEach((contractorData: any, index: number) => {
                    // Use the first record for basic contractor info
                    if (index === 0) {
                        contractorId = contractorData['MISPAR_KABLAN'] || '';
                        email = contractorData['EMAIL'] || '';
                        // Add phone from contractors registry with leading 0
                        const phoneFromRegistry = contractorData['MISPAR_TEL'] || contractorData['TELEFON'] || '';
                        console.log('Phone from contractors registry (refresh):', phoneFromRegistry);
                        if (phoneFromRegistry) {
                            const formattedPhone = formatPhoneNumber(phoneFromRegistry);
                            console.log('Formatted phone (refresh):', formattedPhone);
                            setContractor(prev => ({
                                ...prev,
                                phone: formattedPhone
                            }));
                        }
                    }

                    // Add activity for each record
                    if (contractorData['SIVUG'] || contractorData['TEUR_ANAF']) {
                        // Safely handle date conversion
                        let licenseExpiry = '';
                        if (contractorData['TARICH_SUG']) {
                            try {
                                const date = new Date(contractorData['TARICH_SUG']);
                                if (!isNaN(date.getTime())) {
                                    licenseExpiry = date.toISOString().split('T')[0];
                                }
                            } catch (error) {
                                console.warn('Invalid date format for TARICH_SUG:', contractorData['TARICH_SUG']);
                            }
                        }

                        activities.push({
                            id: (index + 1).toString(),
                            activity_type: contractorData['TEUR_ANAF'] || '',
                            classification: contractorData['SIVUG'] || '',
                            sector: contractorData['TEUR_ANAF'] || '',
                            field: contractorData['KVUTZA'] || '',
                            contractor_license: contractorData['MISPAR_KABLAN'] || '',
                            license_number: contractorData['MISPAR_KABLAN'] || '',
                            license_expiry: licenseExpiry,
                            insurance_company: '',
                            insurance_policy: '',
                            insurance_expiry: ''
                        });
                    }
                });

                setContractor(prev => ({
                    ...prev,
                    contractor_id: contractorId || prev.contractor_id,
                    sector: contractorsData.result.records[0]['TEUR_ANAF'] || prev.sector,
                    email: email || prev.email, // Add email from contractors registry
                    website: prev.website || generateWebsiteFromEmail(email || ''), // Generate website from email if empty
                    activities: activities
                }));

                setSnackbar({ open: true, message: `הנתונים רועננו בהצלחה (${activities.length} פעילויות)`, severity: 'success' });
            } else {
                setSnackbar({ open: true, message: 'לא נמצאו נתונים בפנקס הקבלנים', severity: 'error' });
            }
        } catch (error) {
            console.error('Error refreshing contractor data:', error);
            setSnackbar({ open: true, message: 'שגיאה ברענון הנתונים', severity: 'error' });
        }
    };

    const handleValidateStatus = async () => {
        if (!contractor.company_id) {
            setSnackbar({ open: true, message: 'נא להזין מספר חברה תחילה', severity: 'error' });
            return;
        }

        try {
            setValidationLoading(true);
            setValidationMessage('מאמת סטטוס מרשום החברות...');

            const response = await authenticatedFetch(API_CONFIG.VALIDATE_STATUS_URL(contractor.contractor_id), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.updated) {
                // Company status updated successfully

                setValidationMessage(`סטטוס עודכן בהצלחה: ${result.message}`);
                setSnackbar({ open: true, message: 'סטטוס החברה עודכן בהצלחה מרשום החברות', severity: 'success' });
                setStatusValidated(true);
            } else {
                setValidationMessage(`לא נדרש עדכון: ${result.message}`);
                setStatusValidated(true);
            }
        } catch (error) {
            console.error('Error validating status:', error);
            setValidationMessage('שגיאה בעדכון הסטטוס');
            setSnackbar({ open: true, message: 'שגיאה בעדכון הסטטוס מרשום החברות', severity: 'error' });
        } finally {
            setValidationLoading(false);
            // Clear validation message after 5 seconds
            setTimeout(() => setValidationMessage(''), 5000);
        }
    };

    return (
        <Box sx={{ width: '100%', typography: 'body1' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={handleTabChange} aria-label="contractor tabs">
                    <Tab label="פרטי חברה" />
                    <Tab label="מידע עסקי" />
                    <Tab label="אנשי קשר" />
                    <Tab label="פרויקטים" />
                    <Tab label="הערות" />
                </Tabs>
            </Box>

            {/* Company Details Tab */}
            {activeTab === 0 && (
                <Box sx={{ p: 3, pb: 6 }}>
                    {/* Risk Indicator */}
                    <RiskIndicator
                        status={contractor.status}
                        violator={contractor.violator}
                        restrictions={contractor.restrictions}
                    />

                    {/* Company General Details Section */}
                    <Card sx={{ mb: 3, boxShadow: 2 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>פרטי חברה כללים</Typography>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Box sx={{ position: 'relative' }}>
                                        <TextField
                                            fullWidth
                                            label="מספר חברה (ח״פ)"
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
                                        {isLoadingCompanyData && (
                                            <CircularProgress
                                                size={20}
                                                sx={{
                                                    position: 'absolute',
                                                    left: 7,
                                                    top: 'calc(50% - 5px)',
                                                    transform: 'translateY(-50%)',
                                                    zIndex: 1
                                                }}
                                            />
                                        )}
                                    </Box>
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
                                        label="שם החברה"
                                        value={contractor.name}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                        onBlur={handleNameBlur}
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
                                            MenuProps={{
                                                PaperProps: {
                                                    style: {
                                                        maxHeight: 300
                                                    }
                                                }
                                            }}
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
                                        inputProps={{
                                            style: { color: '#666' }
                                        }}
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>

                    {/* Contact Information Section */}
                    <Card sx={{ mb: 3, boxShadow: 2 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>פרטי קשר</Typography>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="עיר"
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
                                        label="אימייל"
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
                                        label="טלפון"
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
                                <Grid item xs={12}>
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
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        {onClose && (
                            <Button onClick={onClose} variant="outlined">
                                ביטול
                            </Button>
                        )}
                        <Button onClick={handleSave} variant="contained">
                            שמור
                        </Button>
                    </Box>
                </Box>
            )}

            {/* Business Information Tab */}
            {activeTab === 1 && (
                <Box sx={{ p: 3, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h6" gutterBottom>מידע עסקי ופעילויות</Typography>

                    {/* Safety Section */}
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>בטיחות ואיכות</Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <FormControl sx={{ minWidth: 200 }}>
                                    <InputLabel>דירוג כוכבי בטיחות</InputLabel>
                                    <Select
                                        value={contractor.safetyRating || 0}
                                        onChange={(e) => handleChange('safetyRating', e.target.value)}
                                        error={!!errors.safetyRating}
                                        label="דירוג כוכבי בטיחות"
                                    >
                                        <MenuItem value={0}>0 כוכבים</MenuItem>
                                        <MenuItem value={1}>1 כוכב</MenuItem>
                                        <MenuItem value={2}>2 כוכבים</MenuItem>
                                        <MenuItem value={3}>3 כוכבים</MenuItem>
                                        <MenuItem value={4}>4 כוכבים</MenuItem>
                                        <MenuItem value={5}>5 כוכבים</MenuItem>
                                        <MenuItem value={6}>6 כוכבים (זהב)</MenuItem>
                                    </Select>
                                    {errors.safetyRating && (
                                        <FormHelperText error>{errors.safetyRating}</FormHelperText>
                                    )}
                                </FormControl>
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ color: 'primary.main' }}>פעילויות מפנקס הקבלנים</Typography>
                        <Button
                            variant="contained"
                            startIcon={<RefreshIcon />}
                            onClick={refreshContractorActivities}
                            sx={{ gap: 1 }}
                        >
                            רענן נתונים
                        </Button>
                    </Box>

                    {(!contractor.classifications || contractor.classifications.length === 0) ? (
                        <Card sx={{ mb: 2 }}>
                            <CardContent>
                                <Typography variant="body1" color="text.secondary" align="center">
                                    אין פעילויות זמינות. לחץ על "רענן נתונים" כדי לטעון את הנתונים מפנקס הקבלנים.
                                </Typography>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card sx={{ mt: 2, boxShadow: 'none', border: '1px solid #e0e0e0', flexGrow: 1 }}>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 600, textAlign: 'right', borderBottom: '2px solid #e0e0e0', backgroundColor: '#fafafa' }}>תיאור ענף</TableCell>
                                            <TableCell sx={{ fontWeight: 600, textAlign: 'right', borderBottom: '2px solid #e0e0e0', backgroundColor: '#fafafa' }}>סיווג</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {contractor.classifications.map((classification, index) => (
                                            <TableRow key={classification.id || index} sx={{ '&:hover': { backgroundColor: '#f5f5f5' } }}>
                                                <TableCell sx={{ textAlign: 'right', borderBottom: '1px solid #f0f0f0' }}>{classification.classification_type || ''}</TableCell>
                                                <TableCell sx={{ textAlign: 'right', borderBottom: '1px solid #f0f0f0' }}>{classification.classification || ''}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Card>
                    )}
                </Box>
            )}

            {/* Management Contacts Tab */}
            {activeTab === 2 && (
                <Box sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleAddContact}
                            sx={{
                                backgroundColor: '#f5f5f5',
                                color: '#666',
                                border: '1px solid #e0e0e0',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                gap: 1,
                                '&:hover': {
                                    backgroundColor: '#e8e8e8'
                                }
                            }}
                        >
                            הוסף
                        </Button>
                    </Box>

                    {(!contractor.contacts || contractor.contacts.length === 0) ? (
                        <Card sx={{
                            mb: 2,
                            backgroundColor: '#fafafa',
                            border: '1px solid #e0e0e0',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            borderRadius: 2
                        }}>
                            <CardContent sx={{ padding: '16px' }}>
                                <Typography variant="body1" sx={{ color: '#888', textAlign: 'center' }}>
                                    אין אנשי קשר. לחץ על "הוסף" כדי להוסיף איש קשר חדש.
                                </Typography>
                            </CardContent>
                        </Card>
                    ) : (
                        <TableContainer component={Paper} sx={{
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            borderRadius: 2,
                            backgroundColor: '#fafafa'
                        }}>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                        <TableCell sx={{ color: '#666', fontWeight: 500, textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>שם</TableCell>
                                        <TableCell sx={{ color: '#666', fontWeight: 500, textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>תפקיד</TableCell>
                                        <TableCell sx={{ color: '#666', fontWeight: 500, textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>אימייל</TableCell>
                                        <TableCell sx={{ color: '#666', fontWeight: 500, textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>טלפון</TableCell>
                                        <TableCell sx={{ color: '#666', fontWeight: 500, textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>הרשאות</TableCell>
                                        <TableCell sx={{ color: '#666', fontWeight: 500, textAlign: 'center', borderBottom: '1px solid #e0e0e0' }}>פעולות</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {contractor.contacts?.map((contact, index) => (
                                        <TableRow key={contact.id} sx={{
                                            backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa',
                                            '&:hover': { backgroundColor: '#f0f0f0' }
                                        }}>
                                            <TableCell sx={{ textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>
                                                <Typography variant="body2" sx={{ color: '#666', fontWeight: 500 }}>
                                                    {contact.fullName || `איש קשר ${index + 1}`}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>
                                                <Typography variant="body2" sx={{ color: '#888' }}>
                                                    {contact.role}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: '#888',
                                                        cursor: 'pointer',
                                                        textDecoration: 'underline',
                                                        '&:hover': { color: 'primary.main' }
                                                    }}
                                                    onClick={() => {
                                                        if (contact.email) {
                                                            window.open(`mailto:${contact.email}`, '_blank');
                                                        }
                                                    }}
                                                >
                                                    {contact.email}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        color: '#888',
                                                        cursor: 'pointer',
                                                        textDecoration: 'underline',
                                                        '&:hover': { color: 'primary.main' }
                                                    }}
                                                    onClick={() => {
                                                        if (contact.mobile) {
                                                            window.open(`callto://${contact.mobile.replace(/\D/g, '')}`, '_blank');
                                                        }
                                                    }}
                                                >
                                                    {contact.mobile}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'right', borderBottom: '1px solid #e0e0e0' }}>
                                                <Typography variant="body2" sx={{ color: '#888' }}>
                                                    {contact.permissions === 'admin' ? 'מנהל' : 'משתמש'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center', borderBottom: '1px solid #e0e0e0' }}>
                                                <IconButton
                                                    onClick={() => handleEditContact(contact, index)}
                                                    sx={{ color: '#666', mr: 1 }}
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton
                                                    onClick={() => handleDeleteContact(index)}
                                                    sx={{ color: '#666' }}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}

                    {/* Action Buttons */}
                    <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        {onClose && (
                            <Button onClick={onClose} variant="outlined">
                                ביטול
                            </Button>
                        )}
                        <Button onClick={handleSave} variant="contained">
                            שמור
                        </Button>
                    </Box>
                </Box>
            )}

            {/* Projects Tab */}
            {activeTab === 3 && (
                <Box sx={{ p: 3 }}>
                    {/* Project Sub-tabs */}
                    <Box sx={{ mb: 3 }}>
                        <Tabs
                            value={activeProjectTab}
                            onChange={(e, newValue) => setActiveProjectTab(newValue)}
                            sx={{
                                '& .MuiTab-root': {
                                    color: '#666',
                                    fontWeight: 500,
                                    textTransform: 'none',
                                    minWidth: 'auto',
                                    px: 2,
                                    '&.Mui-selected': {
                                        color: 'primary.main',
                                        fontWeight: 600
                                    }
                                },
                                '& .MuiTabs-indicator': {
                                    backgroundColor: 'primary.main'
                                }
                            }}
                        >
                            <Tab label="הכל" value="all" />
                            <Tab label="עתידיים" value="future" />
                            <Tab label="פעילים" value="active" />
                            <Tab label="סגורים" value="closed" />
                        </Tabs>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 2 }}>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleAddProject}
                            sx={{ gap: 1 }}
                        >
                            הוסף פרויקט
                        </Button>
                    </Box>

                    <ProjectsList
                        projects={contractor.projects as any}
                        onEditProject={handleEditProject}
                        onDeleteProject={handleDeleteProject}
                        activeTab={activeProjectTab}
                    />

                    {/* Project Dialog */}
                    <Dialog open={isProjectDialogOpen} onClose={handleCancelProject} maxWidth="lg" fullWidth>
                        <DialogTitle>
                            {editingProjectIndex !== null ? 'ערוך פרויקט' : 'הוסף פרויקט חדש'}
                        </DialogTitle>
                        <DialogContent>
                            {editingProject && (
                                <Grid container spacing={3} sx={{ mt: 1 }}>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="שם הפרויקט"
                                            value={editingProject.projectName}
                                            onChange={(e) => setEditingProject(prev => prev ? { ...prev, projectName: e.target.value } : null)}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 1.5
                                                }
                                            }}
                                            placeholder="לדוגמה: בניית מבנה מסחרי"
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
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 1.5
                                                }
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <TextField
                                            fullWidth
                                            label="שווי הפרויקט"
                                            type="text"
                                            value={editingProject.value ? `${editingProject.value.toLocaleString('he-IL')} ₪` : ''}
                                            onChange={(e) => {
                                                const numericValue = e.target.value.replace(/[^\d]/g, '');
                                                setEditingProject(prev => prev ? { ...prev, value: numericValue ? parseInt(numericValue) : 0 } : null);
                                            }}
                                            onKeyDown={(e) => {
                                                // Allow backspace, delete, arrow keys, etc.
                                                if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                                                    return;
                                                }
                                                // Allow only numbers
                                                if (!/[0-9]/.test(e.key)) {
                                                    e.preventDefault();
                                                }
                                            }}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 1.5
                                                }
                                            }}
                                            placeholder="לדוגמה: 1,000,000 ₪"
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="משך הפרויקט בחודשים"
                                            type="number"
                                            value={editingProject.durationMonths || ''}
                                            onChange={(e) => setEditingProject(prev => prev ? { ...prev, durationMonths: parseInt(e.target.value) || 0 } : null)}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 1.5
                                                }
                                            }}
                                            placeholder="לדוגמה: 12"
                                            inputProps={{ min: 1, max: 120 }}
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="תיאור הפרויקט"
                                            multiline
                                            rows={6}
                                            value={editingProject.description}
                                            onChange={(e) => setEditingProject(prev => prev ? { ...prev, description: e.target.value } : null)}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 1.5
                                                }
                                            }}
                                            placeholder="תאר את הפרויקט בפירוט..."
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="עיר הפרויקט"
                                            value={editingProject.city || ''}
                                            onChange={(e) => setEditingProject(prev => prev ? { ...prev, city: e.target.value } : null)}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 1.5
                                                }
                                            }}
                                            placeholder="לדוגמה: תל אביב"
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={editingProject.isClosed}
                                                    onChange={(e) => setEditingProject(prev => prev ? { ...prev, isClosed: e.target.checked } : null)}
                                                />
                                            }
                                            label="פרויקט סגור"
                                            sx={{ mt: 1 }}
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

                    {/* Action Buttons */}
                    <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        {onClose && (
                            <Button onClick={onClose} variant="outlined">
                                ביטול
                            </Button>
                        )}
                        <Button onClick={handleSave} variant="contained">
                            שמור
                        </Button>
                    </Box>
                </Box>
            )}

            {/* Notes Tab */}
            {activeTab === 4 && (
                <Box sx={{ p: 3 }}>
                    {/* Risk Indicator */}
                    <RiskIndicator
                        status={contractor.status}
                        violator={contractor.violator}
                        restrictions={contractor.restrictions}
                    />

                    {/* Validation Button */}
                    <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Button
                            variant="outlined"
                            color="primary"
                            onClick={handleValidateStatus}
                            disabled={!contractor.company_id}
                            startIcon={<RefreshIcon />}
                        >
                            עדכן סטטוס מרשום החברות
                        </Button>
                        {validationLoading && (
                            <CircularProgress size={20} />
                        )}
                        {validationMessage && (
                            <Alert severity="info" sx={{ flex: 1 }}>
                                {validationMessage}
                            </Alert>
                        )}
                    </Box>

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

                    {/* Action Buttons */}
                    <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        {onClose && (
                            <Button onClick={onClose} variant="outlined">
                                ביטול
                            </Button>
                        )}
                        <Button onClick={handleSave} variant="contained">
                            שמור
                        </Button>
                    </Box>
                </Box>
            )}

            {/* Contacts Dialog */}
            <Dialog open={isContactsDialogOpen} onClose={handleCancelContact} maxWidth="md" fullWidth>
                <DialogTitle>
                    {editingContactIndex !== null ? 'ערוך איש קשר' : 'הוסף איש קשר חדש'}
                </DialogTitle>
                <DialogContent>
                    {editingContact && (
                        <Grid container spacing={3} sx={{ mt: 1 }}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="שם מלא"
                                    value={editingContact.fullName}
                                    required
                                    sx={{ minWidth: 300 }}
                                    error={editingContact.fullName && (containsForbiddenWords(editingContact.fullName) || !validateHebrewName(editingContact.fullName))}
                                    helperText={
                                        editingContact.fullName && containsForbiddenWords(editingContact.fullName) ? "השם מכיל מילים לא הולמות" :
                                            editingContact.fullName && !validateHebrewName(editingContact.fullName) ? "השם יכול להכיל רק אותיות בעברית, מקף, גרש וגרשיים" : ""
                                    }
                                    onChange={(e) => setEditingContact(prev => prev ? { ...prev, fullName: e.target.value } : null)}
                                    onBlur={(e) => {
                                        // ולידציה רק אחרי עזיבת השדה
                                        if (e.target.value) {
                                            if (containsForbiddenWords(e.target.value)) {
                                                setSnackbar({
                                                    open: true,
                                                    message: 'השם מכיל מילים לא הולמות',
                                                    severity: 'error'
                                                });
                                            } else if (!validateHebrewName(e.target.value)) {
                                                setSnackbar({
                                                    open: true,
                                                    message: 'השם יכול להכיל רק אותיות בעברית, מקף, גרש וגרשיים',
                                                    severity: 'error'
                                                });
                                            }
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Autocomplete
                                    freeSolo
                                    options={commonRoles}
                                    value={editingContact.role}
                                    onChange={(event, newValue) => {
                                        setEditingContact(prev => prev ? { ...prev, role: newValue || '' } : null);
                                    }}
                                    onInputChange={(event, newInputValue) => {
                                        setEditingContact(prev => prev ? { ...prev, role: newInputValue } : null);
                                    }}
                                    sx={{ minWidth: 300 }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="תפקיד"
                                            required
                                            fullWidth
                                            sx={{ minWidth: 300 }}
                                            error={editingContact.role && containsForbiddenWords(editingContact.role)}
                                            helperText={
                                                editingContact.role && containsForbiddenWords(editingContact.role) ? "התפקיד מכיל מילים לא הולמות" : ""
                                            }
                                            onBlur={(e) => {
                                                // ולידציה רק אחרי עזיבת השדה
                                                if (e.target.value && containsForbiddenWords(e.target.value)) {
                                                    setSnackbar({
                                                        open: true,
                                                        message: 'התפקיד מכיל מילים לא הולמות',
                                                        severity: 'error'
                                                    });
                                                }
                                            }}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="אימייל"
                                    type="email"
                                    value={editingContact.email}
                                    sx={{ minWidth: 300 }}
                                    error={editingContact.email && !validateEmail(editingContact.email)}
                                    helperText={editingContact.email && !validateEmail(editingContact.email) ? "כתובת אימייל לא תקינה" : ""}
                                    onChange={(e) => setEditingContact(prev => prev ? { ...prev, email: e.target.value } : null)}
                                    onBlur={(e) => {
                                        // ולידציה רק אחרי עזיבת השדה
                                        if (e.target.value && !validateEmail(e.target.value)) {
                                            setSnackbar({
                                                open: true,
                                                message: 'כתובת אימייל לא תקינה',
                                                severity: 'error'
                                            });
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="טלפון נייד"
                                    value={editingContact.mobile}
                                    placeholder="050-1234567 או 02-1234567"
                                    inputMode="tel"
                                    sx={{ minWidth: 300 }}
                                    error={editingContact.mobile && !validateIsraeliPhone(editingContact.mobile)}
                                    helperText={editingContact.mobile && !validateIsraeliPhone(editingContact.mobile) ? "מספר טלפון לא תקין" : ""}
                                    onChange={(e) => {
                                        // הגבלה על תווים מותרים - רק ספרות ומקף
                                        const inputValue = e.target.value;
                                        const allowedChars = /^[0-9\-]*$/;
                                        
                                        if (!allowedChars.test(inputValue)) {
                                            return; // לא לעדכן אם יש תווים לא מותרים
                                        }
                                        
                                        const formattedPhone = formatIsraeliPhone(inputValue);
                                        setEditingContact(prev => prev ? { ...prev, mobile: formattedPhone } : null);
                                    }}
                                    onBlur={(e) => {
                                        // ולידציה רק אחרי עזיבת השדה
                                        if (e.target.value && !validateIsraeliPhone(e.target.value)) {
                                            setSnackbar({
                                                open: true,
                                                message: 'מספר טלפון לא תקין',
                                                severity: 'error'
                                            });
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControl sx={{ minWidth: 200 }} required>
                                    <InputLabel sx={{ backgroundColor: 'white', px: 1 }}>הרשאות</InputLabel>
                                    <Select
                                        value={editingContact.permissions}
                                        onChange={(e) => setEditingContact(prev => prev ? { ...prev, permissions: e.target.value as any } : null)}
                                        label="הרשאות"
                                    >
                                        <MenuItem value="admin">מנהל</MenuItem>
                                        <MenuItem value="user">משתמש</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelContact}>ביטול</Button>
                    <Button onClick={handleSaveContact} variant="contained">שמור</Button>
                </DialogActions>
            </Dialog>

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
