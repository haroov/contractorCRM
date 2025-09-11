import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, Button, Tabs, Tab, TextField, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Checkbox, IconButton, Grid, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip, Autocomplete } from '@mui/material';
import { CloudUpload as CloudUploadIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

interface ContractorTabsSimpleProps {
    contractor?: any;
    onSave?: (contractor: any) => void;
    onClose?: () => void;
    isContactUser?: boolean;
    contactUserPermissions?: string;
    currentUser?: any;
    isSaving?: boolean;
}

export default function ContractorTabsSimple({
    contractor,
    onSave,
    onClose,
    isContactUser = false,
    contactUserPermissions,
    currentUser,
    isSaving = false
}: ContractorTabsSimpleProps) {
    const [activeTab, setActiveTab] = useState(0);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [uploadType, setUploadType] = useState<'safety' | 'iso' | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<{ [key: string]: string }>({});
    const [isUploading, setIsUploading] = useState(false);
    const [contactDialogOpen, setContactDialogOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<any>(null);
    const [contactEmailError, setContactEmailError] = useState<string>('');
    const [contactPhoneError, setContactPhoneError] = useState<string>('');
    const [companyIdError, setCompanyIdError] = useState<string>('');
    const [emailError, setEmailError] = useState<string>('');
    const [localCompanyId, setLocalCompanyId] = useState<string>(contractor?.company_id || '');
    const [localCompanyType, setLocalCompanyType] = useState<string>(contractor?.companyType || 'private_company');
    const [isLoadingCompanyData, setIsLoadingCompanyData] = useState<boolean>(false);
    const [companyStatusIndicator, setCompanyStatusIndicator] = useState<string>('');

    // Function to get tooltip text for status indicator
    const getStatusTooltipText = (statusIndicator: string): string => {
        switch (statusIndicator) {
            case '🔴':
                return 'חברה לא פעילה - סטטוס החברה ברשם החברות אינו "פעילה"';
            case '🟡':
                return 'חברה עם בעיות - יש הפרות או דוח שנתי ישן (מעל שנתיים)';
            case '🟢':
                return 'חברה תקינה - פעילה, ללא הפרות, דוח שנתי עדכני';
            default:
                return 'אין מידע זמין על מצב החברה';
        }
    };

    // Function to get Hebrew text for safety rating value
    const getSafetyRatingText = (value: string): string => {
        switch (value) {
            case '0':
                return 'ללא כוכבים';
            case '1':
                return '1 כוכב';
            case '2':
                return '2 כוכבים';
            case '3':
                return '3 כוכבים';
            case '4':
                return '4 כוכבים';
            case '5':
                return '5 כוכבים';
            case '6':
                return '6 כוכבים (זהב)';
            default:
                return 'ללא כוכבים';
        }
    };

    // Validation functions
    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePhone = (phone: string): boolean => {
        // Israeli phone number validation (10 digits, can start with 0 or +972)
        const phoneRegex = /^(\+972|0)?[2-9]\d{7,8}$/;
        return phoneRegex.test(phone.replace(/[\s-]/g, ''));
    };

    // Function to check if email domain is a company domain (not personal email providers)
    const isCompanyDomain = (email: string): boolean => {
        if (!email || !email.includes('@')) return false;
        
        const domain = email.split('@')[1].toLowerCase();
        const personalEmailProviders = [
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'walla.co.il',
            'nana.co.il', 'bezeqint.net', 'netvision.net.il', '012.net.il',
            'aol.com', 'icloud.com', 'me.com', 'mac.com', 'live.com', 'msn.com'
        ];
        
        return !personalEmailProviders.includes(domain);
    };

    // Function to calculate website from email domain (only for company domains)
    const calculateWebsiteFromEmail = (email: string): string => {
        if (!email || !email.includes('@')) {
            return '';
        }
        
        const domain = email.split('@')[1];
        if (!domain) return '';

        // Use the same logic as generateWebsiteFromEmail
        const freeEmailProviders = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'walla.co.il', 'nana10.co.il'];
        if (freeEmailProviders.includes(domain.toLowerCase())) {
            return '';
        }

        return `https://www.${domain}`;
    };

    // Function to get Hebrew text for company type value
    const getCompanyTypeText = (value: string): string => {
        switch (value) {
            case 'private_company':
                return 'חברה פרטית';
            case 'public_company':
                return 'חברה ציבורית';
            case 'authorized_dealer':
                return 'עוסק מורשה';
            case 'exempt_dealer':
                return 'עוסק פטור';
            case 'cooperative':
                return 'אגודה שיתופית';
            case 'non_profit':
                return 'עמותה רשומה';
            default:
                return 'חברה פרטית';
        }
    };

    // Function to map company type from API to English value
    const mapCompanyTypeFromAPI = (apiCompanyType: string): string => {
        if (!apiCompanyType) return 'private_company';

        const type = apiCompanyType.toLowerCase();
        if (type.includes('ישראלית חברה פרטית') || type.includes('חברה פרטית')) {
            return 'private_company';
        } else if (type.includes('ישראלית חברה ציבורית') || type.includes('חברה ציבורית')) {
            return 'public_company';
        } else if (type.includes('אגודה שיתופית')) {
            return 'cooperative';
        } else if (type.includes('עוסק מורשה')) {
            return 'authorized_dealer';
        } else if (type.includes('עוסק פטור')) {
            return 'exempt_dealer';
        } else {
            return 'private_company'; // Default fallback
        }
    };

    // Function to generate website from email
    const generateWebsiteFromEmail = (email: string): string => {
        if (!email) return '';
        const domain = email.split('@')[1];
        if (!domain) return '';

        const freeEmailProviders = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'walla.co.il', 'nana10.co.il'];
        if (freeEmailProviders.includes(domain?.toLowerCase() || '')) {
            return '';
        }

        return `https://www.${domain}`;
    };

    // Function to scrape company information from website
    const scrapeCompanyInfo = async (websiteUrl: string) => {
        if (!websiteUrl) return;

        setIsLoadingAbout(true);
        try {
            const response = await fetch('/api/scrape-company-info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ website: websiteUrl })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setCompanyAbout(data.about || '');
                    setCompanyLogo(data.logo || '');
                    console.log('✅ Company info scraped successfully:', { about: data.about, logo: data.logo });
                } else {
                    console.warn('⚠️ Scraping returned unsuccessful:', data);
                }
            } else {
                // Handle rate limiting and other HTTP errors
                if (response.status === 429) {
                    console.warn('⚠️ Rate limit exceeded for scraping. Please wait before trying again.');
                    setCompanyAbout('מידע זמנית לא זמין - יותר מדי בקשות. נסה שוב בעוד כמה דקות.');
                } else {
                    console.error('❌ HTTP error scraping company info:', response.status, response.statusText);
                    setCompanyAbout('שגיאה בטעינת מידע מהאתר. נסה שוב מאוחר יותר.');
                }
            }
        } catch (error) {
            console.error('❌ Error scraping company info:', error);
            setCompanyAbout('שגיאה בטעינת מידע מהאתר. נסה שוב מאוחר יותר.');
        } finally {
            setIsLoadingAbout(false);
        }
    };

    // Local states for company data fields
    const [localName, setLocalName] = useState<string>(contractor?.name || '');
    const [localNameEnglish, setLocalNameEnglish] = useState<string>(contractor?.nameEnglish || '');
    const [localFoundationDate, setLocalFoundationDate] = useState<string>(contractor?.foundationDate || '');
    const [localAddress, setLocalAddress] = useState<string>(contractor?.address || '');
    const [localCity, setLocalCity] = useState<string>(contractor?.city || '');
    const [localEmail, setLocalEmail] = useState<string>(contractor?.email || '');
    const [localPhone, setLocalPhone] = useState<string>(contractor?.phone || '');
    const [localWebsite, setLocalWebsite] = useState<string>(contractor?.website || '');
    const [localContractorId, setLocalContractorId] = useState<string>(contractor?.contractor_id || '');
    const [localEmployees, setLocalEmployees] = useState<string>(contractor?.employees || contractor?.numberOfEmployees || '');

    // Local states for additional contractor data
    const [localContacts, setLocalContacts] = useState<any[]>(contractor?.contacts || []);
    const [localProjects, setLocalProjects] = useState<any[]>(contractor?.projects || []);
    const [localNotes, setLocalNotes] = useState<{ general: string, internal: string }>(contractor?.notes || { general: '', internal: '' });
    const [localSafetyRating, setLocalSafetyRating] = useState<string>(contractor?.safetyRating || '0');
    const [localSafetyExpiry, setLocalSafetyExpiry] = useState<string>(contractor?.safetyExpiry || '');
    const [localSafetyCertificate, setLocalSafetyCertificate] = useState<string>(contractor?.safetyCertificate || '');
    const [localIso45001, setLocalIso45001] = useState<boolean>(contractor?.iso45001 || false);
    const [localIsoExpiry, setLocalIsoExpiry] = useState<string>(contractor?.isoExpiry || '');
    const [localIsoCertificate, setLocalIsoCertificate] = useState<string>(contractor?.isoCertificate || '');
    const [localClassifications, setLocalClassifications] = useState<any[]>(contractor?.classifications || []);

    // Company about section states
    const [companyAbout, setCompanyAbout] = useState<string>(contractor?.companyAbout || '');
    const [companyLogo, setCompanyLogo] = useState<string>(contractor?.companyLogo || '');
    const [isLoadingAbout, setIsLoadingAbout] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Check if user can edit based on contact user permissions
    const canEdit = !isContactUser || contactUserPermissions === 'contactAdmin' || contactUserPermissions === 'admin';

    // Debug logging for canEdit
    console.log('🔧 canEdit debug:', {
        isContactUser,
        contactUserPermissions,
        canEdit
    });

    // Common styling for TextFields with choco purple focus
    const textFieldSx = {
        '& .MuiOutlinedInput-root': {
            '& fieldset': {
                borderColor: '#d0d0d0'
            },
            '&:hover fieldset': {
                borderColor: '#9c27b0'
            },
            '&.Mui-focused fieldset': {
                borderColor: '#9c27b0'
            }
        },
        '& .MuiInputLabel-root': {
            color: '#666666',
            '&.Mui-focused': {
                color: '#9c27b0'
            }
        }
    };

    // Update local states when contractor changes
    useEffect(() => {
        setLocalCompanyId(contractor?.company_id || '');
        setLocalCompanyType(contractor?.companyType || 'private_company');
        setLocalName(contractor?.name || '');
        setLocalNameEnglish(contractor?.nameEnglish || '');
        setLocalFoundationDate(contractor?.foundationDate || '');
        setLocalAddress(contractor?.address || '');
        setLocalCity(contractor?.city || '');
        setLocalEmail(contractor?.email || '');
        setLocalPhone(contractor?.phone || '');
        setLocalWebsite(contractor?.website || '');
        setLocalContractorId(contractor?.contractor_id || '');
        setLocalEmployees(contractor?.employees || contractor?.numberOfEmployees || '');

        // Update additional contractor data
        setLocalContacts(contractor?.contacts || []);
        setLocalProjects(contractor?.projects || []);
        setLocalNotes(contractor?.notes || { general: '', internal: '' });
        setLocalSafetyRating(contractor?.safetyRating || '0');
        setLocalSafetyExpiry(contractor?.safetyExpiry || '');
        setLocalSafetyCertificate(contractor?.safetyCertificate || '');
        setLocalIso45001(contractor?.iso45001 || false);
        setLocalIsoExpiry(contractor?.isoExpiry || '');
        setLocalIsoCertificate(contractor?.isoCertificate || '');
        setLocalClassifications(contractor?.classifications || []);

        // Update company about section
        setCompanyAbout(contractor?.companyAbout || '');
        setCompanyLogo(contractor?.companyLogo || '');

        // Load status indicator for existing contractors
        if (contractor?.company_id && contractor._id) {
            loadStatusForExistingContractor(contractor.company_id);
        }
    }, [contractor]);


    // Auto-scrape company info when website changes
    useEffect(() => {
        if (localWebsite && localWebsite.startsWith('http')) {
            console.log('🌐 Website changed, scraping company info:', localWebsite);
            scrapeCompanyInfo(localWebsite);
        }
    }, [localWebsite]);

    // Listen for save events from the header button
    useEffect(() => {
        const handleSaveEvent = () => {
            console.log('🔘 Save event received in ContractorTabsSimple');
            handleSave();
        };

        window.addEventListener('saveContractor', handleSaveEvent);

        return () => {
            window.removeEventListener('saveContractor', handleSaveEvent);
        };
    }, [contractor, localCompanyId, localCompanyType, localName, localNameEnglish, localFoundationDate, localAddress, localCity, localEmail, localPhone, localWebsite, localContractorId, localEmployees, localContacts, localProjects, localNotes, localSafetyRating, localSafetyExpiry, localSafetyCertificate, localIso45001, localIsoExpiry, localIsoCertificate, localClassifications, companyAbout, companyLogo]);

    // Function to validate Israeli company ID (ח״פ) like Israeli ID
    const validateIsraeliCompanyId = (companyId: string): boolean => {
        if (!companyId || companyId.length !== 9) {
            return false;
        }

        // Check if all characters are digits
        if (!/^\d{9}$/.test(companyId)) {
            return false;
        }

        // Israeli company ID validation algorithm (similar to Israeli ID)
        let sum = 0;
        for (let i = 0; i < 8; i++) {
            let digit = parseInt(companyId[i]);
            let multiplier = (i % 2) + 1;
            let product = digit * multiplier;

            // If product is greater than 9, sum the digits
            if (product > 9) {
                product = Math.floor(product / 10) + (product % 10);
            }

            sum += product;
        }

        // Calculate check digit
        const checkDigit = (10 - (sum % 10)) % 10;
        const lastDigit = parseInt(companyId[8]);

        return checkDigit === lastDigit;
    };

    // Function to determine company type based on company ID
    const getCompanyTypeFromId = (companyId: string): string => {
        if (!companyId || companyId.length < 2) {
            return 'private_company'; // Default to private company
        }

        const prefix = companyId.substring(0, 2);

        switch (prefix) {
            case '51':
                return 'private_company';
            case '52':
                return 'public_company';
            case '57':
                return 'cooperative_association';
            default:
                // If doesn't start with 5, it's usually עוסק מורשה
                return 'authorized_dealer';
        }
    };

    const handleSave = () => {
        if (onSave && contractor) {
            console.log('💾 Starting save process...');

            // Update contractor with local values before saving
            const updatedContractor = {
                ...contractor,
                // Basic company info
                company_id: localCompanyId || undefined, // Use undefined instead of empty string
                companyType: localCompanyType,
                name: localName,
                nameEnglish: localNameEnglish,
                foundationDate: localFoundationDate,
                address: localAddress,
                city: localCity,
                email: localEmail,
                phone: localPhone,
                website: localWebsite,
                contractor_id: localContractorId,
                employees: localEmployees,
                numberOfEmployees: localEmployees ? parseInt(localEmployees) : undefined,
                // Additional contractor data
                contacts: localContacts,
                projects: localProjects,
                notes: localNotes,
                safetyRating: localSafetyRating,
                safetyExpiry: localSafetyExpiry,
                safetyCertificate: localSafetyCertificate,
                iso45001: localIso45001,
                isoExpiry: localIsoExpiry,
                isoCertificate: localIsoCertificate,
                classifications: localClassifications,
                // Company about section
                companyAbout: companyAbout,
                companyLogo: companyLogo
            };

            console.log('💾 Saving contractor data:', {
                company_id: updatedContractor.company_id,
                name: updatedContractor.name,
                contractor_id: updatedContractor.contractor_id
            });

            onSave(updatedContractor);
        }
    };

    const handleUploadClick = (type: 'safety' | 'iso') => {
        setUploadType(type);
        setUploadDialogOpen(true);
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && uploadType) {
            // Check file type
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
            if (!allowedTypes.includes(file.type)) {
                alert('אנא בחר קובץ PDF או תמונה (JPG, PNG)');
                return;
            }

            // Check file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('גודל הקובץ גדול מדי. מקסימום 10MB');
                return;
            }

            setIsUploading(true);

            try {
                // Convert file to base64
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                // Save to database
                const fileData = {
                    contractorId: contractor?._id,
                    fileType: uploadType,
                    fileName: file.name,
                    fileSize: file.size,
                    mimeType: file.type,
                    data: base64,
                    uploadedAt: new Date().toISOString()
                };

                // Call API to save file
                const headers: { [key: string]: string } = {
                    'Content-Type': 'application/json'
                };

                // Add authentication headers based on user type
                const token = localStorage.getItem('token');
                const contactUser = localStorage.getItem('contactUser');
                const contactSessionId = localStorage.getItem('contactSessionId');

                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                if (contactUser) {
                    headers['Contact-User'] = contactUser;
                }

                if (contactSessionId) {
                    headers['Contact-Session'] = contactSessionId;
                }

                const response = await fetch('/api/contractors/upload-certificate', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(fileData)
                });

                if (response.ok) {
                    // Create preview URL for display
                    const fileUrl = URL.createObjectURL(file);
                    setUploadedFiles(prev => ({
                        ...prev,
                        [uploadType]: fileUrl
                    }));

                    // Update contractor data
                    if (contractor) {
                        const updatedContractor = {
                            ...contractor,
                            [`${uploadType}Certificate`]: {
                                fileName: file.name,
                                uploadedAt: new Date().toISOString(),
                                fileSize: file.size
                            }
                        };
                        if (onSave) {
                            onSave(updatedContractor);
                        }
                    }

                    alert('הקובץ הועלה בהצלחה!');
                } else {
                    throw new Error('שגיאה בהעלאת הקובץ');
                }
            } catch (error) {
                console.error('Error uploading file:', error);
                alert('שגיאה בהעלאת הקובץ. אנא נסה שוב.');
            } finally {
                setIsUploading(false);
                setUploadDialogOpen(false);
                setUploadType(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        }
    };

    const handleCloseUploadDialog = () => {
        setUploadDialogOpen(false);
        setUploadType(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleAddContact = () => {
        setEditingContact(null);
        setContactDialogOpen(true);
    };

    const handleEditContact = (contact: any) => {
        setEditingContact(contact);
        setContactDialogOpen(true);
    };

    const handleDeleteContact = async (contactId: string) => {
        if (window.confirm('האם אתה בטוח שברצונך למחוק את איש הקשר?')) {
            try {
                // Remove from local state
                const updatedContacts = localContacts.filter(contact => contact.id !== contactId);
                setLocalContacts(updatedContacts);

                // Save to server by triggering the main save
                if (onSave) {
                    const updatedContractor = {
                        ...contractor,
                        contacts: updatedContacts
                    };
                    onSave(updatedContractor);
                }

                console.log('Contact deleted successfully:', contactId);
            } catch (error) {
                console.error('Error deleting contact:', error);
            }
        }
    };

    const handleCloseContactDialog = () => {
        setContactDialogOpen(false);
        setEditingContact(null);
        setContactEmailError('');
        setContactPhoneError('');
    };

    const handleSaveContact = async () => {
        // Get form data from the dialog
        const form = document.querySelector('#contact-dialog-form') as HTMLFormElement;
        if (!form) return;

        const formData = new FormData(form);
        const contactData = {
            fullName: formData.get('name') as string,
            role: formData.get('role') as string,
            mobile: formData.get('phone') as string,
            email: formData.get('email') as string,
            permissions: formData.get('permissions') as string
        };

        // Validate email and phone
        let hasErrors = false;

        if (contactData.email && !validateEmail(contactData.email)) {
            setContactEmailError('כתובת אימייל לא תקינה');
            hasErrors = true;
        } else {
            setContactEmailError('');
        }

        if (contactData.mobile && !validatePhone(contactData.mobile)) {
            setContactPhoneError('מספר טלפון לא תקין');
            hasErrors = true;
        } else {
            setContactPhoneError('');
        }

        if (hasErrors) {
            return; // Don't save if there are validation errors
        }

        console.log('Saving contact:', contactData);

        try {
            let updatedContacts;

            if (editingContact) {
                // Update existing contact
                updatedContacts = localContacts.map(contact =>
                    contact.id === editingContact.id
                        ? { ...contact, ...contactData }
                        : contact
                );
            } else {
                // Add new contact
                const newContact = {
                    id: Date.now().toString(),
                    ...contactData
                };
                updatedContacts = [...localContacts, newContact];
            }

            // Update local state first
            setLocalContacts(updatedContacts);

            // Save to server by triggering the main save
            if (onSave) {
                const updatedContractor = {
                    ...contractor,
                    contacts: updatedContacts
                };
                onSave(updatedContractor);
            }

            handleCloseContactDialog();
        } catch (error) {
            console.error('Error saving contact:', error);
        }
    };

    // Load status indicator for existing contractors
    const loadStatusForExistingContractor = async (companyId: string) => {
        try {
            console.log('Loading status for existing contractor:', companyId);
            const response = await fetch(`http://localhost:3001/api/search-company/${companyId}`);
            const result = await response.json();

            if (result.success && result.data.statusIndicator) {
                setCompanyStatusIndicator(result.data.statusIndicator);
                console.log('✅ Loaded status indicator for existing contractor:', result.data.statusIndicator);
            }
        } catch (error) {
            console.error('Error loading status for existing contractor:', error);
        }
    };

    // Function to sync data from both Companies Registry and Contractors Registry APIs
    const syncDataFromBothAPIs = async (companyId: string) => {
        console.log('🔄 Syncing data from both APIs for company ID:', companyId);
        
        try {
            // Use our backend API endpoint that handles external API calls
            console.log('📊 Fetching data through backend API...');
            const response = await fetch(`http://localhost:3001/api/search-company/${companyId}?force_refresh=true`);
            const result = await response.json();
            
            if (result.success && result.data) {
                console.log('✅ Data fetched successfully:', result.data);
                
                // Populate form with the data
                await populateFormWithApiData(result.data);
            } else {
                throw new Error('לא נמצאו נתונים במאגרים החיצוניים');
            }
            
        } catch (error) {
            console.error('❌ Error syncing data:', error);
            throw error;
        }
    };

    // New function to handle the complete validation and data fetching flow
    const validateAndFetchCompanyData = async (companyId: string, forceRefresh: boolean = false) => {
        setIsLoadingCompanyData(true);
        try {
            console.log('🔍 Starting validation flow for company ID:', companyId);
            console.log('🔍 Force refresh:', forceRefresh);

            // Step 2: Check MongoDB Atlas first for existing contractor
            console.log('📊 Step 2: Checking MongoDB Atlas for existing contractor...');
            const response = await fetch(`http://localhost:3001/api/search-company/${companyId}`);
            const result = await response.json();
            console.log('📊 MongoDB search response:', result);

            if (result.success) {
                const companyData = result.data;
                console.log(`✅ Found company in ${result.source}:`, companyData.name);
                console.log('🔍 result.source:', result.source);
                console.log('🔍 forceRefresh:', forceRefresh);

                if ((result.source === 'mongodb_cached' || result.source === 'mongodb_updated') && !forceRefresh) {
                    // Step 2a: Found existing contractor in MongoDB - load all contractor data
                    console.log('📊 Step 2a: Loading existing contractor data from MongoDB...');
                    await loadExistingContractorData(companyData);
                } else {
                    // Step 2b: Found in external API or force refresh - populate form with API data
                    console.log('📊 Step 2b: Populating form with API data...');
                    await populateFormWithApiData(companyData);
                }
            } else {
                // Step 3: Not found in MongoDB - check Companies Registry API
                console.log('📊 Step 3: Not found in MongoDB, checking Companies Registry API...');
                setCompanyIdError('חברה לא נמצאה במאגרי המידע');
            }
        } catch (error) {
            console.error('❌ Error in validation flow:', error);
            setCompanyIdError('שגיאה בטעינת נתוני החברה');
        } finally {
            setIsLoadingCompanyData(false);
        }
    };

    // Function to load existing contractor data from MongoDB
    const loadExistingContractorData = async (contractorData: any) => {
        console.log('📊 Loading existing contractor data:', contractorData);
        console.log('📊 Contractor name:', contractorData.name);
        console.log('📊 Contractor phone:', contractorData.phone);

        // Check if contractor is archived
        if (contractorData.isActive === false) {
            console.log('📋 Loading archived contractor - will be reactivated on save');
        }

        // Update all local states with existing contractor data
        console.log('📊 Setting local name:', contractorData.name);
        setLocalName(contractorData.name || '');
        setLocalNameEnglish(contractorData.nameEnglish || '');
        setLocalFoundationDate(contractorData.foundationDate || '');
        setLocalAddress(contractorData.address || '');
        setLocalCity(contractorData.city || '');
        setLocalEmail(contractorData.email || '');
        console.log('📊 Setting local phone:', contractorData.phone);
        setLocalPhone(contractorData.phone || '');
        setLocalWebsite(contractorData.website || '');
        setLocalContractorId(contractorData.contractor_id || contractorData.contractorId || '');
        setLocalEmployees(contractorData.employees || contractorData.numberOfEmployees || '');
        setLocalCompanyType(contractorData.companyType || 'private_company');
        
        // IMPORTANT: Set the company ID from existing contractor data
        if (contractorData.company_id) {
            console.log('📊 Setting local company ID:', contractorData.company_id);
            setLocalCompanyId(contractorData.company_id);
        }
        setLocalSafetyRating(contractorData.safetyRating || '0');
        setLocalIso45001(contractorData.iso45001 || false);
        setLocalClassifications(contractorData.classifications || []);
        setCompanyAbout(contractorData.companyAbout || '');
        setCompanyLogo(contractorData.companyLogo || '');

        // Update contacts and projects if they exist
        if (contractorData.contacts) {
            setLocalContacts(contractorData.contacts);
        }
        if (contractorData.projects) {
            setLocalProjects(contractorData.projects);
        }
        if (contractorData.notes) {
            setLocalNotes(contractorData.notes);
        }

        // Load status indicator
        if (contractorData.statusIndicator) {
            setCompanyStatusIndicator(contractorData.statusIndicator);
        }

        // Show notification that contractor was loaded
        const message = contractorData.isActive === false
            ? `הח״פ ${localCompanyId} כבר קיים במערכת (archived). נטען הקבלן "${contractorData.name}" עם כל הנתונים לעריכה.`
            : `הח״פ ${localCompanyId} כבר קיים במערכת. נטען הקבלן "${contractorData.name}" עם כל הנתונים לעריכה.`;

        // Show alert or notification
        alert(message);

        console.log('✅ Existing contractor data loaded successfully');
    };

    // Function to populate form with API data
    const populateFormWithApiData = async (companyData: any) => {
        console.log('📊 Populating form with API data:', companyData);

        // Show notification that data was refreshed from API
        const message = `נתונים עודכנו מרשם החברות ופנקס הקבלנים עבור "${companyData.name}".`;
        alert(message);

        // Clean up company name - replace בע~מ with בע״מ and remove double spaces
        const cleanName = (companyData.name || '')
            .replace(/בע~מ/g, 'בע״מ')
            .replace(/\s+/g, ' ')
            .trim();

        const cleanNameEnglish = (companyData.nameEnglish || '')
            .replace(/בע~מ/g, 'בע״מ')
            .replace(/\s+/g, ' ')
            .trim();

        // Update form fields with API data
        setLocalName(cleanName);
        setLocalNameEnglish(cleanNameEnglish);
        setLocalFoundationDate(companyData.foundationDate || '');
        setLocalAddress(companyData.address || '');
        setLocalCity(companyData.city || '');
        setLocalEmail(companyData.email || '');
        setLocalPhone(companyData.phone || '');
        setLocalWebsite(companyData.website || '');
        setLocalContractorId(companyData.contractor_id || '');
        setLocalEmployees(companyData.employees || '');
        
        // IMPORTANT: Keep the company ID alive during sync
        if (companyData.company_id) {
            setLocalCompanyId(companyData.company_id);
        }

        // Set company type from API (prioritize over local logic)
        if (companyData.companyType) {
            setLocalCompanyType(companyData.companyType);
        }

        // Set status indicator
        if (companyData.statusIndicator) {
            setCompanyStatusIndicator(companyData.statusIndicator);
        }

        // Set about and logo if available
        if (companyData.companyAbout) {
            setCompanyAbout(companyData.companyAbout);
        }
        if (companyData.companyLogo) {
            setCompanyLogo(companyData.companyLogo);
        }

        console.log('✅ Form populated with API data successfully');
    };

    const fetchCompanyData = async (companyId: string) => {
        setIsLoadingCompanyData(true);
        try {
            console.log('Fetching data for company ID:', companyId);

            // Use our new API endpoint that checks MongoDB first, then external APIs
            const response = await fetch(`http://localhost:3001/api/search-company/${companyId}`);
            const result = await response.json();
            console.log('Company search response:', result);

            if (result.success) {
                const companyData = result.data;
                console.log(`✅ Found company in ${result.source}:`, companyData.name);

                // Clean up company name - replace בע~מ with בע״מ and remove double spaces
                const cleanName = (companyData.name || '')
                    .replace(/בע~מ/g, 'בע״מ')
                    .replace(/\s+/g, ' ')
                    .trim();

                const cleanNameEnglish = (companyData.nameEnglish || '')
                    .replace(/\s+/g, ' ')
                    .trim();

                // Clean up address - remove double spaces
                const cleanAddress = (companyData.address || '')
                    .replace(/\s+/g, ' ')
                    .trim();

                // Update local states with cleaned data
                setLocalCompanyType(mapCompanyTypeFromAPI(companyData.companyType));
                setLocalName(cleanName);
                setLocalNameEnglish(cleanNameEnglish);
                setLocalFoundationDate(companyData.foundationDate || '');
                setLocalAddress(cleanAddress);
                setLocalCity(companyData.city || '');
                setLocalEmail(companyData.email || '');
                setLocalPhone(companyData.phone || '');
                setLocalWebsite(companyData.website || '');
                setLocalContractorId(companyData.contractor_id || '');
                setCompanyStatusIndicator(companyData.statusIndicator || '');

                // Update company about section if available
                if (companyData.companyAbout !== undefined) setCompanyAbout(companyData.companyAbout);
                if (companyData.companyLogo !== undefined) setCompanyLogo(companyData.companyLogo);

                // Update additional contractor data if available
                if (companyData.employees !== undefined) setLocalEmployees(companyData.employees);
                if (companyData.numberOfEmployees !== undefined) setLocalEmployees(companyData.numberOfEmployees.toString());
                if (companyData.contacts !== undefined) setLocalContacts(companyData.contacts);
                if (companyData.projects !== undefined) setLocalProjects(companyData.projects);
                if (companyData.notes !== undefined) setLocalNotes(companyData.notes);
                if (companyData.safetyRating !== undefined) setLocalSafetyRating(companyData.safetyRating);
                else setLocalSafetyRating('0'); // Default to "ללא כוכבים"
                if (companyData.safetyExpiry !== undefined) setLocalSafetyExpiry(companyData.safetyExpiry);
                if (companyData.safetyCertificate !== undefined) setLocalSafetyCertificate(companyData.safetyCertificate);
                if (companyData.iso45001 !== undefined) setLocalIso45001(companyData.iso45001);
                if (companyData.isoExpiry !== undefined) setLocalIsoExpiry(companyData.isoExpiry);
                if (companyData.isoCertificate !== undefined) setLocalIsoCertificate(companyData.isoCertificate);
                if (companyData.classifications !== undefined) {
                    console.log('📋 Loading classifications from API:', companyData.classifications);
                    setLocalClassifications(companyData.classifications);
                }

                console.log('✅ Updated local states with cleaned company data:', {
                    name: cleanName,
                    nameEnglish: cleanNameEnglish,
                    address: cleanAddress,
                    city: companyData.city,
                    foundationDate: companyData.foundationDate,
                    statusIndicator: companyData.statusIndicator
                });
            } else {
                console.log('No company data found for ID:', companyId);
            }
        } catch (error) {
            console.error('Error fetching company data:', error);
        } finally {
            setIsLoadingCompanyData(false);
        }
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                <Tabs
                    value={activeTab}
                    onChange={(e, newValue) => setActiveTab(newValue)}
                    sx={{
                        '& .MuiTab-root': {
                            color: 'text.secondary',
                            '&.Mui-selected': {
                                color: '#9c27b0' // סגול שוקו
                            }
                        },
                        '& .MuiTabs-indicator': {
                            backgroundColor: '#9c27b0' // סגול שוקו
                        }
                    }}
                >
                    <Tab label="פרטי חברה" />
                    <Tab label="מידע עסקי" />
                    <Tab label="פרויקטים" />
                    <Tab label="אנשי קשר" />
                    <Tab label="הערות" />
                </Tabs>
            </Box>

            {/* Tab Content */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                {activeTab === 0 && (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            פרטי חברה
                        </Typography>

                        <Grid container spacing={2}>
                            {/* שורה ראשונה */}
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="מספר חברה (ח״פ)"
                                    value={localCompanyId}
                                    disabled={!canEdit || !!contractor?._id}
                                    sx={{
                                        ...textFieldSx,
                                        '& .MuiInputBase-input': {
                                            textAlign: 'right'  // יישור הטקסט לימין
                                        }
                                    }}
                                    InputProps={{
                                        startAdornment: isLoadingCompanyData ? (
                                            <Box sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                marginLeft: '10px',
                                                marginRight: '8px'
                                            }}>
                                                <CircularProgress size={20} sx={{ color: '#9c27b0' }} />
                                            </Box>
                                        ) : companyStatusIndicator ? (
                                            <Tooltip
                                                title={getStatusTooltipText(companyStatusIndicator)}
                                                arrow
                                                placement="top"
                                            >
                                                <Box sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    marginLeft: '10px',
                                                    marginRight: '8px',
                                                    fontSize: '18px',
                                                    cursor: 'help'
                                                }}>
                                                    {companyStatusIndicator}
                                                </Box>
                                            </Tooltip>
                                        ) : null
                                    }}
                                    onChange={(e) => {
                                        const value = e.target.value;

                                        // Allow only digits and limit to 9 characters
                                        const numericValue = value.replace(/\D/g, '').slice(0, 9);
                                        setLocalCompanyId(numericValue);

                                        // Auto-set company type based on company ID prefix (local state only)
                                        // Only if we don't have data from API yet
                                        if (numericValue && numericValue.length >= 2 && !companyStatusIndicator) {
                                            const companyType = getCompanyTypeFromId(numericValue);
                                            setLocalCompanyType(companyType);
                                        }

                                        // Clear error and status indicator when user starts typing
                                        if (companyIdError) {
                                            setCompanyIdError('');
                                        }
                                        if (companyStatusIndicator) {
                                            setCompanyStatusIndicator('');
                                        }
                                    }}
                                    onBlur={async (e) => {
                                        const companyId = e.target.value;

                                        // Clear previous errors and status
                                        setCompanyIdError('');
                                        setCompanyStatusIndicator('');

                                        // Step 1: Validate Israeli ID checksum
                                        if (companyId && companyId.length === 9) {
                                            if (!validateIsraeliCompanyId(companyId)) {
                                                setCompanyIdError('מספר חברה לא תקין');
                                                return;
                                            }

                                            // Step 2: Check MongoDB Atlas first for existing contractor
                                            await validateAndFetchCompanyData(companyId);

                                        } else if (companyId && companyId.length > 0) {
                                            setCompanyIdError('נא להזין 9 ספרות');
                                        }
                                    }}
                                    error={!!companyIdError}
                                    helperText={companyIdError}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="מספר קבלן"
                                    value={localContractorId}
                                    disabled={true}
                                    sx={textFieldSx}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="שם החברה (עברית)"
                                    value={localName}
                                    disabled={!canEdit}
                                    sx={textFieldSx}
                                    onChange={(e) => setLocalName(e.target.value)}
                                    InputProps={{
                                        endAdornment: localCompanyId && localCompanyId.length === 9 ? (
                                            <Tooltip title="סנכרן נתונים מרשם החברות ופנקס הקבלנים">
                                                <IconButton
                                                    onClick={async () => {
                                                        if (localCompanyId && localCompanyId.length === 9) {
                                                            // Show confirmation dialog
                                                            const confirmed = window.confirm(
                                                                'האם אתה בטוח שאתה רוצה לסנכרן נתונים?\n\n' +
                                                                'הח״פ ' + localCompanyId + ' כבר קיים במערכת.\n\n' +
                                                                'פעולה זו תטען נתונים חדשים מרשם החברות ופנקס הקבלנים ותעדכן את הטופס.\n\n' +
                                                                'נתונים קיימים בטופס יוחלפו בנתונים מהמאגרים החיצוניים.'
                                                            );
                                                            
                                                            if (confirmed) {
                                                                setIsLoadingCompanyData(true);
                                                                try {
                                                                    // Load from both APIs
                                                                    await syncDataFromBothAPIs(localCompanyId);
                                                                } catch (error) {
                                                                    console.error('Error syncing data:', error);
                                                                    alert('שגיאה בסנכרון הנתונים');
                                                                } finally {
                                                                    setIsLoadingCompanyData(false);
                                                                }
                                                            }
                                                        }
                                                    }}
                                                    disabled={isLoadingCompanyData}
                                                    sx={{ 
                                                        color: '#9c27b0',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(156, 39, 176, 0.04)'
                                                        }
                                                    }}
                                                >
                                                    {isLoadingCompanyData ? (
                                                        <CircularProgress size={20} sx={{ color: '#9c27b0' }} />
                                                    ) : (
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                                                        </svg>
                                                    )}
                                                </IconButton>
                                            </Tooltip>
                                        ) : null
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="שם החברה (אנגלית)"
                                    value={localNameEnglish}
                                    disabled={!canEdit}
                                    sx={textFieldSx}
                                    onChange={(e) => setLocalNameEnglish(e.target.value)}
                                />
                            </Grid>

                            {/* שורה שנייה */}
                            <Grid item xs={12} sm={6} md={3}>
                                <FormControl fullWidth>
                                    <InputLabel sx={{
                                        backgroundColor: 'white',
                                        px: 1,
                                        '&.Mui-focused': {
                                            backgroundColor: 'white'
                                        }
                                    }}>
                                        סוג חברה
                                    </InputLabel>
                                    <Select
                                        value={localCompanyType}
                                        disabled={!canEdit}
                                        onChange={(e) => {
                                            console.log('🔧 Company type changed:', {
                                                value: e.target.value,
                                                text: getCompanyTypeText(e.target.value)
                                            });
                                            setLocalCompanyType(e.target.value);
                                        }}
                                        sx={{
                                            minWidth: '200px', // Fixed width for company type field
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderColor: '#d0d0d0'
                                            },
                                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                                borderColor: '#9c27b0'
                                            },
                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                borderColor: '#9c27b0'
                                            }
                                        }}
                                    >
                                        <MenuItem value="private_company">חברה פרטית</MenuItem>
                                        <MenuItem value="public_company">חברה ציבורית</MenuItem>
                                        <MenuItem value="authorized_dealer">עוסק מורשה</MenuItem>
                                        <MenuItem value="exempt_dealer">עוסק פטור</MenuItem>
                                        <MenuItem value="cooperative">אגודה שיתופית</MenuItem>
                                        <MenuItem value="non_profit">עמותה רשומה</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="תאריך התאגדות"
                                    type="date"
                                    value={localFoundationDate}
                                    disabled={!canEdit}
                                    sx={textFieldSx}
                                    onChange={(e) => setLocalFoundationDate(e.target.value)}
                                    InputLabelProps={{
                                        shrink: true,
                                        sx: {
                                            backgroundColor: 'white',
                                            px: 1
                                        }
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="מספר עובדים"
                                    type="number"
                                    value={localEmployees}
                                    disabled={!canEdit}
                                    sx={textFieldSx}
                                    onChange={(e) => setLocalEmployees(e.target.value)}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="עיר"
                                    value={localCity}
                                    disabled={!canEdit}
                                    sx={textFieldSx}
                                    onChange={(e) => setLocalCity(e.target.value)}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="כתובת"
                                    value={localAddress}
                                    disabled={!canEdit}
                                    sx={textFieldSx}
                                    onChange={(e) => setLocalAddress(e.target.value)}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="אימייל"
                                    value={localEmail}
                                    disabled={!canEdit}
                                    sx={textFieldSx}
                                    error={!!emailError}
                                    helperText={emailError}
                                    onChange={(e) => {
                                        setLocalEmail(e.target.value);
                                        // Clear error when user starts typing
                                        if (emailError) {
                                            setEmailError('');
                                        }
                                    }}
                                    onBlur={(e) => {
                                        const email = e.target.value.trim();
                                        if (email && !validateEmail(email)) {
                                            setEmailError('כתובת אימייל לא תקינה');
                                        } else {
                                            setEmailError('');
                                            // Calculate website from email if it's a company domain and website is empty
                                            if (email && !localWebsite) {
                                                const website = calculateWebsiteFromEmail(email);
                                                if (website) {
                                                    console.log('🌐 Auto-generating website from email:', {
                                                        email: email,
                                                        generatedWebsite: website
                                                    });
                                                    setLocalWebsite(website);
                                                }
                                            }
                                        }
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="אתר אינטרנט"
                                    value={localWebsite}
                                    disabled={!canEdit}
                                    sx={textFieldSx}
                                    onChange={(e) => setLocalWebsite(e.target.value)}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="טלפון"
                                    value={localPhone}
                                    disabled={!canEdit}
                                    sx={textFieldSx}
                                    onChange={(e) => setLocalPhone(e.target.value)}
                                />
                            </Grid>
                        </Grid>

                        {/* אודות החברה */}
                        <Box sx={{ mt: 3 }}>
                            <Typography variant="h6" gutterBottom>
                                אודות החברה
                            </Typography>

                            <Grid container spacing={2} alignItems="flex-start">
                                <Grid item xs={12} md={8}>
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                        <TextField
                                            fullWidth
                                            multiline
                                            rows={4}
                                            label="אודות החברה"
                                            value={companyAbout}
                                            disabled={!canEdit}
                                            sx={textFieldSx}
                                            onChange={(e) => setCompanyAbout(e.target.value)}
                                            placeholder="מידע על החברה יופיע כאן אוטומטית מאתר האינטרנט..."
                                            InputProps={{
                                                endAdornment: isLoadingAbout && (
                                                    <CircularProgress size={20} sx={{ color: '#9c27b0' }} />
                                                )
                                            }}
                                        />
                                        {localWebsite && canEdit && (
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={() => scrapeCompanyInfo(localWebsite)}
                                                disabled={isLoadingAbout}
                                                sx={{
                                                    minWidth: 'auto',
                                                    px: 2,
                                                    height: '56px',
                                                    borderColor: '#9c27b0',
                                                    color: '#9c27b0',
                                                    '&:hover': {
                                                        borderColor: '#7b1fa2',
                                                        backgroundColor: 'rgba(156, 39, 176, 0.04)'
                                                    },
                                                    '&:disabled': {
                                                        borderColor: '#d0d0d0',
                                                        color: '#d0d0d0'
                                                    }
                                                }}
                                            >
                                                {isLoadingAbout ? (
                                                    <CircularProgress size={20} sx={{ color: '#9c27b0' }} />
                                                ) : (
                                                    'סרוק מחדש'
                                                )}
                                            </Button>
                                        )}
                                    </Box>
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <Box sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        p: 2,
                                        border: '1px solid #e0e0e0',
                                        borderRadius: 1,
                                        minHeight: '120px',
                                        justifyContent: 'center'
                                    }}>
                                        {companyLogo ? (
                                            <img
                                                src={companyLogo}
                                                alt="לוגו החברה"
                                                style={{
                                                    maxWidth: '100%',
                                                    maxHeight: '100px',
                                                    objectFit: 'contain'
                                                }}
                                            />
                                        ) : (
                                            <Typography variant="body2" color="text.secondary" textAlign="center">
                                                {isLoadingAbout ? 'טוען לוגו...' : 'לוגו החברה יופיע כאן אוטומטית'}
                                            </Typography>
                                        )}
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>
                    </Box>
                )}

                {activeTab === 1 && (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            מידע עסקי
                        </Typography>

                        <Grid container spacing={2}>
                            {/* שורה ראשונה - כוכבי בטיחות */}
                            <Grid item xs={12} sm={6} md={3}>
                                <FormControl fullWidth>
                                    <InputLabel sx={{
                                        backgroundColor: 'white',
                                        px: 1,
                                        '&.Mui-focused': {
                                            backgroundColor: 'white'
                                        }
                                    }}>
                                        מספר כוכבי בטיחות
                                    </InputLabel>
                                    <Select
                                        value={localSafetyRating}
                                        disabled={!canEdit}
                                        onChange={(e) => {
                                            console.log('🔧 Safety rating changed:', {
                                                value: e.target.value,
                                                text: getSafetyRatingText(e.target.value)
                                            });
                                            setLocalSafetyRating(e.target.value);
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderColor: '#d0d0d0'
                                            },
                                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                                borderColor: '#9c27b0'
                                            },
                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                borderColor: '#9c27b0'
                                            }
                                        }}
                                    >
                                        <MenuItem value="0">ללא כוכבים</MenuItem>
                                        <MenuItem value="1">1 כוכב</MenuItem>
                                        <MenuItem value="2">2 כוכבים</MenuItem>
                                        <MenuItem value="3">3 כוכבים</MenuItem>
                                        <MenuItem value="4">4 כוכבים</MenuItem>
                                        <MenuItem value="5">5 כוכבים</MenuItem>
                                        <MenuItem value="6">6 כוכבים (זהב)</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="תאריך תוקף"
                                    type="date"
                                    value={contractor?.safetyRatingExpiry || ''}
                                    disabled={!canEdit}
                                    sx={textFieldSx}
                                    InputLabelProps={{
                                        shrink: true,
                                        sx: {
                                            backgroundColor: 'white',
                                            px: 1
                                        }
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 1 }}>
                                    <IconButton
                                        disabled={!canEdit}
                                        title="העלאת תעודת הסמכת כוכבי בטיחות"
                                        onClick={() => handleUploadClick('safety')}
                                        sx={{
                                            border: '1px solid #d0d0d0',
                                            borderRadius: 1,
                                            height: '56px',
                                            width: '56px',
                                            color: '#9c27b0', // סגול שוקו
                                            '&:hover': {
                                                backgroundColor: 'rgba(156, 39, 176, 0.04)',
                                                borderColor: '#9c27b0'
                                            }
                                        }}
                                    >
                                        <CloudUploadIcon />
                                    </IconButton>
                                    {uploadedFiles.safety && (
                                        <Box sx={{
                                            width: 40,
                                            height: 40,
                                            border: '1px solid #d0d0d0',
                                            borderRadius: 1,
                                            overflow: 'hidden',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <img
                                                src={uploadedFiles.safety}
                                                alt="תצוגה מקדימה"
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                        </Box>
                                    )}
                                </Box>
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                {/* מקום ריק לשורה הראשונה */}
                            </Grid>
                        </Grid>

                        {/* שורה שנייה - ISO45001 */}
                        <Grid container spacing={2} sx={{ mt: 3 }}>
                            <Grid item xs={12} sm={6} md={3}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={localIso45001}
                                            disabled={!canEdit}
                                            onChange={(e) => {
                                                setLocalIso45001(e.target.checked);
                                            }}
                                            sx={{
                                                color: '#9c27b0',
                                                '&.Mui-checked': {
                                                    color: '#9c27b0'
                                                }
                                            }}
                                        />
                                    }
                                    label="ISO45001"
                                    sx={{
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="תאריך תוקף"
                                    type="date"
                                    value={contractor?.iso45001Expiry || ''}
                                    disabled={!canEdit}
                                    sx={textFieldSx}
                                    InputLabelProps={{
                                        shrink: true,
                                        sx: {
                                            backgroundColor: 'white',
                                            px: 1
                                        }
                                    }}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 1 }}>
                                    <IconButton
                                        disabled={!canEdit}
                                        title="העלאת תעודת ISO45001"
                                        onClick={() => handleUploadClick('iso')}
                                        sx={{
                                            border: '1px solid #d0d0d0',
                                            borderRadius: 1,
                                            height: '56px',
                                            width: '56px',
                                            color: '#9c27b0', // סגול שוקו
                                            '&:hover': {
                                                backgroundColor: 'rgba(156, 39, 176, 0.04)',
                                                borderColor: '#9c27b0'
                                            }
                                        }}
                                    >
                                        <CloudUploadIcon />
                                    </IconButton>
                                    {uploadedFiles.iso && (
                                        <Box sx={{
                                            width: 40,
                                            height: 40,
                                            border: '1px solid #d0d0d0',
                                            borderRadius: 1,
                                            overflow: 'hidden',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <img
                                                src={uploadedFiles.iso}
                                                alt="תצוגה מקדימה"
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                        </Box>
                                    )}
                                </Box>
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                {/* מקום ריק לשורה השנייה */}
                            </Grid>
                        </Grid>

                        {localClassifications && Array.isArray(localClassifications) && localClassifications.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    סוגי רישיונות:
                                </Typography>
                                {localClassifications.map((classification: any, index: number) => (
                                    <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                                        • {classification?.description || `${classification?.classification_type || ''} - ${classification?.classification || ''}`}
                                    </Typography>
                                ))}
                            </Box>
                        )}

                        {contractor?.activities && Array.isArray(contractor.activities) && contractor.activities.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    פעילויות:
                                </Typography>
                                {contractor.activities.map((activity: any, index: number) => (
                                    <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                                        • {String(activity || '')}
                                    </Typography>
                                ))}
                            </Box>
                        )}
                    </Box>
                )}

                {activeTab === 2 && (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            פרויקטים
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            פרויקטים פעילים: {contractor?.projects?.filter((p: any) => p.status === 'active')?.length || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            פרויקטים עתידיים: {contractor?.projects?.filter((p: any) => p.status === 'future')?.length || 0}
                        </Typography>
                    </Box>
                )}

                {activeTab === 3 && (
                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">
                                אנשי קשר
                            </Typography>
                            {canEdit && (
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={handleAddContact}
                                    size="small"
                                    sx={{
                                        backgroundColor: '#9c27b0', // סגול שוקו
                                        '&:hover': {
                                            backgroundColor: '#7b1fa2' // סגול כהה יותר בהובר
                                        }
                                    }}
                                >
                                    הוספה
                                </Button>
                            )}
                        </Box>

                        {contractor?.contacts && contractor.contacts.length > 0 ? (
                            <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>שם</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>תפקיד</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>טלפון</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>אימייל</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>הרשאות</TableCell>
                                            {canEdit && (
                                                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>פעולות</TableCell>
                                            )}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {contractor.contacts.map((contact: any, index: number) => (
                                            <TableRow key={contact.id || index}>
                                                <TableCell sx={{ textAlign: 'right' }}>{contact.fullName || ''}</TableCell>
                                                <TableCell sx={{ textAlign: 'right' }}>{contact.role || contact.position || ''}</TableCell>
                                                <TableCell sx={{ textAlign: 'right' }}>{contact.mobile || ''}</TableCell>
                                                <TableCell sx={{ textAlign: 'right' }}>{contact.email || contact.emailAddress || ''}</TableCell>
                                                <TableCell sx={{ textAlign: 'right' }}>
                                                    <Typography variant="body2" sx={{
                                                        color: 'text.secondary',
                                                        fontWeight: 'normal'
                                                    }}>
                                                        {contact.permissions === 'contactAdmin' ? 'מנהל' : 'משתמש'}
                                                    </Typography>
                                                </TableCell>
                                                {canEdit && (
                                                    <TableCell sx={{ textAlign: 'center' }}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleEditContact(contact)}
                                                            sx={{ mr: 1 }}
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleDeleteContact(contact.id)}
                                                            sx={{ color: 'text.secondary' }}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    אין אנשי קשר רשומים
                                </Typography>
                                {canEdit && (
                                    <Button
                                        variant="outlined"
                                        startIcon={<AddIcon />}
                                        onClick={handleAddContact}
                                        sx={{
                                            borderColor: '#9c27b0', // סגול שוקו
                                            color: '#9c27b0',
                                            '&:hover': {
                                                borderColor: '#7b1fa2',
                                                backgroundColor: 'rgba(156, 39, 176, 0.04)'
                                            }
                                        }}
                                    >
                                        הוסף איש קשר ראשון
                                    </Button>
                                )}
                            </Box>
                        )}
                    </Box>
                )}

                {activeTab === 4 && (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            הערות
                        </Typography>

                        <TextField
                            fullWidth
                            multiline
                            rows={8}
                            label="הערות כלליות"
                            value={contractor?.notes || ''}
                            sx={{ mb: 2, ...textFieldSx }}
                            disabled={!canEdit}
                            placeholder="הוסף הערות על הקבלן..."
                        />

                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="הערות פנימיות"
                            value={contractor?.internalNotes || ''}
                            sx={{ mb: 2, ...textFieldSx }}
                            disabled={!canEdit}
                            placeholder="הערות פנימיות לצוות..."
                        />
                    </Box>
                )}
            </Box>

            {/* Contact Dialog */}
            <Dialog open={contactDialogOpen} onClose={handleCloseContactDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingContact ? 'עריכת איש קשר' : 'הוספת איש קשר'}
                </DialogTitle>
                <DialogContent>
                    <Box id="contact-dialog-form" component="form" sx={{ pt: 2 }}>
                        <TextField
                            fullWidth
                            name="name"
                            label="שם מלא"
                            defaultValue={editingContact?.fullName || ''}
                            sx={{ mb: 2, ...textFieldSx }}
                        />
                        <Autocomplete
                            freeSolo
                            options={[
                                'מנכ״ל',
                                'סמנכ״ל כספים',
                                'גזבר',
                                'ממונה ביטוח',
                                'יועץ ביטוח',
                                'ממונה בטיחות',
                                'סמנכ״ל תפעול',
                                'סמנכ״ל הנדסה',
                                'סמנכ״ל תכנון',
                                'מנהל פרוייקטים',
                                'מנהל עבודה'
                            ]}
                            defaultValue={editingContact?.role || editingContact?.position || ''}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    name="role"
                                    label="תפקיד"
                                    sx={{ mb: 2, ...textFieldSx }}
                                />
                            )}
                        />
                        <TextField
                            fullWidth
                            name="phone"
                            label="טלפון"
                            defaultValue={editingContact?.mobile || ''}
                            error={!!contactPhoneError}
                            helperText={contactPhoneError}
                            onChange={(e) => {
                                if (contactPhoneError) {
                                    setContactPhoneError('');
                                }
                            }}
                            sx={{ mb: 2, ...textFieldSx }}
                        />
                        <TextField
                            fullWidth
                            name="email"
                            label="אימייל"
                            type="email"
                            defaultValue={editingContact?.email || editingContact?.emailAddress || ''}
                            error={!!contactEmailError}
                            helperText={contactEmailError}
                            onChange={(e) => {
                                if (contactEmailError) {
                                    setContactEmailError('');
                                }
                            }}
                            sx={{ mb: 2, ...textFieldSx }}
                        />
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel sx={{
                                backgroundColor: 'white',
                                px: 1,
                                '&.Mui-focused': {
                                    backgroundColor: 'white'
                                }
                            }}>
                                הרשאות
                            </InputLabel>
                            <Select
                                name="permissions"
                                defaultValue={editingContact?.permissions || 'contactUser'}
                                sx={{
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#d0d0d0'
                                    },
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#9c27b0'
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#9c27b0'
                                    }
                                }}
                            >
                                <MenuItem value="contactUser">משתמש</MenuItem>
                                <MenuItem value="contactAdmin">מנהל</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseContactDialog}>ביטול</Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveContact}
                        sx={{
                            backgroundColor: '#9c27b0', // סגול שוקו
                            '&:hover': {
                                backgroundColor: '#7b1fa2' // סגול כהה יותר בהובר
                            }
                        }}
                    >
                        {editingContact ? 'עדכן' : 'הוסף'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Upload Dialog */}
            <Dialog open={uploadDialogOpen} onClose={handleCloseUploadDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    העלאת קובץ {uploadType === 'safety' ? 'תעודת כוכבי בטיחות' : 'תעודת ISO45001'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                        {isUploading ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                <CircularProgress size={40} />
                                <Typography variant="body2">
                                    מעלה קובץ...
                                </Typography>
                            </Box>
                        ) : (
                            <>
                                <Typography variant="body2" sx={{ mb: 2 }}>
                                    בחר קובץ PDF או תמונה (JPG, PNG)
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                                    מקסימום 10MB
                                </Typography>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleFileUpload}
                                    style={{ display: 'none' }}
                                />
                                <Button
                                    variant="contained"
                                    component="label"
                                    startIcon={<CloudUploadIcon />}
                                    sx={{
                                        mb: 2,
                                        backgroundColor: '#9c27b0', // סגול שוקו
                                        '&:hover': {
                                            backgroundColor: '#7b1fa2' // סגול כהה יותר בהובר
                                        }
                                    }}
                                >
                                    בחר קובץ
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={handleFileUpload}
                                        style={{ display: 'none' }}
                                    />
                                </Button>
                            </>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseUploadDialog} disabled={isUploading}>
                        ביטול
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
