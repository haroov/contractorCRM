import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Box, Typography, Button, Tabs, Tab, TextField, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Checkbox, IconButton, Grid, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip, Autocomplete, InputAdornment, Chip } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon, Close as CloseIcon, Refresh as RefreshIcon, AutoAwesome as AutoAwesomeIcon } from '@mui/icons-material';
import GentleCloudUploadIcon from './GentleCloudUploadIcon';
import FileUpload from './FileUpload';
import { useNavigate } from 'react-router-dom';
import ContractorService from '../services/contractorService';
import { authenticatedFetch } from '../config/api';

interface ContractorTabsSimpleProps {
    contractor?: any;
    onSave?: (contractor: any) => void;
    onClose?: () => void;
    isContactUser?: boolean;
    contactUserPermissions?: string;
    currentUser?: any;
    isSaving?: boolean;
    onUpdateContractor?: (contractor: any) => void;
    onShowNotification?: (message: string, severity: 'success' | 'error' | 'info' | 'warning') => void;
    contractorMode?: 'view' | 'edit' | 'new';
}

const ContractorTabsSimple = forwardRef<any, ContractorTabsSimpleProps>(({
    contractor,
    onSave,
    onClose,
    isContactUser = false,
    contactUserPermissions,
    currentUser,
    isSaving = false,
    onUpdateContractor,
    onShowNotification,
    contractorMode = 'view'
}: ContractorTabsSimpleProps, ref) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(() => {
        // Check if there's a stored tab from URL navigation or previous session
        const storedTab = sessionStorage.getItem('contractor_active_tab');
        if (storedTab) {
            const tabIndex = parseInt(storedTab);
            if (!isNaN(tabIndex) && tabIndex >= 0 && tabIndex <= 4) {
                return tabIndex;
            }
        }
        return 0;
    });
    const [activeProjectFilter, setActiveProjectFilter] = useState<'all' | 'active' | 'future' | 'closed'>('all');
    const [projectSearchTerm, setProjectSearchTerm] = useState('');
    const [contactSearchTerm, setContactSearchTerm] = useState('');
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [uploadType, setUploadType] = useState<'safety' | 'iso' | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<{ [key: string]: string }>({});
    const [isUploading, setIsUploading] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [fileToDelete, setFileToDelete] = useState<{ type: 'safety' | 'iso', url: string } | null>(null);
    const [contactDeleteDialogOpen, setContactDeleteDialogOpen] = useState(false);
    const [contactToDelete, setContactToDelete] = useState<string | null>(null);
    const [contactDialogOpen, setContactDialogOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<any>(null);
    const [contactEmailError, setContactEmailError] = useState<string>('');
    const [contactPhoneError, setContactPhoneError] = useState<string>('');
    const [companyIdError, setCompanyIdError] = useState<string>('');

    // Save active tab to sessionStorage whenever it changes
    useEffect(() => {
        sessionStorage.setItem('contractor_active_tab', activeTab.toString());
    }, [activeTab]);
    const [emailError, setEmailError] = useState<string>('');
    const [localCompanyId, setLocalCompanyId] = useState<string>(contractor?.companyId || contractor?.company_id || '');
    const [localCompanyType, setLocalCompanyType] = useState<string>(contractor?.companyType || 'private_company');
    const [isLoadingCompanyData, setIsLoadingCompanyData] = useState<boolean>(false);
    const [companyStatusIndicator, setCompanyStatusIndicator] = useState<string>(
        contractor?.statusIndicator || contractor?.contractorStatusIndicator || ''
    );
    const [isLoadingLicenses, setIsLoadingLicenses] = useState<boolean>(false);

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

    // Function to navigate to project editing page
    const navigateToProject = (project: any, mode: 'view' | 'edit' | 'new') => {
        // Get session ID from current URL
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('sessionId');

        // Create URL parameters for the project data
        const params = new URLSearchParams();
        params.set('mode', mode);

        // Add session ID to the URL
        if (sessionId) {
            params.set('sessionId', sessionId);
        }

        // Add contractor ID for navigation back
        if (contractor?._id) {
            params.set('contractorId', contractor._id);
        }

        if (mode === 'new') {
            params.set('project_id', 'new');
        } else {
            params.set('project_id', project._id || project.id || '');
            // Store project data in sessionStorage for the project page to access (for both edit and view modes)
            sessionStorage.setItem('project_data', JSON.stringify(project));
        }

        // Navigate to project page in the same window
        navigate(`/project?${params.toString()}`);
    };

    // Validation functions
    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validateDate = (dateString: string): string => {
        if (!dateString) return '';

        // If it's a valid date format (YYYY-MM-DD), return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
        }

        // If it's a partial date, ensure year is max 4 digits
        const parts = dateString.split('-');
        if (parts.length >= 1 && parts[0].length > 4) {
            parts[0] = parts[0].substring(0, 4);
        }

        return parts.join('-');
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

    // Compute normalized Levenshtein similarity (0..1)
    const computeStringSimilarity = (a: string, b: string): number => {
        const s1 = (a || '').toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, ' ').trim();
        const s2 = (b || '').toLowerCase().replace(/[^\p{L}\p{N} ]+/gu, ' ').trim();
        if (!s1 || !s2) return 0;
        const n = s1.length, m = s2.length;
        const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
        for (let i = 0; i <= n; i++) dp[i][0] = i;
        for (let j = 0; j <= m; j++) dp[0][j] = j;
        for (let i = 1; i <= n; i++) {
            for (let j = 1; j <= m; j++) {
                const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1,
                    dp[i - 1][j - 1] + cost
                );
            }
        }
        const dist = dp[n][m];
        const maxLen = Math.max(n, m) || 1;
        return 1 - dist / maxLen;
    };

    const containsHebrew = (s: string): boolean => /[\u0590-\u05FF]/.test(s || '');

    // Function to analyze company website using AI
    const analyzeCompanyWebsite = async (websiteUrl: string) => {
        if (!websiteUrl) return;

        setIsLoadingAbout(true);
        try {
            console.log('🚀 analyzeCompanyWebsite called with:', websiteUrl);

            // Import the company analysis service
            const { analyzeCompanyWebsite: analyzeWebsite, mapCompanyAnalysisToContractor } = await import('../services/companyAnalysisService');
            console.log('📦 Services imported successfully');

            console.log('📞 Calling analyzeWebsite with:', websiteUrl);
            const analysisResult = await analyzeWebsite(websiteUrl, contractor?.name || localName || '');
            console.log('📊 Analysis result received:', analysisResult);

            const mappedData = mapCompanyAnalysisToContractor(analysisResult);
            console.log('🗺️ Mapped data:', mappedData);

            // Check name match using AI (semantic check instead of statistical)
            try {
                const aiName = (analysisResult?.companyName || '').toString().trim();
                const dbNameHe = contractor?.name || localName || '';
                const dbNameEn = contractor?.nameEnglish || localNameEnglish || '';

                if (!aiName) {
                    console.log('ℹ️ Skipping name match check (missing aiName)');
                } else {
                    const compareTo = containsHebrew(aiName) ? dbNameHe : (dbNameEn || dbNameHe);
                    if (!compareTo) {
                        console.log('ℹ️ Skipping name match check (no appropriate DB name)', { aiName });
                    } else {
                        // Use AI-based semantic matching instead of statistical
                        try {
                            const checkResponse = await fetch('/api/company-analysis/check-name-match', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ dbName: compareTo, aiName })
                            });
                            if (checkResponse.ok) {
                                const { matches } = await checkResponse.json();
                                if (matches) {
                                    console.log('✅ Company names match (AI semantic check)', { db: compareTo, ai: aiName });
                                } else {
                                    console.warn('⚠️ Company name mismatch (AI semantic check)', { db: compareTo, ai: aiName });
                                }
                            }
                        } catch (apiErr) {
                            console.warn('⚠️ AI name match API call failed, using fallback statistical check:', apiErr);
                            // Fallback to statistical check if AI API fails
                            const similarity = computeStringSimilarity(compareTo, aiName);
                            if (similarity < 0.95) {
                                console.warn('⚠️ Company name mismatch (statistical fallback)', { db: compareTo, ai: aiName, similarity });
                            } else {
                                console.log('✅ Company name similarity OK (statistical fallback, >=95%)', { db: compareTo, ai: aiName, similarity });
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn('⚠️ Name match check failed:', e);
            }

            // Update the contractor state with the analyzed data
            if (mappedData.about) {
                setCompanyAbout(mappedData.about);
            }
            if (mappedData.logoUrl) {
                setCompanyLogo(mappedData.logoUrl);
            }
            // Note: Not updating company name as it comes from company registry

            console.log('✅ Company analysis completed successfully');

        } catch (error) {
            console.error('❌ Error analyzing company website:', error);
            setCompanyAbout('שגיאה בניתוח האתר. נסה שוב מאוחר יותר.');
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
    const [localContractorId, setLocalContractorId] = useState<string>(contractor?.contractorId || contractor?.contractor_id || '');
    const [localEmployees, setLocalEmployees] = useState<string>(contractor?.employees || contractor?.numberOfEmployees || '');

    // Local states for additional contractor data
    const [localContacts, setLocalContacts] = useState<any[]>(contractor?.contacts || []);
    const [localProjects, setLocalProjects] = useState<any[]>(contractor?.projects || []);
    const [localNotes, setLocalNotes] = useState<{ general: string, internal: string }>(contractor?.notes || { general: '', internal: '' });
    const [localSafetyRating, setLocalSafetyRating] = useState<string>(contractor?.safetyRating?.toString() || '0');
    const [localSafetyExpiry, setLocalSafetyExpiry] = useState<string>(contractor?.safetyExpiry || '');
    const [localSafetyCertificate, setLocalSafetyCertificate] = useState<string>(contractor?.safetyCertificate || '');
    const [localSafetyCertificateType, setLocalSafetyCertificateType] = useState<string>('');
    const [localSafetyCertificateThumbnail, setLocalSafetyCertificateThumbnail] = useState<string>(contractor?.safetyCertificateThumbnail || '');
    const [localSafetyCertificateCreationDate, setLocalSafetyCertificateCreationDate] = useState<string>(contractor?.safetyCertificateCreationDate || '');
    const [localIso45001, setLocalIso45001] = useState<boolean>(contractor?.iso45001 || false);
    const [localIsoExpiry, setLocalIsoExpiry] = useState<string>(contractor?.isoExpiry || '');
    const [localIsoCertificate, setLocalIsoCertificate] = useState<string>(contractor?.isoCertificate || '');
    const [localIsoCertificateType, setLocalIsoCertificateType] = useState<string>('');
    const [localIsoCertificateThumbnail, setLocalIsoCertificateThumbnail] = useState<string>(contractor?.isoCertificateThumbnail || '');
    const [localIsoCertificateCreationDate, setLocalIsoCertificateCreationDate] = useState<string>(contractor?.isoCertificateCreationDate || '');

    // New safety procedures fields
    const [localSafetyProceduresFile, setLocalSafetyProceduresFile] = useState<string>(contractor?.safetyProceduresFile || '');
    const [localSafetyProceduresThumbnail, setLocalSafetyProceduresThumbnail] = useState<string>(contractor?.safetyProceduresThumbnail || '');
    const [localSafetyProceduresLastUpdate, setLocalSafetyProceduresLastUpdate] = useState<string>(contractor?.safetyProceduresLastUpdate || '');

    const [localSecurityProceduresFile, setLocalSecurityProceduresFile] = useState<string>(contractor?.securityProceduresFile || '');
    const [localSecurityProceduresThumbnail, setLocalSecurityProceduresThumbnail] = useState<string>(contractor?.securityProceduresThumbnail || '');
    const [localSecurityProceduresLastUpdate, setLocalSecurityProceduresLastUpdate] = useState<string>(contractor?.securityProceduresLastUpdate || '');

    const [localEnvironmentalProtectionFile, setLocalEnvironmentalProtectionFile] = useState<string>(contractor?.environmentalProtectionFile || '');
    const [localEnvironmentalProtectionThumbnail, setLocalEnvironmentalProtectionThumbnail] = useState<string>(contractor?.environmentalProtectionThumbnail || '');
    const [localEnvironmentalProtectionLastUpdate, setLocalEnvironmentalProtectionLastUpdate] = useState<string>(contractor?.environmentalProtectionLastUpdate || '');

    const [localContractorSafetyGuideFile, setLocalContractorSafetyGuideFile] = useState<string>(contractor?.contractorSafetyGuideFile || '');
    const [localContractorSafetyGuideThumbnail, setLocalContractorSafetyGuideThumbnail] = useState<string>(contractor?.contractorSafetyGuideThumbnail || '');
    const [localContractorSafetyGuideLastUpdate, setLocalContractorSafetyGuideLastUpdate] = useState<string>(contractor?.contractorSafetyGuideLastUpdate || '');

    const [localHotWorkProcedureFile, setLocalHotWorkProcedureFile] = useState<string>(contractor?.hotWorkProcedureFile || '');
    const [localHotWorkProcedureThumbnail, setLocalHotWorkProcedureThumbnail] = useState<string>(contractor?.hotWorkProcedureThumbnail || '');
    const [localHotWorkProcedureLastUpdate, setLocalHotWorkProcedureLastUpdate] = useState<string>(contractor?.hotWorkProcedureLastUpdate || '');

    const [localIllegalResidentsFile, setLocalIllegalResidentsFile] = useState<string>(contractor?.illegalResidentsFile || '');
    const [localIllegalResidentsThumbnail, setLocalIllegalResidentsThumbnail] = useState<string>(contractor?.illegalResidentsThumbnail || '');
    const [localIllegalResidentsLastUpdate, setLocalIllegalResidentsLastUpdate] = useState<string>(contractor?.illegalResidentsLastUpdate || '');

    const [localQualityControlPlanFile, setLocalQualityControlPlanFile] = useState<string>(contractor?.qualityControlPlanFile || '');
    const [localQualityControlPlanThumbnail, setLocalQualityControlPlanThumbnail] = useState<string>(contractor?.qualityControlPlanThumbnail || '');
    const [localQualityControlPlanLastUpdate, setLocalQualityControlPlanLastUpdate] = useState<string>(contractor?.qualityControlPlanLastUpdate || '');

    const [localEmergencyProceduresFile, setLocalEmergencyProceduresFile] = useState<string>(contractor?.emergencyProceduresFile || '');
    const [localEmergencyProceduresThumbnail, setLocalEmergencyProceduresThumbnail] = useState<string>(contractor?.emergencyProceduresThumbnail || '');
    const [localEmergencyProceduresLastUpdate, setLocalEmergencyProceduresLastUpdate] = useState<string>(contractor?.emergencyProceduresLastUpdate || '');
    const [localClassifications, setLocalClassifications] = useState<any[]>(contractor?.classifications || []);
    const [localIsActive, setLocalIsActive] = useState<boolean>(contractor?.isActive ?? true);

    // Company about section states
    const [companyAbout, setCompanyAbout] = useState<string>(contractor?.companyAbout || '');
    const [companyLogo, setCompanyLogo] = useState<string>(contractor?.companyLogo || '');
    const [isLoadingAbout, setIsLoadingAbout] = useState<boolean>(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Check if user can edit based on contact user permissions
    // System users (admin/user) can always edit, contact users need contactAdmin permissions
    const canEdit = !isContactUser || contactUserPermissions === 'contactAdmin';

    // For company ID field specifically - allow editing ONLY for new contractors
    const canEditCompanyId = canEdit && contractorMode === 'new';

    // Force enable for new contractors - debug
    const forceEnableCompanyId = contractorMode === 'new';


    // Common styling for TextFields with choco purple focus
    const textFieldSx = {
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
    };

    // Update local states when contractor changes - but only if it's a meaningful change
    useEffect(() => {
        // Only update state if:
        // 1. contractor has meaningful data AND
        // 2. we're not in the middle of loading from API/DB AND
        // 3. the contractor's companyId is different from current local state (to prevent overriding loaded data)
        const contractorCompanyId = contractor?.companyId || contractor?.company_id;
        if (contractor && !isLoadingCompanyData) {

            // Only update companyId if we're not in 'new' mode or if the contractor has a meaningful companyId
            // This prevents overriding user input when creating a new contractor
            // BUT: if localCompanyId is already set (from API data), don't override it
            if (contractorMode !== 'new' || (contractorCompanyId && contractorCompanyId.trim() !== '')) {
                // Only update if localCompanyId is empty (not set from API)
                if (!localCompanyId || localCompanyId.trim() === '') {
                    setLocalCompanyId(contractorCompanyId || '');
                }
            }

            setLocalCompanyType(contractor?.companyType || 'private_company');
            setLocalName(contractor?.name || '');
            setLocalNameEnglish(contractor?.nameEnglish || '');
            setLocalFoundationDate(contractor?.foundationDate || '');
            setLocalAddress(contractor?.address || '');
            setLocalCity(contractor?.city || '');
            setLocalEmail(contractor?.email || '');
            setLocalPhone(contractor?.phone || '');
            setLocalWebsite(contractor?.website || '');
            // Only update contractorId if we're not in 'new' mode or if the contractor has a meaningful contractorId
            // This prevents overriding API-loaded data when creating a new contractor
            if (contractorMode !== 'new' || (contractor?.contractorId && contractor.contractorId.trim() !== '')) {
                setLocalContractorId(contractor?.contractorId || '');
            }
            setLocalEmployees(contractor?.employees || contractor?.numberOfEmployees || '');

            // Update additional contractor data
            setLocalContacts(contractor?.contacts || []);
            setLocalProjects(contractor?.projects || []);
            setLocalNotes(contractor?.notes || { general: '', internal: '' });
            setLocalSafetyRating(contractor?.safetyRating || '0');
            setLocalSafetyExpiry(contractor?.safetyExpiry || '');
            setLocalSafetyCertificate(contractor?.safetyCertificate || '');
            // Auto-detect file type for legacy files
            if (contractor?.safetyCertificate) {
                setLocalSafetyCertificateType(contractor.safetyCertificate.toLowerCase().includes('.pdf') ? 'application/pdf' : 'image');
            }
            setLocalIso45001(contractor?.iso45001 || false);
            setLocalIsoExpiry(contractor?.isoExpiry || '');
            setLocalIsoCertificate(contractor?.isoCertificate || '');
            // Auto-detect file type for legacy files
            if (contractor?.isoCertificate) {
                setLocalIsoCertificateType(contractor.isoCertificate.toLowerCase().includes('.pdf') ? 'application/pdf' : 'image');
            }
            setLocalClassifications(contractor?.classifications || []);

            // Update company about section
            setCompanyAbout(contractor?.companyAbout || '');
            setCompanyLogo(contractor?.companyLogo || '');

            // Load status indicator for existing contractors
            console.log('🔍 useEffect: Checking contractor status data:', {
                company_id: contractor?.company_id,
                _id: contractor?._id,
                statusIndicator: contractor?.statusIndicator
            });

            // Sync companyStatusIndicator with contractor prop
            const statusFromProp = contractor?.statusIndicator || contractor?.contractorStatusIndicator;
            console.log('🔧 useEffect: Status sync debug:', {
                statusFromProp,
                currentCompanyStatusIndicator: companyStatusIndicator,
                needsSync: statusFromProp !== companyStatusIndicator,
                contractorStatusIndicator: contractor?.statusIndicator,
                contractorStatusIndicatorAlt: contractor?.contractorStatusIndicator,
                company_id: contractor?.company_id,
                isLoadingCompanyData,
                contractorName: contractor?.name,
                statusIndicatorFromContractor: contractor?.statusIndicator,
                contractorStatusIndicatorFromContractor: contractor?.contractorStatusIndicator,
                statusValue: contractor?.statusIndicator || contractor?.contractorStatusIndicator,
                companyStatusIndicatorState: companyStatusIndicator,
                hasIndicator: !!companyStatusIndicator,
                shouldShowIndicator: companyStatusIndicator && !isLoadingCompanyData,
                shouldShowNoIndicator: !companyStatusIndicator && !isLoadingCompanyData
            });

            if (statusFromProp !== companyStatusIndicator) {
                console.log('🔍 useEffect: Syncing companyStatusIndicator from prop:', statusFromProp || 'cleared');
                setCompanyStatusIndicator(statusFromProp || '');
            }

            // Load status for contractors without status
            if (!statusFromProp && contractor?.company_id) {
                console.log('🔍 useEffect: Loading status for existing contractor:', contractor.company_id);
                loadStatusForExistingContractor(contractor.company_id);
            } else if (!statusFromProp && !contractor?.company_id) {
                console.log('🔍 useEffect: Not loading status - missing company_id:', {
                    company_id: contractor?.company_id,
                    _id: contractor?._id
                });
            }

            // Auto-load licenses for existing contractors if they don't have classifications
            if (contractor?.company_id && (!contractor?.classifications || contractor.classifications.length === 0)) {
                console.log('🔄 Auto-loading licenses for existing contractor without classifications...');
                loadLicensesForContractor(contractor.company_id);
            }

            // Auto-load status indicator for existing contractors if they don't have status
            if (contractor?.company_id && !contractor?.statusIndicator && !contractor?.contractorStatusIndicator) {
                console.log('🔄 Auto-loading status indicator for existing contractor without status...');
                loadStatusForExistingContractor(contractor.company_id);
            }
        } else if (isLoadingCompanyData) {
            console.log('🔄 useEffect: Skipping state update - data is currently loading');
        } else if (contractor && (contractor.companyId || contractor.company_id) === localCompanyId) {
            console.log('🔄 useEffect: Skipping state update - contractor data matches current state');
        } else {
            console.log('🔄 useEffect: Skipping state update - no meaningful contractor data');
        }

        // Debug: Log current local state values
        console.log('🔍 Current local state values:');
        console.log('🔍 localContacts:', localContacts);
        console.log('🔍 localNotes:', localNotes);
    }, [contractor, isLoadingCompanyData, localCompanyId, companyStatusIndicator, contractorMode]);

    // Load licenses when switching to Business Information tab
    useEffect(() => {
        console.log('🔍 License loading effect triggered:', {
            activeTab,
            hasCompanyId: !!contractor?.company_id,
            companyId: contractor?.company_id,
            companyIdLength: contractor?.company_id?.length,
            contractorName: contractor?.name
        });

        // Use localCompanyId for new contractors, contractor.company_id for existing ones
        const companyId = localCompanyId || contractor?.company_id;

        if (activeTab === 1 && companyId && companyId.length >= 9) {
            console.log('🔍 Loading licenses for Business Information tab');
            loadLicensesForContractor(companyId);
        } else {
            console.log('🔍 Not loading licenses - conditions not met:', {
                activeTabIs1: activeTab === 1,
                hasCompanyId: !!companyId,
                companyIdLengthValid: companyId?.length >= 9,
                localCompanyId: localCompanyId,
                contractorCompanyId: contractor?.company_id
            });
        }
    }, [activeTab, contractor?.company_id, localCompanyId]);

    // Auto-analyze company info when website changes
    useEffect(() => {
        if (localWebsite && localWebsite.startsWith('http')) {
            console.log('🌐 Website changed, analyzing company info:', localWebsite);
            analyzeCompanyWebsite(localWebsite);
        }
    }, [localWebsite]);

    // Listen for save events from the header button
    useEffect(() => {
        const handleSaveEvent = (event: any) => {
            console.log('🔘 Save event received in ContractorTabsSimple');
            console.log('🔘 Event object:', event);
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
            console.log('🔍 Save values:', {
                localCompanyId,
                localCompanyIdType: typeof localCompanyId,
                localCompanyIdLength: localCompanyId?.length,
                contractorMode
            });

            // Update contractor with local values before saving
            // Fallback: if localCompanyId is empty, try to get it from contractor object
            const finalCompanyId = localCompanyId || contractor?.companyId || contractor?.company_id || '';

            // Remove _id field to prevent MongoDB duplicate key error
            const { _id, ...contractorWithoutId } = contractor || {};

            const updatedContractor = {
                ...contractorWithoutId,
                // Basic company info
                companyId: finalCompanyId, // Use fallback if localCompanyId is empty
                company_id: finalCompanyId, // Also set the old field for backward compatibility
                companyType: localCompanyType,
                name: localName,
                nameEnglish: localNameEnglish,
                foundationDate: localFoundationDate,
                address: localAddress,
                city: localCity,
                email: localEmail,
                phone: localPhone,
                website: localWebsite,
                contractorId: localContractorId,
                contractor_id: localContractorId, // Also set the old field for backward compatibility
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

            console.log('🔍 updatedContractor after creation:', updatedContractor);
            console.log('🔍 updatedContractor.companyId:', updatedContractor.companyId);
            console.log('🔍 updatedContractor.company_id:', updatedContractor.company_id);
            console.log('💾 Saving contractor data:', {
                companyId: updatedContractor.companyId,
                name: updatedContractor.name,
                contractorId: updatedContractor.contractorId
            });

            onSave(updatedContractor);
        }
    };

    // Expose handleSave function to parent component
    useImperativeHandle(ref, () => ({
        handleSave
    }));

    const handleUploadClick = (type: 'safety' | 'iso') => {
        setUploadType(type);
        // Open file browser directly instead of dialog
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.jpg,.jpeg,.png';
        input.onchange = (event) => {
            const target = event.target as HTMLInputElement;
            if (target.files && target.files[0]) {
                handleFileUploadDirect(target.files[0], type);
            }
        };
        input.click();
    };

    const generatePdfThumbnail = async (file: File): Promise<string | null> => {
        try {
            // Create a canvas to render PDF thumbnail
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;

            // Set canvas size for thumbnail
            canvas.width = 200;
            canvas.height = 200;

            // For now, return null to use the fallback PDF icon
            // In a real implementation, you would use PDF.js or similar library
            // to render the first page of the PDF to the canvas
            return null;
        } catch (error) {
            console.error('Error generating PDF thumbnail:', error);
            return null;
        }
    };

    const handleFileUploadDirect = async (file: File, type: 'safety' | 'iso') => {
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
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('file', file);
            formData.append('certificateType', type);
            formData.append('contractorId', contractor?._id || '');

            // Call API to upload file using authenticatedFetch
            const response = await authenticatedFetch('/api/upload/certificate', {
                method: 'POST',
                body: formData,
                headers: {
                    // Don't set Content-Type, let browser set it with boundary for FormData
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                // Update local state with the uploaded file URL and type
                if (type === 'safety') {
                    setLocalSafetyCertificate(result.data.url);
                    setLocalSafetyCertificateType(file.type);
                } else if (type === 'iso') {
                    setLocalIsoCertificate(result.data.url);
                    setLocalIsoCertificateType(file.type);
                }

                // Update contractor data
                if (onSave) {
                    const updatedContractor = {
                        ...contractor,
                        company_id: localCompanyId,
                        [type === 'safety' ? 'safetyCertificate' : 'isoCertificate']: result.data.url
                    };
                    onSave(updatedContractor);
                }

                console.log(`✅ Certificate uploaded successfully: ${result.data.url}`);
            } else {
                throw new Error(result.error || 'שגיאה בהעלאת הקובץ');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('שגיאה בהעלאת הקובץ: ' + (error as Error).message);
        } finally {
            setIsUploading(false);
        }
    };

    // Handle file deletion
    const handleDeleteFile = (type: 'safety' | 'iso', url: string) => {
        setFileToDelete({ type, url });
        setDeleteDialogOpen(true);
    };

    const confirmDeleteFile = async () => {
        if (!fileToDelete) return;

        try {
            // Call API to delete certificate
            const response = await authenticatedFetch('/api/upload/certificate', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contractorId: contractor?._id,
                    certificateType: fileToDelete.type
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                // Clear the file from local state
                if (fileToDelete.type === 'safety') {
                    setLocalSafetyCertificate('');
                    setLocalSafetyCertificateType('');
                } else if (fileToDelete.type === 'iso') {
                    setLocalIsoCertificate('');
                    setLocalIsoCertificateType('');
                }

                // Update contractor data
                if (onSave) {
                    const updatedContractor = {
                        ...contractor,
                        [fileToDelete.type === 'safety' ? 'safetyCertificate' : 'isoCertificate']: ''
                    };
                    onSave(updatedContractor);
                }

                console.log(`✅ Certificate deleted successfully`);
            } else {
                throw new Error(result.error || 'שגיאה במחיקת הקובץ');
            }

        } catch (error) {
            console.error('Error deleting file:', error);
            alert('שגיאה במחיקת הקובץ: ' + (error as Error).message);
        } finally {
            setDeleteDialogOpen(false);
            setFileToDelete(null);
        }
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

                    // File uploaded successfully - UI will show the change
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

    const handleDeleteContact = (contactId: string) => {
        setContactToDelete(contactId);
        setContactDeleteDialogOpen(true);
    };

    const confirmDeleteContact = async () => {
        if (!contactToDelete) return;

        try {
            // Remove from local state
            const updatedContacts = localContacts.filter(contact => contact.id !== contactToDelete);
            setLocalContacts(updatedContacts);

            // Save to server by triggering the main save
            if (onSave) {
                const updatedContractor = {
                    ...contractor,
                    contacts: updatedContacts
                };
                onSave(updatedContractor);
            }

            console.log('Contact deleted successfully:', contactToDelete);
            // Contact deleted successfully - UI will show the change
        } catch (error) {
            console.error('Error deleting contact:', error);
            alert('שגיאה במחיקת איש הקשר');
        } finally {
            setContactDeleteDialogOpen(false);
            setContactToDelete(null);
        }
    };

    const handleCloseContactDialog = () => {
        setContactDialogOpen(false);
        setEditingContact(null);
        setContactEmailError('');
        setContactPhoneError('');
    };

    // Filter contacts based on search term
    const getFilteredContacts = () => {
        if (!localContacts || localContacts.length === 0) return [];

        if (!contactSearchTerm.trim()) return localContacts;

        const searchLower = contactSearchTerm.toLowerCase();
        return localContacts.filter((contact: any) => {
            const name = (contact.fullName || '').toLowerCase();
            const role = (contact.role || contact.position || '').toLowerCase();
            const permissions = (contact.permissions === 'contactAdmin' ? 'מנהל' : 'משתמש').toLowerCase();

            return name.includes(searchLower) ||
                role.includes(searchLower) ||
                permissions.includes(searchLower);
        });
    };

    // Filter projects based on active filter
    const getFilteredProjects = () => {
        console.log('🔍 getFilteredProjects called with:');
        console.log('🔍 localProjects:', localProjects);
        console.log('🔍 localProjects length:', localProjects?.length || 0);
        console.log('🔍 activeProjectFilter:', activeProjectFilter);

        if (!localProjects || localProjects.length === 0) {
            console.log('🔍 No projects to filter, returning empty array');
            return [];
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const filtered = localProjects.filter((project: any) => {
            const startDate = new Date(project.startDate);
            startDate.setHours(0, 0, 0, 0);
            const isClosed = project.isClosed || project.status === 'completed';

            // Apply search filter
            if (projectSearchTerm) {
                const searchTerm = projectSearchTerm.toLowerCase();
                const projectName = (project.projectName || '').toLowerCase();
                const city = (project.city || '').toLowerCase();

                if (!projectName.includes(searchTerm) && !city.includes(searchTerm)) {
                    return false;
                }
            }

            switch (activeProjectFilter) {
                case 'all':
                    return true;
                case 'active':
                    return !isClosed && startDate <= today;
                case 'future':
                    return !isClosed && startDate > today;
                case 'closed':
                    return isClosed;
                default:
                    return true;
            }
        });

        console.log('🔍 Filtered projects:', filtered);
        console.log('🔍 Filtered count:', filtered.length);
        return filtered;
    };

    // Format date from YYYY-MM-DD to DD/MM/YYYY
    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
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

        // Validate required fields
        let hasErrors = false;

        // Validate name (required)
        if (!contactData.fullName || contactData.fullName.trim() === '') {
            alert('שם מלא הוא שדה חובה');
            hasErrors = true;
        }

        // Validate role (required)
        if (!contactData.role || contactData.role.trim() === '') {
            alert('תפקיד הוא שדה חובה');
            hasErrors = true;
        }

        // Validate email and phone
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
                // Skip company ID check to prevent redundant loading
                onSave(updatedContractor, true);
            }

            // Show success message for contact save
            alert(editingContact ? 'הקבלן עודכן בהצלחה' : 'הקבלן עודכן בהצלחה');

            handleCloseContactDialog();
        } catch (error) {
            console.error('Error saving contact:', error);
        }
    };

    // Load status indicator for existing contractors
    const loadStatusForExistingContractor = async (companyId: string) => {
        try {
            console.log('🔍 Loading status for existing contractor:', companyId);
            console.log('🔍 Current companyStatusIndicator state:', companyStatusIndicator);

            // First check if we have cached data from today
            const today = new Date().toISOString().split('T')[0];
            const lastUpdated = contractor?.statusLastUpdated ?
                new Date(contractor.statusLastUpdated).toISOString().split('T')[0] : null;

            if (lastUpdated === today && contractor?.statusIndicator) {
                console.log('✅ Using cached status data from today:', contractor.statusIndicator);
                setCompanyStatusIndicator(contractor.statusIndicator);
                return;
            }

            console.log('🔍 Fetching fresh status data from Companies Registry API');
            const response = await fetch(`https://data.gov.il/api/3/action/datastore_search?resource_id=f004176c-b85f-4542-8901-7b3176f9a054&q=${companyId}`);
            console.log('🔍 Companies Registry API response status:', response.status);

            if (!response.ok) {
                console.error('❌ Companies Registry API response not OK:', response.status, response.statusText);
                return;
            }

            const result = await response.json();
            console.log('🔍 Companies Registry API response data:', result);

            if (result.success && result.result.records.length > 0) {
                const record = result.result.records[0];
                console.log('🔍 Processing company record:', record);

                // Determine status indicator based on business logic
                const currentYear = new Date().getFullYear();
                const companyStatus = record['סטטוס חברה'] || '';
                const isViolator = record['מפרה'] || false;
                const companyType = record['סוג תאגיד'] || '';
                const lastReportYear = record['דוח אחרון (שהוגש)'] || '';

                let statusIndicator = '';

                // Check if company is active and not a violator
                if (companyStatus === 'פעילה' && !isViolator) {
                    // For private companies, check if last report was submitted within 2 years
                    if (companyType.includes('פרטית') && lastReportYear) {
                        const reportYear = parseInt(lastReportYear);
                        if (currentYear - reportYear <= 2) {
                            statusIndicator = '🟢'; // Green - all good
                        } else {
                            statusIndicator = '🟡'; // Yellow - report overdue
                        }
                    } else {
                        statusIndicator = '🟢'; // Green - active and not violator
                    }
                } else if (isViolator) {
                    statusIndicator = '🔴'; // Red - violator
                } else if (companyStatus !== 'פעילה') {
                    statusIndicator = '🟡'; // Yellow - not active
                }

                if (statusIndicator) {
                    setCompanyStatusIndicator(statusIndicator);
                    console.log('✅ Loaded status indicator:', statusIndicator);
                    console.log('🔍 Status logic:', {
                        companyStatus,
                        isViolator,
                        companyType,
                        lastReportYear,
                        currentYear,
                        statusIndicator
                    });

                    // Update contractor with fresh status data
                    if (onUpdateContractor) {
                        onUpdateContractor({
                            ...contractor,
                            statusIndicator: statusIndicator,
                            statusLastUpdated: new Date().toISOString()
                        });
                    }
                } else {
                    console.log('❌ No status indicator determined from record');
                    setCompanyStatusIndicator(''); // Clear any existing indicator
                }
            } else {
                console.log('❌ No company record found in Companies Registry');
                setCompanyStatusIndicator(''); // Clear any existing indicator
            }
        } catch (error) {
            console.error('❌ Error loading status for existing contractor:', error);
        }
    };

    const loadLicensesForContractor = async (companyId: string, forceRefresh: boolean = false) => {
        if (!companyId) return;

        setIsLoadingLicenses(true);
        try {
            console.log('🔍 Loading licenses for contractor:', companyId, forceRefresh ? '(force refresh)' : '');
            console.log('🔍 Contractor data:', {
                name: contractor?.name,
                company_id: contractor?.company_id,
                _id: contractor?._id,
                classifications: contractor?.classifications,
                licensesLastUpdated: contractor?.licensesLastUpdated
            });

            // Check if we have fresh data (today) - skip if force refresh
            if (!forceRefresh) {
                const today = new Date().toISOString().split('T')[0];
                const lastUpdated = contractor?.licensesLastUpdated ?
                    new Date(contractor.licensesLastUpdated).toISOString().split('T')[0] : null;

                console.log('🔍 License freshness check:', {
                    today,
                    lastUpdated,
                    hasClassifications: !!contractor?.classifications,
                    classificationsLength: contractor?.classifications?.length || 0
                });

                if (lastUpdated === today && contractor?.classifications && contractor.classifications.length > 0) {
                    console.log('✅ Using cached license data from today');
                    setIsLoadingLicenses(false);
                    return;
                }
            } else {
                console.log('🔄 Force refresh - skipping cache check');
            }

            console.log('🔍 Fetching fresh license data from Contractors Registry API');
            const contractorsResponse = await fetch(`https://data.gov.il/api/3/action/datastore_search?resource_id=4eb61bd6-18cf-4e7c-9f9c-e166dfa0a2d8&q=${companyId}`);
            console.log('🔍 Contractors Registry API response status:', contractorsResponse.status);
            const contractorsData = await contractorsResponse.json();
            console.log('🔍 Contractors Registry API response data:', contractorsData);

            if (contractorsData.success && contractorsData.result.records.length > 0) {
                const licenseTypes = [];
                contractorsData.result.records.forEach((record) => {
                    if (record['TEUR_ANAF'] && record['KVUTZA'] && record['SIVUG']) {
                        const licenseDescription = `${record['TEUR_ANAF']} - ${record['KVUTZA']}${record['SIVUG']}`;
                        licenseTypes.push({
                            classification_type: record['TEUR_ANAF'],
                            classification: `${record['KVUTZA']}${record['SIVUG']}`,
                            description: licenseDescription,
                            kod_anaf: record['KOD_ANAF'] || '',
                            tarich_sug: record['TARICH_SUG'] || '',
                            hekef: record['HEKEF'] || '',
                            lastUpdated: new Date().toISOString()
                        });
                    }
                });

                console.log('✅ Loaded fresh license data from Contractors Registry:', licenseTypes.length, 'licenses');
                console.log('🔍 License data:', licenseTypes);

                // Update local state with fresh data
                setLocalClassifications(licenseTypes);

                // Update contractor with fresh data
                if (onUpdateContractor) {
                    onUpdateContractor({
                        ...contractor,
                        classifications: licenseTypes,
                        licensesLastUpdated: new Date().toISOString()
                    });
                }
            } else {
                console.log('❌ No license data found in Contractors Registry API response');
                console.log('❌ Response details:', {
                    success: contractorsData.success,
                    result: contractorsData.result,
                    records: contractorsData.result?.records?.length || 0
                });
            }
        } catch (error) {
            console.error('❌ Error loading licenses for contractor:', error);
        } finally {
            setIsLoadingLicenses(false);
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
            const response = await fetch(`/api/search-company/${companyId}`);
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

                // Try to fetch from external APIs
                try {
                    const response = await fetch(`/api/search-company/${localCompanyId}`);
                    const result = await response.json();

                    if (result.success && result.data) {
                        console.log('✅ Found company in external APIs:', result.data.name);
                        await populateFormWithApiData(result.data);
                        setCompanyIdError(''); // Clear any error

                        // Auto-load licenses from Contractors Registry after loading company data
                        console.log('🔄 Auto-loading licenses from Contractors Registry for new company...');
                        await loadLicensesForContractor(localCompanyId);

                        // Auto-load status indicator for new company
                        console.log('🔄 Auto-loading status indicator for new company...');
                        await loadStatusForExistingContractor(localCompanyId);
                    } else {
                        console.log('❌ Company not found in external APIs either');
                        setCompanyIdError(''); // Don't show error - this is legitimate for new contractors

                        // Still try to load licenses from Contractors Registry even if company not found
                        console.log('🔄 Still trying to load licenses from Contractors Registry...');
                        await loadLicensesForContractor(localCompanyId);

                        // Still try to load status indicator even if company not found
                        console.log('🔄 Still trying to load status indicator...');
                        await loadStatusForExistingContractor(localCompanyId);
                    }
                } catch (apiError) {
                    console.error('❌ Error fetching from external APIs:', apiError);
                    setCompanyIdError(''); // Don't show error - this is legitimate for new contractors
                }
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
        console.log('📊 Loading existing contractor data - FULL OBJECT:', contractorData);

        // Check if contractor is archived
        if (contractorData.isActive === false) {
            console.log('📋 Loading archived contractor - will be reactivated on save');
        }

        // Update all local states with existing contractor data
        setLocalName(contractorData.name || '');
        setLocalNameEnglish(contractorData.nameEnglish || '');
        setLocalFoundationDate(contractorData.foundationDate || '');
        setLocalAddress(contractorData.address || '');
        setLocalCity(contractorData.city || '');
        setLocalEmail(contractorData.email || '');
        setLocalPhone(contractorData.phone || '');
        setLocalWebsite(contractorData.website || '');
        setLocalContractorId(contractorData.contractorId || contractorData.contractor_id || 'לא קבלן רשום');
        setLocalEmployees(contractorData.employees || contractorData.numberOfEmployees || '');
        setLocalCompanyType(contractorData.companyType || 'private_company');

        // Update additional contractor data (contacts, projects, notes, etc.)
        console.log('📊 Loading additional data:');
        console.log('📊 Contacts:', contractorData.contacts);
        console.log('📊 Contacts type:', typeof contractorData.contacts);
        console.log('📊 Contacts length:', contractorData.contacts?.length);
        console.log('📊 Projects:', contractorData.projects);
        console.log('📊 Project IDs:', contractorData.projectIds);
        console.log('📊 Notes:', contractorData.notes);
        console.log('📊 Notes type:', typeof contractorData.notes);
        console.log('📊 Notes keys:', contractorData.notes ? Object.keys(contractorData.notes) : 'no notes');
        console.log('📊 Safety Rating:', contractorData.safetyRating);
        console.log('📊 Safety Rating type:', typeof contractorData.safetyRating);
        console.log('📊 Safety Rating converted to string:', contractorData.safetyRating?.toString());
        console.log('📊 Classifications:', contractorData.classifications);

        // Check all keys in contractorData
        console.log('📊 All contractorData keys:', Object.keys(contractorData));

        setLocalContacts(contractorData.contacts || []);
        console.log('📊 Set localContacts to:', contractorData.contacts || []);

        // Load projects if projectIds exist
        if (contractorData.projectIds && contractorData.projectIds.length > 0) {
            console.log('📊 Loading projects for IDs:', contractorData.projectIds);
            try {
                const projects = await ContractorService.getProjectsByIds(contractorData.projectIds);
                setLocalProjects(projects);
                console.log('📊 Loaded projects:', projects);
                console.log('📊 Projects count:', projects.length);
            } catch (error) {
                console.error('❌ Error loading projects:', error);
                setLocalProjects([]);
            }
        } else {
            console.log('📊 No projectIds found, using contractorData.projects:', contractorData.projects);
            setLocalProjects(contractorData.projects || []);
        }

        setLocalNotes(contractorData.notes || { general: '', internal: '' });
        console.log('📊 Set localNotes to:', contractorData.notes || { general: '', internal: '' });
        setLocalSafetyRating(contractorData.safetyRating || '0');
        setLocalSafetyExpiry(contractorData.safetyExpiry || '');
        setLocalSafetyCertificate(contractorData.safetyCertificate || '');
        // Auto-detect file type for legacy files
        if (contractorData.safetyCertificate) {
            setLocalSafetyCertificateType(contractorData.safetyCertificate.toLowerCase().includes('.pdf') ? 'application/pdf' : 'image');
        }
        setLocalIso45001(contractorData.iso45001 || false);
        setLocalIsoExpiry(contractorData.isoExpiry || '');
        setLocalIsoCertificate(contractorData.isoCertificate || '');
        // Auto-detect file type for legacy files
        if (contractorData.isoCertificate) {
            setLocalIsoCertificateType(contractorData.isoCertificate.toLowerCase().includes('.pdf') ? 'application/pdf' : 'image');
        }
        setLocalClassifications(contractorData.classifications || []);
        setLocalIsActive(contractorData.isActive ?? true);

        // Set status indicator from existing contractor data
        if (contractorData.statusIndicator) {
            setCompanyStatusIndicator(contractorData.statusIndicator);
        }

        // Update company about section
        setCompanyAbout(contractorData.companyAbout || '');
        setCompanyLogo(contractorData.companyLogo || '');

        // IMPORTANT: Set the company ID from existing contractor data
        setLocalCompanyId(contractorData.companyId || contractorData.company_id || '');

        // Update the contractor object with the loaded data for the title
        if (onUpdateContractor) {
            const updatedContractor = {
                ...contractor,
                name: contractorData.name,
                nameEnglish: contractorData.nameEnglish,
                company_id: contractorData.company_id,
                contractorId: contractorData.contractorId || contractorData.contractor_id,
                foundationDate: contractorData.foundationDate,
                address: contractorData.address,
                city: contractorData.city,
                email: contractorData.email,
                phone: contractorData.phone,
                website: contractorData.website,
                employees: contractorData.employees,
                numberOfEmployees: contractorData.numberOfEmployees,
                companyType: contractorData.companyType
            };
            onUpdateContractor(updatedContractor);
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

        // Show notification using snackbar
        if (onShowNotification) {
            onShowNotification(message, 'info');
        }

        console.log('✅ Existing contractor data loaded successfully');
    };

    // Function to populate form with API data
    const populateFormWithApiData = async (companyData: any) => {
        console.log('📊 Populating form with API data:', companyData);

        // Data loaded from external APIs - no need to show notification

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
        setLocalContractorId(companyData.contractorId || companyData.contractor_id || 'לא קבלן רשום');
        setLocalEmployees(companyData.employees || '');

        // IMPORTANT: Keep the company ID alive during sync
        console.log('🔍 API Data received:', companyData);
        console.log('🔍 API companyId:', companyData.companyId);
        console.log('🔍 API company_id:', companyData.company_id);
        if (companyData.companyId || companyData.company_id) {
            const companyIdValue = companyData.companyId || companyData.company_id;
            console.log('🔍 Setting localCompanyId to:', companyIdValue);
            setLocalCompanyId(companyIdValue);
        }

        // Set company type from API (prioritize over local logic)
        if (companyData.companyType) {
            setLocalCompanyType(companyData.companyType);
        }

        // Set status indicator
        if (companyData.statusIndicator) {
            setCompanyStatusIndicator(companyData.statusIndicator);
        }

        // Set classifications if available
        if (companyData.licenseTypes && Array.isArray(companyData.licenseTypes)) {
            console.log('📋 Loading license types from API:', companyData.licenseTypes);
            setLocalClassifications(companyData.licenseTypes);
        }

        // Set about and logo if available
        if (companyData.companyAbout) {
            setCompanyAbout(companyData.companyAbout);
        }
        if (companyData.companyLogo) {
            setCompanyLogo(companyData.companyLogo);
        }

        // Update the contractor object with the loaded data for the title
        if (onUpdateContractor) {
            const updatedContractor = {
                ...contractor,
                name: cleanName,
                nameEnglish: cleanNameEnglish,
                company_id: companyData.company_id,
                contractor_id: companyData.contractor_id,
                foundationDate: companyData.foundationDate,
                address: companyData.address,
                city: companyData.city,
                email: companyData.email,
                phone: companyData.phone,
                website: companyData.website,
                employees: companyData.employees,
                numberOfEmployees: companyData.employees,
                companyType: companyData.companyType
            };
            onUpdateContractor(updatedContractor);
        }

        console.log('✅ Form populated with API data successfully');
    };

    const fetchCompanyData = async (companyId: string) => {
        setIsLoadingCompanyData(true);
        try {
            console.log('Fetching data for company ID:', companyId);

            // Use our new API endpoint that checks MongoDB first, then external APIs
            const response = await fetch(`/api/search-company/${companyId}`);
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
                setLocalContractorId(companyData.contractorId || companyData.contractor_id || 'לא קבלן רשום');
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
                                color: '#6b47c1' // סגול שוקו
                            }
                        },
                        '& .MuiTabs-indicator': {
                            backgroundColor: '#6b47c1' // סגול שוקו
                        }
                    }}
                >
                    <Tab label="פרטי חברה" />
                    <Tab label="מידע עסקי" />
                    <Tab label="אנשי קשר" />
                    <Tab label="פרויקטים" />
                    <Tab label="דשבורד" />
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
                                    disabled={contractorMode !== 'new'}
                                    sx={{
                                        ...textFieldSx,
                                        direction: 'rtl',
                                        '& .MuiInputBase-input': {
                                            textAlign: 'right',
                                            direction: 'rtl'
                                        }
                                    }}
                                    InputProps={{
                                        readOnly: contractorMode !== 'new',
                                        startAdornment: (
                                            <Box sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                marginLeft: '10px',
                                                marginRight: '8px',
                                                gap: 1
                                            }}>
                                                {isLoadingCompanyData && (
                                                    <CircularProgress size={20} sx={{ color: '#6b47c1' }} />
                                                )}
                                                {companyStatusIndicator && !isLoadingCompanyData && (
                                                    <Tooltip
                                                        title={getStatusTooltipText(companyStatusIndicator)}
                                                        arrow
                                                        placement="top"
                                                    >
                                                        <Box sx={{ fontSize: '16px', lineHeight: 1, cursor: 'help' }}>
                                                            {companyStatusIndicator}
                                                        </Box>
                                                    </Tooltip>
                                                )}
                                                {/* Debug info */}
                                                {process.env.NODE_ENV === 'development' && (
                                                    <Box sx={{ fontSize: '10px', color: 'red' }}>
                                                        DEBUG: {companyStatusIndicator || 'empty'} | Loading: {isLoadingCompanyData ? 'yes' : 'no'}
                                                    </Box>
                                                )}
                                            </Box>
                                        ),
                                        endAdornment: null
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
                                    value={localContractorId || 'לא קבלן רשום'}
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
                                                borderColor: '#6b47c1'
                                            },
                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                borderColor: '#6b47c1'
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

                            {/* שדה אודות החברה - כל אורך העמוד, 8 שורות */}
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 3 }}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={8}
                                    maxRows={8}
                                    label="אודות החברה"
                                    value={companyAbout}
                                    disabled={!canEdit}
                                    sx={{
                                        ...textFieldSx,
                                        '& .MuiInputBase-root': {
                                            overflow: 'auto'
                                        }
                                    }}
                                    onChange={(e) => setCompanyAbout(e.target.value)}
                                    placeholder="מידע על החברה יופיע כאן אוטומטית מאתר האינטרנט..."
                                    InputProps={{
                                        endAdornment: isLoadingAbout && (
                                            <CircularProgress size={20} sx={{ color: '#6b47c1' }} />
                                        )
                                    }}
                                />
                                {localWebsite && canEdit && (
                                    <IconButton
                                        onClick={() => analyzeCompanyWebsite(localWebsite)}
                                        disabled={isLoadingAbout}
                                        size="small"
                                        sx={{
                                            color: '#6b47c1',
                                            '&:hover': {
                                                backgroundColor: 'rgba(136, 47, 215, 0.04)'
                                            },
                                            '&:disabled': {
                                                color: '#d0d0d0'
                                            }
                                        }}
                                    >
                                        {isLoadingAbout ? (
                                            <CircularProgress size={16} sx={{ color: '#6b47c1' }} />
                                        ) : (
                                            <AutoAwesomeIcon sx={{ fontSize: 20 }} />
                                        )}
                                    </IconButton>
                                )}
                            </Box>

                            {/* שדה לוגו החברה - 250x250 */}
                            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                <Box sx={{
                                    border: '2px dashed #ccc',
                                    borderRadius: 2,
                                    p: 2,
                                    width: '250px',
                                    height: '250px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#fafafa'
                                }}>
                                    {companyLogo ? (
                                        <img
                                            src={companyLogo}
                                            alt="לוגו החברה"
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '100%',
                                                objectFit: 'contain'
                                            }}
                                        />
                                    ) : (
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                            {isLoadingAbout ? (
                                                <>
                                                    <CircularProgress size={32} sx={{ color: '#6b47c1' }} />
                                                    <Typography variant="body2" color="text.secondary" textAlign="center">
                                                        טוען לוגו...
                                                    </Typography>
                                                </>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary" textAlign="center">
                                                    לוגו החברה יופיע כאן אוטומטית
                                                </Typography>
                                            )}
                                        </Box>
                                    )}
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                )}

                {activeTab === 1 && (
                    <Box>
                        {/* סוגי רישיונות מפנקס הקבלנים */}
                        <Box sx={{ mb: 4 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <Typography variant="subtitle2" gutterBottom sx={{ mb: 0 }}>
                                    סוגי רישיונות מפנקס הקבלנים:
                                </Typography>
                                {isLoadingLicenses && (
                                    <CircularProgress size={16} sx={{ color: '#6b47c1' }} />
                                )}
                                {!isLoadingLicenses && localClassifications && localClassifications.length > 0 && (
                                    <Chip
                                        label={`עודכן: ${new Date(contractor.licensesLastUpdated || contractor.updatedAt).toLocaleDateString('he-IL')}`}
                                        size="small"
                                        sx={{
                                            backgroundColor: '#e8f5e8',
                                            color: '#2e7d32',
                                            fontSize: '0.75rem'
                                        }}
                                    />
                                )}
                                <IconButton
                                    size="small"
                                    onClick={() => {
                                        if (contractor?.company_id) {
                                            console.log('🔄 Manual refresh of licenses for company (force refresh):', contractor.company_id);
                                            // Force refresh by passing true as second parameter
                                            loadLicensesForContractor(contractor.company_id, true);
                                        }
                                    }}
                                    disabled={isLoadingLicenses}
                                    title="רענן רישיונות מפנקס הקבלנים"
                                    sx={{
                                        color: '#6b47c1',
                                        '&:hover': {
                                            backgroundColor: 'rgba(156, 39, 176, 0.04)'
                                        }
                                    }}
                                >
                                    <RefreshIcon />
                                </IconButton>
                            </Box>

                            {localClassifications && Array.isArray(localClassifications) && localClassifications.length > 0 ? (
                                <Box sx={{
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 1,
                                    p: 2,
                                    backgroundColor: '#fafafa',
                                    maxHeight: '300px',
                                    overflow: 'auto'
                                }}>
                                    {localClassifications.map((license: any, index: number) => (
                                        <Box key={index} sx={{
                                            mb: 0.5,
                                            pb: 0.5,
                                            borderBottom: index < localClassifications.length - 1 ? '1px solid #e0e0e0' : 'none'
                                        }}>
                                            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0 }}>
                                                {license.description || `${license.classification_type} - ${license.classification}`}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            ) : (
                                <Box sx={{
                                    border: '1px solid #e0e0e0',
                                    borderRadius: 1,
                                    p: 2,
                                    backgroundColor: '#fafafa',
                                    textAlign: 'center'
                                }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {isLoadingLicenses ? 'טוען סוגי רישיונות...' : 'לא נמצאו סוגי רישיונות'}
                                    </Typography>
                                </Box>
                            )}
                        </Box>

                        <Grid container spacing={2}>
                            {/* שורה ראשונה - כוכבי בטיחות */}
                            <Grid item xs={12} sm={6} md={3}>
                                <FormControl fullWidth>
                                    <InputLabel sx={{
                                        backgroundColor: 'white',
                                        px: 1,
                                        color: '#6b47c1',
                                        '&.Mui-focused': {
                                            backgroundColor: 'white',
                                            color: '#6b47c1'
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
                                                borderColor: '#6b47c1'
                                            },
                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                borderColor: '#6b47c1'
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
                                    value={localSafetyExpiry}
                                    disabled={!canEdit}
                                    sx={textFieldSx}
                                    onChange={(e) => setLocalSafetyExpiry(validateDate(e.target.value))}
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
                                <FileUpload
                                    label="תעודת כוכבי בטיחות"
                                    value={localSafetyCertificate || ''}
                                    thumbnailUrl={localSafetyCertificateThumbnail || ''}
                                    onChange={async (url, thumbnailUrl) => {
                                        console.log('🔍 Safety certificate onChange called with:', { url, thumbnailUrl });

                                        if (url) {
                                            // Update local state
                                            setLocalSafetyCertificate(url);
                                            if (thumbnailUrl) {
                                                setLocalSafetyCertificateThumbnail(thumbnailUrl);
                                            }

                                            // Save to database immediately
                                            if (contractor?._id) {
                                                try {
                                                    const { contractorsAPI } = await import('../services/api');
                                                    const updateData = {
                                                        safetyCertificate: url,
                                                        safetyCertificateThumbnail: thumbnailUrl || '',
                                                        safetyCertificateCreationDate: new Date().toISOString().split('T')[0]
                                                    };

                                                    console.log('🔍 Saving safety certificate to database:', updateData);
                                                    const result = await contractorsAPI.update(contractor._id, updateData);
                                                    console.log('✅ Safety certificate saved successfully:', result);

                                                    // Update contractor state
                                                    if (onUpdateContractor) {
                                                        onUpdateContractor({
                                                            ...contractor,
                                                            ...updateData
                                                        });
                                                    }
                                                } catch (error) {
                                                    console.error('❌ Error saving safety certificate:', error);
                                                }
                                            }
                                        } else {
                                            // Handle deletion
                                            setLocalSafetyCertificate('');
                                            setLocalSafetyCertificateThumbnail('');
                                        }
                                    }}
                                    onDelete={async () => {
                                        console.log('🗑️ Safety certificate onDelete called');

                                        // Clear local state
                                        setLocalSafetyCertificate('');
                                        setLocalSafetyCertificateThumbnail('');

                                        // Delete from database
                                        if (contractor?._id) {
                                            try {
                                                const { contractorsAPI } = await import('../services/api');
                                                const updateData = {
                                                    safetyCertificate: null,
                                                    safetyCertificateThumbnail: null,
                                                    safetyCertificateCreationDate: null
                                                };

                                                console.log('🗑️ Deleting safety certificate from database:', updateData);
                                                const result = await contractorsAPI.update(contractor._id, updateData);
                                                console.log('✅ Safety certificate deleted successfully:', result);

                                                // Update contractor state
                                                if (onUpdateContractor) {
                                                    onUpdateContractor({
                                                        ...contractor,
                                                        safetyCertificate: null,
                                                        safetyCertificateThumbnail: null,
                                                        safetyCertificateCreationDate: null
                                                    });
                                                }
                                            } catch (error) {
                                                console.error('❌ Error deleting safety certificate:', error);
                                            }
                                        }
                                    }}
                                    disabled={!canEdit}
                                    showCreationDate={false}
                                />
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
                                                color: '#6b47c1',
                                                '&.Mui-checked': {
                                                    color: '#6b47c1'
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
                                    value={localIsoExpiry}
                                    disabled={!canEdit}
                                    sx={textFieldSx}
                                    onChange={(e) => setLocalIsoExpiry(validateDate(e.target.value))}
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
                                <FileUpload
                                    label="תעודת ISO45001"
                                    value={localIsoCertificate || ''}
                                    thumbnailUrl={localIsoCertificateThumbnail || ''}
                                    onChange={async (url, thumbnailUrl) => {
                                        console.log('🔍 ISO certificate onChange called with:', { url, thumbnailUrl });

                                        if (url) {
                                            // Update local state
                                            setLocalIsoCertificate(url);
                                            if (thumbnailUrl) {
                                                setLocalIsoCertificateThumbnail(thumbnailUrl);
                                            }

                                            // Save to database immediately
                                            if (contractor?._id) {
                                                try {
                                                    const { contractorsAPI } = await import('../services/api');
                                                    const updateData = {
                                                        isoCertificate: url,
                                                        isoCertificateThumbnail: thumbnailUrl || '',
                                                        isoCertificateCreationDate: new Date().toISOString().split('T')[0]
                                                    };

                                                    console.log('🔍 Saving ISO certificate to database:', updateData);
                                                    const result = await contractorsAPI.update(contractor._id, updateData);
                                                    console.log('✅ ISO certificate saved successfully:', result);

                                                    // Update contractor state
                                                    if (onUpdateContractor) {
                                                        onUpdateContractor({
                                                            ...contractor,
                                                            ...updateData
                                                        });
                                                    }
                                                } catch (error) {
                                                    console.error('❌ Error saving ISO certificate:', error);
                                                }
                                            }
                                        } else {
                                            // Handle deletion
                                            setLocalIsoCertificate('');
                                            setLocalIsoCertificateThumbnail('');
                                        }
                                    }}
                                    onDelete={async () => {
                                        console.log('🗑️ ISO certificate onDelete called');

                                        // Clear local state
                                        setLocalIsoCertificate('');
                                        setLocalIsoCertificateThumbnail('');

                                        // Delete from database
                                        if (contractor?._id) {
                                            try {
                                                const { contractorsAPI } = await import('../services/api');
                                                const updateData = {
                                                    isoCertificate: null,
                                                    isoCertificateThumbnail: null,
                                                    isoCertificateCreationDate: null
                                                };

                                                console.log('🗑️ Deleting ISO certificate from database:', updateData);
                                                const result = await contractorsAPI.update(contractor._id, updateData);
                                                console.log('✅ ISO certificate deleted successfully:', result);

                                                // Update contractor state
                                                if (onUpdateContractor) {
                                                    onUpdateContractor({
                                                        ...contractor,
                                                        isoCertificate: null,
                                                        isoCertificateThumbnail: null,
                                                        isoCertificateCreationDate: null
                                                    });
                                                }
                                            } catch (error) {
                                                console.error('❌ Error deleting ISO certificate:', error);
                                            }
                                        }
                                    }}
                                    disabled={!canEdit}
                                    showCreationDate={false}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                {/* מקום ריק לשורה השנייה */}
                            </Grid>
                        </Grid>

                        {/* שורה 3 - נהלי הביטחון והשמירה באתרי בניה */}
                        <Grid container spacing={2} sx={{ mt: 3 }}>
                            <Grid item xs={12} sm={6} md={3}>
                                <FileUpload
                                    label="נהלי הביטחון והשמירה באתרי בניה"
                                    value={localSafetyProceduresFile || ''}
                                    thumbnailUrl={localSafetyProceduresThumbnail || ''}
                                    onChange={async (url, thumbnailUrl) => {
                                        console.log('🔍 Safety procedures onChange called with:', { url, thumbnailUrl });

                                        if (url) {
                                            setLocalSafetyProceduresFile(url);
                                            if (thumbnailUrl) {
                                                setLocalSafetyProceduresThumbnail(thumbnailUrl);
                                            }

                                            if (contractor?._id) {
                                                try {
                                                    const { contractorsAPI } = await import('../services/api');
                                                    const updateData = {
                                                        safetyProceduresFile: url,
                                                        safetyProceduresThumbnail: thumbnailUrl || '',
                                                        safetyProceduresLastUpdate: new Date().toISOString().split('T')[0]
                                                    };

                                                    const result = await contractorsAPI.update(contractor._id, updateData);
                                                    console.log('✅ Safety procedures saved successfully:', result);

                                                    if (onUpdateContractor) {
                                                        onUpdateContractor({ ...contractor, ...updateData });
                                                    }
                                                } catch (error) {
                                                    console.error('❌ Error saving safety procedures:', error);
                                                }
                                            }
                                        } else {
                                            setLocalSafetyProceduresFile('');
                                            setLocalSafetyProceduresThumbnail('');
                                        }
                                    }}
                                    onDelete={async () => {
                                        console.log('🗑️ Safety procedures onDelete called');

                                        setLocalSafetyProceduresFile('');
                                        setLocalSafetyProceduresThumbnail('');

                                        if (contractor?._id) {
                                            try {
                                                const { contractorsAPI } = await import('../services/api');
                                                const updateData = {
                                                    safetyProceduresFile: null,
                                                    safetyProceduresThumbnail: null,
                                                    safetyProceduresLastUpdate: null
                                                };

                                                const result = await contractorsAPI.update(contractor._id, updateData);
                                                console.log('✅ Safety procedures deleted successfully:', result);

                                                if (onUpdateContractor) {
                                                    onUpdateContractor({
                                                        ...contractor,
                                                        safetyProceduresFile: null,
                                                        safetyProceduresThumbnail: null,
                                                        safetyProceduresLastUpdate: null
                                                    });
                                                }
                                            } catch (error) {
                                                console.error('❌ Error deleting safety procedures:', error);
                                            }
                                        }
                                    }}
                                    disabled={!canEdit}
                                    showCreationDate={false}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="תאריך עדכון אחרון"
                                    type="date"
                                    value={localSafetyProceduresLastUpdate}
                                    disabled={!canEdit}
                                    sx={textFieldSx}
                                    onChange={(e) => setLocalSafetyProceduresLastUpdate(validateDate(e.target.value))}
                                    InputLabelProps={{
                                        shrink: true,
                                        sx: { backgroundColor: 'white', px: 1 }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={6}>
                                {/* מקום ריק */}
                            </Grid>
                        </Grid>


                        {/* שורה 4 - נספח הגנת הסביבה */}
                        <Grid container spacing={2} sx={{ mt: 3 }}>
                            <Grid item xs={12} sm={6} md={3}>
                                <FileUpload
                                    label="נספח הגנת הסביבה"
                                    value={localEnvironmentalProtectionFile || ''}
                                    thumbnailUrl={localEnvironmentalProtectionThumbnail || ''}
                                    onChange={async (url, thumbnailUrl) => {
                                        console.log('🔍 Environmental protection onChange called with:', { url, thumbnailUrl });

                                        if (url) {
                                            setLocalEnvironmentalProtectionFile(url);
                                            if (thumbnailUrl) {
                                                setLocalEnvironmentalProtectionThumbnail(thumbnailUrl);
                                            }

                                            if (contractor?._id) {
                                                try {
                                                    const { contractorsAPI } = await import('../services/api');
                                                    const updateData = {
                                                        environmentalProtectionFile: url,
                                                        environmentalProtectionThumbnail: thumbnailUrl || '',
                                                        environmentalProtectionLastUpdate: new Date().toISOString().split('T')[0]
                                                    };

                                                    const result = await contractorsAPI.update(contractor._id, updateData);
                                                    console.log('✅ Environmental protection saved successfully:', result);

                                                    if (onUpdateContractor) {
                                                        onUpdateContractor({ ...contractor, ...updateData });
                                                    }
                                                } catch (error) {
                                                    console.error('❌ Error saving environmental protection:', error);
                                                }
                                            }
                                        } else {
                                            setLocalEnvironmentalProtectionFile('');
                                            setLocalEnvironmentalProtectionThumbnail('');
                                        }
                                    }}
                                    onDelete={async () => {
                                        console.log('🗑️ Environmental protection onDelete called');

                                        setLocalEnvironmentalProtectionFile('');
                                        setLocalEnvironmentalProtectionThumbnail('');

                                        if (contractor?._id) {
                                            try {
                                                const { contractorsAPI } = await import('../services/api');
                                                const updateData = {
                                                    environmentalProtectionFile: null,
                                                    environmentalProtectionThumbnail: null,
                                                    environmentalProtectionLastUpdate: null
                                                };

                                                const result = await contractorsAPI.update(contractor._id, updateData);
                                                console.log('✅ Environmental protection deleted successfully:', result);

                                                if (onUpdateContractor) {
                                                    onUpdateContractor({
                                                        ...contractor,
                                                        environmentalProtectionFile: null,
                                                        environmentalProtectionThumbnail: null,
                                                        environmentalProtectionLastUpdate: null
                                                    });
                                                }
                                            } catch (error) {
                                                console.error('❌ Error deleting environmental protection:', error);
                                            }
                                        }
                                    }}
                                    disabled={!canEdit}
                                    showCreationDate={false}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="תאריך עדכון אחרון"
                                    type="date"
                                    value={localEnvironmentalProtectionLastUpdate}
                                    disabled={!canEdit}
                                    sx={textFieldSx}
                                    onChange={(e) => setLocalEnvironmentalProtectionLastUpdate(validateDate(e.target.value))}
                                    InputLabelProps={{
                                        shrink: true,
                                        sx: { backgroundColor: 'white', px: 1 }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={6}>
                                {/* מקום ריק */}
                            </Grid>
                        </Grid>

                        {/* שורה 6 - מדריך בטיחות לקבלנים */}
                        <Grid container spacing={2} sx={{ mt: 3 }}>
                            <Grid item xs={12} sm={6} md={3}>
                                <FileUpload
                                    label="מדריך בטיחות לקבלנים"
                                    value={localContractorSafetyGuideFile || ''}
                                    thumbnailUrl={localContractorSafetyGuideThumbnail || ''}
                                    onChange={async (url, thumbnailUrl) => {
                                        console.log('🔍 Contractor safety guide onChange called with:', { url, thumbnailUrl });

                                        if (url) {
                                            setLocalContractorSafetyGuideFile(url);
                                            if (thumbnailUrl) {
                                                setLocalContractorSafetyGuideThumbnail(thumbnailUrl);
                                            }

                                            if (contractor?._id) {
                                                try {
                                                    const { contractorsAPI } = await import('../services/api');
                                                    const updateData = {
                                                        contractorSafetyGuideFile: url,
                                                        contractorSafetyGuideThumbnail: thumbnailUrl || '',
                                                        contractorSafetyGuideLastUpdate: new Date().toISOString().split('T')[0]
                                                    };

                                                    const result = await contractorsAPI.update(contractor._id, updateData);
                                                    console.log('✅ Contractor safety guide saved successfully:', result);

                                                    if (onUpdateContractor) {
                                                        onUpdateContractor({ ...contractor, ...updateData });
                                                    }
                                                } catch (error) {
                                                    console.error('❌ Error saving contractor safety guide:', error);
                                                }
                                            }
                                        } else {
                                            setLocalContractorSafetyGuideFile('');
                                            setLocalContractorSafetyGuideThumbnail('');
                                        }
                                    }}
                                    onDelete={async () => {
                                        console.log('🗑️ Contractor safety guide onDelete called');

                                        setLocalContractorSafetyGuideFile('');
                                        setLocalContractorSafetyGuideThumbnail('');

                                        if (contractor?._id) {
                                            try {
                                                const { contractorsAPI } = await import('../services/api');
                                                const updateData = {
                                                    contractorSafetyGuideFile: null,
                                                    contractorSafetyGuideThumbnail: null,
                                                    contractorSafetyGuideLastUpdate: null
                                                };

                                                const result = await contractorsAPI.update(contractor._id, updateData);
                                                console.log('✅ Contractor safety guide deleted successfully:', result);

                                                if (onUpdateContractor) {
                                                    onUpdateContractor({
                                                        ...contractor,
                                                        contractorSafetyGuideFile: null,
                                                        contractorSafetyGuideThumbnail: null,
                                                        contractorSafetyGuideLastUpdate: null
                                                    });
                                                }
                                            } catch (error) {
                                                console.error('❌ Error deleting contractor safety guide:', error);
                                            }
                                        }
                                    }}
                                    disabled={!canEdit}
                                    showCreationDate={false}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="תאריך עדכון אחרון"
                                    type="date"
                                    value={localContractorSafetyGuideLastUpdate}
                                    disabled={!canEdit}
                                    sx={textFieldSx}
                                    onChange={(e) => setLocalContractorSafetyGuideLastUpdate(validateDate(e.target.value))}
                                    InputLabelProps={{
                                        shrink: true,
                                        sx: { backgroundColor: 'white', px: 1 }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={6}>
                                {/* מקום ריק */}
                            </Grid>
                        </Grid>

                        {/* שורה 7 - נוהל עבודה חמה */}
                        <Grid container spacing={2} sx={{ mt: 3 }}>
                            <Grid item xs={12} sm={6} md={3}>
                                <FileUpload
                                    label="נוהל עבודה חמה"
                                    value={localHotWorkProcedureFile || ''}
                                    thumbnailUrl={localHotWorkProcedureThumbnail || ''}
                                    onChange={async (url, thumbnailUrl) => {
                                        console.log('🔍 Hot work procedure onChange called with:', { url, thumbnailUrl });

                                        if (url) {
                                            setLocalHotWorkProcedureFile(url);
                                            if (thumbnailUrl) {
                                                setLocalHotWorkProcedureThumbnail(thumbnailUrl);
                                            }

                                            if (contractor?._id) {
                                                try {
                                                    const { contractorsAPI } = await import('../services/api');
                                                    const updateData = {
                                                        hotWorkProcedureFile: url,
                                                        hotWorkProcedureThumbnail: thumbnailUrl || '',
                                                        hotWorkProcedureLastUpdate: new Date().toISOString().split('T')[0]
                                                    };

                                                    const result = await contractorsAPI.update(contractor._id, updateData);
                                                    console.log('✅ Hot work procedure saved successfully:', result);

                                                    if (onUpdateContractor) {
                                                        onUpdateContractor({ ...contractor, ...updateData });
                                                    }
                                                } catch (error) {
                                                    console.error('❌ Error saving hot work procedure:', error);
                                                }
                                            }
                                        } else {
                                            setLocalHotWorkProcedureFile('');
                                            setLocalHotWorkProcedureThumbnail('');
                                        }
                                    }}
                                    onDelete={async () => {
                                        console.log('🗑️ Hot work procedure onDelete called');

                                        setLocalHotWorkProcedureFile('');
                                        setLocalHotWorkProcedureThumbnail('');

                                        if (contractor?._id) {
                                            try {
                                                const { contractorsAPI } = await import('../services/api');
                                                const updateData = {
                                                    hotWorkProcedureFile: null,
                                                    hotWorkProcedureThumbnail: null,
                                                    hotWorkProcedureLastUpdate: null
                                                };

                                                const result = await contractorsAPI.update(contractor._id, updateData);
                                                console.log('✅ Hot work procedure deleted successfully:', result);

                                                if (onUpdateContractor) {
                                                    onUpdateContractor({
                                                        ...contractor,
                                                        hotWorkProcedureFile: null,
                                                        hotWorkProcedureThumbnail: null,
                                                        hotWorkProcedureLastUpdate: null
                                                    });
                                                }
                                            } catch (error) {
                                                console.error('❌ Error deleting hot work procedure:', error);
                                            }
                                        }
                                    }}
                                    disabled={!canEdit}
                                    showCreationDate={false}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="תאריך עדכון אחרון"
                                    type="date"
                                    value={localHotWorkProcedureLastUpdate}
                                    disabled={!canEdit}
                                    sx={textFieldSx}
                                    onChange={(e) => setLocalHotWorkProcedureLastUpdate(validateDate(e.target.value))}
                                    InputLabelProps={{
                                        shrink: true,
                                        sx: { backgroundColor: 'white', px: 1 }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={6}>
                                {/* מקום ריק */}
                            </Grid>
                        </Grid>

                        {/* שורה 8 - נספח שוהים בלתי חוקיים */}
                        <Grid container spacing={2} sx={{ mt: 3 }}>
                            <Grid item xs={12} sm={6} md={3}>
                                <FileUpload
                                    label="נספח שוהים בלתי חוקיים"
                                    value={localIllegalResidentsFile || ''}
                                    thumbnailUrl={localIllegalResidentsThumbnail || ''}
                                    onChange={async (url, thumbnailUrl) => {
                                        console.log('🔍 Illegal residents onChange called with:', { url, thumbnailUrl });

                                        if (url) {
                                            setLocalIllegalResidentsFile(url);
                                            if (thumbnailUrl) {
                                                setLocalIllegalResidentsThumbnail(thumbnailUrl);
                                            }

                                            if (contractor?._id) {
                                                try {
                                                    const { contractorsAPI } = await import('../services/api');
                                                    const updateData = {
                                                        illegalResidentsFile: url,
                                                        illegalResidentsThumbnail: thumbnailUrl || '',
                                                        illegalResidentsLastUpdate: new Date().toISOString().split('T')[0]
                                                    };

                                                    const result = await contractorsAPI.update(contractor._id, updateData);
                                                    console.log('✅ Illegal residents saved successfully:', result);

                                                    if (onUpdateContractor) {
                                                        onUpdateContractor({ ...contractor, ...updateData });
                                                    }
                                                } catch (error) {
                                                    console.error('❌ Error saving illegal residents:', error);
                                                }
                                            }
                                        } else {
                                            setLocalIllegalResidentsFile('');
                                            setLocalIllegalResidentsThumbnail('');
                                        }
                                    }}
                                    onDelete={async () => {
                                        console.log('🗑️ Illegal residents onDelete called');

                                        setLocalIllegalResidentsFile('');
                                        setLocalIllegalResidentsThumbnail('');

                                        if (contractor?._id) {
                                            try {
                                                const { contractorsAPI } = await import('../services/api');
                                                const updateData = {
                                                    illegalResidentsFile: null,
                                                    illegalResidentsThumbnail: null,
                                                    illegalResidentsLastUpdate: null
                                                };

                                                const result = await contractorsAPI.update(contractor._id, updateData);
                                                console.log('✅ Illegal residents deleted successfully:', result);

                                                if (onUpdateContractor) {
                                                    onUpdateContractor({
                                                        ...contractor,
                                                        illegalResidentsFile: null,
                                                        illegalResidentsThumbnail: null,
                                                        illegalResidentsLastUpdate: null
                                                    });
                                                }
                                            } catch (error) {
                                                console.error('❌ Error deleting illegal residents:', error);
                                            }
                                        }
                                    }}
                                    disabled={!canEdit}
                                    showCreationDate={false}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="תאריך עדכון אחרון"
                                    type="date"
                                    value={localIllegalResidentsLastUpdate}
                                    disabled={!canEdit}
                                    sx={textFieldSx}
                                    onChange={(e) => setLocalIllegalResidentsLastUpdate(validateDate(e.target.value))}
                                    InputLabelProps={{
                                        shrink: true,
                                        sx: { backgroundColor: 'white', px: 1 }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={6}>
                                {/* מקום ריק */}
                            </Grid>
                        </Grid>

                        {/* שורה 9 - תוכנית בקרת איכות */}
                        <Grid container spacing={2} sx={{ mt: 3 }}>
                            <Grid item xs={12} sm={6} md={3}>
                                <FileUpload
                                    label="תוכנית בקרת איכות"
                                    value={localQualityControlPlanFile || ''}
                                    thumbnailUrl={localQualityControlPlanThumbnail || ''}
                                    onChange={async (url, thumbnailUrl) => {
                                        console.log('🔍 Quality control plan onChange called with:', { url, thumbnailUrl });

                                        if (url) {
                                            setLocalQualityControlPlanFile(url);
                                            if (thumbnailUrl) {
                                                setLocalQualityControlPlanThumbnail(thumbnailUrl);
                                            }

                                            if (contractor?._id) {
                                                try {
                                                    const { contractorsAPI } = await import('../services/api');
                                                    const updateData = {
                                                        qualityControlPlanFile: url,
                                                        qualityControlPlanThumbnail: thumbnailUrl || '',
                                                        qualityControlPlanLastUpdate: new Date().toISOString().split('T')[0]
                                                    };

                                                    const result = await contractorsAPI.update(contractor._id, updateData);
                                                    console.log('✅ Quality control plan saved successfully:', result);

                                                    if (onUpdateContractor) {
                                                        onUpdateContractor({ ...contractor, ...updateData });
                                                    }
                                                } catch (error) {
                                                    console.error('❌ Error saving quality control plan:', error);
                                                }
                                            }
                                        } else {
                                            setLocalQualityControlPlanFile('');
                                            setLocalQualityControlPlanThumbnail('');
                                        }
                                    }}
                                    onDelete={async () => {
                                        console.log('🗑️ Quality control plan onDelete called');

                                        setLocalQualityControlPlanFile('');
                                        setLocalQualityControlPlanThumbnail('');

                                        if (contractor?._id) {
                                            try {
                                                const { contractorsAPI } = await import('../services/api');
                                                const updateData = {
                                                    qualityControlPlanFile: null,
                                                    qualityControlPlanThumbnail: null,
                                                    qualityControlPlanLastUpdate: null
                                                };

                                                const result = await contractorsAPI.update(contractor._id, updateData);
                                                console.log('✅ Quality control plan deleted successfully:', result);

                                                if (onUpdateContractor) {
                                                    onUpdateContractor({
                                                        ...contractor,
                                                        qualityControlPlanFile: null,
                                                        qualityControlPlanThumbnail: null,
                                                        qualityControlPlanLastUpdate: null
                                                    });
                                                }
                                            } catch (error) {
                                                console.error('❌ Error deleting quality control plan:', error);
                                            }
                                        }
                                    }}
                                    disabled={!canEdit}
                                    showCreationDate={false}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="תאריך עדכון אחרון"
                                    type="date"
                                    value={localQualityControlPlanLastUpdate}
                                    disabled={!canEdit}
                                    sx={textFieldSx}
                                    onChange={(e) => setLocalQualityControlPlanLastUpdate(validateDate(e.target.value))}
                                    InputLabelProps={{
                                        shrink: true,
                                        sx: { backgroundColor: 'white', px: 1 }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={6}>
                                {/* מקום ריק */}
                            </Grid>
                        </Grid>

                        {/* שורה 10 - נוהל מצבי חירום */}
                        <Grid container spacing={2} sx={{ mt: 3 }}>
                            <Grid item xs={12} sm={6} md={3}>
                                <FileUpload
                                    label="נוהל מצבי חירום (שריפה, פציעה, הצפה וכו׳)"
                                    value={localEmergencyProceduresFile || ''}
                                    thumbnailUrl={localEmergencyProceduresThumbnail || ''}
                                    onChange={async (url, thumbnailUrl) => {
                                        console.log('🔍 Emergency procedures onChange called with:', { url, thumbnailUrl });

                                        if (url) {
                                            setLocalEmergencyProceduresFile(url);
                                            if (thumbnailUrl) {
                                                setLocalEmergencyProceduresThumbnail(thumbnailUrl);
                                            }

                                            if (contractor?._id) {
                                                try {
                                                    const { contractorsAPI } = await import('../services/api');
                                                    const updateData = {
                                                        emergencyProceduresFile: url,
                                                        emergencyProceduresThumbnail: thumbnailUrl || '',
                                                        emergencyProceduresLastUpdate: new Date().toISOString().split('T')[0]
                                                    };

                                                    const result = await contractorsAPI.update(contractor._id, updateData);
                                                    console.log('✅ Emergency procedures saved successfully:', result);

                                                    if (onUpdateContractor) {
                                                        onUpdateContractor({ ...contractor, ...updateData });
                                                    }
                                                } catch (error) {
                                                    console.error('❌ Error saving emergency procedures:', error);
                                                }
                                            }
                                        } else {
                                            setLocalEmergencyProceduresFile('');
                                            setLocalEmergencyProceduresThumbnail('');
                                        }
                                    }}
                                    onDelete={async () => {
                                        console.log('🗑️ Emergency procedures onDelete called');

                                        setLocalEmergencyProceduresFile('');
                                        setLocalEmergencyProceduresThumbnail('');

                                        if (contractor?._id) {
                                            try {
                                                const { contractorsAPI } = await import('../services/api');
                                                const updateData = {
                                                    emergencyProceduresFile: null,
                                                    emergencyProceduresThumbnail: null,
                                                    emergencyProceduresLastUpdate: null
                                                };

                                                const result = await contractorsAPI.update(contractor._id, updateData);
                                                console.log('✅ Emergency procedures deleted successfully:', result);

                                                if (onUpdateContractor) {
                                                    onUpdateContractor({
                                                        ...contractor,
                                                        emergencyProceduresFile: null,
                                                        emergencyProceduresThumbnail: null,
                                                        emergencyProceduresLastUpdate: null
                                                    });
                                                }
                                            } catch (error) {
                                                console.error('❌ Error deleting emergency procedures:', error);
                                            }
                                        }
                                    }}
                                    disabled={!canEdit}
                                    showCreationDate={false}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="תאריך עדכון אחרון"
                                    type="date"
                                    value={localEmergencyProceduresLastUpdate}
                                    disabled={!canEdit}
                                    sx={textFieldSx}
                                    onChange={(e) => setLocalEmergencyProceduresLastUpdate(validateDate(e.target.value))}
                                    InputLabelProps={{
                                        shrink: true,
                                        sx: { backgroundColor: 'white', px: 1 }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6} md={6}>
                                {/* מקום ריק */}
                            </Grid>
                        </Grid>

                    </Box>
                )}

                {activeTab === 3 && (
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <TextField
                                size="small"
                                placeholder="חיפוש פרויקטים לפי שם, עיר..."
                                value={projectSearchTerm}
                                onChange={(e) => setProjectSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    bgcolor: 'white',
                                    borderRadius: 1,
                                    flex: 1,
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
                            {canEdit && (
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => {
                                        // Create new project with contractor ObjectId pre-filled
                                        const newProject = {
                                            _id: `new_${Date.now()}`,
                                            name: '',
                                            description: '',
                                            startDate: new Date().toISOString().split('T')[0],
                                            city: '',
                                            value: 0,
                                            duration: 12,
                                            contractorName: contractor?.name || '',
                                            contractorId: contractor?._id || '', // Use ObjectId as contractorId
                                            isActive: true,
                                            isNew: true
                                        };

                                        // Add to local projects
                                        const updatedProjects = [...localProjects, newProject];
                                        setLocalProjects(updatedProjects);

                                        // Navigate to project edit page using the existing function
                                        navigateToProject(newProject, 'new');

                                        console.log('🆕 Created new project and navigating to new project page');
                                    }}
                                    size="small"
                                    sx={{
                                        backgroundColor: '#6b47c1', // סגול שוקו
                                        '&:hover': {
                                            backgroundColor: '#5a3aa1' // סגול כהה יותר בהובר
                                        }
                                    }}
                                >
                                    הוספה
                                </Button>
                            )}
                        </Box>

                        {/* Project Filter Tabs */}
                        <Box sx={{ mb: 2 }}>
                            <Tabs
                                value={activeProjectFilter}
                                onChange={(event, newValue) => setActiveProjectFilter(newValue)}
                                sx={{
                                    '& .MuiTab-root': {
                                        minWidth: 'auto',
                                        padding: '8px 16px',
                                        fontSize: '0.875rem',
                                        textTransform: 'none',
                                        color: '#666',
                                        '&.Mui-selected': {
                                            color: '#6b47c1',
                                            fontWeight: 'bold'
                                        }
                                    },
                                    '& .MuiTabs-indicator': {
                                        backgroundColor: '#6b47c1'
                                    }
                                }}
                            >
                                <Tab label="הכל" value="all" />
                                <Tab label="פעילים" value="active" />
                                <Tab label="עתידיים" value="future" />
                                <Tab label="נסגרו" value="closed" />
                            </Tabs>
                        </Box>

                        {getFilteredProjects().length > 0 ? (
                            <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                            <TableCell sx={{ color: '#666', fontWeight: 'bold', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>שם</TableCell>
                                            <TableCell sx={{ color: '#666', fontWeight: 'bold', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>התחלה</TableCell>
                                            <TableCell sx={{ color: '#666', fontWeight: 'bold', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>עיר</TableCell>
                                            <TableCell sx={{ color: '#666', fontWeight: 'bold', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>ערך (₪)</TableCell>
                                            <TableCell sx={{ color: '#666', fontWeight: 'bold', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>סטטוס</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {getFilteredProjects().map((project: any, index: number) => (
                                            <TableRow
                                                key={project._id || project.id || index}
                                                sx={{
                                                    '&:hover': { backgroundColor: '#f5f5f5' },
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => navigateToProject(project, 'edit')}
                                            >
                                                <TableCell sx={{ textAlign: 'left', fontWeight: 'bold' }}>{project.projectName || ''}</TableCell>
                                                <TableCell sx={{ textAlign: 'left' }}>{formatDate(project.startDate)}</TableCell>
                                                <TableCell sx={{ textAlign: 'left' }}>{project.city || ''}</TableCell>
                                                <TableCell sx={{ textAlign: 'left' }}>
                                                    {(project.valueNis || project.value) ? `₪${(project.valueNis || project.value).toLocaleString()}` : ''}
                                                </TableCell>
                                                <TableCell sx={{ textAlign: 'left' }}>
                                                    {project.status === 'active' || project.status === 'current' ? 'פעיל' :
                                                        project.status === 'future' ? 'עתידי' : 'הושלם'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    {activeProjectFilter === 'all' ? 'אין פרויקטים רשומים' :
                                        activeProjectFilter === 'active' ? 'אין פרויקטים פעילים' :
                                            activeProjectFilter === 'future' ? 'אין פרויקטים עתידיים' :
                                                'אין פרויקטים נסגרו'}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                )}

                {activeTab === 2 && (
                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <TextField
                                fullWidth
                                placeholder="חיפוש אנשי קשר לפי שם, תפקיד, הרשאות..."
                                value={contactSearchTerm}
                                onChange={(e) => setContactSearchTerm(e.target.value)}
                                variant="outlined"
                                size="small"
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    maxWidth: '400px',
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
                            {canEdit && (
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={handleAddContact}
                                    size="small"
                                    sx={{
                                        backgroundColor: '#6b47c1', // סגול שוקו
                                        '&:hover': {
                                            backgroundColor: '#5a3aa1' // סגול כהה יותר בהובר
                                        }
                                    }}
                                >
                                    הוספה
                                </Button>
                            )}
                        </Box>

                        {getFilteredContacts().length > 0 ? (
                            <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                            <TableCell sx={{ color: '#666', fontWeight: 'bold', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>שם</TableCell>
                                            <TableCell sx={{ color: '#666', fontWeight: 'bold', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>תפקיד</TableCell>
                                            <TableCell sx={{ color: '#666', fontWeight: 'bold', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>טלפון</TableCell>
                                            <TableCell sx={{ color: '#666', fontWeight: 'bold', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>אימייל</TableCell>
                                            <TableCell sx={{ color: '#666', fontWeight: 'bold', textAlign: 'left', borderBottom: '1px solid #e0e0e0' }}>הרשאות</TableCell>
                                            {canEdit && (
                                                <TableCell sx={{ color: '#666', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #e0e0e0' }}>פעולות</TableCell>
                                            )}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {getFilteredContacts().map((contact: any, index: number) => (
                                            <TableRow
                                                key={contact.id || index}
                                                sx={{
                                                    '&:hover': { backgroundColor: '#f5f5f5' },
                                                    cursor: canEdit ? 'pointer' : 'default'
                                                }}
                                                onClick={canEdit ? () => handleEditContact(contact) : undefined}
                                            >
                                                <TableCell sx={{ textAlign: 'left', fontWeight: 'bold' }}>{contact.fullName || ''}</TableCell>
                                                <TableCell sx={{ textAlign: 'left' }}>{contact.role || contact.position || ''}</TableCell>
                                                <TableCell sx={{ textAlign: 'left' }}>{contact.mobile || ''}</TableCell>
                                                <TableCell sx={{ textAlign: 'left' }}>{contact.email || contact.emailAddress || ''}</TableCell>
                                                <TableCell sx={{ textAlign: 'left' }}>
                                                    {contact.permissions === 'contactAdmin' ? 'מנהל' : 'משתמש'}
                                                </TableCell>
                                                {canEdit && (
                                                    <TableCell sx={{ textAlign: 'center' }}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteContact(contact.id);
                                                            }}
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
                                <Typography variant="body2" color="text.secondary">
                                    {contactSearchTerm ? 'לא נמצאו אנשי קשר התואמים לחיפוש' : 'אין אנשי קשר רשומים'}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                )}

                {activeTab === 4 && (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            דשבורד
                        </Typography>

                        <TextField
                            fullWidth
                            multiline
                            rows={8}
                            label="הערות כלליות"
                            value={localNotes?.general || ''}
                            sx={{ mb: 2, ...textFieldSx }}
                            disabled={!canEdit}
                            placeholder="הוסף הערות על הקבלן..."
                        />

                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="הערות פנימיות"
                            value={localNotes?.internal || ''}
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
                                        borderColor: '#6b47c1'
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#6b47c1'
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
                    <Button onClick={handleCloseContactDialog} sx={{ color: '#6b47c1' }}>ביטול</Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveContact}
                        sx={{
                            backgroundColor: '#6b47c1', // סגול שוקו
                            '&:hover': {
                                backgroundColor: '#5a3aa1' // סגול כהה יותר בהובר
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
                                    startIcon={<GentleCloudUploadIcon fontSize="xlarge" />}
                                    sx={{
                                        mb: 2,
                                        backgroundColor: '#6b47c1', // סגול שוקו
                                        '&:hover': {
                                            backgroundColor: '#5a3aa1' // סגול כהה יותר בהובר
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

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    אישור מחיקת קובץ
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1">
                        האם אתה בטוח שברצונך למחוק את הקובץ?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>
                        ביטול
                    </Button>
                    <Button
                        onClick={confirmDeleteFile}
                        color="error"
                        variant="contained"
                    >
                        מחק
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Contact Delete Confirmation Dialog */}
            <Dialog open={contactDeleteDialogOpen} onClose={() => setContactDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    אישור מחיקת איש קשר
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1">
                        האם אתה בטוח שברצונך למחוק את איש הקשר?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setContactDeleteDialogOpen(false)}>
                        ביטול
                    </Button>
                    <Button
                        onClick={confirmDeleteContact}
                        color="error"
                        variant="contained"
                    >
                        מחק
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
});

export default ContractorTabsSimple;

