import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { analyzeReportByUrl, mapRiskAnalysisToProject } from '../services/riskAnalysisService';
import gisService from '../services/gisService';
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
    TableRow,
    Autocomplete
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
    Close as CloseIcon,
    AccountCircle as AccountCircleIcon,
    Logout as LogoutIcon,
    Person as PersonIcon,
    MoreVert as MoreVertIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    PictureAsPdf as PdfIcon,
    AutoAwesome as AutoAwesomeIcon,
    ContentCopy as ContentCopyIcon,
    Clear as ClearIcon,
    TableChart as ExcelIcon
} from '@mui/icons-material';
import type { Project, Stakeholder, Subcontractor } from '../types/contractor';
import SkeletonLoader from './SkeletonLoader';
import TrashIcon from './TrashIcon';
import CloudSyncIcon from './CloudSyncIcon';
import GentleCloudUploadIcon from './GentleCloudUploadIcon';
import RefreshIcon from './RefreshIcon';

// Helper function to generate ObjectId-like string
const generateObjectId = (): string => {
    const timestamp = Math.floor(new Date().getTime() / 1000).toString(16);
    const random = Math.random().toString(16).substring(2, 8);
    const counter = Math.floor(Math.random() * 16777216).toString(16).padStart(6, '0');
    return timestamp + random + counter;
};

// Helper function to format Cresta data as lowRes (highRes) - name
const formatCrestaData = (crestaData: any): string => {
    // If it's already a string (legacy format), return as is
    if (typeof crestaData === 'string') {
        return crestaData;
    }

    // If it's an object with the new structure, format it properly
    if (crestaData && typeof crestaData === 'object') {
        const { lowRes, highRes, name } = crestaData;
        return `${lowRes} (${highRes}) - ${name}`;
    }

    // Fallback
    return crestaData?.toString() || '';
};

// Custom File Upload Component
interface FileUploadProps {
    label: string;
    value?: string;
    thumbnailUrl?: string;
    onChange: (url: string | null, thumbnailUrl?: string | null) => void;
    disabled?: boolean;
    accept?: string;
    showCreationDate?: boolean;
    creationDateValue?: string;
    onCreationDateChange?: (date: string) => void;
    onDelete?: () => void;
    projectId?: string;
    aiIcon?: React.ReactNode;
}

const FileUpload: React.FC<FileUploadProps> = ({
    label,
    value,
    thumbnailUrl,
    onChange,
    disabled,
    accept = ".pdf,.jpg,.jpeg,.png",
    showCreationDate = false,
    creationDateValue = '',
    onCreationDateChange,
    onDelete,
    projectId,
    aiIcon
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Debug logging
    console.log(`📁 FileUpload ${label} - value:`, value);
    console.log(`📁 FileUpload ${label} - thumbnailUrl:`, thumbnailUrl);
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

                const { authenticatedFetch } = await import('../config/api');
                const response = await authenticatedFetch('/api/upload-project-file', {
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
                    console.log('✅ Thumbnail URL:', result.data?.thumbnailUrl);
                    console.log('✅ Full result.data:', result.data);

                    // Use result.data.url if available, otherwise fallback to result.url
                    const fileUrl = result.data?.url || result.url;
                    const thumbnailUrl = result.data?.thumbnailUrl;
                    console.log('✅ Using file URL:', fileUrl);
                    console.log('✅ Using thumbnail URL:', thumbnailUrl);

                    // Store both file URL and thumbnail URL
                    console.log('🔄 Calling onChange with:', { fileUrl, thumbnailUrl });
                    onChange(fileUrl, thumbnailUrl); // Updated to pass both URLs

                    // Auto-fill creation date from file metadata
                    if (onCreationDateChange && !creationDateValue) {
                        const fileDate = new Date(file.lastModified);
                        const formattedDate = fileDate.toISOString().split('T')[0];
                        onCreationDateChange(formattedDate);
                    }
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
                    const { authenticatedFetch } = await import('../config/api');
                    const response = await authenticatedFetch('/api/delete-project-file', {
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, direction: 'rtl' }}>
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />

            {/* Upload button or file display */}
            {value ? (
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
                    {thumbnailUrl ? (
                        <img
                            src={thumbnailUrl}
                            alt="תצוגה מקדימה"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                borderRadius: '4px'
                            }}
                            onError={(e) => {
                                // Fallback to PDF icon if thumbnail fails to load
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
                    ) : value.toLowerCase().includes('.pdf') ? (
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
                    {isUploading ? <CircularProgress size={20} /> : <GentleCloudUploadIcon fontSize="xlarge" />}
                </IconButton>
            )}

            {/* Label text */}
            <Typography
                variant="body2"
                sx={{
                    color: value ? '#6B46C1' : 'text.secondary',
                    fontSize: '1rem',
                    minWidth: 'fit-content',
                    cursor: value ? 'pointer' : 'default',
                    textDecoration: value ? 'underline' : 'none',
                    '&:hover': value ? {
                        color: '#5B21B6',
                        textDecoration: 'underline'
                    } : {}
                }}
                onClick={value ? () => window.open(value, '_blank') : undefined}
            >
                {label}
            </Typography>

            {/* AI Icon */}
            {aiIcon}

            {/* Date field */}
            {showCreationDate && (
                <TextField
                    label="תאריך יצירת המסמך"
                    type="date"
                    value={creationDateValue}
                    onChange={(e) => onCreationDateChange?.(e.target.value)}
                    disabled={disabled}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 200 }}
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
                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>שטח בניה (מ״ר)</TableCell>
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
                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', fontSize: '0.875rem' }}>גוש</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', fontSize: '0.875rem' }}>חלקה</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', fontSize: '0.875rem' }}>תת חלקה</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', fontSize: '0.875rem' }}>שטח (מ״ר)</TableCell>
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
                                <TableCell sx={{ padding: 1 }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        value={plot.area ? `${parseFloat(plot.area).toLocaleString('he-IL')} מ״ר` : ''}
                                        onChange={(e) => {
                                            const numericValue = e.target.value.replace(/[^\d]/g, '');
                                            handlePlotChange(index, 'area', numericValue);
                                        }}
                                        disabled={disabled}
                                        variant="outlined"
                                        placeholder="שטח במ״ר"
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
                                {!disabled && index > 0 && (
                                    <TableCell sx={{ padding: 1, textAlign: 'center' }}>
                                        <IconButton
                                            onClick={() => removePlot(index)}
                                            size="small"
                                            sx={{
                                                color: 'grey.600',
                                                '&:hover': {
                                                    color: 'white',
                                                    backgroundColor: 'error.main'
                                                },
                                                '&:focus': {
                                                    color: 'white',
                                                    backgroundColor: 'error.main'
                                                }
                                            }}
                                            title="מחק חלקה"
                                        >
                                            <TrashIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                )}
                                {!disabled && index === 0 && (
                                    <TableCell sx={{ padding: 1, textAlign: 'center' }}>
                                        {/* Empty cell for first row - no delete button */}
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                        {!disabled && (
                            <TableRow>
                                <TableCell colSpan={5} sx={{ padding: 2, textAlign: 'center', borderTop: '1px solid #e0e0e0' }}>
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

    // Format currency with commas (₪ symbol is handled by InputProps)
    const formatCurrency = (value: number): string => {
        if (!value || value === 0) return '';
        return value.toLocaleString('he-IL');
    };
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [fileUploadState, setFileUploadState] = useState<{ [key: string]: { url: string; thumbnailUrl?: string; creationDate?: string } }>({});
    const [loadingCompanyData, setLoadingCompanyData] = useState<{ [key: string]: boolean }>({});
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

    // Typing effect state
    const [typingText, setTypingText] = useState('');

    // Typing effect animation
    useEffect(() => {
        if (!isAnalyzing) {
            setTypingText('');
            return;
        }

        let dots = '';
        const interval = setInterval(() => {
            dots = dots.length >= 3 ? '' : dots + '.';
            setTypingText(dots);
        }, 500);

        return () => clearInterval(interval);
    }, [isAnalyzing]);

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
                            console.log('✅ Stakeholders loaded from server:', projectData.stakeholders);

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

    // Initialize default stakeholders when project is loaded
    useEffect(() => {
        console.log('🔄 useEffect for stakeholders initialization triggered');
        console.log('🔄 Project exists:', !!project);
        console.log('🔄 Stakeholders exist:', !!(project?.stakeholders && project.stakeholders.length > 0));
        if (project && (!project.stakeholders || project.stakeholders.length === 0)) {
            const initializeStakeholders = async () => {
                await initializeDefaultStakeholders();
            };
            initializeStakeholders();
        }
    }, [project, contractorName]);

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

    const handleNestedFieldChange = useCallback((fieldPath: string, value: any) => {
        console.log('🔄 handleNestedFieldChange called:', fieldPath, value);
        console.log('🔄 Current project state:', project);
        if (project) {
            // Use functional update to ensure React detects the change
            setProject(prevProject => {
                if (!prevProject) return prevProject;

                // Deep clone the project to ensure React detects the change
                const newProject = JSON.parse(JSON.stringify(prevProject));
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
                console.log('✅ siteOrganizationPlan after update:', newProject.siteOrganizationPlan);

                // Also update fileUploadState for immediate UI update
                if (fieldPath === 'siteOrganizationPlan.file' && value) {
                    console.log('🔄 Updating fileUploadState with file URL:', value);
                    setFileUploadState(prev => {
                        const newState = {
                            ...prev,
                            siteOrganizationPlan: {
                                ...prev.siteOrganizationPlan,
                                url: value
                            }
                        };
                        console.log('🔄 New fileUploadState:', newState);
                        return newState;
                    });
                } else if (fieldPath === 'siteOrganizationPlan.thumbnailUrl' && value) {
                    console.log('🔄 Updating fileUploadState with thumbnail URL:', value);
                    setFileUploadState(prev => {
                        const newState = {
                            ...prev,
                            siteOrganizationPlan: {
                                ...prev.siteOrganizationPlan,
                                thumbnailUrl: value
                            }
                        };
                        console.log('🔄 New fileUploadState:', newState);
                        return newState;
                    });
                } else if (fieldPath === 'siteOrganizationPlan.fileCreationDate' && value) {
                    console.log('🔄 Updating fileUploadState with creation date:', value);
                    setFileUploadState(prev => {
                        const newState = {
                            ...prev,
                            siteOrganizationPlan: {
                                ...prev.siteOrganizationPlan,
                                creationDate: value
                            }
                        };
                        console.log('🔄 New fileUploadState:', newState);
                        return newState;
                    });
                }

                return newProject;
            });

            // Auto-calculate GIS values when coordinates change
            if (fieldPath === 'engineeringQuestionnaire.buildingPlan.coordinates.x' ||
                fieldPath === 'engineeringQuestionnaire.buildingPlan.coordinates.y') {

                const x = fieldPath.includes('.x') ? value : project.engineeringQuestionnaire?.buildingPlan?.coordinates?.x;
                const y = fieldPath.includes('.y') ? value : project.engineeringQuestionnaire?.buildingPlan?.coordinates?.y;

                if (x && y && typeof x === 'number' && typeof y === 'number') {
                    console.log(`🔍 Auto-calculating GIS values for coordinates (${x}, ${y})`);

                    gisService.autoCalculateGISValues(
                        x, y,
                        (gisValues) => {
                            console.log('✅ GIS values calculated:', gisValues);

                            // Update PNG25 value if found
                            if (gisValues.png25 !== null) {
                                const updatedProject = { ...project };
                                if (!updatedProject.engineeringQuestionnaire) {
                                    updatedProject.engineeringQuestionnaire = {};
                                }
                                if (!updatedProject.engineeringQuestionnaire.soilReport) {
                                    updatedProject.engineeringQuestionnaire.soilReport = {};
                                }
                                updatedProject.engineeringQuestionnaire.soilReport.png25EarthquakeRating = gisValues.png25;
                                setProject(updatedProject);
                                console.log('✅ Updated PNG25 value:', gisValues.png25);
                            }

                            // Update Cresta area if found
                            if (gisValues.cresta !== null) {
                                const updatedProject = { ...project };
                                if (!updatedProject.engineeringQuestionnaire) {
                                    updatedProject.engineeringQuestionnaire = {};
                                }
                                if (!updatedProject.engineeringQuestionnaire.soilReport) {
                                    updatedProject.engineeringQuestionnaire.soilReport = {};
                                }
                                updatedProject.engineeringQuestionnaire.soilReport.crestaArea = gisValues.cresta;
                                setProject(updatedProject);
                                console.log('✅ Updated Cresta area:', gisValues.cresta);
                            }
                        },
                        (error) => {
                            console.error('❌ Failed to calculate GIS values:', error);
                        }
                    );
                }
            }
        } else {
            console.log('❌ No project to update');
        }
    }, []);

    // Stakeholder management functions
    const addStakeholder = () => {
        if (project) {
            const newStakeholder: Stakeholder = {
                id: generateObjectId(),
                role: '',
                companyId: '',
                companyName: '',
                phone: '',
                email: '',
                isDefault: false
            };
            console.log('✅ Adding new stakeholder with ObjectId:', newStakeholder.id);
            setProject({
                ...project,
                stakeholders: [...(project.stakeholders || []), newStakeholder]
            });
        }
    };

    // Initialize default stakeholders if none exist
    const initializeDefaultStakeholders = async () => {
        console.log('🔄 Checking stakeholders initialization for project:', project?.projectName);
        console.log('🔄 Current stakeholders:', project?.stakeholders);
        if (project && (!project.stakeholders || project.stakeholders.length === 0)) {
            console.log('🔄 Initializing default stakeholders for project:', project.projectName);

            // Get contractor details for entrepreneur
            let entrepreneurDetails = {
                companyId: '',
                companyName: '',
                phone: '',
                email: '',
                contractorObjectId: ''
            };

            // Try to get contractor details from URL parameter first, then from project
            const urlContractorId = searchParams.get('contractorId');
            const contractorId = urlContractorId || project.mainContractor || project.contractorId;
            console.log('🔍 Looking for contractor ID:', contractorId);
            console.log('🔍 URL contractor ID:', urlContractorId);
            console.log('🔍 Project mainContractor:', project.mainContractor);
            console.log('🔍 Project contractorId:', project.contractorId);

            if (contractorId) {
                // Check if contractorId is a valid ObjectId (24 characters)
                const isValidObjectId = contractorId.length === 24 && /^[0-9a-fA-F]{24}$/.test(contractorId);
                console.log('🔍 Is valid ObjectId:', isValidObjectId, 'Length:', contractorId.length);

                if (isValidObjectId) {
                    try {
                        console.log('🔄 Loading contractor details for entrepreneur...');
                        const { default: ContractorService } = await import('../services/contractorService');
                        const contractor = await ContractorService.getById(contractorId);
                        console.log('✅ Contractor loaded:', contractor);
                        console.log('🔍 Contractor companyId:', contractor?.companyId);
                        console.log('🔍 Contractor id:', contractor?.id);
                        console.log('🔍 Contractor _id:', contractor?._id);

                        if (contractor) {
                            entrepreneurDetails = {
                                companyId: contractor.companyId || contractor.id || contractor._id || '',
                                companyName: contractor.name || contractor.nameEnglish || '',
                                phone: contractor.phone || '',
                                email: contractor.email || '',
                                contractorObjectId: contractor._id || contractor.id || ''
                            };
                            console.log('✅ Entrepreneur details populated:', entrepreneurDetails);
                            console.log('✅ Contractor ObjectId saved:', entrepreneurDetails.contractorObjectId);
                        } else {
                            console.log('❌ No contractor found for ID:', contractorId);
                        }
                    } catch (error) {
                        console.error('❌ Error loading contractor details for entrepreneur:', error);
                        // Fallback to contractorName if available
                        if (contractorName) {
                            entrepreneurDetails.companyName = contractorName;
                            console.log('🔄 Using fallback contractor name:', contractorName);
                        }
                    }
                } else {
                    console.log('❌ Invalid ObjectId format, using fallback contractor name');
                    // Fallback to contractorName if available
                    if (contractorName) {
                        entrepreneurDetails.companyName = contractorName;
                        console.log('🔄 Using fallback contractor name:', contractorName);
                    }
                }
            } else {
                console.log('❌ No contractor ID found in project');
                // Fallback to contractorName if available
                if (contractorName) {
                    entrepreneurDetails.companyName = contractorName;
                    console.log('🔄 Using fallback contractor name:', contractorName);
                }
            }

            const defaultStakeholders: Stakeholder[] = [
                {
                    id: generateObjectId(),
                    role: 'יזם',
                    companyId: entrepreneurDetails.companyId,
                    companyName: entrepreneurDetails.companyName,
                    phone: entrepreneurDetails.phone,
                    email: entrepreneurDetails.email,
                    contractorObjectId: entrepreneurDetails.contractorObjectId,
                    isDefault: true
                },
                {
                    id: generateObjectId(),
                    role: 'מזמין העבודה',
                    companyId: '',
                    companyName: '',
                    phone: '',
                    email: '',
                    isDefault: true
                },
                {
                    id: generateObjectId(),
                    role: 'קבלן ראשי',
                    companyId: '',
                    companyName: '',
                    phone: '',
                    email: '',
                    isDefault: true
                },
                {
                    id: generateObjectId(),
                    role: 'בנק / גוף פיננסי מלווה',
                    companyId: '',
                    companyName: '',
                    phone: '',
                    email: '',
                    isDefault: true
                }
            ];

            console.log('✅ Setting default stakeholders with ObjectIds:', defaultStakeholders);
            console.log('✅ Stakeholder IDs:', defaultStakeholders.map(s => ({ role: s.role, id: s.id, contractorObjectId: s.contractorObjectId })));
            setProject({
                ...project,
                stakeholders: defaultStakeholders
            });
        } else {
            console.log('ℹ️ Stakeholders already exist or no project loaded');
        }
    };

    const removeStakeholder = (index: number) => {
        if (project && project.stakeholders) {
            const stakeholder = project.stakeholders[index];
            // Don't allow deletion of default stakeholders (except bank)
            if (stakeholder.isDefault && stakeholder.role !== 'בנק / גוף פיננסי מלווה') {
                return;
            }

            // Show confirmation dialog
            if (window.confirm('האם אתה בטוח שברצונך למחוק את בעל העניין?')) {
                const updatedStakeholders = project.stakeholders.filter((_, i) => i !== index);
                setProject({
                    ...project,
                    stakeholders: updatedStakeholders
                });
            }
        }
    };

    // Function to validate Israeli company ID or personal ID
    const validateIsraeliId = (id: string): boolean => {
        if (!id || id.length < 8 || id.length > 9) return false;
        if (!/^\d+$/.test(id)) return false; // Only digits

        // Israeli ID validation algorithm
        const digits = id.split('').map(Number);
        let sum = 0;

        for (let i = 0; i < digits.length - 1; i++) {
            let digit = digits[i];
            if (i % 2 === 1) {
                digit *= 2;
                if (digit > 9) {
                    digit = Math.floor(digit / 10) + (digit % 10);
                }
            }
            sum += digit;
        }

        const checkDigit = (10 - (sum % 10)) % 10;
        return checkDigit === digits[digits.length - 1];
    };

    const handleStakeholderChange = (index: number, field: keyof Stakeholder, value: any) => {
        if (project && project.stakeholders) {
            const updatedStakeholders = [...project.stakeholders];

            console.log('🔄 handleStakeholderChange called:', { index, field, value });
            console.log('🔄 Current stakeholder before change:', updatedStakeholders[index]);

            // Special handling for companyId field
            if (field === 'companyId') {
                // Only allow digits
                const numericValue = value.replace(/\D/g, '');
                console.log('🔄 Processing companyId:', { originalValue: value, numericValue });

                updatedStakeholders[index] = {
                    ...updatedStakeholders[index],
                    [field]: numericValue
                };

                console.log('🔄 Updated stakeholder after companyId change:', updatedStakeholders[index]);

                // Check if it's a government program (starts with 50 and is 9 digits)
                if (numericValue.length === 9 && numericValue.startsWith('50')) {
                    console.log('🏛️ Government program detected for company ID:', numericValue);
                    // Update government program field in project
                    setProject(prev => ({
                        ...prev,
                        engineeringQuestionnaire: {
                            ...prev?.engineeringQuestionnaire,
                            buildingPlan: {
                                ...prev?.engineeringQuestionnaire?.buildingPlan,
                                governmentProgram: true
                            }
                        }
                    }));
                }
            } else {
                updatedStakeholders[index] = {
                    ...updatedStakeholders[index],
                    [field]: value
                };
                console.log('🔄 Updated stakeholder after other field change:', updatedStakeholders[index]);
            }

            setProject({
                ...project,
                stakeholders: updatedStakeholders
            });

            console.log('🔄 Project stakeholders updated');
        }
    };

    const duplicateEntrepreneurDetails = (targetIndex: number) => {
        if (project && project.stakeholders) {
            const entrepreneur = project.stakeholders.find(s => s.role === 'יזם');
            if (entrepreneur) {
                const updatedStakeholders = [...project.stakeholders];
                updatedStakeholders[targetIndex] = {
                    ...updatedStakeholders[targetIndex],
                    companyId: entrepreneur.companyId,
                    companyName: entrepreneur.companyName,
                    phone: entrepreneur.phone,
                    email: entrepreneur.email,
                    contractorObjectId: entrepreneur.contractorObjectId
                };
                console.log('✅ Duplicated entrepreneur details including contractorObjectId:', entrepreneur.contractorObjectId);
                setProject({
                    ...project,
                    stakeholders: updatedStakeholders
                });
            }
        }
    };

    // Function to fetch company data from registry
    const fetchCompanyData = async (companyId: string, stakeholderIndex: number) => {
        if (!companyId || companyId.length < 8) {
            console.log('❌ Company ID too short or empty:', companyId);
            return; // Minimum company ID length
        }

        const loadingKey = `stakeholder-${stakeholderIndex}`;
        setLoadingCompanyData(prev => ({ ...prev, [loadingKey]: true }));

        try {
            console.log('🔍 Fetching company data for ID:', companyId, 'at index:', stakeholderIndex);

            // Store the original companyId to ensure it's preserved
            const originalCompanyId = companyId;
            console.log('🔍 Storing original companyId:', originalCompanyId);

            // Fetch from Companies Registry
            const companiesResponse = await fetch(`https://data.gov.il/api/3/action/datastore_search?resource_id=f004176c-b85f-4542-8901-7b3176f9a054&q=${companyId}`);
            const companiesData = await companiesResponse.json();
            console.log('Companies Registry response:', companiesData);

            // Fetch from Contractors Registry
            const contractorsResponse = await fetch(`https://data.gov.il/api/3/action/datastore_search?resource_id=4eb61bd6-18cf-4e7c-9f9c-e166dfa0a2d8&q=${companyId}`);
            const contractorsData = await contractorsResponse.json();
            console.log('Contractors Registry response:', contractorsData);

            if (companiesData.success && companiesData.result.records.length > 0) {
                const companyData = companiesData.result.records[0];
                console.log('✅ Company data found:', companyData);

                // Update stakeholder with company data
                if (project && project.stakeholders) {
                    const updatedStakeholders = [...project.stakeholders];

                    // Format company name - remove double spaces and fix בע"מ format
                    let companyName = companyData['שם חברה'] || companyData['שם התאגיד'] || '';
                    companyName = companyName.replace(/\s+/g, ' ').trim(); // Remove double spaces
                    companyName = companyName.replace(/בעמ|בע~מ/g, 'בע״מ'); // Fix בע"מ format

                    console.log('🔍 Current stakeholder before update:', updatedStakeholders[stakeholderIndex]);
                    console.log('🔍 Using stored original companyId:', originalCompanyId);

                    // Check if contractor data is available
                    let contractorNumber = '';
                    if (contractorsData.success && contractorsData.result.records.length > 0) {
                        const contractorData = contractorsData.result.records[0];
                        contractorNumber = contractorData['MISPAR_KABLAN'] || '';
                        console.log('✅ Contractor data found:', contractorData);
                    }

                    updatedStakeholders[stakeholderIndex] = {
                        ...updatedStakeholders[stakeholderIndex],
                        companyId: originalCompanyId, // Use the stored original companyId
                        companyName: companyName,
                        phone: companyData['טלפון'] || '',
                        email: companyData['דוא"ל'] || companyData['אימייל'] || ''
                    };

                    console.log('✅ Updated stakeholder after update:', updatedStakeholders[stakeholderIndex]);

                    setProject({
                        ...project,
                        stakeholders: updatedStakeholders
                    });

                    console.log('✅ Updated stakeholder with company data - companyId preserved:', originalCompanyId);
                }
            } else {
                console.log('❌ No company data found for ID:', companyId);
            }
        } catch (error) {
            console.error('❌ Error fetching company data:', error);
        } finally {
            setLoadingCompanyData(prev => ({ ...prev, [loadingKey]: false }));
        }
    };

    // Subcontractor management functions
    const addSubcontractor = () => {
        if (project) {
            const newSubcontractor: Subcontractor = {
                id: generateObjectId(),
                role: '',
                companyId: '',
                companyName: '',
                address: '',
                fullAddress: '',
                contractorNumber: '',
                phone: '',
                email: '',
                website: '',
                isRegistered: false
            };
            setProject({
                ...project,
                subcontractors: [...(project.subcontractors || []), newSubcontractor]
            });
        }
    };

    const removeSubcontractor = (index: number) => {
        if (project && project.subcontractors) {
            if (window.confirm('האם אתה בטוח שברצונך למחוק את קבלן המשנה?')) {
                const updatedSubcontractors = project.subcontractors.filter((_, i) => i !== index);
                setProject({
                    ...project,
                    subcontractors: updatedSubcontractors
                });
            }
        }
    };

    const handleSubcontractorChange = (index: number, field: keyof Subcontractor, value: any) => {
        if (project && project.subcontractors) {
            const updatedSubcontractors = [...project.subcontractors];

            // Special handling for companyId field
            if (field === 'companyId') {
                const numericValue = value.replace(/\D/g, '');
                updatedSubcontractors[index] = {
                    ...updatedSubcontractors[index],
                    [field]: numericValue
                };

                // Fetch company data if companyId is long enough
                if (numericValue.length >= 8) {
                    fetchSubcontractorData(numericValue, index);
                }
            } else {
                updatedSubcontractors[index] = {
                    ...updatedSubcontractors[index],
                    [field]: value
                };
            }

            setProject({
                ...project,
                subcontractors: updatedSubcontractors
            });
        }
    };

    // Function to extract website from email
    const extractWebsiteFromEmail = (email: string): string => {
        if (!email) return '';

        // Skip common email providers
        const commonProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'walla.co.il', 'nana.co.il'];
        const domain = email.split('@')[1]?.toLowerCase();

        if (commonProviders.includes(domain)) {
            return '';
        }

        return `https://www.${domain}`;
    };

    // Function to extract city from full address
    const extractCityFromAddress = (fullAddress: string): string => {
        if (!fullAddress) return '';

        // Split by common separators and take the last part (usually the city)
        const parts = fullAddress.split(/[,;]/).map(part => part.trim());
        return parts[parts.length - 1] || fullAddress;
    };

    // Load company data for existing subcontractors on component mount
    useEffect(() => {
        if (project?.subcontractors) {
            project.subcontractors.forEach((subcontractor, index) => {
                if (subcontractor.companyId && subcontractor.companyId.length >= 8 && !subcontractor.companyName) {
                    console.log('🔄 Auto-loading data for existing subcontractor:', subcontractor.companyId);
                    fetchSubcontractorData(subcontractor.companyId, index);
                }
            });
        }
    }, [project?.subcontractors]);

    // Import functions for subcontractors
    const handleCloudImport = () => {
        // Future: Sync with Safeguard system
        console.log('Sync subcontractors with Safeguard system - coming soon');
        // TODO: Implement Safeguard API integration for subcontractor sync
    };

    const handleExcelImport = () => {
        // Future: Open file browser for Excel/CSV files
        console.log('Excel/CSV import - coming soon');
        // TODO: Implement file browser and Excel/CSV parsing
    };

    // Function to fetch subcontractor data from MongoDB first, then APIs
    const fetchSubcontractorData = async (companyId: string, subcontractorIndex: number) => {
        if (!companyId || companyId.length < 8) {
            return;
        }

        const loadingKey = `subcontractor-${subcontractorIndex}`;
        setLoadingCompanyData(prev => ({ ...prev, [loadingKey]: true }));

        try {
            console.log('🔍 Fetching subcontractor data for ID:', companyId, 'at index:', subcontractorIndex);

            // Store the original companyId to ensure it's preserved
            const originalCompanyId = companyId;

            let companyName = '';
            let address = ''; // This will store the city for UI display
            let fullAddress = ''; // This will store the full address for data
            let contractorNumber = '';
            let phone = '';
            let email = '';
            let website = '';
            let isRegistered = false;

            // First, try to find contractor in MongoDB Atlas
            try {
                console.log('🔍 Searching for contractor in MongoDB with companyId:', companyId);
                const { authenticatedFetch } = await import('../config/api');
                const response = await authenticatedFetch(`/api/contractors/search?companyId=${companyId}`);
                console.log('📡 MongoDB search response status:', response.status);

                if (response.ok) {
                    const contractors = await response.json();
                    console.log('📋 MongoDB search results:', contractors);

                    if (contractors && contractors.length > 0) {
                        const existingContractor = contractors[0];
                        console.log('✅ Found contractor in MongoDB:', existingContractor);
                        companyName = existingContractor.companyName || '';
                        fullAddress = existingContractor.address || ''; // Get full address
                        address = existingContractor.city || extractCityFromAddress(fullAddress); // Use city field or extract from address
                        phone = existingContractor.phone || '';
                        email = existingContractor.email || '';
                        website = extractWebsiteFromEmail(email);
                        contractorNumber = existingContractor.contractorNumber || '';
                        isRegistered = !!contractorNumber;
                        console.log('📊 Extracted data from MongoDB:', { companyName, fullAddress, address, phone, email, contractorNumber });
                    } else {
                        console.log('ℹ️ No contractors found in MongoDB for companyId:', companyId);
                    }
                } else {
                    console.log('❌ MongoDB search failed with status:', response.status);
                }
            } catch (error) {
                console.log('❌ Error searching MongoDB:', error);
            }

            // If not found in MongoDB, try APIs
            if (!companyName) {
                // Fetch from Companies Registry
                const companiesResponse = await fetch(`https://data.gov.il/api/3/action/datastore_search?resource_id=f004176c-b85f-4542-8901-7b3176f9a054&q=${companyId}`);
                const companiesData = await companiesResponse.json();

                // Fetch from Contractors Registry
                const contractorsResponse = await fetch(`https://data.gov.il/api/3/action/datastore_search?resource_id=4eb61bd6-18cf-4e7c-9f9c-e166dfa0a2d8&q=${companyId}`);
                const contractorsData = await contractorsResponse.json();

                // Process company data
                if (companiesData.success && companiesData.result.records.length > 0) {
                    const companyData = companiesData.result.records[0];
                    console.log('✅ Company data from registry:', companyData);
                    companyName = companyData['שם חברה'] || companyData['שם התאגיד'] || '';
                    companyName = companyName.replace(/\s+/g, ' ').trim();
                    companyName = companyName.replace(/בעמ|בע~מ/g, 'בע״מ');
                    fullAddress = companyData['כתובת'] || ''; // Get full address
                    address = extractCityFromAddress(fullAddress); // Extract city for UI
                    phone = companyData['טלפון'] || '';
                    email = companyData['דוא"ל'] || companyData['אימייל'] || '';
                    website = extractWebsiteFromEmail(email);
                    console.log('✅ Processed company data:', { companyName, fullAddress, address, phone, email });
                } else {
                    console.log('ℹ️ No company data found in registry');
                }

                // Process contractor data
                if (contractorsData.success && contractorsData.result.records.length > 0) {
                    const contractorData = contractorsData.result.records[0];
                    contractorNumber = contractorData['MISPAR_KABLAN'] || '';
                    isRegistered = true;

                    // Get city from SHEM_YISHUV field
                    const cityFromRegistry = contractorData['SHEM_YISHUV'] || '';
                    if (cityFromRegistry && !address) {
                        address = cityFromRegistry;
                        console.log('✅ City from contractors registry:', cityFromRegistry);
                    }

                    console.log('✅ Contractor data from registry:', contractorData);
                    console.log('✅ Contractor number:', contractorNumber);
                    console.log('✅ City from registry:', cityFromRegistry);
                } else {
                    isRegistered = false;
                    contractorNumber = 'אינו קבלן רשום';
                    console.log('ℹ️ No contractor data found in registry');
                }
            }

            if (project && project.subcontractors) {
                const updatedSubcontractors = [...project.subcontractors];

                console.log('🔍 Updating subcontractor with data:', {
                    companyId: originalCompanyId,
                    companyName,
                    address,
                    fullAddress,
                    contractorNumber,
                    phone,
                    email,
                    website,
                    isRegistered
                });

                updatedSubcontractors[subcontractorIndex] = {
                    ...updatedSubcontractors[subcontractorIndex],
                    companyId: originalCompanyId,
                    companyName: companyName,
                    address: address, // Display only city in UI
                    fullAddress: fullAddress, // Store full address for data
                    contractorNumber: contractorNumber,
                    phone: phone,
                    email: email,
                    website: website,
                    isRegistered: isRegistered
                };

                setProject({
                    ...project,
                    subcontractors: updatedSubcontractors
                });

                console.log('✅ Updated subcontractor with data:', updatedSubcontractors[subcontractorIndex]);
            }
        } catch (error) {
            console.error('❌ Error fetching subcontractor data:', error);
        } finally {
            setLoadingCompanyData(prev => ({ ...prev, [loadingKey]: false }));
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
        console.log('🚀 handleDocumentAnalysis called with:', { fileUrl, documentType });

        if (!fileUrl) {
            console.log('❌ No file URL provided');
            setSnackbarMessage('אנא העלה מסמך תחילה');
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }

        try {
            console.log('🔄 Setting analyzing state to true');
            setIsAnalyzing(true);
            setSnackbarMessage(`מנתח את המסמך (${documentType}) וממלא שדות...`);
            setSnackbarSeverity('info');
            setSnackbarOpen(true);

            console.log('🔍 Starting document analysis:', fileUrl, documentType);

            // Handle risk assessment report analysis
            if (documentType === 'risk-assessment') {
                console.log('🎯 Processing risk assessment report');
                const { analyzeReportByUrl, mapRiskAnalysisToProject } = await import('../services/riskAnalysisService');
                console.log('📦 Services imported successfully');

                console.log('📞 Calling analyzeReportByUrl with:', fileUrl);
                const analysisResult = await analyzeReportByUrl(fileUrl);
                console.log('📊 Analysis result received:', analysisResult);

                const mappedData = mapRiskAnalysisToProject(analysisResult);
                console.log('🗺️ Mapped data:', mappedData);

                // Update project with mapped data
                if (project) {
                    const newProject = { ...project };
                    console.log('📝 Original project before update:', newProject);

                    // Apply all mapped fields
                    Object.entries(mappedData).forEach(([fieldPath, value]) => {
                        console.log(`🔧 Updating field: ${fieldPath} = ${value}`);
                        const keys = fieldPath.split('.');
                        let current = newProject;

                        for (let i = 0; i < keys.length - 1; i++) {
                            if (!current[keys[i]]) {
                                current[keys[i]] = {};
                            }
                            current = current[keys[i]];
                        }

                        current[keys[keys.length - 1]] = value;
                        console.log(`✅ Field updated: ${fieldPath} = ${value}`);
                    });

                    console.log('📝 Updated project:', newProject);
                    setProject(newProject);
                }

                // Mark file as analyzed
                setAnalyzedFiles(prev => new Set([...prev, fileUrl]));

                setSnackbarMessage('הניתוח הושלם בהצלחה! השדות מולאו אוטומטית');
                setSnackbarSeverity('success');
                setSnackbarOpen(true);
                return;
            }

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
            console.error('❌ Error stack:', error.stack);
            setSnackbarMessage(`שגיאה בניתוח המסמך: ${error.message}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            console.log('🔄 Setting analyzing state to false');
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
                    schedule: project.schedule,
                    // Include subcontractors array
                    subcontractors: project.subcontractors || []
                };
                console.log('🔄 Creating new project with data:', projectToSave);
                console.log('🔄 Stakeholders in new project:', projectToSave.stakeholders);
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
                    // Include stakeholders array
                    stakeholders: project.stakeholders || [],
                    // Include subcontractors array
                    subcontractors: project.subcontractors || [],
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
                    plotDetails: updateData.plotDetails,
                    stakeholders: updateData.stakeholders
                });
                console.log('🔄 Stakeholders with contractorObjectIds:', updateData.stakeholders?.map(s => ({
                    role: s.role,
                    contractorObjectId: s.contractorObjectId
                })));
                console.log('🔄 Full update data JSON:', JSON.stringify(updateData, null, 2));

                // Use different endpoint based on user type
                let updatedProject;
                if (isContactUser) {
                    console.log('🔧 Using contact API endpoint for update');
                    const { authenticatedFetch } = await import('../config/api');
                    const response = await authenticatedFetch(`/api/contact/projects/${projectId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(updateData),
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    updatedProject = await response.json();
                } else {
                    console.log('🔧 Using regular API endpoint for update');
                    updatedProject = await projectsAPI.update(projectId, updateData);
                }
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
                    {/* Project Header and Tabs - Combined Sticky */}
                    <Box sx={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 1000,
                        bgcolor: 'white',
                        flexShrink: 0
                    }}>
                        {/* Project Header */}
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            p: 1.5,
                            bgcolor: 'white',
                            color: 'black'
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
                        <Box sx={{
                            borderBottom: 1,
                            borderColor: 'divider',
                            bgcolor: 'white'
                        }}>
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
                                <Tab label="נהלים" />
                                <Tab label="ביטוח" />
                                <Tab label="הרשאות" />
                                <Tab label="הערות" />
                                {(project?.status === 'current' || project?.status === 'completed') && (
                                    <Tab label="דשבורד" />
                                )}
                            </Tabs>
                        </Box>
                    </Box>

                    {/* Tab Content */}
                    <Box sx={{ p: 3, pb: 6, flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {activeTab === 0 && (
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, bgcolor: 'white', p: 2, borderRadius: 1 }}>
                                    {/* Row 1: שם הפרויקט, עיר */}
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                                        <TextField
                                            fullWidth
                                            label="שם הפרויקט"
                                            value={project?.projectName || ''}
                                            onChange={(e) => handleFieldChange('projectName', e.target.value)}
                                            disabled={mode === 'view' || !canEdit}
                                        />
                                        <TextField
                                            fullWidth
                                            label="עיר"
                                            value={project?.city || ''}
                                            onChange={(e) => handleFieldChange('city', e.target.value)}
                                            disabled={mode === 'view' || !canEdit}
                                        />
                                    </Box>

                                    {/* Row 2: תיאור הפרויקט - על אורך כל השורה, 4 שורות */}
                                    <TextField
                                        fullWidth
                                        label="תיאור הפרויקט"
                                        value={project?.description || ''}
                                        onChange={(e) => handleFieldChange('description', e.target.value)}
                                        disabled={mode === 'view' || !canEdit}
                                        multiline
                                        rows={4}
                                    />

                                    {/* Row 3: תאריך התחלה, משך בחודשים */}
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
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
                                    </Box>

                                    {/* Row 4: ערך הפרויקט */}
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                                        <TextField
                                            fullWidth
                                            label="ערך הפרויקט (בש״ח)"
                                            value={project?.valueNis || project?.value ? `${(project?.valueNis || project?.value).toLocaleString('he-IL')} ₪` : ''}
                                            onChange={(e) => {
                                                const numericValue = e.target.value.replace(/[^\d]/g, '');
                                                const numValue = numericValue ? parseInt(numericValue) : 0;
                                                handleFieldChange('valueNis', numValue);
                                            }}
                                            disabled={mode === 'view' || !canEdit}
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
                                        />
                                    </Box>


                                    {/* Stakeholders Table */}
                                    <Box sx={{ gridColumn: '1 / -1', mt: 2 }}>
                                        <Typography variant="h6" gutterBottom sx={{ color: 'text.secondary', mb: 2 }}>
                                            בעלי עניין
                                        </Typography>


                                        {project?.stakeholders && project.stakeholders.length > 0 && (
                                            <TableContainer component={Paper} sx={{ borderRadius: 1, overflow: 'hidden' }}>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                                                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#374151', textAlign: 'right', minWidth: '150px' }}>
                                                                תחום
                                                            </TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#374151', textAlign: 'right' }}>
                                                                ח״פ
                                                            </TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#374151', textAlign: 'right' }}>
                                                                שם החברה
                                                            </TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#374151', textAlign: 'right' }}>
                                                                טלפון
                                                            </TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#374151', textAlign: 'right' }}>
                                                                אימייל
                                                            </TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#374151', width: 80, textAlign: 'right' }}>
                                                                פעולות
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {project.stakeholders.map((stakeholder, index) => (
                                                            <TableRow key={stakeholder.id} sx={{ '&:hover': { backgroundColor: '#F9FAFB' } }}>
                                                                <TableCell sx={{ minWidth: '150px' }}>
                                                                    <Autocomplete
                                                                        value={stakeholder.role}
                                                                        onChange={(event, newValue) => {
                                                                            handleStakeholderChange(index, 'role', newValue || '');
                                                                        }}
                                                                        onInputChange={(event, newInputValue) => {
                                                                            handleStakeholderChange(index, 'role', newInputValue);
                                                                        }}
                                                                        freeSolo
                                                                        options={[
                                                                            'יזם',
                                                                            'מזמין העבודה',
                                                                            'קבלן ראשי',
                                                                            'בנק / גוף פיננסי מלווה',
                                                                            'קבלן משנה'
                                                                        ]}
                                                                        disabled={mode === 'view' || !canEdit || stakeholder.isDefault}
                                                                        renderInput={(params) => (
                                                                            <TextField
                                                                                {...params}
                                                                                variant="outlined"
                                                                                size="small"
                                                                                sx={{
                                                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                                        borderColor: '#6B46C1',
                                                                                    },
                                                                                }}
                                                                            />
                                                                        )}
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Box sx={{ position: 'relative' }}>
                                                                        <TextField
                                                                            fullWidth
                                                                            value={stakeholder.companyId}
                                                                            onChange={(e) => {
                                                                                handleStakeholderChange(index, 'companyId', e.target.value);
                                                                                // Auto-fetch company data when company ID is complete
                                                                                if (e.target.value.replace(/\D/g, '').length >= 8) {
                                                                                    fetchCompanyData(e.target.value.replace(/\D/g, ''), index);
                                                                                }
                                                                            }}
                                                                            disabled={mode === 'view' || !canEdit || (stakeholder.isDefault && stakeholder.role === 'יזם')}
                                                                            variant="outlined"
                                                                            size="small"
                                                                            placeholder="ח״פ"
                                                                            inputProps={{
                                                                                maxLength: 9,
                                                                                pattern: '[0-9]*',
                                                                                inputMode: 'numeric'
                                                                            }}
                                                                            error={stakeholder.companyId && stakeholder.companyId.length >= 8 && !validateIsraeliId(stakeholder.companyId)}
                                                                            helperText={stakeholder.companyId && stakeholder.companyId.length >= 8 && !validateIsraeliId(stakeholder.companyId) ? 'ח״פ לא תקין' : ''}
                                                                            sx={{
                                                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                                    borderColor: '#6B46C1',
                                                                                },
                                                                            }}
                                                                        />
                                                                        {loadingCompanyData[`stakeholder-${index}`] && (
                                                                            <CircularProgress
                                                                                size={16}
                                                                                sx={{
                                                                                    position: 'absolute',
                                                                                    left: 8,
                                                                                    top: 'calc(50% - 8px)',
                                                                                    color: '#6B46C1',
                                                                                    verticalAlign: 'center'
                                                                                }}
                                                                            />
                                                                        )}
                                                                    </Box>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <TextField
                                                                        fullWidth
                                                                        value={stakeholder.companyName}
                                                                        onChange={(e) => handleStakeholderChange(index, 'companyName', e.target.value)}
                                                                        disabled={mode === 'view' || !canEdit || (stakeholder.isDefault && stakeholder.role === 'יזם')}
                                                                        variant="outlined"
                                                                        size="small"
                                                                        sx={{
                                                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                                borderColor: '#6B46C1',
                                                                            },
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <TextField
                                                                        fullWidth
                                                                        value={stakeholder.phone}
                                                                        onChange={(e) => handleStakeholderChange(index, 'phone', e.target.value)}
                                                                        disabled={mode === 'view' || !canEdit || (stakeholder.isDefault && stakeholder.role === 'יזם')}
                                                                        variant="outlined"
                                                                        size="small"
                                                                        sx={{
                                                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                                borderColor: '#6B46C1',
                                                                            },
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <TextField
                                                                        fullWidth
                                                                        value={stakeholder.email}
                                                                        onChange={(e) => handleStakeholderChange(index, 'email', e.target.value)}
                                                                        disabled={mode === 'view' || !canEdit || (stakeholder.isDefault && stakeholder.role === 'יזם')}
                                                                        variant="outlined"
                                                                        size="small"
                                                                        sx={{
                                                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                                borderColor: '#6B46C1',
                                                                            },
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                                        {(stakeholder.role === 'מזמין העבודה' || stakeholder.role === 'קבלן ראשי') && (
                                                                            <IconButton
                                                                                onClick={() => duplicateEntrepreneurDetails(index)}
                                                                                disabled={mode === 'view' || !canEdit}
                                                                                sx={{
                                                                                    color: 'grey.600',
                                                                                    '&:hover': {
                                                                                        color: '#6B46C1',
                                                                                        backgroundColor: '#F3F4F6'
                                                                                    }
                                                                                }}
                                                                                title="שכפל פרטי היזם"
                                                                            >
                                                                                <ContentCopyIcon fontSize="small" />
                                                                            </IconButton>
                                                                        )}
                                                                        {(!stakeholder.isDefault || stakeholder.role === 'בנק / גוף פיננסי מלווה') && (
                                                                            <IconButton
                                                                                onClick={() => removeStakeholder(index)}
                                                                                disabled={mode === 'view' || !canEdit}
                                                                                sx={{
                                                                                    color: 'grey.600',
                                                                                    '&:hover': {
                                                                                        color: 'white',
                                                                                        backgroundColor: 'error.main'
                                                                                    },
                                                                                    '&:focus': {
                                                                                        color: 'white',
                                                                                        backgroundColor: 'error.main'
                                                                                    }
                                                                                }}
                                                                                title="מחק בעל עניין"
                                                                            >
                                                                                <TrashIcon fontSize="small" />
                                                                            </IconButton>
                                                                        )}
                                                                    </Box>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        )}

                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mt: 2 }}>
                                            <Button
                                                variant="outlined"
                                                onClick={addStakeholder}
                                                disabled={mode === 'view' || !canEdit}
                                                sx={{
                                                    borderColor: '#6B46C1',
                                                    color: '#6B46C1',
                                                    '&:hover': {
                                                        borderColor: '#5B21B6',
                                                        backgroundColor: '#F3F4F6'
                                                    }
                                                }}
                                            >
                                                + הוספה
                                            </Button>
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        )}

                        {/* Subcontractors Section */}
                        {activeTab === 0 && (
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <Box sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                                    gap: 3,
                                    p: 3,
                                    backgroundColor: 'white',
                                    borderRadius: 2,
                                    boxShadow: 1
                                }}>
                                    {/* Subcontractors Table */}
                                    <Box sx={{ gridColumn: '1 / -1', mt: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                            <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                                                קבלני משנה
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <IconButton
                                                    onClick={handleCloudImport}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        color: '#6B46C1',
                                                        '&:hover': {
                                                            color: '#5B21B6',
                                                            backgroundColor: 'rgba(107, 70, 193, 0.04)'
                                                        }
                                                    }}
                                                    title="סינכרון קבלני משנה עם Safeguard"
                                                >
                                                    <CloudSyncIcon fontSize="xlarge" />
                                                </IconButton>
                                                <IconButton
                                                    onClick={handleExcelImport}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        color: '#6B46C1',
                                                        '&:hover': {
                                                            color: '#5B21B6',
                                                            backgroundColor: 'rgba(107, 70, 193, 0.04)'
                                                        }
                                                    }}
                                                    title="ייבוא מאקסל/CSV"
                                                >
                                                    <GentleCloudUploadIcon fontSize="large" />
                                                </IconButton>
                                            </Box>
                                        </Box>

                                        {project?.subcontractors && project.subcontractors.length > 0 && (
                                            <TableContainer component={Paper} sx={{ overflow: 'hidden' }}>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 120, px: 0.5 }}>תחום</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 100, px: 0.5 }}>ח״פ</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 150, px: 0.5 }}>שם החברה</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 120, px: 0.5 }}>עיר</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 100, px: 0.5 }}>מספר קבלן</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 60, px: 0.5 }}>פעולות</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {project.subcontractors.map((subcontractor, index) => (
                                                            <TableRow key={subcontractor.id}>
                                                                <TableCell sx={{ px: 0.5 }}>
                                                                    <Autocomplete
                                                                        freeSolo
                                                                        getOptionLabel={(option) => option}
                                                                        isOptionEqualToValue={(option, value) => option === value}
                                                                        options={[
                                                                            'חפירה ודיפון',
                                                                            'שלד',
                                                                            'חשמל',
                                                                            'אינסטלציה',
                                                                            'ריצוף',
                                                                            'גגן',
                                                                            'איטום',
                                                                            'גמר',
                                                                            'גמרים',
                                                                            'חלונות',
                                                                            'דלתות',
                                                                            'נגרות',
                                                                            'צבע',
                                                                            'אלקטרוניקה',
                                                                            'מיזוג אוויר',
                                                                            'אבטחה',
                                                                            'גינון',
                                                                            'כבישים וחנייה',
                                                                            'ביטון',
                                                                            'פלדה',
                                                                            'אבן',
                                                                            'טיח',
                                                                            'קרמיקה',
                                                                            'פרקט',
                                                                            'טפט',
                                                                            'תריסים',
                                                                            'שערים',
                                                                            'מעקות',
                                                                            'מדרגות',
                                                                            'מעליות',
                                                                            'מערכות כיבוי',
                                                                            'מערכות אזעקה',
                                                                            'מערכות תקשורת',
                                                                            'מערכות מיזוג',
                                                                            'מערכות חימום',
                                                                            'מערכות אוורור',
                                                                            'מערכות ניקוז',
                                                                            'מערכות ביוב',
                                                                            'מערכות מים',
                                                                            'מערכות גז',
                                                                            'מערכות תאורה',
                                                                            'מערכות בטיחות',
                                                                            'מערכות גישה',
                                                                            'מערכות ניטור',
                                                                            'מערכות בקרה',
                                                                            'מערכות אוטומציה',
                                                                            'מערכות חכמות',
                                                                            'מערכות אנרגיה',
                                                                            'מערכות סולאריות',
                                                                            'מערכות חיסכון',
                                                                            'מערכות מיחזור',
                                                                            'מערכות טיהור',
                                                                            'מערכות סינון',
                                                                            'מערכות חיטוי',
                                                                            'מערכות ניקוי',
                                                                            'מערכות תחזוקה',
                                                                            'מערכות שירות',
                                                                            'מערכות לוגיסטיקה',
                                                                            'מערכות אספקה',
                                                                            'מערכות הובלה',
                                                                            'מערכות אחסון',
                                                                            'מערכות אריזה',
                                                                            'מערכות סימון',
                                                                            'מערכות זיהוי',
                                                                            'מערכות בקרת איכות',
                                                                            'מערכות בדיקה',
                                                                            'מערכות מדידה',
                                                                            'מערכות כיול',
                                                                            'מערכות תיקון',
                                                                            'מערכות החלפה',
                                                                            'מערכות עדכון',
                                                                            'מערכות שדרוג',
                                                                            'מערכות התקנה',
                                                                            'מערכות הסרה',
                                                                            'מערכות פירוק',
                                                                            'מערכות הרכבה',
                                                                            'מערכות חיבור',
                                                                            'מערכות ניתוק',
                                                                            'מערכות חיתוך',
                                                                            'מערכות חריטה',
                                                                            'מערכות ליטוש',
                                                                            'מערכות הברקה',
                                                                            'מערכות ציפוי',
                                                                            'מערכות הגנה',
                                                                            'מערכות בידוד',
                                                                            'מערכות אטימה'
                                                                        ]}
                                                                        value={subcontractor.role || null}
                                                                        onChange={(_, newValue) => handleSubcontractorChange(index, 'role', newValue || '')}
                                                                        onInputChange={(_, newInputValue) => handleSubcontractorChange(index, 'role', newInputValue)}
                                                                        onOpen={() => console.log('Autocomplete opened')}
                                                                        onClose={() => console.log('Autocomplete closed')}
                                                                        disabled={mode === 'view' || !canEdit}
                                                                        size="small"
                                                                        sx={{
                                                                            '& .MuiOutlinedInput-root': {
                                                                                height: '40px',
                                                                            },
                                                                        }}
                                                                        renderInput={(params) => (
                                                                            <TextField
                                                                                {...params}
                                                                                placeholder="תחום"
                                                                                variant="outlined"
                                                                                size="small"
                                                                                sx={{
                                                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                                        borderColor: '#6B46C1',
                                                                                    },
                                                                                }}
                                                                            />
                                                                        )}
                                                                    />
                                                                </TableCell>
                                                                <TableCell sx={{ px: 0.5 }}>
                                                                    <Box sx={{ position: 'relative' }}>
                                                                        <TextField
                                                                            value={subcontractor.companyId}
                                                                            onChange={(e) => {
                                                                                const value = e.target.value;
                                                                                handleSubcontractorChange(index, 'companyId', value);
                                                                                const numericValue = value.replace(/\D/g, '');
                                                                                if (numericValue.length >= 8) {
                                                                                    fetchSubcontractorData(numericValue, index);
                                                                                }
                                                                            }}
                                                                            disabled={mode === 'view' || !canEdit}
                                                                            size="small"
                                                                            placeholder="ח״פ"
                                                                            inputProps={{
                                                                                maxLength: 9,
                                                                                pattern: '[0-9]*',
                                                                                inputMode: 'numeric',
                                                                                style: { textAlign: 'right' }
                                                                            }}
                                                                            error={subcontractor.companyId && subcontractor.companyId.length >= 8 && !validateIsraeliId(subcontractor.companyId)}
                                                                            helperText={subcontractor.companyId && subcontractor.companyId.length >= 8 && !validateIsraeliId(subcontractor.companyId) ? 'ח״פ לא תקין' : ''}
                                                                            sx={{
                                                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                                    borderColor: '#6B46C1',
                                                                                },
                                                                            }}
                                                                        />
                                                                        {loadingCompanyData[`subcontractor-${index}`] && (
                                                                            <CircularProgress
                                                                                size={16}
                                                                                sx={{
                                                                                    position: 'absolute',
                                                                                    left: 8,
                                                                                    top: 'calc(50% - 8px)',
                                                                                    color: '#6B46C1',
                                                                                    verticalAlign: 'center'
                                                                                }}
                                                                            />
                                                                        )}
                                                                    </Box>
                                                                </TableCell>
                                                                <TableCell sx={{ px: 0.5 }}>
                                                                    <TextField
                                                                        value={subcontractor.companyName}
                                                                        onChange={(e) => handleSubcontractorChange(index, 'companyName', e.target.value)}
                                                                        disabled={mode === 'view' || !canEdit}
                                                                        size="small"
                                                                        placeholder="שם החברה"
                                                                        inputProps={{ style: { textAlign: 'right' } }}
                                                                        sx={{
                                                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                                borderColor: '#6B46C1',
                                                                            },
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell sx={{ px: 0.5 }}>
                                                                    <TextField
                                                                        value={subcontractor.address}
                                                                        onChange={(e) => handleSubcontractorChange(index, 'address', e.target.value)}
                                                                        disabled={mode === 'view' || !canEdit}
                                                                        size="small"
                                                                        placeholder="עיר"
                                                                        inputProps={{ style: { textAlign: 'right' } }}
                                                                        sx={{
                                                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                                borderColor: '#6B46C1',
                                                                            },
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell sx={{ px: 0.5 }}>
                                                                    <TextField
                                                                        value={subcontractor.companyId && subcontractor.companyId.length >= 8
                                                                            ? (subcontractor.contractorNumber || 'אינו קבלן רשום')
                                                                            : ''}
                                                                        disabled={true} // Read-only field
                                                                        size="small"
                                                                        placeholder="מספר קבלן"
                                                                        inputProps={{ style: { textAlign: 'right' } }}
                                                                        sx={{
                                                                            '& .MuiInputBase-input': {
                                                                                color: 'text.secondary',
                                                                                backgroundColor: 'grey.100'
                                                                            }
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell sx={{ px: 0.5 }}>
                                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                                        <IconButton
                                                                            onClick={() => removeSubcontractor(index)}
                                                                            disabled={mode === 'view' || !canEdit}
                                                                            sx={{
                                                                                color: 'grey.600',
                                                                                '&:hover': {
                                                                                    color: 'white',
                                                                                    backgroundColor: 'error.main'
                                                                                },
                                                                                '&:focus': {
                                                                                    color: 'white',
                                                                                    backgroundColor: 'error.main'
                                                                                }
                                                                            }}
                                                                            title="מחק קבלן משנה"
                                                                        >
                                                                            <TrashIcon fontSize="small" />
                                                                        </IconButton>
                                                                    </Box>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        )}

                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mt: 2 }}>
                                            <Button
                                                variant="outlined"
                                                onClick={addSubcontractor}
                                                disabled={mode === 'view' || !canEdit}
                                                sx={{
                                                    borderColor: '#6B46C1',
                                                    color: '#6B46C1',
                                                    '&:hover': {
                                                        borderColor: '#5B21B6',
                                                        backgroundColor: '#F3F4F6'
                                                    }
                                                }}
                                            >
                                                + הוספה
                                            </Button>
                                        </Box>
                                    </Box>
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
                                                                <AutoAwesomeIcon
                                                                    sx={{
                                                                        animation: isAnalyzing ? 'sparkle 1.5s ease-in-out infinite' : 'none',
                                                                        color: isAnalyzing ? '#6B46C1' : 'inherit',
                                                                        filter: isAnalyzing ? 'drop-shadow(0 0 8px rgba(107, 70, 193, 0.6))' : 'none',
                                                                        '@keyframes sparkle': {
                                                                            '0%, 100%': {
                                                                                opacity: 1,
                                                                                transform: 'scale(1)',
                                                                                filter: 'brightness(1) drop-shadow(0 0 8px rgba(107, 70, 193, 0.6))'
                                                                            },
                                                                            '50%': {
                                                                                opacity: 0.8,
                                                                                transform: 'scale(1.2)',
                                                                                filter: 'brightness(1.8) drop-shadow(0 0 12px rgba(107, 70, 193, 0.8))'
                                                                            }
                                                                        }
                                                                    }}
                                                                />
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
                                                            label="Latitude (Y)"
                                                            type="number"
                                                            value={project?.engineeringQuestionnaire?.buildingPlan?.coordinates?.y || ''}
                                                            onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.coordinates.y', parseFloat(e.target.value) || 0)}
                                                            disabled={mode === 'view' || !canEdit}
                                                        />

                                                        <TextField
                                                            fullWidth
                                                            label="Longitude (X)"
                                                            type="number"
                                                            value={project?.engineeringQuestionnaire?.buildingPlan?.coordinates?.x || ''}
                                                            onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.coordinates.x', parseFloat(e.target.value) || 0)}
                                                            disabled={mode === 'view' || !canEdit}
                                                        />

                                                        <PlotDetailsTable
                                                            plotDetails={project?.engineeringQuestionnaire?.buildingPlan?.plotDetails || [{ block: '', plot: '', subPlot: '', area: '' }]}
                                                            onPlotDetailsChange={(plotDetails) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.plotDetails', plotDetails)}
                                                            disabled={mode === 'view' || !canEdit}
                                                        />
                                                    </Box>
                                                </Box>

                                                {/* Project Details Fields - 2 columns layout */}
                                                <Box sx={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                                    gap: 2,
                                                    direction: 'rtl'
                                                }}>
                                                    <Box sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '4px',
                                                        backgroundColor: 'white',
                                                        minHeight: '56px',
                                                        padding: '0 14px',
                                                        direction: 'rtl',
                                                        justifyContent: 'space-between'
                                                    }}>
                                                        <Typography variant="body2" sx={{
                                                            color: 'text.secondary',
                                                            fontSize: '1rem',
                                                            marginRight: '10px'
                                                        }}>
                                                            תוכנית ממשלתית
                                                        </Typography>
                                                        <Box sx={{
                                                            display: 'flex',
                                                            gap: 0,
                                                            alignItems: 'center',
                                                            justifyContent: 'flex-start'
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

                                                    {/* בנייה / שיפוץ */}
                                                    <Box sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '4px',
                                                        backgroundColor: 'white',
                                                        minHeight: '56px',
                                                        padding: '0 14px',
                                                        direction: 'rtl',
                                                        justifyContent: 'space-between'
                                                    }}>
                                                        <Typography variant="body2" sx={{
                                                            color: 'text.secondary',
                                                            fontSize: '1rem',
                                                            marginRight: '10px'
                                                        }}>
                                                            בנייה / שיפוץ
                                                        </Typography>
                                                        <Box sx={{
                                                            display: 'flex',
                                                            gap: 0,
                                                            alignItems: 'center',
                                                            justifyContent: 'flex-start'
                                                        }}>
                                                            <Button
                                                                variant="text"
                                                                onClick={() => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.constructionRenovation', false)}
                                                                disabled={mode === 'view' || !canEdit}
                                                                sx={{
                                                                    borderRadius: '0 4px 4px 0',
                                                                    border: '1px solid #d1d5db',
                                                                    borderLeft: 'none',
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.constructionRenovation === false ? '#6B46C1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.constructionRenovation === false ? 'white' : '#6B46C1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.constructionRenovation === false ? '#5B21B6' : '#f3f4f6',
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
                                                                onClick={() => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.constructionRenovation', true)}
                                                                disabled={mode === 'view' || !canEdit}
                                                                sx={{
                                                                    borderRadius: '4px 0 0 4px',
                                                                    border: '1px solid #d1d5db',
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.constructionRenovation === true ? '#6B46C1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.constructionRenovation === true ? 'white' : '#6B46C1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.constructionRenovation === true ? '#5B21B6' : '#f3f4f6',
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

                                                    {/* הריסה מבנים / חלקי מבנים */}
                                                    <Box sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '4px',
                                                        backgroundColor: 'white',
                                                        minHeight: '56px',
                                                        padding: '0 14px',
                                                        direction: 'rtl',
                                                        justifyContent: 'space-between'
                                                    }}>
                                                        <Typography variant="body2" sx={{
                                                            color: 'text.secondary',
                                                            fontSize: '1rem',
                                                            marginRight: '10px'
                                                        }}>
                                                            הריסה מבנים / חלקי מבנים
                                                        </Typography>
                                                        <Box sx={{
                                                            display: 'flex',
                                                            gap: 0,
                                                            alignItems: 'center',
                                                            justifyContent: 'flex-start'
                                                        }}>
                                                            <Button
                                                                variant="text"
                                                                onClick={() => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.demolition', false)}
                                                                disabled={mode === 'view' || !canEdit}
                                                                sx={{
                                                                    borderRadius: '0 4px 4px 0',
                                                                    border: '1px solid #d1d5db',
                                                                    borderLeft: 'none',
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.demolition === false ? '#6B46C1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.demolition === false ? 'white' : '#6B46C1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.demolition === false ? '#5B21B6' : '#f3f4f6',
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
                                                                onClick={() => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.demolition', true)}
                                                                disabled={mode === 'view' || !canEdit}
                                                                sx={{
                                                                    borderRadius: '4px 0 0 4px',
                                                                    border: '1px solid #d1d5db',
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.demolition === true ? '#6B46C1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.demolition === true ? 'white' : '#6B46C1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.demolition === true ? '#5B21B6' : '#f3f4f6',
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

                                                    {/* הנדסה אזרחית / תשתיות */}
                                                    <Box sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '4px',
                                                        backgroundColor: 'white',
                                                        minHeight: '56px',
                                                        padding: '0 14px',
                                                        direction: 'rtl',
                                                        justifyContent: 'space-between'
                                                    }}>
                                                        <Typography variant="body2" sx={{
                                                            color: 'text.secondary',
                                                            fontSize: '1rem',
                                                            marginRight: '10px'
                                                        }}>
                                                            הנדסה אזרחית / תשתיות
                                                        </Typography>
                                                        <Box sx={{
                                                            display: 'flex',
                                                            gap: 0,
                                                            alignItems: 'center',
                                                            justifyContent: 'flex-start'
                                                        }}>
                                                            <Button
                                                                variant="text"
                                                                onClick={() => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.civilEngineering', false)}
                                                                disabled={mode === 'view' || !canEdit}
                                                                sx={{
                                                                    borderRadius: '0 4px 4px 0',
                                                                    border: '1px solid #d1d5db',
                                                                    borderLeft: 'none',
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.civilEngineering === false ? '#6B46C1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.civilEngineering === false ? 'white' : '#6B46C1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.civilEngineering === false ? '#5B21B6' : '#f3f4f6',
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
                                                                onClick={() => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.civilEngineering', true)}
                                                                disabled={mode === 'view' || !canEdit}
                                                                sx={{
                                                                    borderRadius: '4px 0 0 4px',
                                                                    border: '1px solid #d1d5db',
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.civilEngineering === true ? '#6B46C1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.civilEngineering === true ? 'white' : '#6B46C1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.civilEngineering === true ? '#5B21B6' : '#f3f4f6',
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

                                                    {/* תמ״א 38/1 חיזוק ותוספת בנייה */}
                                                    <Box sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '4px',
                                                        backgroundColor: 'white',
                                                        minHeight: '56px',
                                                        padding: '0 14px',
                                                        direction: 'rtl',
                                                        justifyContent: 'space-between'
                                                    }}>
                                                        <Typography variant="body2" sx={{
                                                            color: 'text.secondary',
                                                            fontSize: '1rem',
                                                            marginRight: '10px'
                                                        }}>
                                                            תמ״א 38/1 חיזוק ותוספת בנייה
                                                        </Typography>
                                                        <Box sx={{
                                                            display: 'flex',
                                                            gap: 0,
                                                            alignItems: 'center',
                                                            justifyContent: 'flex-start'
                                                        }}>
                                                            <Button
                                                                variant="text"
                                                                onClick={() => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.tama38_1', false)}
                                                                disabled={mode === 'view' || !canEdit}
                                                                sx={{
                                                                    borderRadius: '0 4px 4px 0',
                                                                    border: '1px solid #d1d5db',
                                                                    borderLeft: 'none',
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.tama38_1 === false ? '#6B46C1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.tama38_1 === false ? 'white' : '#6B46C1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.tama38_1 === false ? '#5B21B6' : '#f3f4f6',
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
                                                                onClick={() => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.tama38_1', true)}
                                                                disabled={mode === 'view' || !canEdit}
                                                                sx={{
                                                                    borderRadius: '4px 0 0 4px',
                                                                    border: '1px solid #d1d5db',
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.tama38_1 === true ? '#6B46C1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.tama38_1 === true ? 'white' : '#6B46C1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.tama38_1 === true ? '#5B21B6' : '#f3f4f6',
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

                                                    {/* תמ״א 38/2 פינוי בינוי */}
                                                    <Box sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '4px',
                                                        backgroundColor: 'white',
                                                        minHeight: '56px',
                                                        padding: '0 14px',
                                                        direction: 'rtl',
                                                        justifyContent: 'space-between'
                                                    }}>
                                                        <Typography variant="body2" sx={{
                                                            color: 'text.secondary',
                                                            fontSize: '1rem',
                                                            marginRight: '10px'
                                                        }}>
                                                            תמ״א 38/2 פינוי בינוי
                                                        </Typography>
                                                        <Box sx={{
                                                            display: 'flex',
                                                            gap: 0,
                                                            alignItems: 'center',
                                                            justifyContent: 'flex-start'
                                                        }}>
                                                            <Button
                                                                variant="text"
                                                                onClick={() => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.tama38_2', false)}
                                                                disabled={mode === 'view' || !canEdit}
                                                                sx={{
                                                                    borderRadius: '0 4px 4px 0',
                                                                    border: '1px solid #d1d5db',
                                                                    borderLeft: 'none',
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.tama38_2 === false ? '#6B46C1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.tama38_2 === false ? 'white' : '#6B46C1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.tama38_2 === false ? '#5B21B6' : '#f3f4f6',
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
                                                                onClick={() => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.tama38_2', true)}
                                                                disabled={mode === 'view' || !canEdit}
                                                                sx={{
                                                                    borderRadius: '4px 0 0 4px',
                                                                    border: '1px solid #d1d5db',
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.tama38_2 === true ? '#6B46C1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.tama38_2 === true ? 'white' : '#6B46C1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.tama38_2 === true ? '#5B21B6' : '#f3f4f6',
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

                                                    {/* שימור וחיזוק מבנים / מבנה בשימור */}
                                                    <Box sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '4px',
                                                        backgroundColor: 'white',
                                                        minHeight: '56px',
                                                        padding: '0 14px',
                                                        direction: 'rtl',
                                                        justifyContent: 'space-between'
                                                    }}>
                                                        <Typography variant="body2" sx={{
                                                            color: 'text.secondary',
                                                            fontSize: '1rem',
                                                            marginRight: '10px'
                                                        }}>
                                                            שימור וחיזוק מבנים / מבנה בשימור
                                                        </Typography>
                                                        <Box sx={{
                                                            display: 'flex',
                                                            gap: 0,
                                                            alignItems: 'center',
                                                            justifyContent: 'flex-start'
                                                        }}>
                                                            <Button
                                                                variant="text"
                                                                onClick={() => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.preservation', false)}
                                                                disabled={mode === 'view' || !canEdit}
                                                                sx={{
                                                                    borderRadius: '0 4px 4px 0',
                                                                    border: '1px solid #d1d5db',
                                                                    borderLeft: 'none',
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.preservation === false ? '#6B46C1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.preservation === false ? 'white' : '#6B46C1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.preservation === false ? '#5B21B6' : '#f3f4f6',
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
                                                                onClick={() => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.preservation', true)}
                                                                disabled={mode === 'view' || !canEdit}
                                                                sx={{
                                                                    borderRadius: '4px 0 0 4px',
                                                                    border: '1px solid #d1d5db',
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.preservation === true ? '#6B46C1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.preservation === true ? 'white' : '#6B46C1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.preservation === true ? '#5B21B6' : '#f3f4f6',
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

                                                    {/* שיטת הבניה */}
                                                    <Autocomplete
                                                        fullWidth
                                                        options={['קונבנציונאלי', 'ברנוביץ', 'טרומי']}
                                                        value={project?.engineeringQuestionnaire?.buildingPlan?.constructionMethod || null}
                                                        onChange={(event, newValue) => {
                                                            handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.constructionMethod', newValue || '');
                                                        }}
                                                        disabled={mode === 'view' || !canEdit}
                                                        renderInput={(params) => (
                                                            <TextField
                                                                {...params}
                                                                label="מה שיטת הבניה"
                                                                variant="outlined"
                                                                sx={{
                                                                    '& .MuiInputLabel-root': {
                                                                        color: 'text.secondary'
                                                                    },
                                                                    '& .MuiInputLabel-root.Mui-focused': {
                                                                        color: 'primary.main'
                                                                    }
                                                                }}
                                                            />
                                                        )}
                                                    />
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



                                        {/* תת-סקשן: פרטי הבניינים - מוצג רק אם סוג הפרויקט הוא "בניה" */}
                                        {project?.engineeringQuestionnaire?.buildingPlan?.projectType === 'בניה' && (
                                            <Box sx={{ mb: 4 }}>
                                                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                                    פרטי הבניינים
                                                </Typography>

                                                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3, mb: 3 }}>
                                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
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

                                                        <TextField
                                                            fullWidth
                                                            label="סה״כ שטח בניה (מ״ר)"
                                                            type="number"
                                                            value={project?.engineeringQuestionnaire?.buildingPlan?.totalConstructionArea || ''}
                                                            onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.totalConstructionArea', parseFloat(e.target.value) || 0)}
                                                            disabled={mode === 'view' || !canEdit}
                                                        />
                                                    </Box>

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
                                                            מרתף משותף לבניינים
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
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                                                <FileUpload
                                                    label="היתר בניה"
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
                                                    label="היתר חפירה ודיפון"
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
                                                    label="אישור מהנדס קונסטרקטור"
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
                                                    label="הצהרת מהנדס לתכנון לפי תקן 413 רעידות אדמה"
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

                                    </Box>

                                    {/* דוח יועץ קרקע */}
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                                            דוח יועץ קרקע
                                        </Typography>

                                        {/* Soil Report File Upload with AI Icon */}
                                        <Box sx={{ mb: 3 }}>
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
                                                aiIcon={(() => {
                                                    const reportFile = project?.engineeringQuestionnaire?.soilConsultantReport?.reportFile;
                                                    const isAnalyzed = analyzedFiles.has(reportFile);
                                                    console.log('🔍 Soil Report AI Icon Debug:', {
                                                        reportFile,
                                                        canEdit,
                                                        isAnalyzed,
                                                        analyzedFiles: Array.from(analyzedFiles),
                                                        shouldShow: reportFile && canEdit && !isAnalyzed
                                                    });
                                                    return reportFile && canEdit && !isAnalyzed ? (
                                                        <IconButton
                                                            onClick={handleAutoFillFromReport}
                                                            disabled={isAnalyzing || mode === 'view'}
                                                            sx={{
                                                                backgroundColor: 'white',
                                                                color: '#6B46C1',
                                                                width: '48px',
                                                                height: '48px',
                                                                '&:hover': {
                                                                    backgroundColor: '#F3F4F6',
                                                                },
                                                                '&:disabled': {
                                                                    backgroundColor: '#E5E7EB',
                                                                    color: '#9CA3AF'
                                                                }
                                                            }}
                                                        >
                                                            <AutoAwesomeIcon
                                                                sx={{
                                                                    animation: isAnalyzing ? 'sparkle 1.5s ease-in-out infinite' : 'none',
                                                                    color: isAnalyzing ? '#6B46C1' : 'inherit',
                                                                    filter: isAnalyzing ? 'drop-shadow(0 0 8px rgba(107, 70, 193, 0.6))' : 'none',
                                                                    '@keyframes sparkle': {
                                                                        '0%, 100%': {
                                                                            opacity: 1,
                                                                            transform: 'scale(1)',
                                                                            filter: 'brightness(1) drop-shadow(0 0 8px rgba(107, 70, 193, 0.6))'
                                                                        },
                                                                        '50%': {
                                                                            opacity: 0.8,
                                                                            transform: 'scale(1.2)',
                                                                            filter: 'brightness(1.8) drop-shadow(0 0 12px rgba(107, 70, 193, 0.8))'
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                        </IconButton>
                                                    ) : null;
                                                })()}
                                            />
                                        </Box>

                                        {/* Soil Report Fields - Row 1: 3 fields */}
                                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 2 }}>
                                            <Autocomplete
                                                fullWidth
                                                options={['חולית', 'סלעית', 'חרסיתית', 'אחר']}
                                                value={project?.engineeringQuestionnaire?.soilConsultantReport?.soilType || null}
                                                onChange={(event, newValue) => {
                                                    handleNestedFieldChange('engineeringQuestionnaire.soilConsultantReport.soilType', newValue || '');
                                                }}
                                                disabled={mode === 'view' || !canEdit}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="סוג הקרקע"
                                                        variant="outlined"
                                                        sx={{
                                                            '& .MuiInputLabel-root': {
                                                                color: 'text.secondary'
                                                            },
                                                            '& .MuiInputLabel-root.Mui-focused': {
                                                                color: 'primary.main'
                                                            }
                                                        }}
                                                    />
                                                )}
                                            />

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
                                                label="עומק יסודות מקסימלי (מטר)"
                                                type="number"
                                                value={project?.engineeringQuestionnaire?.soilReport?.maxFoundationDepth || ''}
                                                onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.soilReport.maxFoundationDepth', parseFloat(e.target.value) || 0)}
                                                disabled={mode === 'view' || !canEdit}
                                            />
                                        </Box>

                                        {/* Soil Report Fields - Row 2: 2 fields with refresh icons */}
                                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 3 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <TextField
                                                    fullWidth
                                                    label="אזור Cresta"
                                                    value={project?.engineeringQuestionnaire?.soilReport?.crestaArea || ''}
                                                    onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.soilReport.crestaArea', e.target.value)}
                                                    disabled={mode === 'view' || !canEdit}
                                                />
                                                <IconButton
                                                    onClick={async () => {
                                                        const x = project?.engineeringQuestionnaire?.buildingPlan?.coordinates?.x;
                                                        const y = project?.engineeringQuestionnaire?.buildingPlan?.coordinates?.y;

                                                        if (!x || !y) {
                                                            alert('אנא הזן קואורדינטות X ו-Y תחילה');
                                                            return;
                                                        }

                                                        try {
                                                            const cresta = await gisService.getCrestaZone(x, y);

                                                            if (cresta !== null) {
                                                                // Format the data as lowRes (highRes) - name
                                                                const formattedCresta = formatCrestaData(cresta);
                                                                handleNestedFieldChange('engineeringQuestionnaire.soilReport.crestaArea', formattedCresta);
                                                            } else {
                                                                alert('לא נמצא אזור Cresta עבור הקואורדינטות הנתונות');
                                                            }
                                                        } catch (error) {
                                                            console.error('Error calculating Cresta zone:', error);
                                                            alert('שגיאה בחישוב אזור Cresta');
                                                        }
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        color: '#6B46C1',
                                                        '&:hover': {
                                                            backgroundColor: '#f3f4f6'
                                                        }
                                                    }}
                                                    title="חשב אזור Cresta"
                                                >
                                                    <RefreshIcon fontSize="large" />
                                                </IconButton>
                                            </Box>

                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <TextField
                                                    fullWidth
                                                    label="ציון PNG25 לרעידות אדמה"
                                                    type="number"
                                                    value={project?.engineeringQuestionnaire?.soilReport?.png25EarthquakeRating || ''}
                                                    onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.soilReport.png25EarthquakeRating', parseFloat(e.target.value) || 0)}
                                                    disabled={mode === 'view' || !canEdit}
                                                />
                                                <IconButton
                                                    onClick={async () => {
                                                        const x = project?.engineeringQuestionnaire?.buildingPlan?.coordinates?.x;
                                                        const y = project?.engineeringQuestionnaire?.buildingPlan?.coordinates?.y;

                                                        if (!x || !y) {
                                                            alert('אנא הזן קואורדינטות X ו-Y תחילה');
                                                            return;
                                                        }

                                                        try {
                                                            const png25 = await gisService.getPNG25Value(x, y);

                                                            if (png25 !== null) {
                                                                handleNestedFieldChange('engineeringQuestionnaire.soilReport.png25EarthquakeRating', png25);
                                                            } else {
                                                                alert('לא נמצא ערך PNG25 עבור הקואורדינטות הנתונות');
                                                            }
                                                        } catch (error) {
                                                            console.error('Error calculating PNG25 value:', error);
                                                            alert('שגיאה בחישוב ערך PNG25');
                                                        }
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        color: '#6B46C1',
                                                        '&:hover': {
                                                            backgroundColor: '#f3f4f6'
                                                        }
                                                    }}
                                                    title="חשב ערך PNG25"
                                                >
                                                    <RefreshIcon fontSize="large" />
                                                </IconButton>
                                            </Box>
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
                                                        דיפון היקפי
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
                                                                console.log('🔴 Clicking "לא" button for perimeter dewatering, current value:', project?.engineeringQuestionnaire?.soilConsultantReport?.perimeterDewatering);
                                                                console.log('🔴 Mode:', mode, 'canEdit:', canEdit);
                                                                handleNestedFieldChange('engineeringQuestionnaire.soilConsultantReport.perimeterDewatering', false);
                                                            }}
                                                            disabled={mode === 'view' || !canEdit}
                                                            sx={{
                                                                borderRadius: '0 4px 4px 0',
                                                                border: '1px solid #d1d5db',
                                                                borderLeft: 'none',
                                                                backgroundColor: project?.engineeringQuestionnaire?.soilConsultantReport?.perimeterDewatering === false ? '#6B46C1' : 'transparent',
                                                                color: project?.engineeringQuestionnaire?.soilConsultantReport?.perimeterDewatering === false ? 'white' : '#6B46C1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.engineeringQuestionnaire?.soilConsultantReport?.perimeterDewatering === false ? '#5B21B6' : '#f3f4f6',
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
                                                                console.log('🟢 Clicking "כן" button for perimeter dewatering, current value:', project?.engineeringQuestionnaire?.soilConsultantReport?.perimeterDewatering);
                                                                console.log('🟢 Mode:', mode, 'canEdit:', canEdit);
                                                                handleNestedFieldChange('engineeringQuestionnaire.soilConsultantReport.perimeterDewatering', true);
                                                            }}
                                                            disabled={mode === 'view' || !canEdit}
                                                            sx={{
                                                                borderRadius: '4px 0 0 4px',
                                                                border: '1px solid #d1d5db',
                                                                backgroundColor: project?.engineeringQuestionnaire?.soilConsultantReport?.perimeterDewatering === true ? '#6B46C1' : 'transparent',
                                                                color: project?.engineeringQuestionnaire?.soilConsultantReport?.perimeterDewatering === true ? 'white' : '#6B46C1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.engineeringQuestionnaire?.soilConsultantReport?.perimeterDewatering === true ? '#5B21B6' : '#f3f4f6',
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



                                                <TextField
                                                    fullWidth
                                                    label="מפתח מירבי בין עמודים (במטרים)"
                                                    type="number"
                                                    value={project?.engineeringQuestionnaire?.soilConsultantReport?.maxColumnSpacing || ''}
                                                    onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.soilConsultantReport.maxColumnSpacing', parseFloat(e.target.value) || 0)}
                                                    disabled={mode === 'view' || !canEdit}
                                                />
                                            </Box>

                                            {/* Text areas for drilling results and recommendations */}
                                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mt: 3 }}>
                                                <TextField
                                                    fullWidth
                                                    label="תוצאות קידוחי הניסיון שנערכו באתר"
                                                    multiline
                                                    rows={4}
                                                    value={project?.engineeringQuestionnaire?.soilConsultantReport?.drillingResults || ''}
                                                    onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.soilConsultantReport.drillingResults', e.target.value)}
                                                    disabled={mode === 'view' || !canEdit}
                                                />

                                                <TextField
                                                    fullWidth
                                                    label="המלצות לתכנון הדיפון והביסוס"
                                                    multiline
                                                    rows={4}
                                                    value={project?.engineeringQuestionnaire?.soilConsultantReport?.shoringRecommendations || ''}
                                                    onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.soilConsultantReport.shoringRecommendations', e.target.value)}
                                                    disabled={mode === 'view' || !canEdit}
                                                />
                                            </Box>
                                        </Box>

                                        {/* דוח סקר סיכונים */}
                                        <Box sx={{ mb: 3 }}>
                                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                                                דוח סקר סיכונים
                                            </Typography>
                                            <FileUpload
                                                label="דוח סקר סיכונים"
                                                value={project?.engineeringQuestionnaire?.riskAssessmentReport?.reportFile}
                                                onChange={(url) => handleFileUploadWithAnalysisReset('engineeringQuestionnaire.riskAssessmentReport.reportFile', url, project?.engineeringQuestionnaire?.riskAssessmentReport?.reportFile)}
                                                onDelete={() => handleFileUploadWithAnalysisReset('engineeringQuestionnaire.riskAssessmentReport.reportFile', '', project?.engineeringQuestionnaire?.riskAssessmentReport?.reportFile)}
                                                disabled={mode === 'view' || !canEdit}
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                showCreationDate={true}
                                                creationDateValue={project?.engineeringQuestionnaire?.riskAssessmentReport?.reportFileCreationDate || ''}
                                                onCreationDateChange={(date) => handleNestedFieldChange('engineeringQuestionnaire.riskAssessmentReport.reportFileCreationDate', date)}
                                                projectId={project?._id || project?.id}
                                                aiIcon={(() => {
                                                    const reportFile = project?.engineeringQuestionnaire?.riskAssessmentReport?.reportFile;
                                                    const isAnalyzed = analyzedFiles.has(reportFile);
                                                    return reportFile && canEdit && !isAnalyzed ? (
                                                        <IconButton
                                                            onClick={() => handleDocumentAnalysis(reportFile, 'risk-assessment')}
                                                            disabled={isAnalyzing || mode === 'view'}
                                                            sx={{
                                                                backgroundColor: 'white',
                                                                color: '#6B46C1',
                                                                width: '48px',
                                                                height: '48px',
                                                                '&:hover': {
                                                                    backgroundColor: '#F3F4F6',
                                                                },
                                                                '&:disabled': {
                                                                    backgroundColor: '#E5E7EB',
                                                                    color: '#9CA3AF'
                                                                }
                                                            }}
                                                        >
                                                            <AutoAwesomeIcon
                                                                sx={{
                                                                    animation: isAnalyzing ? 'sparkle 1.5s ease-in-out infinite' : 'none',
                                                                    color: isAnalyzing ? '#6B46C1' : 'inherit',
                                                                    filter: isAnalyzing ? 'drop-shadow(0 0 8px rgba(107, 70, 193, 0.6))' : 'none',
                                                                    '@keyframes sparkle': {
                                                                        '0%, 100%': {
                                                                            opacity: 1,
                                                                            transform: 'scale(1)',
                                                                            filter: 'brightness(1) drop-shadow(0 0 8px rgba(107, 70, 193, 0.6))'
                                                                        },
                                                                        '50%': {
                                                                            opacity: 0.8,
                                                                            transform: 'scale(1.2)',
                                                                            filter: 'brightness(1.8) drop-shadow(0 0 12px rgba(107, 70, 193, 0.8))'
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                        </IconButton>
                                                    ) : null;
                                                })()}
                                            />
                                        </Box>

                                        {/* תת-סקשן: מבנים קיימים והריסה */}
                                        <Box sx={{ mb: 4 }}>
                                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                                מבנים קיימים והריסה
                                            </Typography>
                                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
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
                                                        עבודה על מבנה קיים
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
                                                                console.log('🔴 Clicking "לא" button for work on existing structure, current value:', project?.engineeringQuestionnaire?.buildingPlan?.workOnExistingStructure);
                                                                console.log('🔴 Mode:', mode, 'canEdit:', canEdit);
                                                                handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.workOnExistingStructure', false);
                                                            }}
                                                            disabled={mode === 'view' || !canEdit}
                                                            sx={{
                                                                borderRadius: '0 4px 4px 0',
                                                                border: '1px solid #d1d5db',
                                                                borderLeft: 'none',
                                                                backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.workOnExistingStructure === false ? '#6B46C1' : 'transparent',
                                                                color: project?.engineeringQuestionnaire?.buildingPlan?.workOnExistingStructure === false ? 'white' : '#6B46C1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.workOnExistingStructure === false ? '#5B21B6' : '#f3f4f6',
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
                                                                console.log('🟢 Clicking "כן" button for work on existing structure, current value:', project?.engineeringQuestionnaire?.buildingPlan?.workOnExistingStructure);
                                                                console.log('🟢 Mode:', mode, 'canEdit:', canEdit);
                                                                handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.workOnExistingStructure', true);
                                                            }}
                                                            disabled={mode === 'view' || !canEdit}
                                                            sx={{
                                                                borderRadius: '4px 0 0 4px',
                                                                border: '1px solid #d1d5db',
                                                                backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.workOnExistingStructure === true ? '#6B46C1' : 'transparent',
                                                                color: project?.engineeringQuestionnaire?.buildingPlan?.workOnExistingStructure === true ? 'white' : '#6B46C1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.workOnExistingStructure === true ? '#5B21B6' : '#f3f4f6',
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

                                                {project?.engineeringQuestionnaire?.buildingPlan?.workOnExistingStructure && (
                                                    <>
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
                                                    </>
                                                )}

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
                                                        הריסת מבנה
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
                                                                console.log('🔴 Clicking "לא" button for demolition work, current value:', project?.engineeringQuestionnaire?.buildingPlan?.demolitionWork);
                                                                console.log('🔴 Mode:', mode, 'canEdit:', canEdit);
                                                                handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.demolitionWork', false);
                                                            }}
                                                            disabled={mode === 'view' || !canEdit}
                                                            sx={{
                                                                borderRadius: '0 4px 4px 0',
                                                                border: '1px solid #d1d5db',
                                                                borderLeft: 'none',
                                                                backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.demolitionWork === false ? '#6B46C1' : 'transparent',
                                                                color: project?.engineeringQuestionnaire?.buildingPlan?.demolitionWork === false ? 'white' : '#6B46C1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.demolitionWork === false ? '#5B21B6' : '#f3f4f6',
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
                                                                console.log('🟢 Clicking "כן" button for demolition work, current value:', project?.engineeringQuestionnaire?.buildingPlan?.demolitionWork);
                                                                console.log('🟢 Mode:', mode, 'canEdit:', canEdit);
                                                                handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.demolitionWork', true);
                                                            }}
                                                            disabled={mode === 'view' || !canEdit}
                                                            sx={{
                                                                borderRadius: '4px 0 0 4px',
                                                                border: '1px solid #d1d5db',
                                                                backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.demolitionWork === true ? '#6B46C1' : 'transparent',
                                                                color: project?.engineeringQuestionnaire?.buildingPlan?.demolitionWork === true ? 'white' : '#6B46C1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.demolitionWork === true ? '#5B21B6' : '#f3f4f6',
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

                                </Box>

                                {/* סקר סביבתי */}
                                <Box sx={{ mb: 4 }}>

                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3, mb: 3 }}>
                                        <TextField
                                            fullWidth
                                            label="תיאור המצב הקיים"
                                            value={isAnalyzing ? `מנתח את המסמך${typingText}` : (project?.environmentalSurvey?.currentStateDescription || '')}
                                            onChange={(e) => handleNestedFieldChange('environmentalSurvey.currentStateDescription', e.target.value)}
                                            disabled={mode === 'view' || !canEdit || isAnalyzing}
                                            multiline
                                            rows={3}
                                            sx={{
                                                '& .MuiInputBase-input': {
                                                    color: isAnalyzing ? '#6B46C1' : 'inherit',
                                                    fontStyle: isAnalyzing ? 'italic' : 'normal'
                                                },
                                                '& .MuiOutlinedInput-root': {
                                                    '&.Mui-focused fieldset': {
                                                        borderColor: '#6B46C1',
                                                    },
                                                },
                                                '& .MuiInputLabel-root': {
                                                    color: '#6B46C1',
                                                    '&.Mui-focused': {
                                                        color: '#6B46C1',
                                                    },
                                                },
                                            }}
                                        />

                                        <TextField
                                            fullWidth
                                            label="תיאור הסביבה"
                                            value={isAnalyzing ? `מנתח את המסמך${typingText}` : (project?.environmentalSurvey?.environmentDescription || '')}
                                            onChange={(e) => handleNestedFieldChange('environmentalSurvey.environmentDescription', e.target.value)}
                                            disabled={mode === 'view' || !canEdit || isAnalyzing}
                                            multiline
                                            rows={3}
                                            sx={{
                                                '& .MuiInputBase-input': {
                                                    color: isAnalyzing ? '#6B46C1' : 'inherit',
                                                    fontStyle: isAnalyzing ? 'italic' : 'normal'
                                                },
                                                '& .MuiOutlinedInput-root': {
                                                    '&.Mui-focused fieldset': {
                                                        borderColor: '#6B46C1',
                                                    },
                                                },
                                                '& .MuiInputLabel-root': {
                                                    color: '#6B46C1',
                                                    '&.Mui-focused': {
                                                        color: '#6B46C1',
                                                    },
                                                },
                                            }}
                                        />

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
                                                האם קיימים מבנים סמוכים
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
                                                        handleNestedFieldChange('environmentalSurvey.adjacentBuildings.exists', false);
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '0 4px 4px 0',
                                                        border: '1px solid #d1d5db',
                                                        borderLeft: 'none',
                                                        backgroundColor: project?.environmentalSurvey?.adjacentBuildings?.exists === false ? '#6B46C1' : 'transparent',
                                                        color: project?.environmentalSurvey?.adjacentBuildings?.exists === false ? 'white' : '#6B46C1',
                                                        '&:hover': {
                                                            backgroundColor: project?.environmentalSurvey?.adjacentBuildings?.exists === false ? '#5B21B6' : '#f3f4f6',
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
                                                        handleNestedFieldChange('environmentalSurvey.adjacentBuildings.exists', true);
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '4px 0 0 4px',
                                                        border: '1px solid #d1d5db',
                                                        backgroundColor: project?.environmentalSurvey?.adjacentBuildings?.exists === true ? '#6B46C1' : 'transparent',
                                                        color: project?.environmentalSurvey?.adjacentBuildings?.exists === true ? 'white' : '#6B46C1',
                                                        '&:hover': {
                                                            backgroundColor: project?.environmentalSurvey?.adjacentBuildings?.exists === true ? '#5B21B6' : '#f3f4f6',
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
                                                עגורנים בקרבה לעמודי חשמל
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
                                                        handleNestedFieldChange('environmentalSurvey.electricalCables.exists', false);
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '0 4px 4px 0',
                                                        border: '1px solid #d1d5db',
                                                        borderLeft: 'none',
                                                        backgroundColor: project?.environmentalSurvey?.electricalCables?.exists === false ? '#6B46C1' : 'transparent',
                                                        color: project?.environmentalSurvey?.electricalCables?.exists === false ? 'white' : '#6B46C1',
                                                        '&:hover': {
                                                            backgroundColor: project?.environmentalSurvey?.electricalCables?.exists === false ? '#5B21B6' : '#f3f4f6',
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
                                                        handleNestedFieldChange('environmentalSurvey.electricalCables.exists', true);
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '4px 0 0 4px',
                                                        border: '1px solid #d1d5db',
                                                        backgroundColor: project?.environmentalSurvey?.electricalCables?.exists === true ? '#6B46C1' : 'transparent',
                                                        color: project?.environmentalSurvey?.electricalCables?.exists === true ? 'white' : '#6B46C1',
                                                        '&:hover': {
                                                            backgroundColor: project?.environmentalSurvey?.electricalCables?.exists === true ? '#5B21B6' : '#f3f4f6',
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
                                                צינורות/מתקנים תת קרקעיים
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
                                                        handleNestedFieldChange('environmentalSurvey.undergroundInfrastructure.exists', false);
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '0 4px 4px 0',
                                                        border: '1px solid #d1d5db',
                                                        borderLeft: 'none',
                                                        backgroundColor: project?.environmentalSurvey?.undergroundInfrastructure?.exists === false ? '#6B46C1' : 'transparent',
                                                        color: project?.environmentalSurvey?.undergroundInfrastructure?.exists === false ? 'white' : '#6B46C1',
                                                        '&:hover': {
                                                            backgroundColor: project?.environmentalSurvey?.undergroundInfrastructure?.exists === false ? '#5B21B6' : '#f3f4f6',
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
                                                        handleNestedFieldChange('environmentalSurvey.undergroundInfrastructure.exists', true);
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '4px 0 0 4px',
                                                        border: '1px solid #d1d5db',
                                                        backgroundColor: project?.environmentalSurvey?.undergroundInfrastructure?.exists === true ? '#6B46C1' : 'transparent',
                                                        color: project?.environmentalSurvey?.undergroundInfrastructure?.exists === true ? 'white' : '#6B46C1',
                                                        '&:hover': {
                                                            backgroundColor: project?.environmentalSurvey?.undergroundInfrastructure?.exists === true ? '#5B21B6' : '#f3f4f6',
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
                                                גני ילדים בסביבה
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
                                                        handleNestedFieldChange('environmentalSurvey.kindergartens.exists', false);
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '0 4px 4px 0',
                                                        border: '1px solid #d1d5db',
                                                        borderLeft: 'none',
                                                        backgroundColor: project?.environmentalSurvey?.kindergartens?.exists === false ? '#6B46C1' : 'transparent',
                                                        color: project?.environmentalSurvey?.kindergartens?.exists === false ? 'white' : '#6B46C1',
                                                        '&:hover': {
                                                            backgroundColor: project?.environmentalSurvey?.kindergartens?.exists === false ? '#5B21B6' : '#f3f4f6',
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
                                                        handleNestedFieldChange('environmentalSurvey.kindergartens.exists', true);
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '4px 0 0 4px',
                                                        border: '1px solid #d1d5db',
                                                        backgroundColor: project?.environmentalSurvey?.kindergartens?.exists === true ? '#6B46C1' : 'transparent',
                                                        color: project?.environmentalSurvey?.kindergartens?.exists === true ? 'white' : '#6B46C1',
                                                        '&:hover': {
                                                            backgroundColor: project?.environmentalSurvey?.kindergartens?.exists === true ? '#5B21B6' : '#f3f4f6',
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
                                                פרויקט על רכס הר
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
                                                        handleNestedFieldChange('environmentalSurvey.onMountainRidge', false);
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '0 4px 4px 0',
                                                        border: '1px solid #d1d5db',
                                                        borderLeft: 'none',
                                                        backgroundColor: project?.environmentalSurvey?.onMountainRidge === false ? '#6B46C1' : 'transparent',
                                                        color: project?.environmentalSurvey?.onMountainRidge === false ? 'white' : '#6B46C1',
                                                        '&:hover': {
                                                            backgroundColor: project?.environmentalSurvey?.onMountainRidge === false ? '#5B21B6' : '#f3f4f6',
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
                                                        handleNestedFieldChange('environmentalSurvey.onMountainRidge', true);
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '4px 0 0 4px',
                                                        border: '1px solid #d1d5db',
                                                        backgroundColor: project?.environmentalSurvey?.onMountainRidge === true ? '#6B46C1' : 'transparent',
                                                        color: project?.environmentalSurvey?.onMountainRidge === true ? 'white' : '#6B46C1',
                                                        '&:hover': {
                                                            backgroundColor: project?.environmentalSurvey?.onMountainRidge === true ? '#5B21B6' : '#f3f4f6',
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
                                                פרויקט בואדי
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
                                                        handleNestedFieldChange('environmentalSurvey.inValley', false);
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '0 4px 4px 0',
                                                        border: '1px solid #d1d5db',
                                                        borderLeft: 'none',
                                                        backgroundColor: project?.environmentalSurvey?.inValley === false ? '#6B46C1' : 'transparent',
                                                        color: project?.environmentalSurvey?.inValley === false ? 'white' : '#6B46C1',
                                                        '&:hover': {
                                                            backgroundColor: project?.environmentalSurvey?.inValley === false ? '#5B21B6' : '#f3f4f6',
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
                                                        handleNestedFieldChange('environmentalSurvey.inValley', true);
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '4px 0 0 4px',
                                                        border: '1px solid #d1d5db',
                                                        backgroundColor: project?.environmentalSurvey?.inValley === true ? '#6B46C1' : 'transparent',
                                                        color: project?.environmentalSurvey?.inValley === true ? 'white' : '#6B46C1',
                                                        '&:hover': {
                                                            backgroundColor: project?.environmentalSurvey?.inValley === true ? '#5B21B6' : '#f3f4f6',
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

                                        <TextField
                                            fullWidth
                                            label="מרחק מתחנת דלק (ק״מ)"
                                            type="number"
                                            value={project?.environmentalSurvey?.distanceFromGasStation || ''}
                                            onChange={(e) => handleNestedFieldChange('environmentalSurvey.distanceFromGasStation', parseFloat(e.target.value) || 0)}
                                            disabled={mode === 'view' || !canEdit}
                                            inputProps={{ min: 0, max: 200 }}
                                        />

                                        {/* טבלת מרחקים לשירותי חירום */}
                                        <Box sx={{ gridColumn: '1 / -1', mb: 2 }}>
                                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                                שירותי חירום
                                            </Typography>
                                            <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', fontSize: '0.875rem' }}>תחום</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', fontSize: '0.875rem' }}>שם</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', fontSize: '0.875rem' }}>טלפון</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', fontSize: '0.875rem' }}>מרחק (ק״מ)</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', fontSize: '0.875rem' }}>זמן נסיעה (דק׳)</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        <TableRow>
                                                            <TableCell sx={{ padding: 1, textAlign: 'right' }}>
                                                                <Typography variant="body2">משטרה</Typography>
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1 }}>
                                                                <TextField
                                                                    fullWidth
                                                                    size="small"
                                                                    value={project?.environmentalSurvey?.policeStationName || ''}
                                                                    onChange={(e) => handleNestedFieldChange('environmentalSurvey.policeStationName', e.target.value)}
                                                                    disabled={mode === 'view' || !canEdit}
                                                                    variant="outlined"
                                                                    placeholder="שם התחנה"
                                                                    sx={{
                                                                        '& .MuiOutlinedInput-root': {
                                                                            height: 40,
                                                                            '& fieldset': { borderColor: '#e0e0e0' },
                                                                            '&:hover fieldset': { borderColor: '#bdbdbd' },
                                                                            '&.Mui-focused fieldset': { borderColor: '#6B46C1' }
                                                                        }
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1 }}>
                                                                <TextField
                                                                    fullWidth
                                                                    size="small"
                                                                    value={project?.environmentalSurvey?.policeStationPhone || ''}
                                                                    onChange={(e) => handleNestedFieldChange('environmentalSurvey.policeStationPhone', e.target.value)}
                                                                    disabled={mode === 'view' || !canEdit}
                                                                    variant="outlined"
                                                                    placeholder="טלפון"
                                                                    sx={{
                                                                        '& .MuiOutlinedInput-root': {
                                                                            height: 40,
                                                                            '& fieldset': { borderColor: '#e0e0e0' },
                                                                            '&:hover fieldset': { borderColor: '#bdbdbd' },
                                                                            '&.Mui-focused fieldset': { borderColor: '#6B46C1' }
                                                                        }
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1 }}>
                                                                <TextField
                                                                    fullWidth
                                                                    size="small"
                                                                    type="number"
                                                                    value={project?.environmentalSurvey?.distanceFromPoliceStation || ''}
                                                                    onChange={(e) => handleNestedFieldChange('environmentalSurvey.distanceFromPoliceStation', parseFloat(e.target.value) || 0)}
                                                                    disabled={mode === 'view' || !canEdit}
                                                                    variant="outlined"
                                                                    inputProps={{ min: 0, max: 200, step: 0.1 }}
                                                                    sx={{
                                                                        '& .MuiOutlinedInput-root': {
                                                                            height: 40,
                                                                            '& fieldset': { borderColor: '#e0e0e0' },
                                                                            '&:hover fieldset': { borderColor: '#bdbdbd' },
                                                                            '&.Mui-focused fieldset': { borderColor: '#6B46C1' }
                                                                        }
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1 }}>
                                                                <TextField
                                                                    fullWidth
                                                                    size="small"
                                                                    type="number"
                                                                    value={project?.environmentalSurvey?.policeStationTravelTime || ''}
                                                                    onChange={(e) => handleNestedFieldChange('environmentalSurvey.policeStationTravelTime', parseFloat(e.target.value) || 0)}
                                                                    disabled={mode === 'view' || !canEdit}
                                                                    variant="outlined"
                                                                    inputProps={{ min: 0, max: 200, step: 1 }}
                                                                    sx={{
                                                                        '& .MuiOutlinedInput-root': {
                                                                            height: 40,
                                                                            '& fieldset': { borderColor: '#e0e0e0' },
                                                                            '&:hover fieldset': { borderColor: '#bdbdbd' },
                                                                            '&.Mui-focused fieldset': { borderColor: '#6B46C1' }
                                                                        }
                                                                    }}
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell sx={{ padding: 1, textAlign: 'right' }}>
                                                                <Typography variant="body2">לוחמי אש</Typography>
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1 }}>
                                                                <TextField
                                                                    fullWidth
                                                                    size="small"
                                                                    value={project?.environmentalSurvey?.fireStationName || ''}
                                                                    onChange={(e) => handleNestedFieldChange('environmentalSurvey.fireStationName', e.target.value)}
                                                                    disabled={mode === 'view' || !canEdit}
                                                                    variant="outlined"
                                                                    placeholder="שם התחנה"
                                                                    sx={{
                                                                        '& .MuiOutlinedInput-root': {
                                                                            height: 40,
                                                                            '& fieldset': { borderColor: '#e0e0e0' },
                                                                            '&:hover fieldset': { borderColor: '#bdbdbd' },
                                                                            '&.Mui-focused fieldset': { borderColor: '#6B46C1' }
                                                                        }
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1 }}>
                                                                <TextField
                                                                    fullWidth
                                                                    size="small"
                                                                    value={project?.environmentalSurvey?.fireStationPhone || ''}
                                                                    onChange={(e) => handleNestedFieldChange('environmentalSurvey.fireStationPhone', e.target.value)}
                                                                    disabled={mode === 'view' || !canEdit}
                                                                    variant="outlined"
                                                                    placeholder="טלפון"
                                                                    sx={{
                                                                        '& .MuiOutlinedInput-root': {
                                                                            height: 40,
                                                                            '& fieldset': { borderColor: '#e0e0e0' },
                                                                            '&:hover fieldset': { borderColor: '#bdbdbd' },
                                                                            '&.Mui-focused fieldset': { borderColor: '#6B46C1' }
                                                                        }
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1 }}>
                                                                <TextField
                                                                    fullWidth
                                                                    size="small"
                                                                    type="number"
                                                                    value={project?.environmentalSurvey?.distanceFromFireStation || ''}
                                                                    onChange={(e) => handleNestedFieldChange('environmentalSurvey.distanceFromFireStation', parseFloat(e.target.value) || 0)}
                                                                    disabled={mode === 'view' || !canEdit}
                                                                    variant="outlined"
                                                                    inputProps={{ min: 0, max: 200, step: 0.1 }}
                                                                    sx={{
                                                                        '& .MuiOutlinedInput-root': {
                                                                            height: 40,
                                                                            '& fieldset': { borderColor: '#e0e0e0' },
                                                                            '&:hover fieldset': { borderColor: '#bdbdbd' },
                                                                            '&.Mui-focused fieldset': { borderColor: '#6B46C1' }
                                                                        }
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1 }}>
                                                                <TextField
                                                                    fullWidth
                                                                    size="small"
                                                                    type="number"
                                                                    value={project?.environmentalSurvey?.fireStationTravelTime || ''}
                                                                    onChange={(e) => handleNestedFieldChange('environmentalSurvey.fireStationTravelTime', parseFloat(e.target.value) || 0)}
                                                                    disabled={mode === 'view' || !canEdit}
                                                                    variant="outlined"
                                                                    inputProps={{ min: 0, max: 200, step: 1 }}
                                                                    sx={{
                                                                        '& .MuiOutlinedInput-root': {
                                                                            height: 40,
                                                                            '& fieldset': { borderColor: '#e0e0e0' },
                                                                            '&:hover fieldset': { borderColor: '#bdbdbd' },
                                                                            '&.Mui-focused fieldset': { borderColor: '#6B46C1' }
                                                                        }
                                                                    }}
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell sx={{ padding: 1, textAlign: 'right' }}>
                                                                <Typography variant="body2">מד״א</Typography>
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1 }}>
                                                                <TextField
                                                                    fullWidth
                                                                    size="small"
                                                                    value={project?.environmentalSurvey?.medicalCenterName || ''}
                                                                    onChange={(e) => handleNestedFieldChange('environmentalSurvey.medicalCenterName', e.target.value)}
                                                                    disabled={mode === 'view' || !canEdit}
                                                                    variant="outlined"
                                                                    placeholder="שם המרכז"
                                                                    sx={{
                                                                        '& .MuiOutlinedInput-root': {
                                                                            height: 40,
                                                                            '& fieldset': { borderColor: '#e0e0e0' },
                                                                            '&:hover fieldset': { borderColor: '#bdbdbd' },
                                                                            '&.Mui-focused fieldset': { borderColor: '#6B46C1' }
                                                                        }
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1 }}>
                                                                <TextField
                                                                    fullWidth
                                                                    size="small"
                                                                    value={project?.environmentalSurvey?.medicalCenterPhone || ''}
                                                                    onChange={(e) => handleNestedFieldChange('environmentalSurvey.medicalCenterPhone', e.target.value)}
                                                                    disabled={mode === 'view' || !canEdit}
                                                                    variant="outlined"
                                                                    placeholder="טלפון"
                                                                    sx={{
                                                                        '& .MuiOutlinedInput-root': {
                                                                            height: 40,
                                                                            '& fieldset': { borderColor: '#e0e0e0' },
                                                                            '&:hover fieldset': { borderColor: '#bdbdbd' },
                                                                            '&.Mui-focused fieldset': { borderColor: '#6B46C1' }
                                                                        }
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1 }}>
                                                                <TextField
                                                                    fullWidth
                                                                    size="small"
                                                                    type="number"
                                                                    value={project?.environmentalSurvey?.distanceFromMedicalCenter || ''}
                                                                    onChange={(e) => handleNestedFieldChange('environmentalSurvey.distanceFromMedicalCenter', parseFloat(e.target.value) || 0)}
                                                                    disabled={mode === 'view' || !canEdit}
                                                                    variant="outlined"
                                                                    inputProps={{ min: 0, max: 200, step: 0.1 }}
                                                                    sx={{
                                                                        '& .MuiOutlinedInput-root': {
                                                                            height: 40,
                                                                            '& fieldset': { borderColor: '#e0e0e0' },
                                                                            '&:hover fieldset': { borderColor: '#bdbdbd' },
                                                                            '&.Mui-focused fieldset': { borderColor: '#6B46C1' }
                                                                        }
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1 }}>
                                                                <TextField
                                                                    fullWidth
                                                                    size="small"
                                                                    type="number"
                                                                    value={project?.environmentalSurvey?.medicalCenterTravelTime || ''}
                                                                    onChange={(e) => handleNestedFieldChange('environmentalSurvey.medicalCenterTravelTime', parseFloat(e.target.value) || 0)}
                                                                    disabled={mode === 'view' || !canEdit}
                                                                    variant="outlined"
                                                                    inputProps={{ min: 0, max: 200, step: 1 }}
                                                                    sx={{
                                                                        '& .MuiOutlinedInput-root': {
                                                                            height: 40,
                                                                            '& fieldset': { borderColor: '#e0e0e0' },
                                                                            '&:hover fieldset': { borderColor: '#bdbdbd' },
                                                                            '&.Mui-focused fieldset': { borderColor: '#6B46C1' }
                                                                        }
                                                                    }}
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </Box>
                                    </Box>
                                </Box>

                                {/* חוות דעת הידרולוג */}
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                        הידרולוג
                                    </Typography>

                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 3, mb: 3 }}>
                                        <FileUpload
                                            label="העלאת קובץ חוות דעת הידרולוג"
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
                                    </Box>

                                    {/* Row 1: 2 fields */}
                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3, mb: 3 }}>
                                        {/* תוכנית טיפול במי נגר */}
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
                                                תוכנית טיפול במי נגר
                                            </Typography>
                                            <Box sx={{
                                                display: 'flex',
                                                gap: 0,
                                                alignItems: 'center',
                                                justifyContent: 'flex-start'
                                            }}>
                                                <Button
                                                    variant="text"
                                                    onClick={() => {
                                                        handleNestedFieldChange('hydrologicalPlan.runoffTreatmentPlan', false);
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '0 4px 4px 0',
                                                        border: '1px solid #d1d5db',
                                                        borderLeft: 'none',
                                                        backgroundColor: project?.hydrologicalPlan?.runoffTreatmentPlan === false ? '#6B46C1' : 'transparent',
                                                        color: project?.hydrologicalPlan?.runoffTreatmentPlan === false ? 'white' : '#6B46C1',
                                                        '&:hover': {
                                                            backgroundColor: project?.hydrologicalPlan?.runoffTreatmentPlan === false ? '#5B21B6' : '#f3f4f6',
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
                                                        handleNestedFieldChange('hydrologicalPlan.runoffTreatmentPlan', true);
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '4px 0 0 4px',
                                                        border: '1px solid #d1d5db',
                                                        backgroundColor: project?.hydrologicalPlan?.runoffTreatmentPlan === true ? '#6B46C1' : 'transparent',
                                                        color: project?.hydrologicalPlan?.runoffTreatmentPlan === true ? 'white' : '#6B46C1',
                                                        '&:hover': {
                                                            backgroundColor: project?.hydrologicalPlan?.runoffTreatmentPlan === true ? '#5B21B6' : '#f3f4f6',
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
                                                הכניסות מנוגדות לזרימת המים
                                            </Typography>
                                            <Box sx={{
                                                display: 'flex',
                                                gap: 0,
                                                alignItems: 'center',
                                                justifyContent: 'flex-start'
                                            }}>
                                                <Button
                                                    variant="text"
                                                    onClick={() => {
                                                        handleNestedFieldChange('hydrologicalPlan.entrancesOppositeWaterFlow', false);
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '0 4px 4px 0',
                                                        border: '1px solid #d1d5db',
                                                        borderLeft: 'none',
                                                        backgroundColor: project?.hydrologicalPlan?.entrancesOppositeWaterFlow === false ? '#6B46C1' : 'transparent',
                                                        color: project?.hydrologicalPlan?.entrancesOppositeWaterFlow === false ? 'white' : '#6B46C1',
                                                        '&:hover': {
                                                            backgroundColor: project?.hydrologicalPlan?.entrancesOppositeWaterFlow === false ? '#5B21B6' : '#f3f4f6',
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
                                                        handleNestedFieldChange('hydrologicalPlan.entrancesOppositeWaterFlow', true);
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '4px 0 0 4px',
                                                        border: '1px solid #d1d5db',
                                                        backgroundColor: project?.hydrologicalPlan?.entrancesOppositeWaterFlow === true ? '#6B46C1' : 'transparent',
                                                        color: project?.hydrologicalPlan?.entrancesOppositeWaterFlow === true ? 'white' : '#6B46C1',
                                                        '&:hover': {
                                                            backgroundColor: project?.hydrologicalPlan?.entrancesOppositeWaterFlow === true ? '#5B21B6' : '#f3f4f6',
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

                                    {/* Row 2: 1 field */}
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 3, mb: 3 }}>
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
                                                משאבות זמינות במקרה הצפה
                                            </Typography>
                                            <Box sx={{
                                                display: 'flex',
                                                gap: 0,
                                                alignItems: 'center',
                                                justifyContent: 'flex-start'
                                            }}>
                                                <Button
                                                    variant="text"
                                                    onClick={() => {
                                                        handleNestedFieldChange('hydrologicalPlan.basementPumpsAvailable', false);
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '0 4px 4px 0',
                                                        border: '1px solid #d1d5db',
                                                        borderLeft: 'none',
                                                        backgroundColor: project?.hydrologicalPlan?.basementPumpsAvailable === false ? '#6B46C1' : 'transparent',
                                                        color: project?.hydrologicalPlan?.basementPumpsAvailable === false ? 'white' : '#6B46C1',
                                                        '&:hover': {
                                                            backgroundColor: project?.hydrologicalPlan?.basementPumpsAvailable === false ? '#5B21B6' : '#f3f4f6',
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
                                                        handleNestedFieldChange('hydrologicalPlan.basementPumpsAvailable', true);
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '4px 0 0 4px',
                                                        border: '1px solid #d1d5db',
                                                        backgroundColor: project?.hydrologicalPlan?.basementPumpsAvailable === true ? '#6B46C1' : 'transparent',
                                                        color: project?.hydrologicalPlan?.basementPumpsAvailable === true ? 'white' : '#6B46C1',
                                                        '&:hover': {
                                                            backgroundColor: project?.hydrologicalPlan?.basementPumpsAvailable === true ? '#5B21B6' : '#f3f4f6',
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

                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3, mb: 3 }}>
                                        <TextField
                                            fullWidth
                                            label="אמצעים מתוכננים"
                                            value={project?.hydrologicalPlan?.plannedMeasures || ''}
                                            onChange={(e) => handleNestedFieldChange('hydrologicalPlan.plannedMeasures', e.target.value)}
                                            disabled={mode === 'view' || !canEdit}
                                            multiline
                                            rows={3}
                                        />
                                    </Box>
                                </Box>

                                {/* תוכנית ניקוז לאתר */}
                                <Box sx={{ mb: 4 }}>
                                </Box>

                                {/* לוחות זמנים */}
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                        לוחות זמנים
                                    </Typography>

                                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3, mb: 3 }}>
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
                                                קיים לוח זמנים לפרויקט
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
                                                        handleNestedFieldChange('schedule.exists', false);
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '0 4px 4px 0',
                                                        border: '1px solid #d1d5db',
                                                        borderLeft: 'none',
                                                        backgroundColor: project?.schedule?.exists === false ? '#6B46C1' : 'transparent',
                                                        color: project?.schedule?.exists === false ? 'white' : '#6B46C1',
                                                        '&:hover': {
                                                            backgroundColor: project?.schedule?.exists === false ? '#5B21B6' : '#f3f4f6',
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
                                                        handleNestedFieldChange('schedule.exists', true);
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '4px 0 0 4px',
                                                        border: '1px solid #d1d5db',
                                                        backgroundColor: project?.schedule?.exists === true ? '#6B46C1' : 'transparent',
                                                        color: project?.schedule?.exists === true ? 'white' : '#6B46C1',
                                                        '&:hover': {
                                                            backgroundColor: project?.schedule?.exists === true ? '#5B21B6' : '#f3f4f6',
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
                                                    <InputLabel>רמת הפירוט</InputLabel>
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
                                {console.log('🔍 Rendering FileUpload with:', {
                                    value: project?.siteOrganizationPlan?.file,
                                    thumbnailUrl: project?.siteOrganizationPlan?.thumbnailUrl,
                                    siteOrganizationPlan: project?.siteOrganizationPlan,
                                    fileUploadState: fileUploadState.siteOrganizationPlan,
                                    finalValue: fileUploadState.siteOrganizationPlan?.url || project?.siteOrganizationPlan?.file,
                                    finalThumbnailUrl: fileUploadState.siteOrganizationPlan?.thumbnailUrl || project?.siteOrganizationPlan?.thumbnailUrl,
                                    finalCreationDate: fileUploadState.siteOrganizationPlan?.creationDate || project?.siteOrganizationPlan?.fileCreationDate || ''
                                })}
                                
                                {/* Display clickable text if file exists */}
                                {fileUploadState.siteOrganizationPlan?.url && (
                                    <Box sx={{ mb: 2 }}>
                                        <Typography 
                                            variant="body2" 
                                            sx={{ 
                                                color: 'primary.main', 
                                                cursor: 'pointer',
                                                textDecoration: 'underline',
                                                '&:hover': {
                                                    color: 'primary.dark'
                                                }
                                            }}
                                            onClick={() => window.open(fileUploadState.siteOrganizationPlan?.url, '_blank')}
                                        >
                                            תוכנית התארגנות אתר - לחץ לצפייה
                                        </Typography>
                                    </Box>
                                )}
                                
                                <FileUpload
                                    label="תוכנית התארגנות אתר"
                                    value={fileUploadState.siteOrganizationPlan?.url || project?.siteOrganizationPlan?.file}
                                    thumbnailUrl={fileUploadState.siteOrganizationPlan?.thumbnailUrl || project?.siteOrganizationPlan?.thumbnailUrl}
                                    onChange={(url, thumbnailUrl) => {
                                        console.log('🔄 FileUpload onChange called with:', { url, thumbnailUrl });
                                        
                                        // Update fileUploadState immediately for UI display
                                        setFileUploadState(prev => {
                                            const newState = {
                                                ...prev,
                                                siteOrganizationPlan: {
                                                    ...prev.siteOrganizationPlan,
                                                    url: url,
                                                    thumbnailUrl: thumbnailUrl
                                                }
                                            };
                                            console.log('🔄 Updated fileUploadState:', newState);
                                            return newState;
                                        });
                                        
                                        // Also try to update project state (may fail if project is null)
                                        handleNestedFieldChange('siteOrganizationPlan.file', url);
                                        if (thumbnailUrl) {
                                            handleNestedFieldChange('siteOrganizationPlan.thumbnailUrl', thumbnailUrl);
                                        }
                                    }}
                                    onDelete={() => {
                                        handleNestedFieldChange('siteOrganizationPlan.file', '');
                                        handleNestedFieldChange('siteOrganizationPlan.thumbnailUrl', '');
                                        setFileUploadState(prev => ({
                                            ...prev,
                                            siteOrganizationPlan: undefined
                                        }));
                                    }}
                                    disabled={mode === 'view' || !canEdit}
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    showCreationDate={true}
                                    creationDateValue={fileUploadState.siteOrganizationPlan?.creationDate || project?.siteOrganizationPlan?.fileCreationDate || ''}
                                    onCreationDateChange={(date) => {
                                        console.log('🔄 FileUpload onCreationDateChange called with:', date);
                                        
                                        // Update fileUploadState immediately for UI display
                                        setFileUploadState(prev => {
                                            const newState = {
                                                ...prev,
                                                siteOrganizationPlan: {
                                                    ...prev.siteOrganizationPlan,
                                                    creationDate: date
                                                }
                                            };
                                            console.log('🔄 Updated fileUploadState with creation date:', newState);
                                            return newState;
                                        });
                                        
                                        // Also try to update project state (may fail if project is null)
                                        handleNestedFieldChange('siteOrganizationPlan.fileCreationDate', date);
                                    }}
                                    projectId={project?._id || project?.id}
                                />
                            </Box>
                        )}

                        {activeTab === 3 && (
                            <Box>
                                <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
                                    ביטוח
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    ניהול מסמכים יוצג כאן בעתיד...
                                </Typography>
                            </Box>
                        )}

                        {activeTab === 4 && (
                            <Box>
                                <Typography variant="h5" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
                                    הרשאות
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    ניהול הרשאות יוצג כאן בעתיד...
                                </Typography>
                            </Box>
                        )}

                        {activeTab === 5 && (
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

                        {activeTab === 6 && (project?.status === 'current' || project?.status === 'completed') && (
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
