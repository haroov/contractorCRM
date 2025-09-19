import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Button,
    IconButton,
    AppBar,
    Toolbar,
    Snackbar,
    Alert,
    Tabs,
    Tab,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Avatar,
    Menu,
    MenuItem as MenuItemComponent,
    ListItemIcon,
    ListItemText,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
    Close as CloseIcon,
    AccountCircle as AccountCircleIcon,
    Logout as LogoutIcon,
    Person as PersonIcon,
    MoreVert as MoreVertIcon,
    CloudUpload as CloudUploadIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    PictureAsPdf as PdfIcon,
    AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';
import type { Project } from '../types/contractor';
import SkeletonLoader from './SkeletonLoader';

// Custom File Upload Component
interface FileUploadProps {
    label: string;
    value?: string;
    onChange: (url: string | null) => void;
    disabled?: boolean;
    accept?: string;
    showCreationDate?: boolean;
    creationDateValue?: string;
    onCreationDateChange?: (date: string) => void;
    onDelete?: () => void;
    projectId?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
    label,
    value,
    onChange,
    disabled,
    accept = ".pdf,.jpg,.jpeg,.png",
    showCreationDate = false,
    creationDateValue = '',
    onCreationDateChange,
    onDelete,
    projectId
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Debug logging
    console.log(`📁 FileUpload ${label} - value:`, value);
    console.log(`📁 FileUpload ${label} - isUploading:`, isUploading);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        if (file) {
            setIsUploading(true);
            try {
                // Upload to blob storage
                const formData = new FormData();
                formData.append('file', file);
                formData.append('projectId', projectId || 'temp'); // Use actual project ID or temp as fallback

                const response = await fetch('/api/upload-project-file', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ File upload successful:', result);
                    console.log('✅ File URL:', result.data?.url);

                    // Use result.data.url if available, otherwise fallback to result.url
                    const fileUrl = result.data?.url || result.url;
                    console.log('✅ Using file URL:', fileUrl);

                    onChange(fileUrl); // Store the blob URL

                    // Auto-fill creation date from file metadata
                    if (onCreationDateChange && !creationDateValue) {
                        const fileDate = new Date(file.lastModified);
                        const formattedDate = fileDate.toISOString().split('T')[0];
                        onCreationDateChange(formattedDate);
                    }

                    // PDF thumbnail generation temporarily disabled
                    // Will be re-enabled when server-side support is restored
                } else {
                    const errorText = await response.text();
                    console.error('❌ Upload failed:', response.status, errorText);
                    throw new Error('Upload failed');
                }
            } catch (error) {
                console.error('Upload error:', error);
                alert('שגיאה בהעלאת הקובץ');
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleUploadClick = () => {
        if (!disabled) {
            fileInputRef.current?.click();
        }
    };

    const handleFileClick = () => {
        if (value && !disabled) {
            window.open(value, '_blank');
        }
    };

    const handleDelete = async () => {
        if (onDelete && window.confirm('האם אתה בטוח שברצונך למחוק את הקובץ?')) {
            try {
                console.log('🗑️ Deleting file:', value);

                // Delete from blob storage
                if (value) {
                    const response = await fetch('/api/delete-project-file', {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({ url: value })
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('❌ Delete failed:', response.status, errorText);
                        throw new Error('Failed to delete file from storage');
                    }

                    console.log('✅ File deleted from blob storage successfully');
                }

                // Call the onDelete callback to update the state
                onDelete();
                console.log('✅ File deleted from UI state');
            } catch (error) {
                console.error('❌ Error deleting file:', error);
                alert('שגיאה במחיקת הקובץ: ' + error.message);
            }
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, direction: 'rtl' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, direction: 'rtl' }}>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />

                {value ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', direction: 'rtl' }}>
                        {/* File name - clickable */}
                        <Typography
                            variant="body2"
                            sx={{
                                color: '#6B46C1',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                fontSize: '0.875rem',
                                flex: 1,
                                textAlign: 'right'
                            }}
                            onClick={handleFileClick}
                        >
                        </Typography>

                        {/* File icon */}
                    <Box sx={{
                        width: 40,
                        height: 40,
                            backgroundColor: '#6B46C1', // Chocolate purple background
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        cursor: 'pointer',
                        border: '1px solid #d0d0d0'
                    }} onClick={handleFileClick}>
                        {value.toLowerCase().includes('.pdf') ? (
                            <PdfIcon sx={{
                                fontSize: 24,
                                    color: 'white' // White color on purple background
                            }} />
                        ) : (
                            <img
                                src={value}
                                alt="תצוגה מקדימה"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    borderRadius: '4px'
                                }}
                                onError={(e) => {
                                    // Fallback to PDF icon if image fails to load
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                        const pdfIcon = document.createElement('div');
                                        pdfIcon.innerHTML = '<svg style="width: 24px; height: 24px; color: white;" viewBox="0 0 24 24"><path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" /></svg>';
                                        parent.appendChild(pdfIcon);
                                    }
                                }}
                            />
                        )}

                        {/* Delete button - small X in top-right corner */}
                        {onDelete && !disabled && (
                            <IconButton
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete();
                                }}
                                sx={{
                                    position: 'absolute',
                                    top: -8,
                                    right: -8,
                                    width: 20,
                                    height: 20,
                                    backgroundColor: 'white',
                                    border: '1px solid #d0d0d0',
                                    color: '#f44336',
                                    '&:hover': {
                                        backgroundColor: '#ffebee',
                                        borderColor: '#f44336'
                                    }
                                }}
                            >
                                <Typography sx={{ fontSize: '12px', lineHeight: 1 }}>×</Typography>
                            </IconButton>
                        )}
                        </Box>
                    </Box>
                ) : (
                    <IconButton
                        disabled={disabled || isUploading}
                        title={label}
                        onClick={handleUploadClick}
                        sx={{
                            border: '1px solid #d0d0d0',
                            borderRadius: 1,
                            height: '40px',
                            width: '40px',
                            color: '#6B46C1',
                            '&:hover': {
                                backgroundColor: 'rgba(156, 39, 176, 0.04)',
                                borderColor: '#6B46C1'
                            }
                        }}
                    >
                        {isUploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                    </IconButton>
                )}

                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    {label}
                </Typography>
            </Box>

            {showCreationDate && (
                <TextField
                    fullWidth
                    label="תאריך יצירת המסמך"
                    type="date"
                    value={creationDateValue}
                    onChange={(e) => onCreationDateChange?.(e.target.value)}
                    disabled={disabled}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ maxWidth: 200 }}
                />
            )}
        </Box>
    );
};

// Building Details Table Component
interface BuildingTableProps {
    numberOfBuildings: number;
    buildings: any[];
    onBuildingsChange: (buildings: any[]) => void;
    disabled?: boolean;
}

const BuildingTable: React.FC<BuildingTableProps> = ({ numberOfBuildings, buildings, onBuildingsChange, disabled }) => {
    const handleBuildingChange = (index: number, field: string, value: any) => {
        const newBuildings = [...buildings];
        if (!newBuildings[index]) {
            newBuildings[index] = {};
        }
        newBuildings[index][field] = value;
        onBuildingsChange(newBuildings);
    };

    // Ensure we have the right number of buildings
    const displayBuildings = [];
    for (let i = 0; i < numberOfBuildings; i++) {
        displayBuildings.push({
            buildingName: buildings[i]?.buildingName || `בניין ${i + 1}`,
            unitsPerBuilding: buildings[i]?.unitsPerBuilding || '',
            floorsAboveGround: buildings[i]?.floorsAboveGround || '',
            floorsBelowGround: buildings[i]?.floorsBelowGround || '',
            totalBuildingArea: buildings[i]?.totalBuildingArea || ''
        });
    }

    // Always show the table, even if no buildings
    if (numberOfBuildings <= 0) {
        return (
            <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    הזן מספר בניינים כדי לראות את הטבלה
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            <TableContainer component={Paper} sx={{ border: '1px solid #e0e0e0' }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>שם הבניין</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>מספר יחידות דיור</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>מספר קומות מעל הקרקע</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>מספר קומות מרתף</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>סה״כ מ״ר בנוי</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {displayBuildings.map((building, index) => (
                            <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell sx={{ padding: 1 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        value={building.buildingName}
                                        onChange={(e) => handleBuildingChange(index, 'buildingName', e.target.value)}
                                        disabled={disabled}
                                        variant="outlined"
                                        sx={{ '& .MuiOutlinedInput-root': { height: 40 } }}
                                    />
                                </TableCell>
                                <TableCell sx={{ padding: 1 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type="number"
                                        value={building.unitsPerBuilding}
                                        onChange={(e) => handleBuildingChange(index, 'unitsPerBuilding', parseInt(e.target.value) || 0)}
                                        disabled={disabled}
                                        variant="outlined"
                                        sx={{ '& .MuiOutlinedInput-root': { height: 40 } }}
                                    />
                                </TableCell>
                                <TableCell sx={{ padding: 1 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type="number"
                                        value={building.floorsAboveGround}
                                        onChange={(e) => handleBuildingChange(index, 'floorsAboveGround', parseInt(e.target.value) || 0)}
                                        disabled={disabled}
                                        variant="outlined"
                                        sx={{ '& .MuiOutlinedInput-root': { height: 40 } }}
                                    />
                                </TableCell>
                                <TableCell sx={{ padding: 1 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type="number"
                                        value={building.floorsBelowGround}
                                        onChange={(e) => handleBuildingChange(index, 'floorsBelowGround', parseInt(e.target.value) || 0)}
                                        disabled={disabled}
                                        variant="outlined"
                                        sx={{ '& .MuiOutlinedInput-root': { height: 40 } }}
                                    />
                                </TableCell>
                                <TableCell sx={{ padding: 1 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        type="number"
                                        value={building.totalBuildingArea}
                                        onChange={(e) => handleBuildingChange(index, 'totalBuildingArea', parseFloat(e.target.value) || 0)}
                                        disabled={disabled}
                                        variant="outlined"
                                        sx={{ '& .MuiOutlinedInput-root': { height: 40 } }}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

// Plot Details Table Component
interface PlotDetailsTableProps {
    plotDetails: any[];
    onPlotDetailsChange: (plotDetails: any[]) => void;
    disabled?: boolean;
}

const PlotDetailsTable: React.FC<PlotDetailsTableProps> = ({ plotDetails, onPlotDetailsChange, disabled }) => {
    const handlePlotChange = (index: number, field: string, value: any) => {
        const newPlotDetails = [...plotDetails];
        if (!newPlotDetails[index]) {
            newPlotDetails[index] = {};
        }
        newPlotDetails[index][field] = value;
        onPlotDetailsChange(newPlotDetails);
    };

    const addPlot = () => {
        onPlotDetailsChange([...plotDetails, { block: '', plot: '', subPlot: '' }]);
    };

    const removePlot = (index: number) => {
        // Prevent deletion of the first row (always keep at least one plot)
        if (index === 0) {
            return;
        }

        if (window.confirm('האם אתה בטוח שברצונך למחוק את החלקה?')) {
            const newPlotDetails = plotDetails.filter((_, i) => i !== index);
            onPlotDetailsChange(newPlotDetails);
        }
    };

    // Always show at least one empty row for input
    const displayPlotDetails = plotDetails.length > 0 ? plotDetails : [{ block: '', plot: '', subPlot: '' }];

    return (
        <Box>
            <TableContainer component={Paper} sx={{ border: '1px solid #e0e0e0', borderRadius: 1, minWidth: 600, overflow: 'hidden' }}>
                <Table size="small" sx={{ minWidth: 600 }}>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', fontSize: '0.875rem' }}>גוש</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', fontSize: '0.875rem' }}>חלקה</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', fontSize: '0.875rem' }}>תת חלקה</TableCell>
                            {!disabled && (
                                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', width: 60, fontSize: '0.875rem' }}>פעולות</TableCell>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {displayPlotDetails.map((plot, index) => (
                            <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell sx={{ padding: 1 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        value={plot.block || ''}
                                        onChange={(e) => handlePlotChange(index, 'block', e.target.value)}
                                        disabled={disabled}
                                        variant="outlined"
                                        inputProps={{ maxLength: 8 }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                height: 40,
                                                '& fieldset': {
                                                    borderColor: '#e0e0e0'
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: '#bdbdbd'
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: '#6B46C1'
                                                }
                                            }
                                        }}
                                    />
                                </TableCell>
                                <TableCell sx={{ padding: 1 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        value={plot.plot || ''}
                                        onChange={(e) => handlePlotChange(index, 'plot', e.target.value)}
                                        disabled={disabled}
                                        variant="outlined"
                                        inputProps={{ maxLength: 8 }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                height: 40,
                                                '& fieldset': {
                                                    borderColor: '#e0e0e0'
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: '#bdbdbd'
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: '#6B46C1'
                                                }
                                            }
                                        }}
                                    />
                                </TableCell>
                                <TableCell sx={{ padding: 1 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        value={plot.subPlot || ''}
                                        onChange={(e) => handlePlotChange(index, 'subPlot', e.target.value)}
                                        disabled={disabled}
                                        variant="outlined"
                                        inputProps={{ maxLength: 8 }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                height: 40,
                                                '& fieldset': {
                                                    borderColor: '#e0e0e0'
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: '#bdbdbd'
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: '#6B46C1'
                                                }
                                            }
                                        }}
                                    />
                                </TableCell>
                                {!disabled && (
                                    <TableCell sx={{ padding: 1, textAlign: 'center' }}>
                                        <IconButton
                                            onClick={() => removePlot(index)}
                                            size="small"
                                            disabled={index === 0}
                                            sx={{
                                                color: index === 0 ? 'grey.400' : 'grey.600',
                                                '&:hover': {
                                                    backgroundColor: index === 0 ? 'transparent' : 'grey.200',
                                                    color: index === 0 ? 'grey.400' : 'grey.800'
                                                },
                                                '&.Mui-disabled': {
                                                    color: 'grey.400'
                                                }
                                            }}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                        {!disabled && (
                            <TableRow>
                                <TableCell colSpan={4} sx={{ padding: 2, textAlign: 'center', borderTop: '1px solid #e0e0e0' }}>
                                    <Button
                                        startIcon={<AddIcon />}
                                        onClick={addPlot}
                                        variant="outlined"
                                        sx={{
                                            borderColor: '#6B46C1',
                                            color: '#6B46C1',
                                            '&:hover': {
                                                borderColor: '#5B21B6',
                                                backgroundColor: '#f3e5f5'
                                            }
                                        }}
                                    >
                                        הוספת חלקה
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

interface ProjectDetailsPageProps {
    currentUser: any;
}

export default function ProjectDetailsPage({ currentUser }: ProjectDetailsPageProps) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [mode, setMode] = useState<'view' | 'edit' | 'new'>('view');
    const [activeTab, setActiveTab] = useState(0);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [contractorName, setContractorName] = useState<string>('');

    // Check if user is a contact user
    const [isContactUser, setIsContactUser] = useState(false);
    const [contactUserPermissions, setContactUserPermissions] = useState<string>('contactUser');

    // Success notification state
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');

    // AI analysis state
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [hasAnalyzedReport, setHasAnalyzedReport] = useState(false);
    const [analyzedFiles, setAnalyzedFiles] = useState<Set<string>>(new Set());

    useEffect(() => {
        const checkContactUser = () => {
            const contactUserCheck = localStorage.getItem('contactUserAuthenticated') === 'true';
            const contactUserData = localStorage.getItem('contactUser');

            let isRealContactUser = false;
            let permissions = 'contactUser';

            if (contactUserCheck && contactUserData) {
                try {
                    const contactUser = JSON.parse(contactUserData);
                    isRealContactUser = contactUser.userType === 'contact' || contactUser.userType === 'contractor';

                    if (isRealContactUser) {
                        permissions = contactUser.permissions || 'contactUser';
                    }
                } catch (error) {
                    console.error('Error parsing contact user data:', error);
                }
            }

            setIsContactUser(isRealContactUser);
            setContactUserPermissions(permissions);

            console.log('🔧 ProjectDetailsPage contact user check:', {
                isContactUser: isRealContactUser,
                permissions,
                contactUserData
            });
        };

        checkContactUser();
    }, []);

    // Check if user can edit based on contact user permissions
    const canEdit = !isContactUser || contactUserPermissions === 'contactAdmin';

    // Function to load contractor name
    const loadContractorName = async (contractorId: string) => {
        if (!contractorId) {
            console.log('🔍 loadContractorName - no contractorId provided');
            return;
        }

        console.log('🔍 loadContractorName - loading contractor:', contractorId);

        try {
            const { default: ContractorService } = await import('../services/contractorService');
            console.log('🔍 loadContractorName - calling ContractorService.getById with:', contractorId);
            const contractor = await ContractorService.getById(contractorId);
            console.log('🔍 loadContractorName - contractor data:', contractor);

            if (contractor) {
                const name = contractor.name || contractor.nameEnglish || '';
                setContractorName(name);
                console.log('✅ Loaded contractor name:', name);

                // Update project with correct contractor name
                if (project) {
                    setProject(prev => prev ? { ...prev, contractorName: name } : null);
                }
            } else {
                console.log('❌ No contractor found for ID:', contractorId);
            }
        } catch (error) {
            console.error('❌ Error loading contractor name:', error);
            console.error('❌ Error details:', error.message);
        }
    };

    useEffect(() => {
        const loadProjectData = () => {
            const urlMode = searchParams.get('mode') as 'view' | 'edit' | 'new';
            const projectId = searchParams.get('project_id');
            const tabParam = searchParams.get('tab');

            // Set active tab from URL parameter
            if (tabParam) {
                const tabIndex = parseInt(tabParam, 10);
                if (!isNaN(tabIndex) && tabIndex >= 0) {
                    setActiveTab(tabIndex);
                }
            }

            setMode(urlMode || 'view');
            setLoading(true);

            if (urlMode === 'new') {
                // Get contractor information from URL or sessionStorage
                const contractorId = searchParams.get('contractorId');
                const projectData = sessionStorage.getItem('project_data');

                console.log('🔍 ProjectDetailsPage - NEW mode - contractorId:', contractorId);
                console.log('🔍 ProjectDetailsPage - NEW mode - projectData:', projectData);

                let contractorName = '';
                if (projectData) {
                    try {
                        const parsedProject = JSON.parse(projectData);
                        contractorName = parsedProject.contractorName || '';
                        console.log('🔍 ProjectDetailsPage - NEW mode - contractorName from sessionStorage:', contractorName);
                    } catch (error) {
                        console.error('Error parsing project data from sessionStorage:', error);
                    }
                }

                // Create new project with contractor information
                const newProject: Project = {
                    id: '',
                    projectName: '',
                    description: '',
                    startDate: '',
                    durationMonths: 0,
                    valueNis: 0,
                    city: '',
                    isClosed: false,
                    status: 'future',
                    mainContractor: contractorId || '', // Use contractorId (ObjectId) not contractorName
                    contractorName: contractorName
                };
                setProject(newProject);

                // Set contractor name in state
                setContractorName(contractorName);

                // Also load contractor name from API if we have contractorId
                if (contractorId) {
                    loadContractorName(contractorId);
                }

                setLoading(false);
            } else if (projectId && projectId !== 'new') {
                // Load existing project from server
                const loadProjectFromServer = async () => {
                    try {
                        console.log('Loading project from server:', projectId);
                        const { projectsAPI } = await import('../services/api');
                        const projectData = await projectsAPI.getById(projectId);
                        if (projectData) {
                            console.log('✅ Project loaded from server:', projectData);

                            // If key fields exist at root level, move them to nested structure for UI compatibility
                            if (projectData.projectType || projectData.garmoshkaFile || projectData.garmoshkaFileCreationDate || projectData.plotDetails) {
                                console.log('🔄 Found root-level fields, moving to nested structure for UI compatibility');
                                const processedProjectData = {
                                    ...projectData,
                                    engineeringQuestionnaire: {
                                        ...projectData.engineeringQuestionnaire,
                                        buildingPlan: {
                                            ...projectData.engineeringQuestionnaire?.buildingPlan,
                                            projectType: projectData.projectType || projectData.engineeringQuestionnaire?.buildingPlan?.projectType || '',
                                            garmoshkaFile: projectData.garmoshkaFile || projectData.engineeringQuestionnaire?.buildingPlan?.garmoshkaFile || '',
                                            garmoshkaFileCreationDate: projectData.garmoshkaFileCreationDate || projectData.engineeringQuestionnaire?.buildingPlan?.garmoshkaFileCreationDate || '',
                                            plotDetails: projectData.plotDetails || projectData.engineeringQuestionnaire?.buildingPlan?.plotDetails || []
                                        },
                                        soilConsultantReport: {
                                            ...projectData.engineeringQuestionnaire?.soilConsultantReport,
                                            // Move excavation fields from buildingPlan to soilConsultantReport
                                            excavationDepth: projectData.engineeringQuestionnaire?.buildingPlan?.excavationDepth || projectData.engineeringQuestionnaire?.soilConsultantReport?.excavationDepth || '',
                                            excavationArea: projectData.engineeringQuestionnaire?.buildingPlan?.excavationArea || projectData.engineeringQuestionnaire?.soilConsultantReport?.excavationArea || '',
                                            foundationMethod: projectData.engineeringQuestionnaire?.buildingPlan?.foundationMethod || projectData.engineeringQuestionnaire?.soilConsultantReport?.foundationMethod || '',
                                            perimeterDewatering: projectData.engineeringQuestionnaire?.buildingPlan?.perimeterDewatering !== undefined ? projectData.engineeringQuestionnaire?.buildingPlan?.perimeterDewatering : projectData.engineeringQuestionnaire?.soilConsultantReport?.perimeterDewatering,
                                            constructionMethod: projectData.engineeringQuestionnaire?.buildingPlan?.constructionMethod || projectData.engineeringQuestionnaire?.soilConsultantReport?.constructionMethod || '',
                                            constructionMethodOther: projectData.engineeringQuestionnaire?.buildingPlan?.constructionMethodOther || projectData.engineeringQuestionnaire?.soilConsultantReport?.constructionMethodOther || '',
                                            maxColumnSpacing: projectData.engineeringQuestionnaire?.buildingPlan?.maxColumnSpacing || projectData.engineeringQuestionnaire?.soilConsultantReport?.maxColumnSpacing || ''
                                        }
                                    }
                                };
                                console.log('🔄 Processed project data with nested fields:', processedProjectData);
                                setProject(processedProjectData);
                                
                                // Update exists fields automatically based on file presence
                                const updatedProjectData = {
                                    ...processedProjectData,
                                    engineeringQuestionnaire: {
                                        ...processedProjectData.engineeringQuestionnaire,
                                        buildingPlan: {
                                            ...processedProjectData.engineeringQuestionnaire?.buildingPlan,
                                            buildingPermit: {
                                                ...processedProjectData.engineeringQuestionnaire?.buildingPlan?.buildingPermit,
                                                exists: !!processedProjectData.engineeringQuestionnaire?.buildingPlan?.buildingPermit?.file
                                            },
                                            excavationPermit: {
                                                ...processedProjectData.engineeringQuestionnaire?.buildingPlan?.excavationPermit,
                                                exists: !!processedProjectData.engineeringQuestionnaire?.buildingPlan?.excavationPermit?.file
                                            }
                                        }
                                    }
                                };
                                setProject(updatedProjectData);
                            } else {
                                setProject(projectData);
                                
                                // Update exists fields automatically based on file presence
                                const updatedProjectData = {
                                    ...projectData,
                                    engineeringQuestionnaire: {
                                        ...projectData.engineeringQuestionnaire,
                                        buildingPlan: {
                                            ...projectData.engineeringQuestionnaire?.buildingPlan,
                                            buildingPermit: {
                                                ...projectData.engineeringQuestionnaire?.buildingPlan?.buildingPermit,
                                                exists: !!projectData.engineeringQuestionnaire?.buildingPlan?.buildingPermit?.file
                                            },
                                            excavationPermit: {
                                                ...projectData.engineeringQuestionnaire?.buildingPlan?.excavationPermit,
                                                exists: !!projectData.engineeringQuestionnaire?.buildingPlan?.excavationPermit?.file
                                            }
                                        }
                                    }
                                };
                                setProject(updatedProjectData);
                            }

                            // Load contractor name if we have contractor ID
                            // Prioritize _id (ObjectId) as primary identifier, then fallback to external identifiers
                            const contractorId = (projectData.mainContractor && projectData.mainContractor.length === 24 ? projectData.mainContractor : null) ||
                                projectData.contractorId ||
                                searchParams.get('contractorId'); // Fallback to URL parameter

                            console.log('🔍 Project loaded - projectData.mainContractor:', projectData.mainContractor);
                            console.log('🔍 Project loaded - projectData.contractorId:', projectData.contractorId);
                            console.log('🔍 Project loaded - URL contractorId:', searchParams.get('contractorId'));
                            console.log('🔍 Project loaded - final contractorId:', contractorId);

                            if (contractorId) {
                                loadContractorName(contractorId);
                            } else {
                                console.log('❌ No valid contractor ID found in project data');
                                console.log('❌ Available fields:', {
                                    contractorId: projectData.contractorId,
                                    mainContractor: projectData.mainContractor,
                                    contractorName: projectData.contractorName,
                                    urlContractorId: searchParams.get('contractorId')
                                });
                            }
                        } else {
                            console.error('❌ Project not found on server');
                            // Fallback to sessionStorage
                            const storedData = sessionStorage.getItem('project_data');
                            if (storedData) {
                                try {
                                    const fallbackData = JSON.parse(storedData);
                                    setProject(fallbackData);

                                    // Load contractor name if we have contractor ID
                                    const contractorId = fallbackData.contractorId ||
                                        (fallbackData.mainContractor && fallbackData.mainContractor.length === 24 ? fallbackData.mainContractor : null);
                                    if (contractorId) {
                                        loadContractorName(contractorId);
                                    } else {
                                        console.log('❌ No valid contractor ID found in fallback data');
                                    }
                                } catch (error) {
                                    console.error('Error parsing fallback project data:', error);
                                }
                            }
                        }
                    } catch (error) {
                        console.error('❌ Error loading project from server:', error);
                        // Fallback to sessionStorage
                        const storedData = sessionStorage.getItem('project_data');
                        if (storedData) {
                            try {
                                const fallbackData = JSON.parse(storedData);
                                setProject(fallbackData);

                                // Load contractor name if we have contractor ID
                                const contractorId = fallbackData.contractorId ||
                                    (fallbackData.mainContractor && fallbackData.mainContractor.length === 24 ? fallbackData.mainContractor : null);
                                if (contractorId) {
                                    loadContractorName(contractorId);
                                } else {
                                    console.log('❌ No valid contractor ID found in catch fallback data');
                                }
                            } catch (parseError) {
                                console.error('Error parsing fallback project data:', parseError);
                            }
                        }
                    } finally {
                        setLoading(false);
                    }
                };
                loadProjectFromServer();
            } else {
                setLoading(false);
            }
        };

        loadProjectData();
    }, [searchParams]);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
        // Save active tab to URL parameters
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('tab', newValue.toString());
        navigate(`?${newSearchParams.toString()}`, { replace: true });
    };

    const handleFieldChange = (field: keyof Project, value: any) => {
        if (project) {
            setProject({
                ...project,
                [field]: value
            });
        }
    };

    const handleNestedFieldChange = (fieldPath: string, value: any) => {
        console.log('🔄 handleNestedFieldChange called:', fieldPath, value);
        if (project) {
            const newProject = { ...project };
            const keys = fieldPath.split('.');
            let current: any = newProject;

            // Navigate to the parent object
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }

            // Set the final value
            current[keys[keys.length - 1]] = value;
            console.log('✅ Updated project field:', fieldPath, 'to:', value);
            console.log('✅ New project state:', newProject);

            setProject(newProject);
        } else {
            console.log('❌ No project to update');
        }
    };

    // General file upload handler that resets analysis state
    const handleFileUploadWithAnalysisReset = (fieldPath: string, url: string | null, currentFileUrl?: string) => {
        // Reset analysis state when new file is uploaded
        setIsAnalyzing(false);

        // Remove from analyzed files if file is deleted or changed
        if (currentFileUrl) {
            setAnalyzedFiles(prev => {
                const newSet = new Set(prev);
                newSet.delete(currentFileUrl);
                return newSet;
            });
        }

        // Update the file URL
        handleNestedFieldChange(fieldPath, url);
    };

    // Handle soil report file upload
    const handleSoilReportFileChange = (url: string | null) => {
        handleFileUploadWithAnalysisReset(
            'engineeringQuestionnaire.soilConsultantReport.reportFile',
            url,
            project?.engineeringQuestionnaire?.soilConsultantReport?.reportFile
        );
    };

    // General document analysis function
    const handleDocumentAnalysis = async (fileUrl: string, documentType: string) => {
        if (!fileUrl) {
            setSnackbarMessage('אנא העלה מסמך תחילה');
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }

        try {
            setIsAnalyzing(true);
            setSnackbarMessage(`מנתח את המסמך (${documentType}) וממלא שדות...`);
            setSnackbarSeverity('info');
            setSnackbarOpen(true);

            console.log('🔍 Starting document analysis:', fileUrl, documentType);

            // Choose the correct endpoint based on document type
            const endpoint = documentType.includes('גרמושקה') || documentType.includes('תוכניות')
                ? '/api/document-parser/parse-garmoshka'
                : '/api/document-parser/parse-soil-report';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ fileUrl: fileUrl })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Failed to parse document');
            }

            const extractedData = result.data;
            console.log('✅ Extracted data:', extractedData);

            // Update project with extracted data
            if (project) {
                const newProject = { ...project };

                // Ensure the soilConsultantReport object exists
                if (!newProject.engineeringQuestionnaire) {
                    newProject.engineeringQuestionnaire = {};
                }
                if (!newProject.engineeringQuestionnaire.soilConsultantReport) {
                    newProject.engineeringQuestionnaire.soilConsultantReport = {};
                }

                // Map extracted data to project fields
                const soilReport = newProject.engineeringQuestionnaire.soilConsultantReport;

                if (extractedData.soilType) {
                    soilReport.soilType = extractedData.soilType;
                }
                if (extractedData.soilTypeOther) {
                    soilReport.soilTypeOther = extractedData.soilTypeOther;
                }
                if (extractedData.groundwaterDepth !== undefined) {
                    soilReport.groundwaterDepth = extractedData.groundwaterDepth;
                }
                if (extractedData.excavationDepth !== undefined) {
                    soilReport.excavationDepth = extractedData.excavationDepth;
                }
                if (extractedData.excavationArea !== undefined) {
                    soilReport.excavationArea = extractedData.excavationArea;
                }
                if (extractedData.foundationMethod) {
                    soilReport.foundationMethod = extractedData.foundationMethod;
                }
                if (extractedData.perimeterDewatering !== undefined) {
                    soilReport.perimeterDewatering = extractedData.perimeterDewatering;
                }
                if (extractedData.constructionMethod) {
                    soilReport.constructionMethod = extractedData.constructionMethod;
                }
                if (extractedData.constructionMethodOther) {
                    soilReport.constructionMethodOther = extractedData.constructionMethodOther;
                }
                if (extractedData.maxColumnSpacing !== undefined) {
                    soilReport.maxColumnSpacing = extractedData.maxColumnSpacing;
                }
                if (extractedData.environmentalDescription) {
                    soilReport.environmentalDescription = extractedData.environmentalDescription;
                }
                if (extractedData.currentSituationDescription) {
                    soilReport.currentSituationDescription = extractedData.currentSituationDescription;
                }
                if (extractedData.png25EarthquakeRating) {
                    soilReport.png25EarthquakeRating = extractedData.png25EarthquakeRating;
                }
                if (extractedData.area) {
                    soilReport.area = extractedData.area;
                }

                setProject(newProject);

                // Mark this file as analyzed
                setAnalyzedFiles(prev => new Set([...prev, fileUrl]));

                setSnackbarMessage('השדות מולאו בהצלחה מהמסמך!');
                setSnackbarSeverity('success');
                setSnackbarOpen(true);
            }

        } catch (error) {
            console.error('❌ Error analyzing document:', error);
            setSnackbarMessage(`שגיאה בניתוח המסמך: ${error.message}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Auto-fill function for soil report
    const handleAutoFillFromReport = async () => {
        const reportFileUrl = project?.engineeringQuestionnaire?.soilConsultantReport?.reportFile;
        await handleDocumentAnalysis(reportFileUrl, 'דוח קרקע');
    };

    const handleSave = async () => {
        try {

            if (!project) {
                console.error('No project to save');
                return;
            }

            // Set saving state
            setSaving(true);

            // Use projectsAPI to save the project
            const { projectsAPI } = await import('../services/api');

            if (mode === 'new') {
                // Create new project - move key fields to root level
                const projectToSave = {
                    ...project,
                    mainContractor: project.mainContractor || searchParams.get('contractorId') || '',
                    // Move key fields from nested objects to root level
                    projectType: project.engineeringQuestionnaire?.buildingPlan?.projectType || '',
                    garmoshkaFile: project.engineeringQuestionnaire?.buildingPlan?.garmoshkaFile || '',
                    garmoshkaFileCreationDate: project.engineeringQuestionnaire?.buildingPlan?.garmoshkaFileCreationDate || '',
                    plotDetails: project.engineeringQuestionnaire?.buildingPlan?.plotDetails || [],
                    // Keep nested objects for other fields
                    engineeringQuestionnaire: project.engineeringQuestionnaire,
                    environmentalSurvey: project.environmentalSurvey,
                    hydrologicalPlan: project.hydrologicalPlan,
                    siteDrainagePlan: project.siteDrainagePlan,
                    schedule: project.schedule
                };
                console.log('🔄 Creating new project with data:', projectToSave);
                console.log('🔄 Key fields moved to root:', {
                    projectType: projectToSave.projectType,
                    garmoshkaFile: projectToSave.garmoshkaFile,
                    garmoshkaFileCreationDate: projectToSave.garmoshkaFileCreationDate,
                    plotDetails: projectToSave.plotDetails
                });
                const savedProject = await projectsAPI.create(projectToSave);
                console.log('✅ Project created:', savedProject);
            } else {
                // Update existing project - move key fields to root level
                const updateData = {
                    projectName: project.projectName,
                    description: project.description,
                    startDate: project.startDate,
                    durationMonths: project.durationMonths,
                    valueNis: typeof project.valueNis === 'number' ? project.valueNis : 0,
                    city: project.city,
                    isClosed: project.isClosed,
                    status: project.status,
                    mainContractor: project.mainContractor || searchParams.get('contractorId') || '',
                    // Move key fields from nested objects to root level
                    projectType: project.engineeringQuestionnaire?.buildingPlan?.projectType || '',
                    garmoshkaFile: project.engineeringQuestionnaire?.buildingPlan?.garmoshkaFile || '',
                    garmoshkaFileCreationDate: project.engineeringQuestionnaire?.buildingPlan?.garmoshkaFileCreationDate || '',
                    plotDetails: project.engineeringQuestionnaire?.buildingPlan?.plotDetails || [],
                    // Keep nested objects for other fields
                    engineeringQuestionnaire: project.engineeringQuestionnaire,
                    environmentalSurvey: project.environmentalSurvey,
                    hydrologicalPlan: project.hydrologicalPlan,
                    siteDrainagePlan: project.siteDrainagePlan,
                    schedule: project.schedule
                };
                const projectId = project._id || project.id;
                console.log('🔄 Sending update data to server:', updateData);
                console.log('🔄 Key fields moved to root:', {
                    projectType: updateData.projectType,
                    garmoshkaFile: updateData.garmoshkaFile,
                    garmoshkaFileCreationDate: updateData.garmoshkaFileCreationDate,
                    plotDetails: updateData.plotDetails
                });
                const updatedProject = await projectsAPI.update(projectId, updateData);
                console.log('✅ Project updated:', updatedProject);
            }

            // Show success message
            console.log('✅ Project saved successfully');
            setSnackbarMessage('הפרויקט נשמר בהצלחה!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);

        } catch (error) {
            console.error('❌ Error saving project:', error);
            setSnackbarMessage('שגיאה בשמירת הפרויקט: ' + error.message);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            // Reset saving state
            setSaving(false);
        }
    };

    const handleClose = () => {
        console.log('🔍 handleClose - function called');
        console.log('🔍 handleClose - current URL:', window.location.href);
        console.log('🔍 handleClose - searchParams:', searchParams.toString());
        console.log('🔍 handleClose - project data:', project);

        // Navigate back to the contractor card that opened this project
        let contractorId = searchParams.get('contractorId') || searchParams.get('contractor_id');

        console.log('🔍 handleClose - contractorId from URL:', contractorId);

        // If no contractorId from URL, try to get it from project data
        if (!contractorId && project) {
            console.log('🔍 handleClose - no contractorId from URL, checking project data');
            console.log('🔍 handleClose - project.mainContractor:', project.mainContractor);
            console.log('🔍 handleClose - project.contractorId:', project.contractorId);

            // ALWAYS prioritize mainContractor (ObjectId) for navigation
            if (project.mainContractor) {
                contractorId = project.mainContractor;
                console.log('🔍 handleClose - using mainContractor as contractorId:', contractorId);
            } else if (project.contractorId) {
                contractorId = project.contractorId;
                console.log('🔍 handleClose - using contractorId as fallback:', contractorId);
            }
            console.log('🔍 handleClose - final contractorId from project:', contractorId);
        }

        if (contractorId) {
            // Navigate back to contractor details with projects tab
            const navigationUrl = `/?contractor_id=${contractorId}&tab=projects`;
            console.log('🔍 handleClose - navigating to:', navigationUrl);
            console.log('🔍 handleClose - about to call navigate()');
            console.log('🔍 handleClose - contractorId type:', typeof contractorId);
            console.log('🔍 handleClose - contractorId length:', contractorId.length);
            navigate(navigationUrl);
        } else {
            // Fallback to main view if no contractor ID
            console.log('🔍 handleClose - no contractorId found, navigating to main view');
            navigate('/');
        }
    };

    const handleBack = () => {
        navigate('/');
    };

    const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleUserMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        // Clear localStorage for contact users
        localStorage.clear();
        // Navigate to login
        navigate('/login');
    };

    if (loading) {
        return <SkeletonLoader />;
    }

    if (!project) {
        return <SkeletonLoader />;
    }

    return (
        <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f4f6f8' }}>
            {/* Main Header with System Name and Profile - Same as contractor card */}
            <Paper elevation={2} sx={{ p: 2, mb: 2, bgcolor: 'white' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Left side - Logo and title */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onClick={() => {
                                // Navigate to CRM for user and admin types
                                if (currentUser?.role === 'user' || currentUser?.role === 'admin') {
                                    handleBack();
                                }
                            }}
                        >
                            <img src="/assets/logo.svg" alt="שוקו ביטוח" style={{ width: '100%', height: '100%' }} />
                        </Box>
                        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#424242' }}>
                            ניהול סיכונים באתרי בניה
                        </Typography>
                    </Box>

                    {/* Right side - User profile */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {currentUser?.picture ? (
                            <Avatar src={currentUser.picture} alt={currentUser.name} sx={{ width: 32, height: 32 }} />
                        ) : (
                            <Avatar sx={{ width: 32, height: 32, bgcolor: '#882DD7' }}>
                                <AccountCircleIcon />
                            </Avatar>
                        )}
                        <Typography variant="body2">{currentUser?.name || 'משתמש'}</Typography>
                        <IconButton onClick={handleUserMenuOpen}>
                            <MoreVertIcon />
                        </IconButton>
                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={handleUserMenuClose}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                        >
                            <MenuItemComponent onClick={handleUserMenuClose}>
                                <ListItemIcon>
                                    <PersonIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>פרופיל</ListItemText>
                            </MenuItemComponent>
                            <MenuItemComponent onClick={handleLogout}>
                                <ListItemIcon>
                                    <LogoutIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>התנתק</ListItemText>
                            </MenuItemComponent>
                        </Menu>
                    </Box>
                </Box>
            </Paper>

            {/* Project Card - Same style as contractor card */}
            <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Paper elevation={1} sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Project Header */}
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1.5,
                        bgcolor: 'white',
                        color: 'black',
                        border: '1px solid #e0e0e0',
                        borderBottom: 'none',
                        borderRadius: '4px 4px 0 0',
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                        flexShrink: 0
                    }}>
                        <Typography variant="h6" sx={{ fontWeight: 500, color: 'black' }}>
                            {mode === 'new' ? 'פרויקט חדש' : project?.projectName || 'פרטי פרויקט'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {/* Show buttons based on user permissions */}
                            {(() => {
                                console.log('🔧 ProjectDetailsPage button logic:', {
                                    isContactUser,
                                    contactUserPermissions
                                });

                                // contactUser: show only Close button to return to contractor
                                if (isContactUser && contactUserPermissions === 'contactUser') {
                                    console.log('🔧 ProjectDetailsPage: contactUser - only Close button');
                                    return (
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => {
                                                console.log('🔍 Close button clicked - contactUser');
                                                handleClose();
                                            }}
                                            sx={{
                                                minWidth: 'auto',
                                                px: 2,
                                                borderColor: '#6B46C1', // סגול שוקו
                                                color: '#6B46C1',
                                                '&:hover': {
                                                    borderColor: '#5B21B6',
                                                    bgcolor: 'rgba(107, 70, 193, 0.04)'
                                                }
                                            }}
                                        >
                                            סגירה
                                        </Button>
                                    );
                                }

                                // contactAdmin: show only Save button, no Close button
                                if (isContactUser && contactUserPermissions === 'contactAdmin') {
                                    console.log('🔧 ProjectDetailsPage: contactAdmin - only Save button');
                                    return (
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={handleSave}
                                            disabled={saving}
                                            sx={{
                                                minWidth: 'auto',
                                                px: 2,
                                                bgcolor: '#6B46C1',
                                                '&:hover': {
                                                    bgcolor: '#5B21B6'
                                                }
                                            }}
                                        >
                                            {saving ? 'שומר...' : 'שמירה'}
                                        </Button>
                                    );
                                }

                                // System users: show both buttons
                                console.log('🔧 ProjectDetailsPage: system user - both buttons');
                                return (
                                    <>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => {
                                                console.log('🔍 Close button clicked - systemUser');
                                                handleClose();
                                            }}
                                            sx={{
                                                minWidth: 'auto',
                                                px: 2,
                                                borderColor: '#6B46C1', // סגול שוקו
                                                color: '#6B46C1',
                                                '&:hover': {
                                                    borderColor: '#5B21B6',
                                                    backgroundColor: 'rgba(136, 47, 215, 0.04)'
                                                }
                                            }}
                                        >
                                            סגירה
                                        </Button>
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={handleSave}
                                            disabled={saving}
                                            sx={{
                                                minWidth: 'auto',
                                                px: 2,
                                                bgcolor: '#6B46C1',
                                                '&:hover': {
                                                    bgcolor: '#5B21B6'
                                                }
                                            }}
                                        >
                                            {saving ? 'שומר...' : 'שמירה'}
                                        </Button>
                                    </>
                                );
                            })()}
                        </Box>
                    </Box>

                    {/* Tabs */}
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs 
                            value={activeTab} 
                            onChange={handleTabChange} 
                            aria-label="project tabs"
                            sx={{
                                '& .MuiTab-root': {
                                    color: '#6B7280',
                                    '&.Mui-selected': {
                                        color: '#6B46C1',
                                    },
                                },
                                '& .MuiTabs-indicator': {
                                    backgroundColor: '#6B46C1',
                                },
                            }}
                        >
                            <Tab label="כללי" />
                            <Tab label="תוכניות" />
                            <Tab label="מפרט" />
                            <Tab label="מסמכים" />
                            <Tab label="ביטוח" />
                            <Tab label="הרשאות" />
                            <Tab label="הערות" />
                            {(project?.status === 'current' || project?.status === 'completed') && (
                                <Tab label="דשבורד" />
                            )}
                        </Tabs>
                    </Box>

                    {/* Tab Content */}
                    <Box sx={{ p: 3, pb: 6, flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {activeTab === 0 && (
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
                                    מידע כללי
                                </Typography>

                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3, flex: 1, bgcolor: 'white', p: 2, borderRadius: 1 }}>
                                    <TextField
                                        fullWidth
                                        label="שם הפרויקט"
                                        value={project?.projectName || ''}
                                        onChange={(e) => handleFieldChange('projectName', e.target.value)}
                                        disabled={mode === 'view' || !canEdit}
                                    />

                                    <TextField
                                        fullWidth
                                        label="תיאור הפרויקט"
                                        value={project?.description || ''}
                                        onChange={(e) => handleFieldChange('description', e.target.value)}
                                        disabled={mode === 'view' || !canEdit}
                                        multiline
                                        rows={3}
                                    />

                                    <TextField
                                        fullWidth
                                        label="תאריך התחלה"
                                        type="date"
                                        value={project?.startDate || ''}
                                        onChange={(e) => handleFieldChange('startDate', e.target.value)}
                                        disabled={mode === 'view' || !canEdit}
                                        InputLabelProps={{ shrink: true }}
                                    />

                                    <TextField
                                        fullWidth
                                        label="משך הפרויקט (חודשים)"
                                        type="number"
                                        value={project?.durationMonths || 0}
                                        onChange={(e) => handleFieldChange('durationMonths', parseInt(e.target.value) || 0)}
                                        disabled={mode === 'view' || !canEdit}
                                    />

                                    <TextField
                                        fullWidth
                                        label="עיר"
                                        value={project?.city || ''}
                                        onChange={(e) => handleFieldChange('city', e.target.value)}
                                        disabled={mode === 'view' || !canEdit}
                                    />

                                    <TextField
                                        fullWidth
                                        label="ערך הפרויקט (₪)"
                                        type="number"
                                        value={project?.valueNis || project?.value || 0}
                                        onChange={(e) => handleFieldChange('valueNis', parseInt(e.target.value) || 0)}
                                        disabled={mode === 'view' || !canEdit}
                                    />


                                    <TextField
                                        fullWidth
                                        label="קבלן ראשי"
                                        value={contractorName || project?.mainContractor || ''}
                                        onChange={(e) => handleFieldChange('mainContractor', e.target.value)}
                                        disabled={mode === 'view' || !canEdit || mode === 'new'}
                                        InputProps={{ readOnly: true }}
                                        sx={{ backgroundColor: '#f5f5f5' }}
                                    />
                                </Box>
                            </Box>
                        )}

                        {activeTab === 1 && (
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

                                {/* שאלון הנדסי */}
                                <Box sx={{ mb: 4 }}>

                                    {/* תוכנית בניה (גרמושקה) */}
                                    <Box sx={{ mb: 3 }}>

                                        {/* תת-סקשן: פרטי הפרויקט */}
                                        <Box sx={{ mb: 4, direction: 'rtl' }}>
                                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary', textAlign: 'right' }}>
                                                פרטי הפרויקט
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, direction: 'rtl' }}>
                                                {/* Garmoshka File Upload with AI Icon - RTL Layout */}
                                                <Box sx={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: 1,
                                                    direction: 'rtl',
                                                    justifyContent: 'flex-start'
                                                }}>
                                                    {/* File Upload Icon */}
                                                <FileUpload
                                                        label=""
                                                    value={project?.engineeringQuestionnaire?.buildingPlan?.garmoshkaFile}
                                                        onChange={(url) => handleFileUploadWithAnalysisReset('engineeringQuestionnaire.buildingPlan.garmoshkaFile', url, project?.engineeringQuestionnaire?.buildingPlan?.garmoshkaFile)}
                                                        onDelete={() => handleFileUploadWithAnalysisReset('engineeringQuestionnaire.buildingPlan.garmoshkaFile', '', project?.engineeringQuestionnaire?.buildingPlan?.garmoshkaFile)}
                                                    disabled={mode === 'view' || !canEdit}
                                                    accept=".pdf,.dwg,.dwf"
                                                        showCreationDate={false}
                                                    projectId={project?._id || project?.id}
                                                />

                                                    {/* File Name */}
                                                    <Typography
                                                        variant="body1"
                                                        sx={{
                                                            color: project?.engineeringQuestionnaire?.buildingPlan?.garmoshkaFile ? '#6B46C1' : 'text.secondary',
                                                            cursor: project?.engineeringQuestionnaire?.buildingPlan?.garmoshkaFile ? 'pointer' : 'default',
                                                            textDecoration: project?.engineeringQuestionnaire?.buildingPlan?.garmoshkaFile ? 'underline' : 'none',
                                                            minWidth: '120px',
                                                            alignSelf: 'center',
                                                            '&:hover': project?.engineeringQuestionnaire?.buildingPlan?.garmoshkaFile ? {
                                                                color: '#5B21B6',
                                                            } : {}
                                                        }}
                                                        onClick={() => {
                                                            if (project?.engineeringQuestionnaire?.buildingPlan?.garmoshkaFile) {
                                                                window.open(project.engineeringQuestionnaire.buildingPlan.garmoshkaFile, '_blank');
                                                            }
                                                        }}
                                                    >
                                                        תוכניות (גרמושקה)
                                                    </Typography>

                                                    {/* AI Analysis Icon */}
                                                    {(() => {
                                                        const garmoshkaFile = project?.engineeringQuestionnaire?.buildingPlan?.garmoshkaFile;
                                                        const isAnalyzed = analyzedFiles.has(garmoshkaFile);
                                                        return garmoshkaFile && canEdit && !isAnalyzed;
                                                    })() && (
                                                            <IconButton
                                                                onClick={() => handleDocumentAnalysis(project?.engineeringQuestionnaire?.buildingPlan?.garmoshkaFile, 'תוכניות גרמושקה')}
                                                                disabled={isAnalyzing || mode === 'view'}
                                                                sx={{
                                                                    backgroundColor: 'white',
                                                                    color: '#6B46C1',
                                                                    width: '40px',
                                                                    height: '40px',
                                                                    alignSelf: 'center',
                                                                    '&:hover': {
                                                                        backgroundColor: '#F3F4F6',
                                                                    },
                                                                    '&:disabled': {
                                                                        backgroundColor: '#E5E7EB',
                                                                        color: '#9CA3AF'
                                                                    }
                                                                }}
                                                            >
                                                                {isAnalyzing ? (
                                                                    <CircularProgress size={20} color="inherit" />
                                                                ) : (
                                                                    <AutoAwesomeIcon />
                                                                )}
                                                            </IconButton>
                                                        )}

                                                    {/* Creation Date */}
                                                    <TextField
                                                        label="תאריך יצירת המסמך"
                                                        type="date"
                                                        value={project?.engineeringQuestionnaire?.buildingPlan?.garmoshkaFileCreationDate || ''}
                                                        onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.garmoshkaFileCreationDate', e.target.value)}
                                                        disabled={mode === 'view' || !canEdit}
                                                        size="small"
                                                        sx={{ minWidth: '180px' }}
                                                        InputLabelProps={{
                                                            shrink: true,
                                                        }}
                                                    />
                                                </Box>

                                                {/* Project Details Fields - 3 columns layout */}
                                                <Box sx={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                                    gap: 2,
                                                    direction: 'rtl'
                                                }}>
                                                    <FormControl>
                                                        <InputLabel id="project-type-label">סוג הפרויקט</InputLabel>
                                                    <Select
                                                        labelId="project-type-label"
                                                        value={project?.engineeringQuestionnaire?.buildingPlan?.projectType || ''}
                                                        label="סוג הפרויקט"
                                                        onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.projectType', e.target.value)}
                                                        disabled={mode === 'view' || !canEdit}
                                                    >
                                                        <MenuItem value="בניה">בניה</MenuItem>
                                                        <MenuItem value="תמא 38">תמא 38</MenuItem>
                                                        <MenuItem value="פינוי בינוי">פינוי בינוי</MenuItem>
                                                        <MenuItem value="תשתיות">תשתיות</MenuItem>
                                                        <MenuItem value="גשר">גשר</MenuItem>
                                                        <MenuItem value="כביש">כביש</MenuItem>
                                                    </Select>
                                                </FormControl>

                                                    <Box sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '4px',
                                                        backgroundColor: 'white',
                                                        minHeight: '56px',
                                                        padding: '0 14px',
                                                        direction: 'rtl'
                                                    }}>
                                                        <Typography variant="body2" sx={{ 
                                                            color: 'text.secondary', 
                                                            fontSize: '1rem',
                                                            marginRight: '10px',
                                                            minWidth: '120px'
                                                        }}>
                                                            תוכנית ממשלתית
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
                                                                onClick={() => {
                                                                    console.log('🔴 Clicking "לא" button, current value:', project?.engineeringQuestionnaire?.buildingPlan?.governmentProgram);
                                                                    console.log('🔴 Mode:', mode, 'canEdit:', canEdit);
                                                                    handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.governmentProgram', false);
                                                                }}
                                                        disabled={mode === 'view' || !canEdit}
                                                                sx={{
                                                                    borderRadius: '0 4px 4px 0',
                                                                    border: '1px solid #d1d5db',
                                                                    borderLeft: 'none',
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.governmentProgram === false ? '#6B46C1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.governmentProgram === false ? 'white' : '#6B46C1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.governmentProgram === false ? '#5B21B6' : '#f3f4f6',
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
                                                                    console.log('🟢 Clicking "כן" button, current value:', project?.engineeringQuestionnaire?.buildingPlan?.governmentProgram);
                                                                    console.log('🟢 Mode:', mode, 'canEdit:', canEdit);
                                                                    handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.governmentProgram', true);
                                                                }}
                                                                disabled={mode === 'view' || !canEdit}
                                                                sx={{
                                                                    borderRadius: '4px 0 0 4px',
                                                                    border: '1px solid #d1d5db',
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.governmentProgram === true ? '#6B46C1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.governmentProgram === true ? 'white' : '#6B46C1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.governmentProgram === true ? '#5B21B6' : '#f3f4f6',
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

                                                {project?.engineeringQuestionnaire?.buildingPlan?.governmentProgram && (
                                                    <TextField
                                                        fullWidth
                                                        label="פרט על התוכנית הממשלתית"
                                                        value={project?.engineeringQuestionnaire?.buildingPlan?.governmentProgramDetails || ''}
                                                        onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.governmentProgramDetails', e.target.value)}
                                                        disabled={mode === 'view' || !canEdit}
                                                        multiline
                                                        rows={2}
                                                    />
                                                )}
                                            </Box>
                                        </Box>

                                        {/* תת-סקשן: מיקום וכתובת */}
                                        <Box sx={{ mb: 4, direction: 'rtl' }}>
                                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary', textAlign: 'right' }}>
                                                מיקום וכתובת
                                            </Typography>
                                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3, direction: 'rtl' }}>
                                                <TextField
                                                    fullWidth
                                                    label="כתובת (טקסט חופשי)"
                                                    value={project?.engineeringQuestionnaire?.buildingPlan?.address || ''}
                                                    onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.address', e.target.value)}
                                                    disabled={mode === 'view' || !canEdit}
                                                />

                                                <TextField
                                                    fullWidth
                                                    label="נ״צ X"
                                                    type="number"
                                                    value={project?.engineeringQuestionnaire?.buildingPlan?.coordinates?.x || ''}
                                                    onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.coordinates.x', parseFloat(e.target.value) || 0)}
                                                    disabled={mode === 'view' || !canEdit}
                                                />

                                                <TextField
                                                    fullWidth
                                                    label="נ״צ Y"
                                                    type="number"
                                                    value={project?.engineeringQuestionnaire?.buildingPlan?.coordinates?.y || ''}
                                                    onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.coordinates.y', parseFloat(e.target.value) || 0)}
                                                    disabled={mode === 'view' || !canEdit}
                                                />

                                                <PlotDetailsTable
                                                    plotDetails={project?.engineeringQuestionnaire?.buildingPlan?.plotDetails || [{ block: '', plot: '', subPlot: '' }]}
                                                    onPlotDetailsChange={(plotDetails) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.plotDetails', plotDetails)}
                                                    disabled={mode === 'view' || !canEdit}
                                                />
                                            </Box>
                                        </Box>


                                        {/* תת-סקשן: פרטי הבניינים - מוצג רק אם סוג הפרויקט הוא "בניה" */}
                                        {project?.engineeringQuestionnaire?.buildingPlan?.projectType === 'בניה' && (
                                            <Box sx={{ mb: 4 }}>
                                                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                                    פרטי הבניינים
                                                </Typography>

                                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3, mb: 3 }}>
                                                    <TextField
                                                        fullWidth
                                                        label="מספר בניינים"
                                                        type="number"
                                                        value={project?.engineeringQuestionnaire?.buildingPlan?.numberOfBuildings || ''}
                                                        onChange={(e) => {
                                                            const value = parseInt(e.target.value) || 0;
                                                            // Validate: minimum 1, maximum 100
                                                            if (value >= 1 && value <= 100) {
                                                                handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.numberOfBuildings', value);
                                                            } else if (value === 0) {
                                                                handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.numberOfBuildings', 0);
                                                            }
                                                        }}
                                                        disabled={mode === 'view' || !canEdit}
                                                        inputProps={{ min: 1, max: 100 }}
                                                    />

                                                </Box>

                                                <BuildingTable
                                                    numberOfBuildings={project?.engineeringQuestionnaire?.buildingPlan?.numberOfBuildings || 0}
                                                    buildings={project?.engineeringQuestionnaire?.buildingPlan?.buildings || []}
                                                    onBuildingsChange={(buildings) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.buildings', buildings)}
                                                    disabled={mode === 'view' || !canEdit}
                                                />

                                                {/* שדות מרתף - מוצגים אחרי הטבלה */}
                                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3, mt: 3 }}>
                                                    <TextField
                                                        fullWidth
                                                        label="סה״כ מ״ר בנוי מרתף"
                                                        type="number"
                                                        value={project?.engineeringQuestionnaire?.buildingPlan?.totalBasementArea || ''}
                                                        onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.totalBasementArea', parseFloat(e.target.value) || 0)}
                                                        disabled={mode === 'view' || !canEdit}
                                                    />

                                                    {/* שדה מרתף משותף - כפתורי כן/לא */}
                                                    <Box sx={{
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '4px',
                                                        backgroundColor: 'white',
                                                        minHeight: '56px',
                                                        padding: '0 14px',
                                                        direction: 'rtl',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between'
                                                    }}>
                                                        <Typography sx={{
                                                            fontSize: '1rem',
                                                            color: 'text.secondary',
                                                            marginRight: '10px'
                                                        }}>
                                                            האם יש קומות מרתף משותפות לבניינים אחרים
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
                                                                onClick={() => {
                                                                    console.log('🔴 Clicking "לא" button for shared basement, current value:', project?.engineeringQuestionnaire?.buildingPlan?.sharedBasementFloors);
                                                                    console.log('🔴 Mode:', mode, 'canEdit:', canEdit);
                                                                    handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.sharedBasementFloors', false);
                                                                }}
                                                                disabled={mode === 'view' || !canEdit}
                                                                sx={{
                                                                    borderRadius: '0 4px 4px 0',
                                                                    border: '1px solid #d1d5db',
                                                                    borderLeft: 'none',
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.sharedBasementFloors === false ? '#6B46C1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.sharedBasementFloors === false ? 'white' : '#6B46C1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.sharedBasementFloors === false ? '#5B21B6' : '#f3f4f6',
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
                                                                    console.log('🟢 Clicking "כן" button for shared basement, current value:', project?.engineeringQuestionnaire?.buildingPlan?.sharedBasementFloors);
                                                                    console.log('🟢 Mode:', mode, 'canEdit:', canEdit);
                                                                    handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.sharedBasementFloors', true);
                                                                }}
                                                                disabled={mode === 'view' || !canEdit}
                                                                sx={{
                                                                    borderRadius: '4px 0 0 4px',
                                                                    border: '1px solid #d1d5db',
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.sharedBasementFloors === true ? '#6B46C1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.sharedBasementFloors === true ? 'white' : '#6B46C1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.sharedBasementFloors === true ? '#5B21B6' : '#f3f4f6',
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
                                            </Box>
                                        )}

                                        {/* תת-סקשן: היתרים ואישורים */}
                                        <Box sx={{ mb: 4 }}>
                                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                                היתרים ואישורים
                                            </Typography>
                                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3 }}>

                                                <FileUpload
                                                    label="העלה קובץ היתר בניה"
                                                    value={project?.engineeringQuestionnaire?.buildingPlan?.buildingPermit?.file}
                                                    onChange={(url) => {
                                                        handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.buildingPermit.file', url);
                                                        // Update exists field automatically based on file presence
                                                        handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.buildingPermit.exists', !!url);
                                                    }}
                                                    onDelete={() => {
                                                        handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.buildingPermit.file', '');
                                                        // Update exists field automatically when file is deleted
                                                        handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.buildingPermit.exists', false);
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    showCreationDate={true}
                                                    creationDateValue={project?.engineeringQuestionnaire?.buildingPlan?.buildingPermit?.creationDate || ''}
                                                    onCreationDateChange={(date) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.buildingPermit.creationDate', date)}
                                                    projectId={project?._id || project?.id}
                                                />

                                                <FileUpload
                                                    label="העלה קובץ היתר חפירה ודיפון"
                                                    value={project?.engineeringQuestionnaire?.buildingPlan?.excavationPermit?.file}
                                                    onChange={(url) => {
                                                        handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.excavationPermit.file', url);
                                                        // Update exists field automatically based on file presence
                                                        handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.excavationPermit.exists', !!url);
                                                    }}
                                                    onDelete={() => {
                                                        handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.excavationPermit.file', '');
                                                        // Update exists field automatically when file is deleted
                                                        handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.excavationPermit.exists', false);
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    showCreationDate={true}
                                                    creationDateValue={project?.engineeringQuestionnaire?.buildingPlan?.excavationPermit?.creationDate || ''}
                                                    onCreationDateChange={(date) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.excavationPermit.creationDate', date)}
                                                    projectId={project?._id || project?.id}
                                                />

                                                <FileUpload
                                                    label="אישור מהנדס קונסטרקטור - העלה קובץ"
                                                    value={project?.engineeringQuestionnaire?.buildingPlan?.structuralEngineerApproval?.file}
                                                    onChange={(url) => handleFileUploadWithAnalysisReset('engineeringQuestionnaire.buildingPlan.structuralEngineerApproval.file', url, project?.engineeringQuestionnaire?.buildingPlan?.structuralEngineerApproval?.file)}
                                                    onDelete={() => handleFileUploadWithAnalysisReset('engineeringQuestionnaire.buildingPlan.structuralEngineerApproval.file', '', project?.engineeringQuestionnaire?.buildingPlan?.structuralEngineerApproval?.file)}
                                                    disabled={mode === 'view' || !canEdit}
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    showCreationDate={true}
                                                    creationDateValue={project?.engineeringQuestionnaire?.buildingPlan?.structuralEngineerApproval?.creationDate || ''}
                                                    onCreationDateChange={(date) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.structuralEngineerApproval.creationDate', date)}
                                                    projectId={project?._id || project?.id}
                                                />

                                                <FileUpload
                                                    label="הצהרת מהנדס לתכנון לפי תקן 413 רעידות אדמה - העלה קובץ"
                                                    value={project?.engineeringQuestionnaire?.buildingPlan?.earthquakeStandard413?.file}
                                                    onChange={(url) => handleFileUploadWithAnalysisReset('engineeringQuestionnaire.buildingPlan.earthquakeStandard413.file', url, project?.engineeringQuestionnaire?.buildingPlan?.earthquakeStandard413?.file)}
                                                    onDelete={() => handleFileUploadWithAnalysisReset('engineeringQuestionnaire.buildingPlan.earthquakeStandard413.file', '', project?.engineeringQuestionnaire?.buildingPlan?.earthquakeStandard413?.file)}
                                                    disabled={mode === 'view' || !canEdit}
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    showCreationDate={true}
                                                    creationDateValue={project?.engineeringQuestionnaire?.buildingPlan?.earthquakeStandard413?.creationDate || ''}
                                                    onCreationDateChange={(date) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.earthquakeStandard413.creationDate', date)}
                                                    projectId={project?._id || project?.id}
                                                />
                                            </Box>
                                        </Box>

                                        {/* תת-סקשן: מבנים קיימים והריסה */}
                                        <Box sx={{ mb: 4 }}>
                                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                                מבנים קיימים והריסה
                                            </Typography>
                                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3 }}>
                                                <FormControl fullWidth>
                                                    <InputLabel id="work-existing-structure-label" sx={{
                                                        whiteSpace: 'normal',
                                                        lineHeight: 1.2,
                                                        maxWidth: '100%',
                                                        transform: 'translate(14px, -9px) scale(0.75)',
                                                        '&.Mui-focused': {
                                                            transform: 'translate(14px, -9px) scale(0.75)'
                                                        }
                                                    }}>האם הפרויקט כולל עבודה על מבנה קיים או צמוד למבנה קיים</InputLabel>
                                                    <Select
                                                        labelId="work-existing-structure-label"
                                                        value={project?.engineeringQuestionnaire?.buildingPlan?.workOnExistingStructure === true ? 'כן' : project?.engineeringQuestionnaire?.buildingPlan?.workOnExistingStructure === false ? 'לא' : ''}
                                                        label="האם הפרויקט כולל עבודה על מבנה קיים או צמוד למבנה קיים"
                                                        onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.workOnExistingStructure', e.target.value === 'כן' ? true : e.target.value === 'לא' ? false : null)}
                                                        disabled={mode === 'view' || !canEdit}
                                                    >
                                                        <MenuItem value="">בחר אפשרות</MenuItem>
                                                        <MenuItem value="לא">לא</MenuItem>
                                                        <MenuItem value="כן">כן</MenuItem>
                                                    </Select>
                                                </FormControl>

                                                {project?.engineeringQuestionnaire?.buildingPlan?.workOnExistingStructure && (
                                                    <TextField
                                                        fullWidth
                                                        label="פרט על העבודה על מבנה קיים"
                                                        value={project?.engineeringQuestionnaire?.buildingPlan?.workOnExistingStructureDetails || ''}
                                                        onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.workOnExistingStructureDetails', e.target.value)}
                                                        disabled={mode === 'view' || !canEdit}
                                                        multiline
                                                        rows={2}
                                                    />
                                                )}

                                                <TextField
                                                    fullWidth
                                                    label="שווי המבנה הקיים במידה ותרצה לבטחו (₪)"
                                                    type="number"
                                                    value={project?.engineeringQuestionnaire?.buildingPlan?.existingStructureValue || ''}
                                                    onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.existingStructureValue', parseFloat(e.target.value) || 0)}
                                                    disabled={mode === 'view' || !canEdit}
                                                />

                                                <TextField
                                                    fullWidth
                                                    label="מי הבעלים של הרכוש הקיים או התשתית הקיימת"
                                                    value={project?.engineeringQuestionnaire?.buildingPlan?.existingPropertyOwner || ''}
                                                    onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.existingPropertyOwner', e.target.value)}
                                                    disabled={mode === 'view' || !canEdit}
                                                />

                                                <TextField
                                                    fullWidth
                                                    label="מה השימוש שנעשה ברכוש הקיים או בתשתית הקיימת"
                                                    value={project?.engineeringQuestionnaire?.buildingPlan?.existingPropertyUsage || ''}
                                                    onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.existingPropertyUsage', e.target.value)}
                                                    disabled={mode === 'view' || !canEdit}
                                                />

                                                <FormControl fullWidth>
                                                    <InputLabel id="demolition-work-label" sx={{
                                                        whiteSpace: 'normal',
                                                        lineHeight: 1.2,
                                                        maxWidth: '100%',
                                                        transform: 'translate(14px, -9px) scale(0.75)',
                                                        '&.Mui-focused': {
                                                            transform: 'translate(14px, -9px) scale(0.75)'
                                                        }
                                                    }}>האם מתבצעת הריסת מבנה</InputLabel>
                                                    <Select
                                                        labelId="demolition-work-label"
                                                        value={project?.engineeringQuestionnaire?.buildingPlan?.demolitionWork === true ? 'כן' : project?.engineeringQuestionnaire?.buildingPlan?.demolitionWork === false ? 'לא' : ''}
                                                        label="האם מתבצעת הריסת מבנה"
                                                        onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.demolitionWork', e.target.value === 'כן' ? true : e.target.value === 'לא' ? false : null)}
                                                        disabled={mode === 'view' || !canEdit}
                                                    >
                                                        <MenuItem value="">בחר אפשרות</MenuItem>
                                                        <MenuItem value="לא">לא</MenuItem>
                                                        <MenuItem value="כן">כן</MenuItem>
                                                    </Select>
                                                </FormControl>

                                                {project?.engineeringQuestionnaire?.buildingPlan?.demolitionWork && (
                                                    <TextField
                                                        fullWidth
                                                        label="פרט על הריסת מבנה"
                                                        value={project?.engineeringQuestionnaire?.buildingPlan?.demolitionWorkDetails || ''}
                                                        onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.demolitionWorkDetails', e.target.value)}
                                                        disabled={mode === 'view' || !canEdit}
                                                        multiline
                                                        rows={2}
                                                    />
                                                )}
                                            </Box>
                                        </Box>
                                    </Box>

                                    {/* דוח יועץ קרקע */}
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                                            דוח יועץ קרקע
                                        </Typography>

                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 3 }}>
                                            {/* Soil Report File Upload with AI Icon */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Box sx={{ flex: 1 }}>
                                            <FileUpload
                                                        label="דוח יועץ קרקע"
                                                value={project?.engineeringQuestionnaire?.soilConsultantReport?.reportFile}
                                                        onChange={handleSoilReportFileChange}
                                                        onDelete={() => handleSoilReportFileChange('')}
                                                disabled={mode === 'view' || !canEdit}
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                showCreationDate={true}
                                                creationDateValue={project?.engineeringQuestionnaire?.soilConsultantReport?.reportFileCreationDate || ''}
                                                onCreationDateChange={(date) => handleNestedFieldChange('engineeringQuestionnaire.soilConsultantReport.reportFileCreationDate', date)}
                                                projectId={project?._id || project?.id}
                                            />
                                                </Box>

                                                {/* AI Analysis Icon - only show if file uploaded and not yet analyzed */}
                                                {(() => {
                                                    const reportFile = project?.engineeringQuestionnaire?.soilConsultantReport?.reportFile;
                                                    const isAnalyzed = analyzedFiles.has(reportFile);
                                                    console.log('🔍 Soil Report AI Icon Debug:', {
                                                        reportFile,
                                                        canEdit,
                                                        isAnalyzed,
                                                        analyzedFiles: Array.from(analyzedFiles),
                                                        shouldShow: reportFile && canEdit && !isAnalyzed
                                                    });
                                                    return reportFile && canEdit && !isAnalyzed;
                                                })() && (
                                                        <IconButton
                                                            onClick={handleAutoFillFromReport}
                                                            disabled={isAnalyzing || mode === 'view'}
                                                            sx={{
                                                                backgroundColor: '#6B46C1', // Chocolate purple color
                                                                color: 'white',
                                                                width: '48px',
                                                                height: '48px',
                                                                '&:hover': {
                                                                    backgroundColor: '#F3F4F6', // Light gray hover
                                                                },
                                                                '&:disabled': {
                                                                    backgroundColor: '#E5E7EB',
                                                                    color: '#9CA3AF'
                                                                }
                                                            }}
                                                        >
                                                            {isAnalyzing ? (
                                                                <CircularProgress size={24} color="inherit" />
                                                            ) : (
                                                                <AutoAwesomeIcon />
                                                            )}
                                                        </IconButton>
                                                    )}
                                            </Box>

                                            <FormControl fullWidth>
                                                <InputLabel id="soil-type-label" sx={{
                                                    whiteSpace: 'normal',
                                                    lineHeight: 1.2,
                                                    maxWidth: '100%',
                                                    transform: 'translate(14px, -9px) scale(0.75)',
                                                    '&.Mui-focused': {
                                                        transform: 'translate(14px, -9px) scale(0.75)'
                                                    }
                                                }}>סוג הקרקע</InputLabel>
                                                <Select
                                                    labelId="soil-type-label"
                                                    value={project?.engineeringQuestionnaire?.soilConsultantReport?.soilType || ''}
                                                    label="סוג הקרקע"
                                                    onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.soilConsultantReport.soilType', e.target.value)}
                                                    disabled={mode === 'view' || !canEdit}
                                                >
                                                    <MenuItem value="חולית">חולית</MenuItem>
                                                    <MenuItem value="סלעית">סלעית</MenuItem>
                                                    <MenuItem value="חרסיתית">חרסיתית</MenuItem>
                                                    <MenuItem value="אחר">אחר</MenuItem>
                                                </Select>
                                            </FormControl>

                                            {project?.engineeringQuestionnaire?.soilReport?.soilType === 'אחר' && (
                                                <TextField
                                                    fullWidth
                                                    label="אחר - פרט"
                                                    value={project?.engineeringQuestionnaire?.soilReport?.soilTypeOther || ''}
                                                    onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.soilReport.soilTypeOther', e.target.value)}
                                                    disabled={mode === 'view' || !canEdit}
                                                />
                                            )}

                                            <TextField
                                                fullWidth
                                                label="עומק מי התהום (מטר)"
                                                type="number"
                                                value={project?.engineeringQuestionnaire?.soilReport?.groundwaterDepth || ''}
                                                onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.soilReport.groundwaterDepth', parseFloat(e.target.value) || 0)}
                                                disabled={mode === 'view' || !canEdit}
                                            />

                                            <TextField
                                                fullWidth
                                                label="עומק חפירה מקסימאלי (מטר)"
                                                type="number"
                                                value={project?.engineeringQuestionnaire?.soilReport?.maxExcavationDepth || ''}
                                                onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.soilReport.maxExcavationDepth', parseFloat(e.target.value) || 0)}
                                                disabled={mode === 'view' || !canEdit}
                                            />

                                            <TextField
                                                fullWidth
                                                label="אזור Cresta"
                                                value={project?.engineeringQuestionnaire?.soilReport?.crestaArea || ''}
                                                onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.soilReport.crestaArea', e.target.value)}
                                                disabled={mode === 'view' || !canEdit}
                                            />

                                            <TextField
                                                fullWidth
                                                label="ציון PNG25 לרעידות אדמה"
                                                type="number"
                                                value={project?.engineeringQuestionnaire?.soilReport?.png25EarthquakeRating || ''}
                                                onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.soilReport.png25EarthquakeRating', parseFloat(e.target.value) || 0)}
                                                disabled={mode === 'view' || !canEdit}
                                            />
                                        </Box>

                                        {/* תת-סקשן: חפירה ויסודות */}
                                        <Box sx={{ mb: 4 }}>
                                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                                חפירה ויסודות
                                            </Typography>
                                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3 }}>

                                                <TextField
                                                    fullWidth
                                                    label="עומק חפירה (מטר)"
                                                    type="number"
                                                    value={project?.engineeringQuestionnaire?.soilConsultantReport?.excavationDepth || ''}
                                                    onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.soilConsultantReport.excavationDepth', parseFloat(e.target.value) || 0)}
                                                    disabled={mode === 'view' || !canEdit}
                                                />

                                                <TextField
                                                    fullWidth
                                                    label="שטח החפירה (מ״ר)"
                                                    type="number"
                                                    value={project?.engineeringQuestionnaire?.soilConsultantReport?.excavationArea || ''}
                                                    onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.soilConsultantReport.excavationArea', parseFloat(e.target.value) || 0)}
                                                    disabled={mode === 'view' || !canEdit}
                                                />

                                                <TextField
                                                    fullWidth
                                                    label="שיטת ביצוע היסודות"
                                                    value={project?.engineeringQuestionnaire?.soilConsultantReport?.foundationMethod || ''}
                                                    onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.soilConsultantReport.foundationMethod', e.target.value)}
                                                    disabled={mode === 'view' || !canEdit}
                                                />

                                                <FormControl fullWidth>
                                                    <InputLabel id="perimeter-dewatering-label" sx={{
                                                        whiteSpace: 'normal',
                                                        lineHeight: 1.2,
                                                        maxWidth: '100%',
                                                        transform: 'translate(14px, -9px) scale(0.75)',
                                                        '&.Mui-focused': {
                                                            transform: 'translate(14px, -9px) scale(0.75)'
                                                        }
                                                    }}>האם מבצעים דיפון היקפי</InputLabel>
                                                    <Select
                                                        labelId="perimeter-dewatering-label"
                                                        value={project?.engineeringQuestionnaire?.soilConsultantReport?.perimeterDewatering === true ? 'כן' : project?.engineeringQuestionnaire?.soilConsultantReport?.perimeterDewatering === false ? 'לא' : ''}
                                                        label="האם מבצעים דיפון היקפי"
                                                        onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.soilConsultantReport.perimeterDewatering', e.target.value === 'כן' ? true : e.target.value === 'לא' ? false : null)}
                                                        disabled={mode === 'view' || !canEdit}
                                                    >
                                                        <MenuItem value="">בחר אפשרות</MenuItem>
                                                        <MenuItem value="לא">לא</MenuItem>
                                                        <MenuItem value="כן">כן</MenuItem>
                                                    </Select>
                                                </FormControl>

                                                <FormControl fullWidth>
                                                    <InputLabel id="construction-method-label" sx={{
                                                        whiteSpace: 'normal',
                                                        lineHeight: 1.2,
                                                        maxWidth: '100%',
                                                        transform: 'translate(14px, -9px) scale(0.75)',
                                                        '&.Mui-focused': {
                                                            transform: 'translate(14px, -9px) scale(0.75)'
                                                        }
                                                    }}>מה שיטת הבניה</InputLabel>
                                                    <Select
                                                        labelId="construction-method-label"
                                                        value={project?.engineeringQuestionnaire?.soilConsultantReport?.constructionMethod || ''}
                                                        label="מה שיטת הבניה"
                                                        onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.soilConsultantReport.constructionMethod', e.target.value)}
                                                        disabled={mode === 'view' || !canEdit}
                                                    >
                                                        <MenuItem value="קונבנציונאלי">קונבנציונאלי</MenuItem>
                                                        <MenuItem value="ברנוביץ">ברנוביץ</MenuItem>
                                                        <MenuItem value="טרומי">טרומי</MenuItem>
                                                        <MenuItem value="אחר">אחר</MenuItem>
                                                    </Select>
                                                </FormControl>

                                                {project?.engineeringQuestionnaire?.soilConsultantReport?.constructionMethod === 'אחר' && (
                                                    <TextField
                                                        fullWidth
                                                        label="אחר - פרט"
                                                        value={project?.engineeringQuestionnaire?.soilConsultantReport?.constructionMethodOther || ''}
                                                        onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.soilConsultantReport.constructionMethodOther', e.target.value)}
                                                        disabled={mode === 'view' || !canEdit}
                                                    />
                                                )}

                                                <TextField
                                                    fullWidth
                                                    label="מפתח מירבי בין עמודים (במטרים)"
                                                    type="number"
                                                    value={project?.engineeringQuestionnaire?.soilConsultantReport?.maxColumnSpacing || ''}
                                                    onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.soilConsultantReport.maxColumnSpacing', parseFloat(e.target.value) || 0)}
                                                    disabled={mode === 'view' || !canEdit}
                                                />
                                            </Box>
                                        </Box>
                                    </Box>

                                </Box>

                                {/* סקר סביבתי */}
                                <Box sx={{ mb: 4 }}>

                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3, mb: 3 }}>
                                        <TextField
                                            fullWidth
                                            label="תיאור המצב הקיים"
                                            value={project?.environmentalSurvey?.currentStateDescription || ''}
                                            onChange={(e) => handleNestedFieldChange('environmentalSurvey.currentStateDescription', e.target.value)}
                                            disabled={mode === 'view' || !canEdit}
                                            multiline
                                            rows={3}
                                        />

                                        <TextField
                                            fullWidth
                                            label="תיאור הסביבה"
                                            value={project?.environmentalSurvey?.environmentDescription || ''}
                                            onChange={(e) => handleNestedFieldChange('environmentalSurvey.environmentDescription', e.target.value)}
                                            disabled={mode === 'view' || !canEdit}
                                            multiline
                                            rows={3}
                                        />

                                        <FormControl fullWidth>
                                            <InputLabel sx={{
                                                whiteSpace: 'normal',
                                                lineHeight: 1.2,
                                                maxWidth: '100%',
                                                transform: 'translate(14px, -9px) scale(0.75)',
                                                '&.Mui-focused': {
                                                    transform: 'translate(14px, -9px) scale(0.75)'
                                                }
                                            }}>האם קיימים מבנים סמוכים</InputLabel>
                                            <Select
                                                value={project?.environmentalSurvey?.adjacentBuildings?.exists === true ? 'כן' : project?.environmentalSurvey?.adjacentBuildings?.exists === false ? 'לא' : ''}
                                                onChange={(e) => handleNestedFieldChange('environmentalSurvey.adjacentBuildings.exists', e.target.value === 'כן' ? true : e.target.value === 'לא' ? false : null)}
                                                disabled={mode === 'view' || !canEdit}
                                            >
                                                <MenuItem value="לא">לא</MenuItem>
                                                <MenuItem value="כן">כן</MenuItem>
                                            </Select>
                                        </FormControl>

                                        {project?.environmentalSurvey?.adjacentBuildings?.exists && (
                                            <>
                                                <TextField
                                                    fullWidth
                                                    label="מרחק וגיל מבנים סמוכים - צפון"
                                                    value={`מרחק: ${project?.environmentalSurvey?.adjacentBuildings?.north?.distance || 0}מ, גיל: ${project?.environmentalSurvey?.adjacentBuildings?.north?.age || 0}שנה`}
                                                    disabled={mode === 'view' || !canEdit}
                                                />

                                                <TextField
                                                    fullWidth
                                                    label="מרחק וגיל מבנים סמוכים - מזרח"
                                                    value={`מרחק: ${project?.environmentalSurvey?.adjacentBuildings?.east?.distance || 0}מ, גיל: ${project?.environmentalSurvey?.adjacentBuildings?.east?.age || 0}שנה`}
                                                    disabled={mode === 'view' || !canEdit}
                                                />

                                                <TextField
                                                    fullWidth
                                                    label="מרחק וגיל מבנים סמוכים - דרום"
                                                    value={`מרחק: ${project?.environmentalSurvey?.adjacentBuildings?.south?.distance || 0}מ, גיל: ${project?.environmentalSurvey?.adjacentBuildings?.south?.age || 0}שנה`}
                                                    disabled={mode === 'view' || !canEdit}
                                                />

                                                <TextField
                                                    fullWidth
                                                    label="מרחק וגיל מבנים סמוכים - מערב"
                                                    value={`מרחק: ${project?.environmentalSurvey?.adjacentBuildings?.west?.distance || 0}מ, גיל: ${project?.environmentalSurvey?.adjacentBuildings?.west?.age || 0}שנה`}
                                                    disabled={mode === 'view' || !canEdit}
                                                />

                                                <TextField
                                                    fullWidth
                                                    label="אמצעי בטיחות למבנים מעל 20 שנה"
                                                    value={project?.environmentalSurvey?.adjacentBuildings?.safetyMeasures || ''}
                                                    onChange={(e) => handleNestedFieldChange('environmentalSurvey.adjacentBuildings.safetyMeasures', e.target.value)}
                                                    disabled={mode === 'view' || !canEdit}
                                                    multiline
                                                    rows={2}
                                                />
                                            </>
                                        )}

                                        <FormControl fullWidth>
                                            <InputLabel sx={{
                                                whiteSpace: 'normal',
                                                lineHeight: 1.2,
                                                maxWidth: '100%',
                                                transform: 'translate(14px, -9px) scale(0.75)',
                                                '&.Mui-focused': {
                                                    transform: 'translate(14px, -9px) scale(0.75)'
                                                }
                                            }}>האם קיימים כבלי חשמל במרחק מהעגורנים</InputLabel>
                                            <Select
                                                value={project?.environmentalSurvey?.electricalCables?.exists === true ? 'כן' : project?.environmentalSurvey?.electricalCables?.exists === false ? 'לא' : ''}
                                                onChange={(e) => handleNestedFieldChange('environmentalSurvey.electricalCables.exists', e.target.value === 'כן' ? true : e.target.value === 'לא' ? false : null)}
                                                disabled={mode === 'view' || !canEdit}
                                            >
                                                <MenuItem value="לא">לא</MenuItem>
                                                <MenuItem value="כן">כן</MenuItem>
                                            </Select>
                                        </FormControl>

                                        {project?.environmentalSurvey?.electricalCables?.exists && (
                                            <TextField
                                                fullWidth
                                                label="אמצעי הבטיחות לכבלי חשמל"
                                                value={project?.environmentalSurvey?.electricalCables?.safetyMeasures || ''}
                                                onChange={(e) => handleNestedFieldChange('environmentalSurvey.electricalCables.safetyMeasures', e.target.value)}
                                                disabled={mode === 'view' || !canEdit}
                                                multiline
                                                rows={2}
                                            />
                                        )}

                                        <FormControl fullWidth>
                                            <InputLabel sx={{
                                                whiteSpace: 'normal',
                                                lineHeight: 1.2,
                                                maxWidth: '100%',
                                                transform: 'translate(14px, -9px) scale(0.75)',
                                                '&.Mui-focused': {
                                                    transform: 'translate(14px, -9px) scale(0.75)'
                                                }
                                            }}>האם בשטח האתר קיימים צינורות, מתקנים או כבלים תת קרקעיים</InputLabel>
                                            <Select
                                                value={project?.environmentalSurvey?.undergroundInfrastructure?.exists === true ? 'כן' : project?.environmentalSurvey?.undergroundInfrastructure?.exists === false ? 'לא' : ''}
                                                onChange={(e) => handleNestedFieldChange('environmentalSurvey.undergroundInfrastructure.exists', e.target.value === 'כן' ? true : e.target.value === 'לא' ? false : null)}
                                                disabled={mode === 'view' || !canEdit}
                                            >
                                                <MenuItem value="לא">לא</MenuItem>
                                                <MenuItem value="כן">כן</MenuItem>
                                            </Select>
                                        </FormControl>

                                        {project?.environmentalSurvey?.undergroundInfrastructure?.exists && (
                                            <TextField
                                                fullWidth
                                                label="אמצעי הבטיחות לתשתיות תת קרקעיות"
                                                value={project?.environmentalSurvey?.undergroundInfrastructure?.safetyMeasures || ''}
                                                onChange={(e) => handleNestedFieldChange('environmentalSurvey.undergroundInfrastructure.safetyMeasures', e.target.value)}
                                                disabled={mode === 'view' || !canEdit}
                                                multiline
                                                rows={2}
                                            />
                                        )}

                                        <FormControl fullWidth>
                                            <InputLabel sx={{
                                                whiteSpace: 'normal',
                                                lineHeight: 1.2,
                                                maxWidth: '100%',
                                                transform: 'translate(14px, -9px) scale(0.75)',
                                                '&.Mui-focused': {
                                                    transform: 'translate(14px, -9px) scale(0.75)'
                                                }
                                            }}>האם יש גני ילדים בסביבה</InputLabel>
                                            <Select
                                                value={project?.environmentalSurvey?.kindergartens?.exists === true ? 'כן' : project?.environmentalSurvey?.kindergartens?.exists === false ? 'לא' : ''}
                                                onChange={(e) => handleNestedFieldChange('environmentalSurvey.kindergartens.exists', e.target.value === 'כן' ? true : e.target.value === 'לא' ? false : null)}
                                                disabled={mode === 'view' || !canEdit}
                                            >
                                                <MenuItem value="לא">לא</MenuItem>
                                                <MenuItem value="כן">כן</MenuItem>
                                            </Select>
                                        </FormControl>

                                        {project?.environmentalSurvey?.kindergartens?.exists && (
                                            <TextField
                                                fullWidth
                                                label="אמצעי הבטיחות לגני ילדים"
                                                value={project?.environmentalSurvey?.kindergartens?.safetyMeasures || ''}
                                                onChange={(e) => handleNestedFieldChange('environmentalSurvey.kindergartens.safetyMeasures', e.target.value)}
                                                disabled={mode === 'view' || !canEdit}
                                                multiline
                                                rows={2}
                                            />
                                        )}

                                        <FormControl fullWidth>
                                            <InputLabel sx={{
                                                whiteSpace: 'normal',
                                                lineHeight: 1.2,
                                                maxWidth: '100%',
                                                transform: 'translate(14px, -9px) scale(0.75)',
                                                '&.Mui-focused': {
                                                    transform: 'translate(14px, -9px) scale(0.75)'
                                                }
                                            }}>קרבה לתחנת דלק</InputLabel>
                                            <Select
                                                value={project?.environmentalSurvey?.proximityToGasStation === true ? 'כן' : project?.environmentalSurvey?.proximityToGasStation === false ? 'לא' : ''}
                                                onChange={(e) => handleNestedFieldChange('environmentalSurvey.proximityToGasStation', e.target.value === 'כן' ? true : e.target.value === 'לא' ? false : null)}
                                                disabled={mode === 'view' || !canEdit}
                                            >
                                                <MenuItem value="לא">לא</MenuItem>
                                                <MenuItem value="כן">כן</MenuItem>
                                            </Select>
                                        </FormControl>

                                        <FormControl fullWidth>
                                            <InputLabel sx={{
                                                whiteSpace: 'normal',
                                                lineHeight: 1.2,
                                                maxWidth: '100%',
                                                transform: 'translate(14px, -9px) scale(0.75)',
                                                '&.Mui-focused': {
                                                    transform: 'translate(14px, -9px) scale(0.75)'
                                                }
                                            }}>קרבה לתחנת משטרה</InputLabel>
                                            <Select
                                                value={project?.environmentalSurvey?.proximityToPoliceStation === true ? 'כן' : project?.environmentalSurvey?.proximityToPoliceStation === false ? 'לא' : ''}
                                                onChange={(e) => handleNestedFieldChange('environmentalSurvey.proximityToPoliceStation', e.target.value === 'כן' ? true : e.target.value === 'לא' ? false : null)}
                                                disabled={mode === 'view' || !canEdit}
                                            >
                                                <MenuItem value="לא">לא</MenuItem>
                                                <MenuItem value="כן">כן</MenuItem>
                                            </Select>
                                        </FormControl>

                                        <FormControl fullWidth>
                                            <InputLabel sx={{
                                                whiteSpace: 'normal',
                                                lineHeight: 1.2,
                                                maxWidth: '100%',
                                                transform: 'translate(14px, -9px) scale(0.75)',
                                                '&.Mui-focused': {
                                                    transform: 'translate(14px, -9px) scale(0.75)'
                                                }
                                            }}>קרבה למד״א או מרכז רפואי</InputLabel>
                                            <Select
                                                value={project?.environmentalSurvey?.proximityToMedicalCenter === true ? 'כן' : project?.environmentalSurvey?.proximityToMedicalCenter === false ? 'לא' : ''}
                                                onChange={(e) => handleNestedFieldChange('environmentalSurvey.proximityToMedicalCenter', e.target.value === 'כן' ? true : e.target.value === 'לא' ? false : null)}
                                                disabled={mode === 'view' || !canEdit}
                                            >
                                                <MenuItem value="לא">לא</MenuItem>
                                                <MenuItem value="כן">כן</MenuItem>
                                            </Select>
                                        </FormControl>

                                        <FormControl fullWidth>
                                            <InputLabel sx={{
                                                whiteSpace: 'normal',
                                                lineHeight: 1.2,
                                                maxWidth: '100%',
                                                transform: 'translate(14px, -9px) scale(0.75)',
                                                '&.Mui-focused': {
                                                    transform: 'translate(14px, -9px) scale(0.75)'
                                                }
                                            }}>האם הפרויקט על רכס הר</InputLabel>
                                            <Select
                                                value={project?.environmentalSurvey?.onMountainRidge === true ? 'כן' : project?.environmentalSurvey?.onMountainRidge === false ? 'לא' : ''}
                                                onChange={(e) => handleNestedFieldChange('environmentalSurvey.onMountainRidge', e.target.value === 'כן' ? true : e.target.value === 'לא' ? false : null)}
                                                disabled={mode === 'view' || !canEdit}
                                            >
                                                <MenuItem value="לא">לא</MenuItem>
                                                <MenuItem value="כן">כן</MenuItem>
                                            </Select>
                                        </FormControl>

                                        <FormControl fullWidth>
                                            <InputLabel sx={{
                                                whiteSpace: 'normal',
                                                lineHeight: 1.2,
                                                maxWidth: '100%',
                                                transform: 'translate(14px, -9px) scale(0.75)',
                                                '&.Mui-focused': {
                                                    transform: 'translate(14px, -9px) scale(0.75)'
                                                }
                                            }}>האם הפרויקט בואדי</InputLabel>
                                            <Select
                                                value={project?.environmentalSurvey?.inValley === true ? 'כן' : project?.environmentalSurvey?.inValley === false ? 'לא' : ''}
                                                onChange={(e) => handleNestedFieldChange('environmentalSurvey.inValley', e.target.value === 'כן' ? true : e.target.value === 'לא' ? false : null)}
                                                disabled={mode === 'view' || !canEdit}
                                            >
                                                <MenuItem value="לא">לא</MenuItem>
                                                <MenuItem value="כן">כן</MenuItem>
                                            </Select>
                                        </FormControl>

                                        <TextField
                                            fullWidth
                                            label="גובה האתר מפני הים (מטר)"
                                            type="number"
                                            value={project?.environmentalSurvey?.siteElevation || ''}
                                            onChange={(e) => handleNestedFieldChange('environmentalSurvey.siteElevation', parseFloat(e.target.value) || 0)}
                                            disabled={mode === 'view' || !canEdit}
                                        />

                                        <TextField
                                            fullWidth
                                            label="מרחק מהים (מטר)"
                                            type="number"
                                            value={project?.environmentalSurvey?.distanceFromSea || ''}
                                            onChange={(e) => handleNestedFieldChange('environmentalSurvey.distanceFromSea', parseFloat(e.target.value) || 0)}
                                            disabled={mode === 'view' || !canEdit}
                                        />

                                        <TextField
                                            fullWidth
                                            label="מרחק מנחלים ואגנים (מטר)"
                                            type="number"
                                            value={project?.environmentalSurvey?.distanceFromStreams || ''}
                                            onChange={(e) => handleNestedFieldChange('environmentalSurvey.distanceFromStreams', parseFloat(e.target.value) || 0)}
                                            disabled={mode === 'view' || !canEdit}
                                        />
                                    </Box>
                                </Box>

                                {/* תוכנית הידרולוג (אופציונלי) */}
                                <Box sx={{ mb: 4 }}>

                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3, mb: 3 }}>
                                        <FileUpload
                                            label="העלאת קובץ תוכנית הידרולוג"
                                            value={project?.hydrologicalPlan?.file}
                                            onChange={(url) => handleNestedFieldChange('hydrologicalPlan.file', url)}
                                            onDelete={() => handleNestedFieldChange('hydrologicalPlan.file', '')}
                                            disabled={mode === 'view' || !canEdit}
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            showCreationDate={true}
                                            creationDateValue={project?.hydrologicalPlan?.fileCreationDate || ''}
                                            onCreationDateChange={(date) => handleNestedFieldChange('hydrologicalPlan.fileCreationDate', date)}
                                            projectId={project?._id || project?.id}
                                        />

                                        <FormControl fullWidth>
                                            <InputLabel id="basement-pumps-label" sx={{
                                                whiteSpace: 'normal',
                                                lineHeight: 1.2,
                                                maxWidth: '100%',
                                                transform: 'translate(14px, -9px) scale(0.75)',
                                                '&.Mui-focused': {
                                                    transform: 'translate(14px, -9px) scale(0.75)'
                                                }
                                            }}>האם יש משאבות זמינות באתר לשימוש במקרה הצפה</InputLabel>
                                            <Select
                                                labelId="basement-pumps-label"
                                                value={project?.hydrologicalPlan?.basementPumpsAvailable === true ? 'כן' : project?.hydrologicalPlan?.basementPumpsAvailable === false ? 'לא' : ''}
                                                label="האם יש משאבות זמינות באתר לשימוש במקרה הצפה"
                                                onChange={(e) => handleNestedFieldChange('hydrologicalPlan.basementPumpsAvailable', e.target.value === 'כן' ? true : e.target.value === 'לא' ? false : null)}
                                                disabled={mode === 'view' || !canEdit}
                                            >
                                                <MenuItem value="לא">לא</MenuItem>
                                                <MenuItem value="כן">כן</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Box>
                                </Box>

                                {/* תוכנית ניקוז לאתר */}
                                <Box sx={{ mb: 4 }}>

                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3, mb: 3 }}>
                                        <FormControl fullWidth>
                                            <InputLabel sx={{
                                                whiteSpace: 'normal',
                                                lineHeight: 1.2,
                                                maxWidth: '100%',
                                                transform: 'translate(14px, -9px) scale(0.75)',
                                                '&.Mui-focused': {
                                                    transform: 'translate(14px, -9px) scale(0.75)'
                                                }
                                            }}>האם הכניסות מנוגדות לזרימת המים</InputLabel>
                                            <Select
                                                value={project?.drainagePlan?.entrancesOppositeWaterFlow === true ? 'כן' : project?.drainagePlan?.entrancesOppositeWaterFlow === false ? 'לא' : ''}
                                                onChange={(e) => handleNestedFieldChange('drainagePlan.entrancesOppositeWaterFlow', e.target.value === 'כן' ? true : e.target.value === 'לא' ? false : null)}
                                                disabled={mode === 'view' || !canEdit}
                                            >
                                                <MenuItem value="לא">לא</MenuItem>
                                                <MenuItem value="כן">כן</MenuItem>
                                            </Select>
                                        </FormControl>

                                        {!project?.drainagePlan?.entrancesOppositeWaterFlow && (
                                            <TextField
                                                fullWidth
                                                label="אמצעים מתוכננים"
                                                value={project?.drainagePlan?.plannedMeasures || ''}
                                                onChange={(e) => handleNestedFieldChange('drainagePlan.plannedMeasures', e.target.value)}
                                                disabled={mode === 'view' || !canEdit}
                                                multiline
                                                rows={2}
                                            />
                                        )}
                                    </Box>
                                </Box>

                                {/* לוח זמנים (גאנט) */}
                                <Box sx={{ mb: 4 }}>

                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3, mb: 3 }}>
                                        <FormControl fullWidth>
                                            <InputLabel sx={{
                                                whiteSpace: 'normal',
                                                lineHeight: 1.2,
                                                maxWidth: '100%',
                                                transform: 'translate(14px, -9px) scale(0.75)',
                                                '&.Mui-focused': {
                                                    transform: 'translate(14px, -9px) scale(0.75)'
                                                }
                                            }}>האם קיים לוח זמנים לפרויקט</InputLabel>
                                            <Select
                                                value={project?.schedule?.exists === true ? 'כן' : project?.schedule?.exists === false ? 'לא' : ''}
                                                onChange={(e) => handleNestedFieldChange('schedule.exists', e.target.value === 'כן' ? true : e.target.value === 'לא' ? false : null)}
                                                disabled={mode === 'view' || !canEdit}
                                            >
                                                <MenuItem value="לא">לא</MenuItem>
                                                <MenuItem value="כן">כן</MenuItem>
                                            </Select>
                                        </FormControl>

                                        {project?.schedule?.exists && (
                                            <>
                                                <FileUpload
                                                    label="העלה קובץ לוח זמנים"
                                                    value={project?.schedule?.file}
                                                    onChange={(url) => handleNestedFieldChange('schedule.file', url)}
                                                    onDelete={() => handleNestedFieldChange('schedule.file', '')}
                                                    disabled={mode === 'view' || !canEdit}
                                                    accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png"
                                                    showCreationDate={true}
                                                    creationDateValue={project?.schedule?.fileCreationDate || ''}
                                                    onCreationDateChange={(date) => handleNestedFieldChange('schedule.fileCreationDate', date)}
                                                    projectId={project?._id || project?.id}
                                                />

                                                <FormControl fullWidth>
                                                    <InputLabel sx={{
                                                        whiteSpace: 'normal',
                                                        lineHeight: 1.2,
                                                        maxWidth: '100%',
                                                        transform: 'translate(14px, -9px) scale(0.75)',
                                                        '&.Mui-focused': {
                                                            transform: 'translate(14px, -9px) scale(0.75)'
                                                        }
                                                    }}>רמת הפירוט</InputLabel>
                                                    <Select
                                                        value={project?.schedule?.detailLevel || ''}
                                                        onChange={(e) => handleNestedFieldChange('schedule.detailLevel', e.target.value)}
                                                        disabled={mode === 'view' || !canEdit}
                                                    >
                                                        <MenuItem value="רבעוני">רבעוני</MenuItem>
                                                        <MenuItem value="חודשי">חודשי</MenuItem>
                                                        <MenuItem value="דו חודשי">דו חודשי</MenuItem>
                                                        <MenuItem value="שבועי">שבועי</MenuItem>
                                                        <MenuItem value="דו שבועי">דו שבועי</MenuItem>
                                                        <MenuItem value="יומי">יומי</MenuItem>
                                                    </Select>
                                                </FormControl>

                                                <TextField
                                                    fullWidth
                                                    label="מידת העמידה בהערכות לוחות הזמנים"
                                                    value={project?.schedule?.adherenceLevel || ''}
                                                    onChange={(e) => handleNestedFieldChange('schedule.adherenceLevel', e.target.value)}
                                                    disabled={mode === 'view' || !canEdit}
                                                />
                                            </>
                                        )}
                                    </Box>
                                </Box>
                            </Box>
                        )}

                        {activeTab === 2 && (
                            <Box>
                                <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
                                    מפרט טכני
                                </Typography>

                                {/* Project General Information */}
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="h6" gutterBottom sx={{ color: 'text.secondary', mb: 2 }}>
                                        פרטי פרויקט
                                    </Typography>

                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
                                        <Box>
                                            <TextField
                                                fullWidth
                                                label="שם הפרויקט"
                                                value={project.projectName || ''}
                                                onChange={(e) => handleFieldChange('projectName', e.target.value)}
                                                variant="outlined"
                                                size="small"
                                            />
                                        </Box>

                                        <Box>
                                            <TextField
                                                fullWidth
                                                label="עיר"
                                                value={project.city || ''}
                                                onChange={(e) => handleFieldChange('city', e.target.value)}
                                                variant="outlined"
                                                size="small"
                                            />
                                        </Box>

                                        <Box>
                                            <TextField
                                                fullWidth
                                                label="תאריך התחלת הפרויקט"
                                                type="date"
                                                value={project.startDate || ''}
                                                onChange={(e) => handleFieldChange('startDate', e.target.value)}
                                                variant="outlined"
                                                size="small"
                                                InputLabelProps={{ shrink: true }}
                                            />
                                        </Box>

                                        <Box>
                                            <TextField
                                                fullWidth
                                                label="משך הפרויקט (חודשים)"
                                                type="number"
                                                value={project.durationMonths || ''}
                                                onChange={(e) => handleFieldChange('durationMonths', parseInt(e.target.value) || 0)}
                                                variant="outlined"
                                                size="small"
                                            />
                                        </Box>

                                        <Box>
                                            <TextField
                                                fullWidth
                                                label="שווי הפרויקט"
                                                type="text"
                                                value={project.valueNis ? `${project.valueNis.toLocaleString('he-IL')} ₪` : ''}
                                                onChange={(e) => {
                                                    const numericValue = e.target.value.replace(/[^\d]/g, '');
                                                    const numValue = numericValue ? parseInt(numericValue) : 0;
                                                    handleFieldChange('valueNis', numValue);
                                                }}
                                                onKeyDown={(e) => {
                                                    // Allow: backspace, delete, tab, escape, enter, home, end, left, right, up, down
                                                    if ([8, 9, 27, 13, 46, 35, 36, 37, 38, 39, 40].indexOf(e.keyCode) !== -1 ||
                                                        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
                                                        (e.keyCode === 65 && e.ctrlKey === true) ||
                                                        (e.keyCode === 67 && e.ctrlKey === true) ||
                                                        (e.keyCode === 86 && e.ctrlKey === true) ||
                                                        (e.keyCode === 88 && e.ctrlKey === true)) {
                                                        return;
                                                    }
                                                    // Ensure that it is a number and stop the keypress
                                                    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                                                        e.preventDefault();
                                                    }
                                                }}
                                                variant="outlined"
                                                size="small"
                                            />
                                        </Box>

                                        <Box>
                                            <TextField
                                                fullWidth
                                                label="סטטוס"
                                                select
                                                value={project.status || 'future'}
                                                onChange={(e) => handleFieldChange('status', e.target.value)}
                                                variant="outlined"
                                                size="small"
                                            >
                                                <MenuItem value="future">עתידי</MenuItem>
                                                <MenuItem value="current">פעיל</MenuItem>
                                                <MenuItem value="completed">הושלם</MenuItem>
                                            </TextField>
                                        </Box>

                                        <Box>
                                            <TextField
                                                fullWidth
                                                label="שם הקבלן הראשי"
                                                value={contractorName || project.contractorName || ''}
                                                onChange={(e) => handleFieldChange('contractorName', e.target.value)}
                                                variant="outlined"
                                                size="small"
                                                disabled={mode === 'view' || !canEdit || mode === 'new'}
                                                InputProps={{ readOnly: true }}
                                                sx={{ backgroundColor: '#f5f5f5' }}
                                            />
                                        </Box>

                                        <Box>
                                            <TextField
                                                fullWidth
                                                label="מזהה קבלן ראשי"
                                                value={project.contractorId || ''}
                                                onChange={(e) => handleFieldChange('contractorId', e.target.value)}
                                                variant="outlined"
                                                size="small"
                                                disabled={mode === 'view' || !canEdit || mode === 'new'}
                                                InputProps={{ readOnly: true }}
                                                sx={{ backgroundColor: '#f5f5f5' }}
                                            />
                                        </Box>

                                        <Box sx={{ gridColumn: '1 / -1' }}>
                                            <TextField
                                                fullWidth
                                                label="תיאור הפרויקט"
                                                value={project.description || ''}
                                                onChange={(e) => handleFieldChange('description', e.target.value)}
                                                variant="outlined"
                                                multiline
                                                rows={4}
                                            />
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        )}

                        {activeTab === 3 && (
                            <Box>
                                <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
                                    מסמכים
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    תוכן טכני יוצג כאן בעתיד...
                                </Typography>
                            </Box>
                        )}

                        {activeTab === 4 && (
                            <Box>
                                <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
                                    ביטוח
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    ניהול מסמכים יוצג כאן בעתיד...
                                </Typography>
                            </Box>
                        )}

                        {activeTab === 5 && (
                            <Box>
                                <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
                                    הרשאות
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    ניהול הרשאות יוצג כאן בעתיד...
                                </Typography>
                            </Box>
                        )}

                        {activeTab === 6 && (
                            <Box>
                                <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
                                    הערות
                                </Typography>
                                <TextField
                                    fullWidth
                                    label="הערות כלליות"
                                    value={project?.notes || ''}
                                    onChange={(e) => handleFieldChange('notes', e.target.value)}
                                    disabled={mode === 'view'}
                                    multiline
                                    rows={6}
                                    placeholder="הוסף הערות על הפרויקט..."
                                />
                            </Box>
                        )}

                        {activeTab === 7 && (project?.status === 'current' || project?.status === 'completed') && (
                            <Box>
                                <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
                                    דשבורד ניהול סיכונים
                                </Typography>

                                {/* Safety Coins */}
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', mb: 2 }}>
                                        Safety Coins
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <Box sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: '50%',
                                            bgcolor: '#FFD700',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '2px solid #FFA500'
                                        }}>
                                            🛡️
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Box sx={{
                                                height: 20,
                                                bgcolor: '#e0e0e0',
                                                borderRadius: 10,
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}>
                                                <Box sx={{
                                                    height: '100%',
                                                    width: '66%',
                                                    bgcolor: '#6B46C1',
                                                    borderRadius: 10,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'flex-end',
                                                    pr: 1
                                                }}>
                                                    <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>
                                                        3,309
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                    Earned: 3,309
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                    Available: 1,701
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>

                                {/* Project Progress */}
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', mb: 2 }}>
                                        התקדמות פרויקט
                                    </Typography>
                                    <Box sx={{
                                        height: 8,
                                        bgcolor: '#e0e0e0',
                                        borderRadius: 4,
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        <Box sx={{
                                            height: '100%',
                                            width: '51%',
                                            bgcolor: '#2196F3',
                                            borderRadius: 4
                                        }} />
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            Proj. Start: 22/04/2023
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                                            51%
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            Est. Delivery: 10/06/2027
                                        </Typography>
                                    </Box>
                                </Box>

                                {/* Risk Monitors Grid */}
                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
                                    {/* Safety Monitor */}
                                    <Box sx={{
                                        p: 3,
                                        border: '1px solid #e0e0e0',
                                        borderRadius: 2,
                                        bgcolor: 'background.paper'
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                            <Box sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: '50%',
                                                bgcolor: '#4CAF50',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                🛡️
                                            </Box>
                                            <Typography variant="h6" sx={{ color: 'text.primary' }}>
                                                בטיחות
                                            </Typography>
                                            <Box sx={{ ml: 'auto' }}>
                                                <Typography variant="h6" sx={{ color: '#6B46C1', fontWeight: 'bold' }}>
                                                    Avg. Score 8.5
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ height: 200, bgcolor: '#f5f5f5', borderRadius: 1, p: 2 }}>
                                            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 8 }}>
                                                גרף בטיחות יוצג כאן
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Security Monitor */}
                                    <Box sx={{
                                        p: 3,
                                        border: '1px solid #e0e0e0',
                                        borderRadius: 2,
                                        bgcolor: 'background.paper'
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                            <Box sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: '50%',
                                                bgcolor: '#FF9800',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                🔒
                                            </Box>
                                            <Typography variant="h6" sx={{ color: 'text.primary' }}>
                                                ביטחון וגישה
                                            </Typography>
                                            <Box sx={{ ml: 'auto' }}>
                                                <Typography variant="h6" sx={{ color: '#6B46C1', fontWeight: 'bold' }}>
                                                    Avg. Score 9.5
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ height: 200, bgcolor: '#f5f5f5', borderRadius: 1, p: 2 }}>
                                            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 8 }}>
                                                גרף ביטחון יוצג כאן
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Fire System Monitor */}
                                    <Box sx={{
                                        p: 3,
                                        border: '1px solid #e0e0e0',
                                        borderRadius: 2,
                                        bgcolor: 'background.paper'
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                            <Box sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: '50%',
                                                bgcolor: '#F44336',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                🔥
                                            </Box>
                                            <Typography variant="h6" sx={{ color: 'text.primary' }}>
                                                מערכת כיבוי אש
                                            </Typography>
                                            <Box sx={{ ml: 'auto' }}>
                                                <Typography variant="h6" sx={{ color: '#6B46C1', fontWeight: 'bold' }}>
                                                    Avg. Score 8.1
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ height: 200, bgcolor: '#f5f5f5', borderRadius: 1, p: 2 }}>
                                            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 8 }}>
                                                גרף מערכת אש יוצג כאן
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Water System Monitor */}
                                    <Box sx={{
                                        p: 3,
                                        border: '1px solid #e0e0e0',
                                        borderRadius: 2,
                                        bgcolor: 'background.paper'
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                            <Box sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: '50%',
                                                bgcolor: '#2196F3',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                💧
                                            </Box>
                                            <Typography variant="h6" sx={{ color: 'text.primary' }}>
                                                מערכת מים
                                            </Typography>
                                            <Box sx={{ ml: 'auto' }}>
                                                <Typography variant="h6" sx={{ color: '#6B46C1', fontWeight: 'bold' }}>
                                                    Avg. Score 7.9
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ height: 200, bgcolor: '#f5f5f5', borderRadius: 1, p: 2 }}>
                                            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 8 }}>
                                                גרף מערכת מים יוצג כאן
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Structural Vibration Monitor */}
                                    <Box sx={{
                                        p: 3,
                                        border: '1px solid #e0e0e0',
                                        borderRadius: 2,
                                        bgcolor: 'background.paper'
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                            <Box sx={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: '50%',
                                                bgcolor: '#9C27B0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                🏗️
                                            </Box>
                                            <Typography variant="h6" sx={{ color: 'text.primary' }}>
                                                רעידות מבניות
                                            </Typography>
                                            <Box sx={{ ml: 'auto' }}>
                                                <Typography variant="h6" sx={{ color: '#6B46C1', fontWeight: 'bold' }}>
                                                    Avg. Score 8.9
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ height: 200, bgcolor: '#f5f5f5', borderRadius: 1, p: 2 }}>
                                            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 8 }}>
                                                גרף רעידות יוצג כאן
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        )}
                    </Box>
                </Paper>
            </Box>

            {/* Success/Error Notification */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <Alert
                    onClose={() => setSnackbarOpen(false)}
                    severity={snackbarSeverity}
                    sx={{ width: '100%' }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
}
