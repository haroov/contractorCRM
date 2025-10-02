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
    TableRow,
    Select,
    MenuItem,
    InputLabel
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
import FileUpload from './FileUpload';

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

interface MedicalDocument {
    documentName: string;
    medicalInstitution: string;
    fileUrl?: string;
    thumbnailUrl?: string;
    validUntil?: string;
}

interface InjuredEmployee {
    fullName: string;
    idNumber: string;
    birthDate: string;
    address: string;
    jobTitle: string;
    employmentType: 'direct' | 'subcontractor';
    subcontractorName?: string;
    subcontractorAgreement?: string;
    directManager: {
        fullName: string;
        phone: string;
        email: string;
        position: string;
    };
    representative: {
        represented: boolean;
        name?: string;
        address?: string;
        phone?: string;
        email?: string;
    };
    startDate: string;
    returnToWorkDate?: string;
    lastSalary: number;
    injuryDescription: string;
    medicalTreatment: {
        received: boolean;
        medicalDocuments?: MedicalDocument[];
    };
    nationalInsuranceReport: {
        reported: boolean;
        reportDate?: string;
        reportFile?: string;
    };
    laborMinistryReport: {
        reported: boolean;
        reportDate?: string;
        reportFile?: string;
    };
    policeReport: {
        reported: boolean;
        reportDate?: string;
        reportFile?: string;
        stationName?: string;
    };
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
    injuredEmployees: InjuredEmployee[];
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
    const [subcontractors, setSubcontractors] = useState<any[]>([]);
    const [expandedEmployees, setExpandedEmployees] = useState<{ [key: number]: boolean }>({});

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
        injuredEmployees: [],
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
        const tab = searchParams.get('tab');

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

        // Set active tab from URL parameter
        if (tab) {
            const tabIndex = parseInt(tab);
            if (tabIndex >= 0 && tabIndex <= 3) {
                setActiveTab(tabIndex);
            }
        }

        // Load subcontractors if we have a project ID
        if (projectId) {
            loadSubcontractors(projectId);
        }
    }, [searchParams]);

    const loadSubcontractors = async (projectId: string) => {
        try {
            const apiUrl = `https://contractorcrm-api.onrender.com/api/projects/${projectId}`;
            console.log('🔍 Loading subcontractors for project:', projectId);
            console.log('🔍 API URL:', apiUrl);
            const response = await fetch(apiUrl);
            if (response.ok) {
                const data = await response.json();
                console.log('🔍 Full API response:', data);
                console.log('🔍 Response structure:', {
                    hasSuccess: 'success' in data,
                    hasProject: 'project' in data,
                    successValue: data.success,
                    projectKeys: data.project ? Object.keys(data.project) : 'no project'
                });

                // Handle both new format (wrapped) and old format (direct)
                let projectData = null;
                if (data.success && data.project) {
                    projectData = data.project;
                    console.log('🔍 Using new API format (wrapped)');
                } else if (data._id || data.projectName) {
                    projectData = data;
                    console.log('🔍 Using old API format (direct)');
                } else {
                    console.log('🔍 Unknown API response format');
                }

                if (projectData) {
                    console.log('🔍 Project subcontractors:', projectData.subcontractors);
                    console.log('🔍 Subcontractors type:', typeof projectData.subcontractors);
                    console.log('🔍 Is array:', Array.isArray(projectData.subcontractors));

                    if (projectData.subcontractors && Array.isArray(projectData.subcontractors)) {
                        console.log('🔍 Setting subcontractors:', projectData.subcontractors);
                        setSubcontractors(projectData.subcontractors);
                    } else {
                        console.log('🔍 No subcontractors found or not an array');
                        console.log('🔍 Available project fields:', Object.keys(projectData));
                        setSubcontractors([]);
                    }
                } else {
                    console.log('🔍 No project data found in response');
                }
            } else {
                console.error('🔍 Failed to load project:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error loading subcontractors:', error);
        }
    };

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
                        injuredEmployees: (data.claim.injuredEmployees || []).map((employee: any) => ({
                            fullName: employee.fullName || '',
                            idNumber: employee.idNumber || '',
                            birthDate: employee.birthDate || '',
                            address: employee.address || '',
                            jobTitle: employee.jobTitle || '',
                            employmentType: employee.employmentType || 'direct',
                            subcontractorName: employee.subcontractorName || '',
                            subcontractorAgreement: employee.subcontractorAgreement || '',
                            directManager: {
                                fullName: employee.directManager?.fullName || '',
                                phone: employee.directManager?.phone || '',
                                email: employee.directManager?.email || '',
                                position: employee.directManager?.position || ''
                            },
                            startDate: employee.startDate || '',
                            returnToWorkDate: employee.returnToWorkDate || '',
                            lastSalary: employee.lastSalary || 0,
                            injuryDescription: employee.injuryDescription || '',
                            medicalTreatment: {
                                received: employee.medicalTreatment?.received || false,
                                medicalDocuments: employee.medicalTreatment?.medicalDocuments || []
                            },
                            nationalInsuranceReport: {
                                reported: employee.nationalInsuranceReport?.reported || false,
                                reportDate: employee.nationalInsuranceReport?.reportDate || '',
                                reportFile: employee.nationalInsuranceReport?.reportFile || ''
                            },
                            laborMinistryReport: {
                                reported: employee.laborMinistryReport?.reported || false,
                                reportDate: employee.laborMinistryReport?.reportDate || '',
                                reportFile: employee.laborMinistryReport?.reportFile || ''
                            },
                            policeReport: {
                                reported: employee.policeReport?.reported || false,
                                reportDate: employee.policeReport?.reportDate || '',
                                stationName: employee.policeReport?.stationName || '',
                                reportFile: employee.policeReport?.reportFile || ''
                            },
                            representative: employee.representative || {
                                represented: false,
                                name: '',
                                address: '',
                                phone: '',
                                email: ''
                            }
                        })),
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

        // Save active tab to URL parameters
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('tab', newValue.toString());
        navigate(`?${newSearchParams.toString()}`, { replace: true });
    };

    const handleFieldChange = (field: keyof ClaimFormData, value: string | boolean | null) => {
        setFormData(prev => {
            const newData = {
                ...prev,
                [field]: value,
                updatedAt: new Date()
            };

            // If bodily injury to employee is set to true and no employees exist, add the first one
            if (field === 'bodilyInjuryEmployee' && value === true && prev.injuredEmployees.length === 0) {
                console.log('🔍 Auto-creating first injured employee');
                const newEmployee: InjuredEmployee = {
                    fullName: '',
                    idNumber: '',
                    birthDate: '',
                    address: '',
                    jobTitle: '',
                    employmentType: 'direct',
                    subcontractorName: '',
                    subcontractorAgreement: '',
                    directManager: {
                        fullName: '',
                        phone: '',
                        email: '',
                        position: ''
                    },
                    startDate: '',
                    returnToWorkDate: '',
                    lastSalary: 0,
                    injuryDescription: '',
                    medicalTreatment: {
                        received: false,
                        medicalDocuments: []
                    },
                    nationalInsuranceReport: {
                        reported: false,
                        reportDate: '',
                        reportFile: ''
                    },
                    laborMinistryReport: {
                        reported: false,
                        reportDate: '',
                        reportFile: ''
                    },
                    policeReport: {
                        reported: false,
                        reportDate: '',
                        stationName: '',
                        reportFile: ''
                    },
                    representative: {
                        represented: false,
                        name: '',
                        address: '',
                        phone: '',
                        email: ''
                    }
                };
                console.log('🔍 Created new employee object:', newEmployee);
                newData.injuredEmployees = [newEmployee];
            }

            return newData;
        });
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

    const addInjuredEmployee = () => {
        const newEmployee: InjuredEmployee = {
            fullName: '',
            idNumber: '',
            birthDate: '',
            address: '',
            jobTitle: '',
            employmentType: 'direct',
            directManager: {
                fullName: '',
                phone: '',
                email: '',
                position: ''
            },
            representative: {
                represented: false
            },
            startDate: '',
            lastSalary: 0,
            injuryDescription: '',
            medicalTreatment: {
                received: false,
                medicalDocuments: []
            },
            nationalInsuranceReport: {
                reported: false
            },
            laborMinistryReport: {
                reported: false
            },
            policeReport: {
                reported: false
            }
        };
        setFormData(prev => ({
            ...prev,
            injuredEmployees: [...prev.injuredEmployees, newEmployee],
            updatedAt: new Date()
        }));
    };

    const removeInjuredEmployee = (index: number) => {
        if (window.confirm('האם אתה בטוח שברצונך למחוק את פרטי העובד?')) {
            setFormData(prev => ({
                ...prev,
                injuredEmployees: prev.injuredEmployees.filter((_, i) => i !== index),
                updatedAt: new Date()
            }));
        }
    };

    const updateInjuredEmployee = (index: number, field: keyof InjuredEmployee, value: any) => {
        setFormData(prev => ({
            ...prev,
            injuredEmployees: prev.injuredEmployees.map((employee, i) =>
                i === index ? { ...employee, [field]: value } : employee
            ),
            updatedAt: new Date()
        }));
    };

    const updateInjuredEmployeeManager = (index: number, field: keyof InjuredEmployee['directManager'], value: string) => {
        setFormData(prev => ({
            ...prev,
            injuredEmployees: prev.injuredEmployees.map((employee, i) =>
                i === index ? {
                    ...employee,
                    directManager: { ...employee.directManager, [field]: value }
                } : employee
            ),
            updatedAt: new Date()
        }));
    };

    const updateInjuredEmployeeRepresentative = (index: number, field: keyof InjuredEmployee['representative'], value: any) => {
        setFormData(prev => ({
            ...prev,
            injuredEmployees: prev.injuredEmployees.map((employee, i) =>
                i === index ? {
                    ...employee,
                    representative: { ...employee.representative, [field]: value }
                } : employee
            ),
            updatedAt: new Date()
        }));
    };

    const updateInjuredEmployeeMedical = (index: number, field: keyof InjuredEmployee['medicalTreatment'], value: any) => {
        setFormData(prev => ({
            ...prev,
            injuredEmployees: prev.injuredEmployees.map((employee, i) =>
                i === index ? {
                    ...employee,
                    medicalTreatment: { ...employee.medicalTreatment, [field]: value }
                } : employee
            ),
            updatedAt: new Date()
        }));
    };

    const addMedicalDocument = (employeeIndex: number) => {
        const newDocument: MedicalDocument = {
            documentName: '',
            medicalInstitution: '',
            validUntil: ''
        };
        setFormData(prev => ({
            ...prev,
            injuredEmployees: prev.injuredEmployees.map((employee, i) =>
                i === employeeIndex ? {
                    ...employee,
                    medicalTreatment: {
                        ...employee.medicalTreatment,
                        medicalDocuments: [...(employee.medicalTreatment.medicalDocuments || []), newDocument]
                    }
                } : employee
            ),
            updatedAt: new Date()
        }));
    };

    const initializeMedicalDocuments = (employeeIndex: number) => {
        setFormData(prev => ({
            ...prev,
            injuredEmployees: prev.injuredEmployees.map((employee, i) =>
                i === employeeIndex ? {
                    ...employee,
                    medicalTreatment: {
                        ...employee.medicalTreatment,
                        medicalDocuments: employee.medicalTreatment.medicalDocuments && employee.medicalTreatment.medicalDocuments.length > 0
                            ? employee.medicalTreatment.medicalDocuments
                            : [{
                                documentName: '',
                                medicalInstitution: '',
                                validUntil: ''
                            }]
                    }
                } : employee
            ),
            updatedAt: new Date()
        }));
    };

    const removeMedicalDocument = async (employeeIndex: number, documentIndex: number) => {
        const employee = formData.injuredEmployees[employeeIndex];
        const document = employee.medicalTreatment.medicalDocuments?.[documentIndex];

        if (!document) return;

        const confirmMessage = `האם אתה בטוח שברצונך למחוק את המסמך הרפואי "${document.documentName || 'ללא שם'}"?`;

        const confirmed = window.confirm(confirmMessage);

        if (confirmed) {
            try {
                // Delete file from Blob storage if it exists
                if (document.fileUrl) {
                    try {
                        const response = await fetch('/api/upload/delete-file', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ fileUrl: document.fileUrl })
                        });

                        if (!response.ok) {
                            console.warn('Failed to delete file from Blob storage:', document.fileUrl);
                            throw new Error('Failed to delete file from storage');
                        }
                    } catch (error) {
                        console.warn('Error deleting file from Blob storage:', error);
                        throw error;
                    }
                }

                // Delete thumbnail from Blob storage if it exists
                if (document.thumbnailUrl) {
                    try {
                        const thumbnailResponse = await fetch('/api/upload/delete-file', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ fileUrl: document.thumbnailUrl })
                        });

                        if (!thumbnailResponse.ok) {
                            console.warn('Failed to delete thumbnail from Blob storage:', document.thumbnailUrl);
                            // Don't throw error for thumbnail deletion failure
                        }
                    } catch (error) {
                        console.warn('Error deleting thumbnail from Blob storage:', error);
                        // Don't throw error for thumbnail deletion failure
                    }
                }

                // Remove document from state
                setFormData(prev => ({
                    ...prev,
                    injuredEmployees: prev.injuredEmployees.map((emp, i) =>
                        i === employeeIndex ? {
                            ...emp,
                            medicalTreatment: {
                                ...emp.medicalTreatment,
                                medicalDocuments: emp.medicalTreatment.medicalDocuments?.filter((_, docIdx) => docIdx !== documentIndex) || []
                            }
                        } : emp
                    ),
                    updatedAt: new Date()
                }));

                // Show success message
                setSnackbar({
                    open: true,
                    message: 'המסמך הרפואי נמחק בהצלחה',
                    severity: 'success'
                });

            } catch (error) {
                console.error('Error deleting medical document:', error);
                setSnackbar({
                    open: true,
                    message: 'שגיאה במחיקת המסמך הרפואי',
                    severity: 'error'
                });
            }
        }
    };

    const updateMedicalDocument = (employeeIndex: number, documentIndex: number, field: keyof MedicalDocument, value: any) => {
        setFormData(prev => ({
            ...prev,
            injuredEmployees: prev.injuredEmployees.map((employee, i) =>
                i === employeeIndex ? {
                    ...employee,
                    medicalTreatment: {
                        ...employee.medicalTreatment,
                        medicalDocuments: employee.medicalTreatment.medicalDocuments?.map((doc, docIndex) =>
                            docIndex === documentIndex ? { ...doc, [field]: value } : doc
                        ) || []
                    }
                } : employee
            ),
            updatedAt: new Date()
        }));
    };

    const updateInjuredEmployeeReport = (index: number, reportType: 'nationalInsuranceReport' | 'laborMinistryReport' | 'policeReport', field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            injuredEmployees: prev.injuredEmployees.map((employee, i) =>
                i === index ? {
                    ...employee,
                    [reportType]: { ...employee[reportType], [field]: value }
                } : employee
            ),
            updatedAt: new Date()
        }));
    };

    const toggleEmployeeExpansion = (index: number) => {
        setExpandedEmployees(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const validateIsraeliID = (id: string): boolean => {
        // Remove any non-numeric characters
        const cleanId = id.replace(/\D/g, '');

        // Check if it's 9 digits
        if (cleanId.length !== 9) return false;

        // Israeli ID validation algorithm
        let sum = 0;
        for (let i = 0; i < 8; i++) {
            let digit = parseInt(cleanId[i]);
            if (i % 2 === 1) {
                digit *= 2;
                if (digit > 9) {
                    digit = Math.floor(digit / 10) + (digit % 10);
                }
            }
            sum += digit;
        }

        const checkDigit = (10 - (sum % 10)) % 10;
        const isValid = checkDigit === parseInt(cleanId[8]);

        console.log('🔍 ID Validation:', {
            id: cleanId,
            sum: sum,
            checkDigit: checkDigit,
            lastDigit: parseInt(cleanId[8]),
            isValid: isValid
        });

        return isValid;
    };

    const handleIDChange = (index: number, value: string) => {
        // Only allow numeric input
        const numericValue = value.replace(/\D/g, '');
        updateInjuredEmployee(index, 'idNumber', numericValue);
    };

    const validateIsraeliMobile = (phone: string): boolean => {
        const cleanPhone = phone.replace(/\D/g, ''); // Remove non-digits
        // Check for common Israeli mobile prefixes (050, 052, 053, 054, 055, 058, 059, 072, 073, 074, 076, 077, 079) and 10 digits total
        return /^(05[0-9]|07[0-9])\d{7}$/.test(cleanPhone) && cleanPhone.length === 10;
    };

    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const formatNumber = (value: number): string => {
        return value.toLocaleString('he-IL');
    };

    const parseFormattedNumber = (value: string): number => {
        return parseFloat(value.replace(/,/g, '')) || 0;
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

            console.log('🔍 handleSave - isEditMode:', isEditMode, 'claimId:', claimId);
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
                } else if (isEditMode) {
                    console.log('🔍 Successfully updated existing claim:', claimId);
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
                                        {formData.bodilyInjuryEmployee === true && (
                                            <Box>
                                                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                                    חבות מעבידים
                                                </Typography>

                                                {(formData.injuredEmployees || []).map((employee, index) => {
                                                    // Safety check to ensure employee object exists and has required properties
                                                    if (!employee) {
                                                        console.warn('Employee object is undefined at index:', index);
                                                        return null;
                                                    }

                                                    console.log(`🔍 Rendering employee ${index}:`, employee);
                                                    console.log(`🔍 Employee fullName:`, employee.fullName);

                                                    return (
                                                        <Paper key={index} sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0' }}>
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                                                                    פרטי העובד
                                                                </Typography>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    <MuiIconButton
                                                                        onClick={() => toggleEmployeeExpansion(index)}
                                                                        sx={{
                                                                            color: '#6b47c1',
                                                                            padding: '4px',
                                                                            '&:hover': {
                                                                                backgroundColor: '#f3f0ff'
                                                                            }
                                                                        }}
                                                                    >
                                                                        <img 
                                                                            src={expandedEmployees[index] ? "/assets/iconArrowOpenUp.svg" : "/assets/iconArrowOpenDown.svg"} 
                                                                            alt={expandedEmployees[index] ? "סגור" : "פתח"} 
                                                                            style={{ width: '16px', height: '16px' }} 
                                                                        />
                                                                    </MuiIconButton>
                                                                    {!(index === 0 && formData.bodilyInjuryEmployee === true) && (
                                                                        <MuiIconButton
                                                                            onClick={() => removeInjuredEmployee(index)}
                                                                            sx={{
                                                                                color: '#f44336',
                                                                                '&:hover': {
                                                                                    backgroundColor: '#d32f2f',
                                                                                    color: 'white'
                                                                                }
                                                                            }}
                                                                        >
                                                                            <img src="/assets/icon-trash.svg" alt="מחק" style={{ width: '16px', height: '16px' }} />
                                                                        </MuiIconButton>
                                                                    )}
                                                                </Box>
                                                            </Box>

                                                            {/* Always show first row (name and ID) */}
                                                            <Grid container spacing={2} sx={{ mb: 2 }}>
                                                                <Grid item xs={12} sm={6}>
                                                                    <TextField
                                                                        fullWidth
                                                                        label="שם הנפגע"
                                                                        value={employee.fullName}
                                                                        onChange={(e) => updateInjuredEmployee(index, 'fullName', e.target.value)}
                                                                        variant="outlined"
                                                                        sx={{
                                                                            '& .MuiOutlinedInput-root': {
                                                                                '&:hover fieldset': { borderColor: '#6b47c1' },
                                                                                '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
                                                                            },
                                                                            '& .MuiInputLabel-root.Mui-focused': { color: '#6b47c1' }
                                                                        }}
                                                                    />
                                                                </Grid>
                                                                <Grid item xs={12} sm={6}>
                                                                    <TextField
                                                                        fullWidth
                                                                        label="מספר תעודת זהות"
                                                                        value={employee.idNumber}
                                                                        onChange={(e) => handleIDChange(index, e.target.value)}
                                                                        variant="outlined"
                                                                        inputProps={{ maxLength: 9 }}
                                                                        error={employee.idNumber.length > 0 && (employee.idNumber.length < 9 || !validateIsraeliID(employee.idNumber))}
                                                                        helperText={
                                                                            employee.idNumber.length > 0 && employee.idNumber.length < 9
                                                                                ? 'תעודת זהות חייבת להכיל 9 ספרות'
                                                                                : employee.idNumber.length === 9 && !validateIsraeliID(employee.idNumber)
                                                                                    ? 'מספר תעודת זהות לא תקין'
                                                                                    : ''
                                                                        }
                                                                        sx={{
                                                                            '& .MuiOutlinedInput-root': {
                                                                                '&:hover fieldset': { borderColor: '#6b47c1' },
                                                                                '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
                                                                            },
                                                                            '& .MuiInputLabel-root.Mui-focused': { color: '#6b47c1' }
                                                                        }}
                                                                    />
                                                                </Grid>
                                                            </Grid>

                                                            {/* Show rest of content only when expanded */}
                                                            {expandedEmployees[index] !== false && (
                                                                <>
                                                                    <Grid item xs={12} sm={6}>
                                                                            <TextField
                                                                                fullWidth
                                                                                type="date"
                                                                                label="תאריך לידה"
                                                                                value={employee.birthDate}
                                                                                onChange={(e) => updateInjuredEmployee(index, 'birthDate', e.target.value)}
                                                                                variant="outlined"
                                                                                InputLabelProps={{ shrink: true }}
                                                                                sx={{
                                                                                    '& .MuiOutlinedInput-root': {
                                                                                        '&:hover fieldset': { borderColor: '#6b47c1' },
                                                                                        '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
                                                                                    },
                                                                                    '& .MuiInputLabel-root.Mui-focused': { color: '#6b47c1' }
                                                                                }}
                                                                            />
                                                                        </Grid>
                                                                        <Grid item xs={12} sm={6}>
                                                                            <TextField
                                                                                fullWidth
                                                                                label="כתובת מגורים"
                                                                                value={employee.address}
                                                                                onChange={(e) => updateInjuredEmployee(index, 'address', e.target.value)}
                                                                                variant="outlined"
                                                                                sx={{
                                                                                    '& .MuiOutlinedInput-root': {
                                                                                        '&:hover fieldset': { borderColor: '#6b47c1' },
                                                                                        '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
                                                                                    },
                                                                                    '& .MuiInputLabel-root.Mui-focused': { color: '#6b47c1' }
                                                                                }}
                                                                            />
                                                                        </Grid>
                                                                        <Grid item xs={12} sm={6}>
                                                                            <TextField
                                                                                fullWidth
                                                                                label="תפקיד העובד באתר"
                                                                                value={employee.jobTitle}
                                                                                onChange={(e) => updateInjuredEmployee(index, 'jobTitle', e.target.value)}
                                                                                variant="outlined"
                                                                                sx={{
                                                                                    '& .MuiOutlinedInput-root': {
                                                                                        '&:hover fieldset': { borderColor: '#6b47c1' },
                                                                                        '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
                                                                                    },
                                                                                    '& .MuiInputLabel-root.Mui-focused': { color: '#6b47c1' }
                                                                                }}
                                                                            />
                                                                        </Grid>
                                                                        <Grid item xs={12} sm={6}>
                                                                            <FormControl component="fieldset">
                                                                                <FormLabel component="legend" sx={{ color: '#666666' }}>הועסק אצל המבוטח או דרך קבלן משנה</FormLabel>
                                                                                <RadioGroup
                                                                                    value={employee.employmentType}
                                                                                    onChange={(e) => updateInjuredEmployee(index, 'employmentType', e.target.value)}
                                                                                    row
                                                                                >
                                                                                    <FormControlLabel value="direct" control={<Radio />} label="מבוטח" />
                                                                                    <FormControlLabel value="subcontractor" control={<Radio />} label="קבלן משנה" />
                                                                                </RadioGroup>
                                                                            </FormControl>
                                                                        </Grid>
                                                                        {employee.employmentType === 'subcontractor' && (
                                                                            <Grid item xs={12} sm={6}>
                                                                                <FormControl fullWidth variant="outlined">
                                                                                    <InputLabel>שם קבלן המשנה</InputLabel>
                                                                                    <Select
                                                                                        value={employee.subcontractorName || ''}
                                                                                        onChange={(e) => updateInjuredEmployee(index, 'subcontractorName', e.target.value)}
                                                                                        label="שם קבלן המשנה"
                                                                                        sx={{
                                                                                            '& .MuiOutlinedInput-root': {
                                                                                                '&:hover fieldset': { borderColor: '#6b47c1' },
                                                                                                '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
                                                                                            },
                                                                                            '& .MuiInputLabel-root.Mui-focused': { color: '#6b47c1' }
                                                                                        }}
                                                                                    >
                                                                                        {subcontractors.length === 0 ? (
                                                                                            <MenuItem disabled>
                                                                                                אין קבלני משנה זמינים
                                                                                            </MenuItem>
                                                                                        ) : (
                                                                                            subcontractors.map((subcontractor, subIndex) => (
                                                                                                <MenuItem key={subIndex} value={subcontractor.companyName || subcontractor.name || subcontractor.subcontractorName}>
                                                                                                    {subcontractor.companyName || subcontractor.name || subcontractor.subcontractorName}
                                                                                                </MenuItem>
                                                                                            ))
                                                                                        )}
                                                                                    </Select>
                                                                                </FormControl>
                                                                            </Grid>
                                                                        )}
                                                                    </Grid>

                                                                    {/* Work Dates and Salary */}
                                                                    <Grid container spacing={2} sx={{ mb: 2 }}>
                                                                        <Grid item xs={12} sm={6}>
                                                                            <TextField
                                                                                fullWidth
                                                                                type="date"
                                                                                label="תאריך תחילת עבודה"
                                                                                value={employee.startDate}
                                                                                onChange={(e) => updateInjuredEmployee(index, 'startDate', e.target.value)}
                                                                                variant="outlined"
                                                                                InputLabelProps={{ shrink: true }}
                                                                                sx={{
                                                                                    '& .MuiOutlinedInput-root': {
                                                                                        '&:hover fieldset': { borderColor: '#6b47c1' },
                                                                                        '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
                                                                                    },
                                                                                    '& .MuiInputLabel-root.Mui-focused': { color: '#6b47c1' }
                                                                                }}
                                                                            />
                                                                        </Grid>
                                                                        <Grid item xs={12} sm={6}>
                                                                            <TextField
                                                                                fullWidth
                                                                                type="date"
                                                                                label="תאריך חזרה לעבודה"
                                                                                value={employee.returnToWorkDate || ''}
                                                                                onChange={(e) => updateInjuredEmployee(index, 'returnToWorkDate', e.target.value)}
                                                                                variant="outlined"
                                                                                InputLabelProps={{ shrink: true }}
                                                                                sx={{
                                                                                    '& .MuiOutlinedInput-root': {
                                                                                        '&:hover fieldset': { borderColor: '#6b47c1' },
                                                                                        '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
                                                                                    },
                                                                                    '& .MuiInputLabel-root.Mui-focused': { color: '#6b47c1' }
                                                                                }}
                                                                            />
                                                                        </Grid>
                                                                        <Grid item xs={12} sm={6}>
                                                                            <TextField
                                                                                fullWidth
                                                                                label="גובה המשכורת האחרונה (ש״ח)"
                                                                                value={formatNumber(employee.lastSalary)}
                                                                                onChange={(e) => updateInjuredEmployee(index, 'lastSalary', parseFormattedNumber(e.target.value))}
                                                                                variant="outlined"
                                                                                sx={{
                                                                                    '& .MuiOutlinedInput-root': {
                                                                                        '&:hover fieldset': { borderColor: '#6b47c1' },
                                                                                        '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
                                                                                    },
                                                                                    '& .MuiInputLabel-root.Mui-focused': { color: '#6b47c1' }
                                                                                }}
                                                                            />
                                                                        </Grid>
                                                                    </Grid>

                                                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                                                        פרטי המנהל הישיר
                                                                    </Typography>
                                                                    <Grid container spacing={2} sx={{ mb: 2 }}>
                                                                        <Grid item xs={12} sm={6}>
                                                                            <TextField
                                                                                fullWidth
                                                                                label="שם מלא"
                                                                                value={employee.directManager.fullName}
                                                                                onChange={(e) => updateInjuredEmployeeManager(index, 'fullName', e.target.value)}
                                                                                variant="outlined"
                                                                                sx={{
                                                                                    '& .MuiOutlinedInput-root': {
                                                                                        '&:hover fieldset': { borderColor: '#6b47c1' },
                                                                                        '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
                                                                                    },
                                                                                    '& .MuiInputLabel-root.Mui-focused': { color: '#6b47c1' }
                                                                                }}
                                                                            />
                                                                        </Grid>
                                                                        <Grid item xs={12} sm={6}>
                                                                            <TextField
                                                                                fullWidth
                                                                                label="טלפון נייד"
                                                                                value={employee.directManager.phone}
                                                                                onChange={(e) => updateInjuredEmployeeManager(index, 'phone', e.target.value)}
                                                                                variant="outlined"
                                                                                error={employee.directManager.phone.length > 0 && !validateIsraeliMobile(employee.directManager.phone)}
                                                                                helperText={employee.directManager.phone.length > 0 && !validateIsraeliMobile(employee.directManager.phone) ? 'מספר טלפון לא תקין' : ''}
                                                                                sx={{
                                                                                    '& .MuiOutlinedInput-root': {
                                                                                        '&:hover fieldset': { borderColor: '#6b47c1' },
                                                                                        '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
                                                                                    },
                                                                                    '& .MuiInputLabel-root.Mui-focused': { color: '#6b47c1' }
                                                                                }}
                                                                            />
                                                                        </Grid>
                                                                        <Grid item xs={12} sm={6}>
                                                                            <TextField
                                                                                fullWidth
                                                                                label="אימייל"
                                                                                value={employee.directManager.email}
                                                                                onChange={(e) => updateInjuredEmployeeManager(index, 'email', e.target.value)}
                                                                                variant="outlined"
                                                                                error={employee.directManager.email.length > 0 && !validateEmail(employee.directManager.email)}
                                                                                helperText={employee.directManager.email.length > 0 && !validateEmail(employee.directManager.email) ? 'כתובת אימייל לא תקינה' : ''}
                                                                                sx={{
                                                                                    '& .MuiOutlinedInput-root': {
                                                                                        '&:hover fieldset': { borderColor: '#6b47c1' },
                                                                                        '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
                                                                                    },
                                                                                    '& .MuiInputLabel-root.Mui-focused': { color: '#6b47c1' }
                                                                                }}
                                                                            />
                                                                        </Grid>
                                                                        <Grid item xs={12} sm={6}>
                                                                            <TextField
                                                                                fullWidth
                                                                                label="תפקיד"
                                                                                value={employee.directManager.position}
                                                                                onChange={(e) => updateInjuredEmployeeManager(index, 'position', e.target.value)}
                                                                                variant="outlined"
                                                                                sx={{
                                                                                    '& .MuiOutlinedInput-root': {
                                                                                        '&:hover fieldset': { borderColor: '#6b47c1' },
                                                                                        '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
                                                                                    },
                                                                                    '& .MuiInputLabel-root.Mui-focused': { color: '#6b47c1' }
                                                                                }}
                                                                            />
                                                                        </Grid>
                                                                    </Grid>

                                                                    <Box sx={{ mt: 4 }}>
                                                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                                                            פרטי בא כח
                                                                        </Typography>
                                                                        <Box sx={{
                                                                            display: 'grid',
                                                                            gridTemplateColumns: '1fr 1fr',
                                                                            gap: 2
                                                                        }}>
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
                                                                                        מיוצג על ידי בא כח
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
                                                                                            onClick={() => updateInjuredEmployeeRepresentative(index, 'represented', false)}
                                                                                            sx={{
                                                                                                borderRadius: '0 4px 4px 0',
                                                                                                border: '1px solid #d1d5db',
                                                                                                borderLeft: 'none',
                                                                                                backgroundColor: !employee.representative.represented ? '#6b47c1' : 'transparent',
                                                                                                color: !employee.representative.represented ? 'white' : '#6b47c1',
                                                                                                '&:hover': {
                                                                                                    backgroundColor: !employee.representative.represented ? '#5a3aa1' : '#f3f4f6',
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
                                                                                            onClick={() => updateInjuredEmployeeRepresentative(index, 'represented', true)}
                                                                                            sx={{
                                                                                                borderRadius: '4px 0 0 4px',
                                                                                                border: '1px solid #d1d5db',
                                                                                                backgroundColor: employee.representative.represented ? '#6b47c1' : 'transparent',
                                                                                                color: employee.representative.represented ? 'white' : '#6b47c1',
                                                                                                '&:hover': {
                                                                                                    backgroundColor: employee.representative.represented ? '#5a3aa1' : '#f3f4f6',
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
                                                                            <Box></Box>
                                                                        </Box>
                                                                    </Box>

                                                                    {employee.representative.represented && (
                                                                        <Grid container spacing={3} sx={{ mb: 2, mt: 2 }}>
                                                                            <Grid item xs={12} sm={6}>
                                                                                <TextField
                                                                                    fullWidth
                                                                                    label="שם המייצג"
                                                                                    value={employee.representative.name || ''}
                                                                                    onChange={(e) => updateInjuredEmployeeRepresentative(index, 'name', e.target.value)}
                                                                                    variant="outlined"
                                                                                    sx={{
                                                                                        '& .MuiOutlinedInput-root': {
                                                                                            '&:hover fieldset': { borderColor: '#6b47c1' },
                                                                                            '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
                                                                                        },
                                                                                        '& .MuiInputLabel-root.Mui-focused': { color: '#6b47c1' }
                                                                                    }}
                                                                                />
                                                                            </Grid>
                                                                            <Grid item xs={12} sm={6}>
                                                                                <TextField
                                                                                    fullWidth
                                                                                    label="כתובת"
                                                                                    value={employee.representative.address || ''}
                                                                                    onChange={(e) => updateInjuredEmployeeRepresentative(index, 'address', e.target.value)}
                                                                                    variant="outlined"
                                                                                    sx={{
                                                                                        '& .MuiOutlinedInput-root': {
                                                                                            '&:hover fieldset': { borderColor: '#6b47c1' },
                                                                                            '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
                                                                                        },
                                                                                        '& .MuiInputLabel-root.Mui-focused': { color: '#6b47c1' }
                                                                                    }}
                                                                                />
                                                                            </Grid>
                                                                            <Grid item xs={12} sm={6}>
                                                                                <TextField
                                                                                    fullWidth
                                                                                    label="טלפון"
                                                                                    value={employee.representative.phone || ''}
                                                                                    onChange={(e) => updateInjuredEmployeeRepresentative(index, 'phone', e.target.value)}
                                                                                    variant="outlined"
                                                                                    error={employee.representative.phone && employee.representative.phone.length > 0 && !validateIsraeliMobile(employee.representative.phone)}
                                                                                    helperText={employee.representative.phone && employee.representative.phone.length > 0 && !validateIsraeliMobile(employee.representative.phone) ? 'מספר טלפון לא תקין' : ''}
                                                                                    sx={{
                                                                                        '& .MuiOutlinedInput-root': {
                                                                                            '&:hover fieldset': { borderColor: '#6b47c1' },
                                                                                            '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
                                                                                        },
                                                                                        '& .MuiInputLabel-root.Mui-focused': { color: '#6b47c1' }
                                                                                    }}
                                                                                />
                                                                            </Grid>
                                                                            <Grid item xs={12} sm={6}>
                                                                                <TextField
                                                                                    fullWidth
                                                                                    label="אימייל"
                                                                                    value={employee.representative.email || ''}
                                                                                    onChange={(e) => updateInjuredEmployeeRepresentative(index, 'email', e.target.value)}
                                                                                    variant="outlined"
                                                                                    error={employee.representative.email && employee.representative.email.length > 0 && !validateEmail(employee.representative.email)}
                                                                                    helperText={employee.representative.email && employee.representative.email.length > 0 && !validateEmail(employee.representative.email) ? 'כתובת אימייל לא תקינה' : ''}
                                                                                    sx={{
                                                                                        '& .MuiOutlinedInput-root': {
                                                                                            '&:hover fieldset': { borderColor: '#6b47c1' },
                                                                                            '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
                                                                                        },
                                                                                        '& .MuiInputLabel-root.Mui-focused': { color: '#6b47c1' }
                                                                                    }}
                                                                                />
                                                                            </Grid>
                                                                        </Grid>
                                                                    )}

                                                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2, mt: 4, color: 'text.secondary' }}>
                                                                        מהות הנזק
                                                                    </Typography>
                                                                    <TextField
                                                                        fullWidth
                                                                        multiline
                                                                        rows={3}
                                                                        label="מהות הנזק או הפגיעה"
                                                                        value={employee.injuryDescription}
                                                                        onChange={(e) => updateInjuredEmployee(index, 'injuryDescription', e.target.value)}
                                                                        variant="outlined"
                                                                        sx={{
                                                                            mb: 3,
                                                                            '& .MuiOutlinedInput-root': {
                                                                                '&:hover fieldset': { borderColor: '#6b47c1' },
                                                                                '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
                                                                            },
                                                                            '& .MuiInputLabel-root.Mui-focused': { color: '#6b47c1' }
                                                                        }}
                                                                    />

                                                                    <Box sx={{ mt: 3 }}>
                                                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                                                            טיפול רפואי
                                                                        </Typography>
                                                                        <Box sx={{
                                                                            display: 'grid',
                                                                            gridTemplateColumns: '1fr 1fr',
                                                                            gap: 2
                                                                        }}>
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
                                                                                        טיפול רפואי
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
                                                                                            onClick={() => updateInjuredEmployeeMedical(index, 'received', false)}
                                                                                            sx={{
                                                                                                borderRadius: '0 4px 4px 0',
                                                                                                border: '1px solid #d1d5db',
                                                                                                borderLeft: 'none',
                                                                                                backgroundColor: !employee.medicalTreatment.received ? '#6b47c1' : 'transparent',
                                                                                                color: !employee.medicalTreatment.received ? 'white' : '#6b47c1',
                                                                                                '&:hover': {
                                                                                                    backgroundColor: !employee.medicalTreatment.received ? '#5a3aa1' : '#f3f4f6',
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
                                                                                            onClick={() => {
                                                                                                updateInjuredEmployeeMedical(index, 'received', true);
                                                                                                if (!employee.medicalTreatment.medicalDocuments || employee.medicalTreatment.medicalDocuments.length === 0) {
                                                                                                    initializeMedicalDocuments(index);
                                                                                                }
                                                                                            }}
                                                                                            sx={{
                                                                                                borderRadius: '4px 0 0 4px',
                                                                                                border: '1px solid #d1d5db',
                                                                                                backgroundColor: employee.medicalTreatment.received ? '#6b47c1' : 'transparent',
                                                                                                color: employee.medicalTreatment.received ? 'white' : '#6b47c1',
                                                                                                '&:hover': {
                                                                                                    backgroundColor: employee.medicalTreatment.received ? '#5a3aa1' : '#f3f4f6',
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
                                                                            <Box></Box>
                                                                        </Box>
                                                                    </Box>

                                                                    {employee.medicalTreatment.received && (
                                                                        <Box sx={{ width: '100%', mt: 2 }}>
                                                                            <TableContainer component={Paper} sx={{ mb: 2 }}>
                                                                                <Table size="small">
                                                                                    <TableHead>
                                                                                        <TableRow>
                                                                                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>שם המסמך</TableCell>
                                                                                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>מוסד רפואי</TableCell>
                                                                                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>קובץ</TableCell>
                                                                                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>תאריך תוקף</TableCell>
                                                                                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}></TableCell>
                                                                                        </TableRow>
                                                                                    </TableHead>
                                                                                    <TableBody>
                                                                                        {(employee.medicalTreatment.medicalDocuments || []).map((document, docIndex) => (
                                                                                            <TableRow key={docIndex}>
                                                                                                <TableCell>
                                                                                                    <TextField
                                                                                                        fullWidth
                                                                                                        size="small"
                                                                                                        value={document.documentName}
                                                                                                        onChange={(e) => updateMedicalDocument(index, docIndex, 'documentName', e.target.value)}
                                                                                                        variant="outlined"
                                                                                                        sx={{
                                                                                                            '& .MuiOutlinedInput-root': {
                                                                                                                '&:hover fieldset': { borderColor: '#6b47c1' },
                                                                                                                '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
                                                                                                            },
                                                                                                            '& .MuiInputLabel-root.Mui-focused': { color: '#6b47c1' }
                                                                                                        }}
                                                                                                    />
                                                                                                </TableCell>
                                                                                                <TableCell>
                                                                                                    <TextField
                                                                                                        fullWidth
                                                                                                        size="small"
                                                                                                        value={document.medicalInstitution}
                                                                                                        onChange={(e) => updateMedicalDocument(index, docIndex, 'medicalInstitution', e.target.value)}
                                                                                                        variant="outlined"
                                                                                                        sx={{
                                                                                                            '& .MuiOutlinedInput-root': {
                                                                                                                '&:hover fieldset': { borderColor: '#6b47c1' },
                                                                                                                '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
                                                                                                            },
                                                                                                            '& .MuiInputLabel-root.Mui-focused': { color: '#6b47c1' }
                                                                                                        }}
                                                                                                    />
                                                                                                </TableCell>
                                                                                                <TableCell>
                                                                                                    <FileUpload
                                                                                                        label="מסמך רפואי"
                                                                                                        value={document.fileUrl || ''}
                                                                                                        thumbnailUrl={document.thumbnailUrl || ''}
                                                                                                        onChange={(url, thumbnailUrl) => {
                                                                                                            updateMedicalDocument(index, docIndex, 'fileUrl', url);
                                                                                                            updateMedicalDocument(index, docIndex, 'thumbnailUrl', thumbnailUrl);
                                                                                                        }}
                                                                                                        onDelete={async () => {
                                                                                                            // Show confirmation dialog
                                                                                                            const confirmMessage = `האם אתה בטוח שברצונך למחוק את הקובץ "${document.documentName || 'ללא שם'}"?`;

                                                                                                            const confirmed = window.confirm(confirmMessage);

                                                                                                            if (!confirmed) {
                                                                                                                throw new Error('User cancelled deletion'); // Throw error to prevent UI clearing
                                                                                                            }

                                                                                                            // Delete file from Blob storage
                                                                                                            if (document.fileUrl) {
                                                                                                                try {
                                                                                                                    const response = await fetch('/api/upload/delete-file', {
                                                                                                                        method: 'POST',
                                                                                                                        headers: {
                                                                                                                            'Content-Type': 'application/json',
                                                                                                                        },
                                                                                                                        body: JSON.stringify({ fileUrl: document.fileUrl })
                                                                                                                    });

                                                                                                                    if (!response.ok) {
                                                                                                                        console.warn('Failed to delete file from Blob storage:', document.fileUrl);
                                                                                                                        throw new Error('Failed to delete file from storage');
                                                                                                                    }
                                                                                                                } catch (error) {
                                                                                                                    console.warn('Error deleting file from Blob storage:', error);
                                                                                                                    throw error;
                                                                                                                }
                                                                                                            }

                                                                                                            // Delete thumbnail from Blob storage
                                                                                                            if (document.thumbnailUrl) {
                                                                                                                try {
                                                                                                                    const thumbnailResponse = await fetch('/api/upload/delete-file', {
                                                                                                                        method: 'POST',
                                                                                                                        headers: {
                                                                                                                            'Content-Type': 'application/json',
                                                                                                                        },
                                                                                                                        body: JSON.stringify({ fileUrl: document.thumbnailUrl })
                                                                                                                    });

                                                                                                                    if (!thumbnailResponse.ok) {
                                                                                                                        console.warn('Failed to delete thumbnail from Blob storage:', document.thumbnailUrl);
                                                                                                                        // Don't throw error for thumbnail deletion failure
                                                                                                                    }
                                                                                                                } catch (error) {
                                                                                                                    console.warn('Error deleting thumbnail from Blob storage:', error);
                                                                                                                    // Don't throw error for thumbnail deletion failure
                                                                                                                }
                                                                                                            }

                                                                                                            // Clear the file URLs in the document
                                                                                                            updateMedicalDocument(index, docIndex, 'fileUrl', '');
                                                                                                            updateMedicalDocument(index, docIndex, 'thumbnailUrl', '');

                                                                                                            // Show success message
                                                                                                            setSnackbar({
                                                                                                                open: true,
                                                                                                                message: 'הקובץ נמחק בהצלחה',
                                                                                                                severity: 'success'
                                                                                                            });
                                                                                                        }}
                                                                                                        projectId={formData.projectId}
                                                                                                        accept=".pdf,.jpg,.jpeg,.png"
                                                                                                    />
                                                                                                </TableCell>
                                                                                                <TableCell>
                                                                                                    <TextField
                                                                                                        fullWidth
                                                                                                        size="small"
                                                                                                        type="date"
                                                                                                        value={document.validUntil || ''}
                                                                                                        onChange={(e) => updateMedicalDocument(index, docIndex, 'validUntil', e.target.value)}
                                                                                                        variant="outlined"
                                                                                                        InputLabelProps={{ shrink: true }}
                                                                                                        sx={{
                                                                                                            '& .MuiOutlinedInput-root': {
                                                                                                                '&:hover fieldset': { borderColor: '#6b47c1' },
                                                                                                                '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
                                                                                                            },
                                                                                                            '& .MuiInputLabel-root.Mui-focused': { color: '#6b47c1' }
                                                                                                        }}
                                                                                                    />
                                                                                                </TableCell>
                                                                                                <TableCell>
                                                                                                    {docIndex > 0 && (
                                                                                                        <MuiIconButton
                                                                                                            onClick={() => removeMedicalDocument(index, docIndex)}
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
                                                                                                    )}
                                                                                                </TableCell>
                                                                                            </TableRow>
                                                                                        ))}
                                                                                        <TableRow>
                                                                                            <TableCell colSpan={5} sx={{ textAlign: 'center', border: 'none', py: 2 }}>
                                                                                                <Button
                                                                                                    variant="outlined"
                                                                                                    onClick={() => addMedicalDocument(index)}
                                                                                                    sx={{
                                                                                                        borderColor: '#6b47c1',
                                                                                                        color: '#6b47c1',
                                                                                                        backgroundColor: 'white',
                                                                                                        '&:hover': {
                                                                                                            borderColor: '#5a3aa1',
                                                                                                            color: '#5a3aa1',
                                                                                                            backgroundColor: '#f3f0ff'
                                                                                                        }
                                                                                                    }}
                                                                                                >
                                                                                                    הוספה
                                                                                                </Button>
                                                                                            </TableCell>
                                                                                        </TableRow>
                                                                                    </TableBody>
                                                                                </Table>
                                                                            </TableContainer>
                                                                        </Box>
                                                                    )}

                                                                    <Box sx={{ mt: 3 }}>
                                                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                                                            דיווחים
                                                                        </Typography>

                                                                        <Grid container spacing={2}>
                                                                            <Grid item xs={12} sm={4}>
                                                                                <Typography variant="body2" sx={{ mb: 1 }}>מוסד לביטוח לאומי</Typography>
                                                                                <FormControl component="fieldset">
                                                                                    <RadioGroup
                                                                                        value={employee.nationalInsuranceReport.reported}
                                                                                        onChange={(e) => updateInjuredEmployeeReport(index, 'nationalInsuranceReport', 'reported', e.target.value === 'true')}
                                                                                        row
                                                                                    >
                                                                                        <FormControlLabel value={false} control={<Radio />} label="לא" />
                                                                                        <FormControlLabel value={true} control={<Radio />} label="כן" />
                                                                                    </RadioGroup>
                                                                                </FormControl>
                                                                                {employee.nationalInsuranceReport.reported && (
                                                                                    <Box sx={{ mt: 1 }}>
                                                                                        <TextField
                                                                                            fullWidth
                                                                                            type="date"
                                                                                            label="תאריך דיווח"
                                                                                            value={employee.nationalInsuranceReport.reportDate || ''}
                                                                                            onChange={(e) => updateInjuredEmployeeReport(index, 'nationalInsuranceReport', 'reportDate', e.target.value)}
                                                                                            variant="outlined"
                                                                                            InputLabelProps={{ shrink: true }}
                                                                                            sx={{ mb: 1 }}
                                                                                        />
                                                                                        <Button
                                                                                            variant="outlined"
                                                                                            component="label"
                                                                                            size="small"
                                                                                            sx={{
                                                                                                borderColor: '#6b47c1',
                                                                                                color: '#6b47c1',
                                                                                                '&:hover': { borderColor: '#5a3aa1', backgroundColor: '#f3f0ff' }
                                                                                            }}
                                                                                        >
                                                                                            העלה אישור דיווח
                                                                                            <input type="file" hidden />
                                                                                        </Button>
                                                                                    </Box>
                                                                                )}
                                                                            </Grid>

                                                                            <Grid item xs={12} sm={4}>
                                                                                <Typography variant="body2" sx={{ mb: 1 }}>משרד העבודה</Typography>
                                                                                <FormControl component="fieldset">
                                                                                    <RadioGroup
                                                                                        value={employee.laborMinistryReport.reported}
                                                                                        onChange={(e) => updateInjuredEmployeeReport(index, 'laborMinistryReport', 'reported', e.target.value === 'true')}
                                                                                        row
                                                                                    >
                                                                                        <FormControlLabel value={false} control={<Radio />} label="לא" />
                                                                                        <FormControlLabel value={true} control={<Radio />} label="כן" />
                                                                                    </RadioGroup>
                                                                                </FormControl>
                                                                                {employee.laborMinistryReport.reported && (
                                                                                    <Box sx={{ mt: 1 }}>
                                                                                        <TextField
                                                                                            fullWidth
                                                                                            type="date"
                                                                                            label="תאריך דיווח"
                                                                                            value={employee.laborMinistryReport.reportDate || ''}
                                                                                            onChange={(e) => updateInjuredEmployeeReport(index, 'laborMinistryReport', 'reportDate', e.target.value)}
                                                                                            variant="outlined"
                                                                                            InputLabelProps={{ shrink: true }}
                                                                                            sx={{ mb: 1 }}
                                                                                        />
                                                                                        <Button
                                                                                            variant="outlined"
                                                                                            component="label"
                                                                                            size="small"
                                                                                            sx={{
                                                                                                borderColor: '#6b47c1',
                                                                                                color: '#6b47c1',
                                                                                                '&:hover': { borderColor: '#5a3aa1', backgroundColor: '#f3f0ff' }
                                                                                            }}
                                                                                        >
                                                                                            העלה אישור דיווח
                                                                                            <input type="file" hidden />
                                                                                        </Button>
                                                                                    </Box>
                                                                                )}
                                                                            </Grid>

                                                                            <Grid item xs={12} sm={4}>
                                                                                <Typography variant="body2" sx={{ mb: 1 }}>משטרה</Typography>
                                                                                <FormControl component="fieldset">
                                                                                    <RadioGroup
                                                                                        value={employee.policeReport.reported}
                                                                                        onChange={(e) => updateInjuredEmployeeReport(index, 'policeReport', 'reported', e.target.value === 'true')}
                                                                                        row
                                                                                    >
                                                                                        <FormControlLabel value={false} control={<Radio />} label="לא" />
                                                                                        <FormControlLabel value={true} control={<Radio />} label="כן" />
                                                                                    </RadioGroup>
                                                                                </FormControl>
                                                                                {employee.policeReport.reported && (
                                                                                    <Box sx={{ mt: 1 }}>
                                                                                        <TextField
                                                                                            fullWidth
                                                                                            label="שם התחנה"
                                                                                            value={employee.policeReport.stationName || ''}
                                                                                            onChange={(e) => updateInjuredEmployeeReport(index, 'policeReport', 'stationName', e.target.value)}
                                                                                            variant="outlined"
                                                                                            sx={{ mb: 1 }}
                                                                                        />
                                                                                        <TextField
                                                                                            fullWidth
                                                                                            type="date"
                                                                                            label="תאריך דיווח"
                                                                                            value={employee.policeReport.reportDate || ''}
                                                                                            onChange={(e) => updateInjuredEmployeeReport(index, 'policeReport', 'reportDate', e.target.value)}
                                                                                            variant="outlined"
                                                                                            InputLabelProps={{ shrink: true }}
                                                                                            sx={{ mb: 1 }}
                                                                                        />
                                                                                        <Button
                                                                                            variant="outlined"
                                                                                            component="label"
                                                                                            size="small"
                                                                                            sx={{
                                                                                                borderColor: '#6b47c1',
                                                                                                color: '#6b47c1',
                                                                                                '&:hover': { borderColor: '#5a3aa1', backgroundColor: '#f3f0ff' }
                                                                                            }}
                                                                                        >
                                                                                            העלה אישור דיווח
                                                                                            <input type="file" hidden />
                                                                                        </Button>
                                                                                    </Box>
                                                                                )}
                                                                            </Grid>
                                                                        </Grid>
                                                                    </Box>
                                                                </>
                                                            )}
                                                        </Paper>
                                                    );
                                                })}

                                                <Button
                                                    variant="contained"
                                                    startIcon={<AddIcon />}
                                                    onClick={addInjuredEmployee}
                                                    sx={{
                                                        bgcolor: '#6b47c1',
                                                        '&:hover': { bgcolor: '#5a3aa1' }
                                                    }}
                                                >
                                                    הוספה
                                                </Button>
                                            </Box>
                                        )}
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
