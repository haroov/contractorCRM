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
    Autocomplete,
    Checkbox,
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
    Edit as EditIcon,
    TableChart as ExcelIcon
} from '@mui/icons-material';
import type { Project, Stakeholder, Subcontractor } from '../types/contractor';
import SkeletonLoader from './SkeletonLoader';
import trashIconUrl from '../assets/icon-trash.svg';
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

// Import the generic FileUpload component
import FileUpload from './FileUpload';


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
            <TableContainer component={Paper} sx={{ border: '1px solid #e0e0e0', overflow: 'auto', maxWidth: '100%' }}>
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
        console.log('🔄 addPlot called, current plotDetails:', plotDetails);
        const newPlotDetails = [...plotDetails, { block: '', plot: '', subPlot: '', area: '' }];
        console.log('🔄 new plotDetails:', newPlotDetails);
        onPlotDetailsChange(newPlotDetails);
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
    const displayPlotDetails = plotDetails.length > 0 ? plotDetails : [{ block: '', plot: '', subPlot: '', area: '' }];

    return (
        <Box>
            <TableContainer component={Paper} sx={{ border: '1px solid #e0e0e0', borderRadius: 1, overflow: 'auto', maxWidth: '100%' }}>
                <Table size="small" sx={{ minWidth: 400 }}>
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
                                                    borderColor: '#6b47c1'
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
                                                    borderColor: '#6b47c1'
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
                                                    borderColor: '#6b47c1'
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
                                                    borderColor: '#6b47c1'
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
                                                    backgroundColor: 'error.main',
                                                    '& img': {
                                                        filter: 'brightness(0) invert(1)'
                                                    }
                                                },
                                                '&:focus': {
                                                    color: 'white',
                                                    backgroundColor: 'error.main',
                                                    '& img': {
                                                        filter: 'brightness(0) invert(1)'
                                                    }
                                                },
                                                '& img': {
                                                    filter: 'brightness(0) saturate(0)'
                                                }
                                            }}
                                            title="מחיקה"
                                        >
                                            <img
                                                src="/assets/icon-trash.svg"
                                                alt="מחק"
                                                style={{
                                                    width: '16px',
                                                    height: '16px'
                                                }}
                                            />
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
                                        onClick={addPlot}
                                        disabled={disabled}
                                        variant="outlined"
                                        sx={{
                                            borderColor: '#6b47c1',
                                            color: '#6b47c1',
                                            '&:hover': {
                                                borderColor: '#5a3aa1',
                                                backgroundColor: '#f3e5f5'
                                            }
                                        }}
                                    >
                                        + הוספה
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

    // Format currency with commas and shekel symbol on the left
    const formatCurrency = (value: number): string => {
        if (!value || value === 0) return '';
        return '₪ ' + value.toLocaleString('he-IL');
    };
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [fileUploadState, setFileUploadState] = useState<{ [key: string]: { url: string; thumbnailUrl?: string; creationDate?: string } }>({});
    const [loadingCompanyData, setLoadingCompanyData] = useState<{ [key: string]: boolean }>({});
    const [expandedSubcontractors, setExpandedSubcontractors] = useState<{ [key: number]: boolean }>({});
    const [mode, setMode] = useState<'view' | 'edit' | 'new'>('view');
    const [activeTab, setActiveTab] = useState(0);
    const [claimsFilterTab, setClaimsFilterTab] = useState(0);
    const [claims, setClaims] = useState<any[]>([]);
    const [loadingClaims, setLoadingClaims] = useState(false);
    const [bankNames, setBankNames] = useState<string[]>([
        'בנק הפועלים',
        'בנק לאומי',
        'בנק דיסקונט',
        'בנק מזרחי טפחות',
        'בנק יהב',
        'בנק אוצר החייל',
        'בנק ירושלים',
        'בנק מסד',
        'בנק אגוד',
        'בנק פועלי אגודת ישראל',
        'בנק מרכנתיל דיסקונט',
        'בנק אדנים',
        'בנק הבינלאומי הראשון',
        'בנק ישראל',
        'הבנק הבינלאומי',
        'בנק אוניון',
        'בנק פאג',
        'בנק אקספרס',
        'בנק איגוד'
    ]);
    const [bankBranches, setBankBranches] = useState<{ [bankName: string]: string[] }>({
        'בנק הפועלים': ['001', '002', '003', '004', '005', '010', '011', '012', '013', '014', '015', '020', '021', '022', '023', '024', '025', '030', '031', '032', '033', '034', '035', '040', '041', '042', '043', '044', '045', '050', '051', '052', '053', '054', '055', '060', '061', '062', '063', '064', '065', '070', '071', '072', '073', '074', '075', '080', '081', '082', '083', '084', '085', '090', '091', '092', '093', '094', '095', '100', '101', '102', '103', '104', '105', '110', '111', '112', '113', '114', '115', '120', '121', '122', '123', '124', '125', '130', '131', '132', '133', '134', '135', '140', '141', '142', '143', '144', '145', '150', '151', '152', '153', '154', '155', '160', '161', '162', '163', '164', '165', '170', '171', '172', '173', '174', '175', '180', '181', '182', '183', '184', '185', '190', '191', '192', '193', '194', '195', '200', '201', '202', '203', '204', '205', '210', '211', '212', '213', '214', '215', '220', '221', '222', '223', '224', '225', '230', '231', '232', '233', '234', '235', '240', '241', '242', '243', '244', '245', '250', '251', '252', '253', '254', '255', '260', '261', '262', '263', '264', '265', '270', '271', '272', '273', '274', '275', '280', '281', '282', '283', '284', '285', '290', '291', '292', '293', '294', '295', '300', '301', '302', '303', '304', '305', '310', '311', '312', '313', '314', '315', '320', '321', '322', '323', '324', '325', '330', '331', '332', '333', '334', '335', '340', '341', '342', '343', '344', '345', '350', '351', '352', '353', '354', '355', '360', '361', '362', '363', '364', '365', '370', '371', '372', '373', '374', '375', '380', '381', '382', '383', '384', '385', '390', '391', '392', '393', '394', '395', '400', '401', '402', '403', '404', '405', '410', '411', '412', '413', '414', '415', '420', '421', '422', '423', '424', '425', '430', '431', '432', '433', '434', '435', '440', '441', '442', '443', '444', '445', '450', '451', '452', '453', '454', '455', '460', '461', '462', '463', '464', '465', '470', '471', '472', '473', '474', '475', '480', '481', '482', '483', '484', '485', '490', '491', '492', '493', '494', '495', '500', '501', '502', '503', '504', '505', '510', '511', '512', '513', '514', '515', '520', '521', '522', '523', '524', '525', '530', '531', '532', '533', '534', '535', '540', '541', '542', '543', '544', '545', '550', '551', '552', '553', '554', '555', '560', '561', '562', '563', '564', '565', '570', '571', '572', '573', '574', '575', '580', '581', '582', '583', '584', '585', '590', '591', '592', '593', '594', '595', '600', '601', '602', '603', '604', '605', '610', '611', '612', '613', '614', '615', '620', '621', '622', '623', '624', '625', '630', '631', '632', '633', '634', '635', '640', '641', '642', '643', '644', '645', '650', '651', '652', '653', '654', '655', '660', '661', '662', '663', '664', '665', '670', '671', '672', '673', '674', '675', '680', '681', '682', '683', '684', '685', '690', '691', '692', '693', '694', '695', '700', '701', '702', '703', '704', '705', '710', '711', '712', '713', '714', '715', '720', '721', '722', '723', '724', '725', '730', '731', '732', '733', '734', '735', '740', '741', '742', '743', '744', '745', '750', '751', '752', '753', '754', '755', '760', '761', '762', '763', '764', '765', '770', '771', '772', '773', '774', '775', '780', '781', '782', '783', '784', '785', '790', '791', '792', '793', '794', '795', '800', '801', '802', '803', '804', '805', '810', '811', '812', '813', '814', '815', '820', '821', '822', '823', '824', '825', '830', '831', '832', '833', '834', '835', '840', '841', '842', '843', '844', '845', '850', '851', '852', '853', '854', '855', '860', '861', '862', '863', '864', '865', '870', '871', '872', '873', '874', '875', '880', '881', '882', '883', '884', '885', '890', '891', '892', '893', '894', '895', '900', '901', '902', '903', '904', '905', '910', '911', '912', '913', '914', '915', '920', '921', '922', '923', '924', '925', '930', '931', '932', '933', '934', '935', '940', '941', '942', '943', '944', '945', '950', '951', '952', '953', '954', '955', '960', '961', '962', '963', '964', '965', '970', '971', '972', '973', '974', '975', '980', '981', '982', '983', '984', '985', '990', '991', '992', '993', '994', '995'],
        'בנק לאומי': ['001', '002', '003', '004', '005', '010', '011', '012', '013', '014', '015', '020', '021', '022', '023', '024', '025', '030', '031', '032', '033', '034', '035', '040', '041', '042', '043', '044', '045', '050', '051', '052', '053', '054', '055', '060', '061', '062', '063', '064', '065', '070', '071', '072', '073', '074', '075', '080', '081', '082', '083', '084', '085', '090', '091', '092', '093', '094', '095', '100', '101', '102', '103', '104', '105', '110', '111', '112', '113', '114', '115', '120', '121', '122', '123', '124', '125', '130', '131', '132', '133', '134', '135', '140', '141', '142', '143', '144', '145', '150', '151', '152', '153', '154', '155', '160', '161', '162', '163', '164', '165', '170', '171', '172', '173', '174', '175', '180', '181', '182', '183', '184', '185', '190', '191', '192', '193', '194', '195', '200', '201', '202', '203', '204', '205', '210', '211', '212', '213', '214', '215', '220', '221', '222', '223', '224', '225', '230', '231', '232', '233', '234', '235', '240', '241', '242', '243', '244', '245', '250', '251', '252', '253', '254', '255', '260', '261', '262', '263', '264', '265', '270', '271', '272', '273', '274', '275', '280', '281', '282', '283', '284', '285', '290', '291', '292', '293', '294', '295', '300', '301', '302', '303', '304', '305', '310', '311', '312', '313', '314', '315', '320', '321', '322', '323', '324', '325', '330', '331', '332', '333', '334', '335', '340', '341', '342', '343', '344', '345', '350', '351', '352', '353', '354', '355', '360', '361', '362', '363', '364', '365', '370', '371', '372', '373', '374', '375', '380', '381', '382', '383', '384', '385', '390', '391', '392', '393', '394', '395', '400', '401', '402', '403', '404', '405', '410', '411', '412', '413', '414', '415', '420', '421', '422', '423', '424', '425', '430', '431', '432', '433', '434', '435', '440', '441', '442', '443', '444', '445', '450', '451', '452', '453', '454', '455', '460', '461', '462', '463', '464', '465', '470', '471', '472', '473', '474', '475', '480', '481', '482', '483', '484', '485', '490', '491', '492', '493', '494', '495', '500', '501', '502', '503', '504', '505', '510', '511', '512', '513', '514', '515', '520', '521', '522', '523', '524', '525', '530', '531', '532', '533', '534', '535', '540', '541', '542', '543', '544', '545', '550', '551', '552', '553', '554', '555', '560', '561', '562', '563', '564', '565', '570', '571', '572', '573', '574', '575', '580', '581', '582', '583', '584', '585', '590', '591', '592', '593', '594', '595', '600', '601', '602', '603', '604', '605', '610', '611', '612', '613', '614', '615', '620', '621', '622', '623', '624', '625', '630', '631', '632', '633', '634', '635', '640', '641', '642', '643', '644', '645', '650', '651', '652', '653', '654', '655', '660', '661', '662', '663', '664', '665', '670', '671', '672', '673', '674', '675', '680', '681', '682', '683', '684', '685', '690', '691', '692', '693', '694', '695', '700', '701', '702', '703', '704', '705', '710', '711', '712', '713', '714', '715', '720', '721', '722', '723', '724', '725', '730', '731', '732', '733', '734', '735', '740', '741', '742', '743', '744', '745', '750', '751', '752', '753', '754', '755', '760', '761', '762', '763', '764', '765', '770', '771', '772', '773', '774', '775', '780', '781', '782', '783', '784', '785', '790', '791', '792', '793', '794', '795', '800', '801', '802', '803', '804', '805', '810', '811', '812', '813', '814', '815', '820', '821', '822', '823', '824', '825', '830', '831', '832', '833', '834', '835', '840', '841', '842', '843', '844', '845', '850', '851', '852', '853', '854', '855', '860', '861', '862', '863', '864', '865', '870', '871', '872', '873', '874', '875', '880', '881', '882', '883', '884', '885', '890', '891', '892', '893', '894', '895', '900', '901', '902', '903', '904', '905', '910', '911', '912', '913', '914', '915', '920', '921', '922', '923', '924', '925', '930', '931', '932', '933', '934', '935', '940', '941', '942', '943', '944', '945', '950', '951', '952', '953', '954', '955', '960', '961', '962', '963', '964', '965', '970', '971', '972', '973', '974', '975', '980', '981', '982', '983', '984', '985', '990', '991', '992', '993', '994', '995'],
        'בנק דיסקונט': ['001', '002', '003', '004', '005', '010', '011', '012', '013', '014', '015', '020', '021', '022', '023', '024', '025', '030', '031', '032', '033', '034', '035', '040', '041', '042', '043', '044', '045', '050', '051', '052', '053', '054', '055', '060', '061', '062', '063', '064', '065', '070', '071', '072', '073', '074', '075', '080', '081', '082', '083', '084', '085', '090', '091', '092', '093', '094', '095', '100', '101', '102', '103', '104', '105', '110', '111', '112', '113', '114', '115', '120', '121', '122', '123', '124', '125', '130', '131', '132', '133', '134', '135', '140', '141', '142', '143', '144', '145', '150', '151', '152', '153', '154', '155', '160', '161', '162', '163', '164', '165', '170', '171', '172', '173', '174', '175', '180', '181', '182', '183', '184', '185', '190', '191', '192', '193', '194', '195', '200', '201', '202', '203', '204', '205', '210', '211', '212', '213', '214', '215', '220', '221', '222', '223', '224', '225', '230', '231', '232', '233', '234', '235', '240', '241', '242', '243', '244', '245', '250', '251', '252', '253', '254', '255', '260', '261', '262', '263', '264', '265', '270', '271', '272', '273', '274', '275', '280', '281', '282', '283', '284', '285', '290', '291', '292', '293', '294', '295', '300', '301', '302', '303', '304', '305', '310', '311', '312', '313', '314', '315', '320', '321', '322', '323', '324', '325', '330', '331', '332', '333', '334', '335', '340', '341', '342', '343', '344', '345', '350', '351', '352', '353', '354', '355', '360', '361', '362', '363', '364', '365', '370', '371', '372', '373', '374', '375', '380', '381', '382', '383', '384', '385', '390', '391', '392', '393', '394', '395', '400', '401', '402', '403', '404', '405', '410', '411', '412', '413', '414', '415', '420', '421', '422', '423', '424', '425', '430', '431', '432', '433', '434', '435', '440', '441', '442', '443', '444', '445', '450', '451', '452', '453', '454', '455', '460', '461', '462', '463', '464', '465', '470', '471', '472', '473', '474', '475', '480', '481', '482', '483', '484', '485', '490', '491', '492', '493', '494', '495', '500', '501', '502', '503', '504', '505', '510', '511', '512', '513', '514', '515', '520', '521', '522', '523', '524', '525', '530', '531', '532', '533', '534', '535', '540', '541', '542', '543', '544', '545', '550', '551', '552', '553', '554', '555', '560', '561', '562', '563', '564', '565', '570', '571', '572', '573', '574', '575', '580', '581', '582', '583', '584', '585', '590', '591', '592', '593', '594', '595', '600', '601', '602', '603', '604', '605', '610', '611', '612', '613', '614', '615', '620', '621', '622', '623', '624', '625', '630', '631', '632', '633', '634', '635', '640', '641', '642', '643', '644', '645', '650', '651', '652', '653', '654', '655', '660', '661', '662', '663', '664', '665', '670', '671', '672', '673', '674', '675', '680', '681', '682', '683', '684', '685', '690', '691', '692', '693', '694', '695', '700', '701', '702', '703', '704', '705', '710', '711', '712', '713', '714', '715', '720', '721', '722', '723', '724', '725', '730', '731', '732', '733', '734', '735', '740', '741', '742', '743', '744', '745', '750', '751', '752', '753', '754', '755', '760', '761', '762', '763', '764', '765', '770', '771', '772', '773', '774', '775', '780', '781', '782', '783', '784', '785', '790', '791', '792', '793', '794', '795', '800', '801', '802', '803', '804', '805', '810', '811', '812', '813', '814', '815', '820', '821', '822', '823', '824', '825', '830', '831', '832', '833', '834', '835', '840', '841', '842', '843', '844', '845', '850', '851', '852', '853', '854', '855', '860', '861', '862', '863', '864', '865', '870', '871', '872', '873', '874', '875', '880', '881', '882', '883', '884', '885', '890', '891', '892', '893', '894', '895', '900', '901', '902', '903', '904', '905', '910', '911', '912', '913', '914', '915', '920', '921', '922', '923', '924', '925', '930', '931', '932', '933', '934', '935', '940', '941', '942', '943', '944', '945', '950', '951', '952', '953', '954', '955', '960', '961', '962', '963', '964', '965', '970', '971', '972', '973', '974', '975', '980', '981', '982', '983', '984', '985', '990', '991', '992', '993', '994', '995']
    });
    const [branchDetails, setBranchDetails] = useState<{ [key: string]: { address: string, amount: string } }>({
        'בנק הפועלים_001': { address: 'רחוב הרצל 1, תל אביב', amount: '' },
        'בנק הפועלים_002': { address: 'רחוב דיזנגוף 100, תל אביב', amount: '' },
        'בנק הפועלים_003': { address: 'רחוב אלנבי 50, תל אביב', amount: '' },
        'בנק לאומי_001': { address: 'רחוב רוטשילד 1, תל אביב', amount: '' },
        'בנק לאומי_002': { address: 'רחוב בן יהודה 100, תל אביב', amount: '' },
        'בנק לאומי_003': { address: 'רחוב הרצל 50, תל אביב', amount: '' },
        'בנק דיסקונט_001': { address: 'רחוב הרצל 1, תל אביב', amount: '' },
        'בנק דיסקונט_002': { address: 'רחוב דיזנגוף 100, תל אביב', amount: '' },
        'בנק דיסקונט_003': { address: 'רחוב אלנבי 50, תל אביב', amount: '' }
    });
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
    const canEdit = !isContactUser || contactUserPermissions === 'contactAdmin' || contactUserPermissions === 'systemAdmin';

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
                    contractorName: contractorName,
                    // Initialize arrays to prevent map errors
                    stakeholders: [],
                    subcontractors: [],
                    buildings: [],
                    plotDetails: [],
                    budgetEstimate: [],
                    budgetAllocation: [],
                    supervisorReports: [],
                    policyDocuments: [],
                    insuranceSpecification: {
                        propertyPledge: {
                            pledgers: []
                        }
                    }
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
                                    // Initialize arrays to prevent map errors
                                    stakeholders: projectData.stakeholders || [],
                                    subcontractors: projectData.subcontractors || [],
                                    buildings: projectData.buildings || [],
                                    plotDetails: projectData.plotDetails || [],
                                    budgetEstimate: projectData.budgetEstimate || [],
                                    budgetAllocation: projectData.budgetAllocation || [],
                                    supervisorReports: projectData.supervisorReports || [],
                                    policyDocuments: projectData.policyDocuments || [],
                                    insuranceSpecification: {
                                        ...projectData.insuranceSpecification,
                                        propertyPledge: {
                                            ...projectData.insuranceSpecification?.propertyPledge,
                                            pledgers: projectData.insuranceSpecification?.propertyPledge?.pledgers || []
                                        }
                                    },
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
                                // Initialize arrays to prevent map errors
                                const projectDataWithArrays = {
                                    ...projectData,
                                    stakeholders: projectData.stakeholders || [],
                                    subcontractors: projectData.subcontractors || [],
                                    buildings: projectData.buildings || [],
                                    plotDetails: projectData.plotDetails || [],
                                    budgetEstimate: projectData.budgetEstimate || [],
                                    budgetAllocation: projectData.budgetAllocation || [],
                                    supervisorReports: projectData.supervisorReports || [],
                                    policyDocuments: projectData.policyDocuments || [],
                                    insuranceSpecification: {
                                        ...projectData.insuranceSpecification,
                                        propertyPledge: {
                                            ...projectData.insuranceSpecification?.propertyPledge,
                                            pledgers: projectData.insuranceSpecification?.propertyPledge?.pledgers || []
                                        }
                                    }
                                };
                                setProject(projectDataWithArrays);

                                // Update exists fields automatically based on file presence
                                const updatedProjectData = {
                                    ...projectDataWithArrays,
                                    engineeringQuestionnaire: {
                                        ...projectDataWithArrays.engineeringQuestionnaire,
                                        buildingPlan: {
                                            ...projectDataWithArrays.engineeringQuestionnaire?.buildingPlan,
                                            buildingPermit: {
                                                ...projectDataWithArrays.engineeringQuestionnaire?.buildingPlan?.buildingPermit,
                                                exists: !!projectDataWithArrays.engineeringQuestionnaire?.buildingPlan?.buildingPermit?.file
                                            },
                                            excavationPermit: {
                                                ...projectDataWithArrays.engineeringQuestionnaire?.buildingPlan?.excavationPermit,
                                                exists: !!projectDataWithArrays.engineeringQuestionnaire?.buildingPlan?.excavationPermit?.file
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

    // Update fileUploadState when project data is loaded
    useEffect(() => {
        if (project) {
            console.log('🔄 Updating fileUploadState with project data:', project);
            setFileUploadState(prev => ({
                ...prev,
                siteOrganizationPlan: {
                    url: project.siteOrganizationPlan?.file || '',
                    thumbnailUrl: project.siteOrganizationPlan?.thumbnailUrl || '',
                    creationDate: project.siteOrganizationPlan?.fileCreationDate || ''
                },
                garmoshka: {
                    url: project.garmoshka?.file || '',
                    thumbnailUrl: project.garmoshka?.thumbnailUrl || '',
                    creationDate: project.garmoshka?.fileCreationDate || ''
                },
                buildingPermit: {
                    url: project.engineeringQuestionnaire?.buildingPlan?.buildingPermit?.file || '',
                    thumbnailUrl: project.engineeringQuestionnaire?.buildingPlan?.buildingPermit?.thumbnailUrl || '',
                    creationDate: project.engineeringQuestionnaire?.buildingPlan?.buildingPermit?.fileCreationDate || ''
                },
                excavationPermit: {
                    url: project.engineeringQuestionnaire?.buildingPlan?.excavationPermit?.file || '',
                    thumbnailUrl: project.engineeringQuestionnaire?.buildingPlan?.excavationPermit?.thumbnailUrl || '',
                    creationDate: project.engineeringQuestionnaire?.buildingPlan?.excavationPermit?.fileCreationDate || ''
                },
                insuranceSpecification: {
                    url: project.insuranceSpecification?.file || '',
                    thumbnailUrl: project.insuranceSpecification?.thumbnailUrl || '',
                    creationDate: project.insuranceSpecification?.fileCreationDate || ''
                },
                insuranceContractClause: {
                    url: project.insuranceContractClause?.file || '',
                    thumbnailUrl: project.insuranceContractClause?.thumbnailUrl || '',
                    creationDate: project.insuranceContractClause?.fileCreationDate || ''
                },
                proposalForm: {
                    url: project.proposalForm?.file || '',
                    thumbnailUrl: project.proposalForm?.thumbnailUrl || '',
                    creationDate: project.proposalForm?.fileCreationDate || ''
                },
            }));
        }
    }, [project]);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
        // Save active tab to URL parameters
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('tab', newValue.toString());
        navigate(`?${newSearchParams.toString()}`, { replace: true });
    };

    const handleClaimsFilterTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setClaimsFilterTab(newValue);
    };

    const loadClaims = async () => {
        if (!project?._id && !project?.id) return;

        setLoadingClaims(true);
        try {
            const projectId = project._id || project.id;
            console.log('Loading claims for project:', projectId);
            const response = await fetch(`https://contractorcrm-api.onrender.com/api/claims/project/${projectId}`);
            if (response.ok) {
                const data = await response.json();
                console.log('Loaded claims:', data.claims);
                setClaims(data.claims || []);
            } else {
                console.error('Failed to load claims:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error loading claims:', error);
        } finally {
            setLoadingClaims(false);
        }
    };

    const handleDeleteClaim = async (claimId: string) => {
        console.log('Attempting to delete claim:', claimId);

        // Use native browser confirmation dialog
        const confirmed = window.confirm('האם אתה בטוח שברצונך למחוק את התביעה?');

        if (!confirmed) {
            console.log('User cancelled deletion');
            return; // User cancelled
        }

        try {
            console.log('Sending DELETE request for claim:', claimId);
            const response = await fetch(`https://contractorcrm-api.onrender.com/api/claims/${claimId}`, {
                method: 'DELETE'
            });

            console.log('Delete response status:', response.status);

            if (response.ok) {
                console.log('Claim deleted successfully');

                // Remove claim from project's claimsId array
                if (project && (project._id || project.id)) {
                    const projectId = project._id || project.id;
                    console.log('Updating project claimsId array');

                    // Handle claimsId as array or string
                    let claimsIdArray = [];
                    if (project.claimsId) {
                        if (Array.isArray(project.claimsId)) {
                            claimsIdArray = project.claimsId;
                        } else if (typeof project.claimsId === 'string' && project.claimsId.trim() !== '') {
                            claimsIdArray = [project.claimsId];
                        }
                    }

                    // Remove the deleted claim ID
                    const updatedClaimsId = claimsIdArray.filter((id: string) => id !== claimId);

                    await fetch(`https://contractorcrm-api.onrender.com/api/projects/${projectId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            claimsId: updatedClaimsId
                        })
                    });
                }

                // Remove claim from local state immediately
                setClaims(prevClaims => prevClaims.filter(claim => claim._id !== claimId));

                setSnackbarMessage('התביעה נמחקה בהצלחה');
                setSnackbarSeverity('success');
                setSnackbarOpen(true);
            } else {
                const errorData = await response.json();
                console.error('Delete failed:', response.status, errorData);
                throw new Error(`Failed to delete claim: ${response.status} ${errorData.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error deleting claim:', error);
            setSnackbarMessage('שגיאה במחיקת התביעה');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleOpenClaimDialog = () => {
        // Navigate to claim form in the same window
        const projectId = project?._id || project?.id;
        if (projectId) {
            const claimUrl = `/claim-form?projectId=${projectId}&projectName=${encodeURIComponent(project?.projectName || '')}`;
            navigate(claimUrl);
        }
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
        // Always try to update, even if project is null
        setProject(prevProject => {
            // If prevProject is null, create a basic project structure
            if (!prevProject) {
                prevProject = {
                    id: '',
                    projectName: '',
                    description: '',
                    startDate: '',
                    durationMonths: 0,
                    valueNis: 0,
                    city: '',
                    isClosed: false,
                    status: 'current',
                    mainContractor: '',
                    engineeringQuestionnaire: {
                        buildingPlan: {}
                    }
                };
            }

            // Deep clone the project to ensure React detects the change
            const newProject = JSON.parse(JSON.stringify(prevProject));
            const keys = fieldPath.split('.');
            let current: any = newProject;

            // Navigate to the parent object, creating arrays when encountering numeric indices
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                const nextKey = keys[i + 1];
                const keyIsIndex = /^\d+$/.test(key);
                const nextIsIndex = /^\d+$/.test(nextKey);

                if (!keyIsIndex) {
                    if (current[key] === undefined) {
                        // If the next key is a numeric index, initialize as an array; otherwise initialize as an object
                        current[key] = nextIsIndex ? [] : {};
                    } else if (nextIsIndex && !Array.isArray(current[key])) {
                        // Ensure correct container type if it already exists
                        current[key] = [];
                    }
                    current = current[key];
                } else {
                    // key refers to an array index on the current container
                    const idx = Number(key);
                    if (!Array.isArray(current)) {
                        // If somehow current isn't an array, convert the container shape for this branch
                        // Note: this only affects this path and preserves other keys
                        const tmp: any[] = [];
                        Object.assign(tmp, current);
                        current = tmp as any;
                    }
                    if (current[idx] === undefined) {
                        current[idx] = nextIsIndex ? [] : {};
                    } else if (nextIsIndex && !Array.isArray(current[idx])) {
                        current[idx] = [];
                    }
                    current = current[idx];
                }
            }

            // Set the final value (supporting numeric indices at the leaf as well)
            const lastKey = keys[keys.length - 1];
            if (/^\d+$/.test(lastKey)) {
                const idx = Number(lastKey);
                if (!Array.isArray(current)) {
                    const tmp: any[] = [];
                    Object.assign(tmp, current);
                    current = tmp as any;
                }
                current[idx] = value;
            } else {
                current[lastKey] = value;
            }
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
            } else if (fieldPath === 'garmoshka.file' && value) {
                console.log('🔄 Updating fileUploadState with garmoshka file URL:', value);
                setFileUploadState(prev => {
                    const newState = {
                        ...prev,
                        garmoshka: {
                            ...prev.garmoshka,
                            url: value
                        }
                    };
                    console.log('🔄 New fileUploadState:', newState);
                    return newState;
                });
            } else if (fieldPath === 'garmoshka.thumbnailUrl' && value) {
                console.log('🔄 Updating fileUploadState with garmoshka thumbnail URL:', value);
                setFileUploadState(prev => {
                    const newState = {
                        ...prev,
                        garmoshka: {
                            ...prev.garmoshka,
                            thumbnailUrl: value
                        }
                    };
                    console.log('🔄 New fileUploadState:', newState);
                    return newState;
                });
            } else if (fieldPath === 'garmoshka.fileCreationDate' && value) {
                console.log('🔄 Updating fileUploadState with garmoshka creation date:', value);
                setFileUploadState(prev => {
                    const newState = {
                        ...prev,
                        garmoshka: {
                            ...prev.garmoshka,
                            creationDate: value
                        }
                    };
                    console.log('🔄 New fileUploadState:', newState);
                    return newState;
                });
            } else if (fieldPath === 'engineeringQuestionnaire.buildingPlan.buildingPermit.file' && value) {
                console.log('🔄 Updating fileUploadState with buildingPermit file URL:', value);
                setFileUploadState(prev => {
                    const newState = {
                        ...prev,
                        buildingPermit: {
                            ...prev.buildingPermit,
                            url: value
                        }
                    };
                    console.log('🔄 New fileUploadState:', newState);
                    return newState;
                });
            } else if (fieldPath === 'engineeringQuestionnaire.buildingPlan.buildingPermit.thumbnailUrl' && value) {
                console.log('🔄 Updating fileUploadState with buildingPermit thumbnail URL:', value);
                setFileUploadState(prev => {
                    const newState = {
                        ...prev,
                        buildingPermit: {
                            ...prev.buildingPermit,
                            thumbnailUrl: value
                        }
                    };
                    console.log('🔄 New fileUploadState:', newState);
                    return newState;
                });
            } else if (fieldPath === 'engineeringQuestionnaire.buildingPlan.buildingPermit.fileCreationDate' && value) {
                console.log('🔄 Updating fileUploadState with buildingPermit creation date:', value);
                setFileUploadState(prev => {
                    const newState = {
                        ...prev,
                        buildingPermit: {
                            ...prev.buildingPermit,
                            creationDate: value
                        }
                    };
                    console.log('🔄 New fileUploadState:', newState);
                    return newState;
                });
            } else if (fieldPath === 'engineeringQuestionnaire.buildingPlan.excavationPermit.file' && value) {
                console.log('🔄 Updating fileUploadState with excavationPermit file URL:', value);
                setFileUploadState(prev => {
                    const newState = {
                        ...prev,
                        excavationPermit: {
                            ...prev.excavationPermit,
                            url: value
                        }
                    };
                    console.log('🔄 New fileUploadState:', newState);
                    return newState;
                });
            } else if (fieldPath === 'engineeringQuestionnaire.buildingPlan.excavationPermit.thumbnailUrl' && value) {
                console.log('🔄 Updating fileUploadState with excavationPermit thumbnail URL:', value);
                setFileUploadState(prev => {
                    const newState = {
                        ...prev,
                        excavationPermit: {
                            ...prev.excavationPermit,
                            thumbnailUrl: value
                        }
                    };
                    console.log('🔄 New fileUploadState:', newState);
                    return newState;
                });
            } else if (fieldPath === 'engineeringQuestionnaire.buildingPlan.excavationPermit.fileCreationDate' && value) {
                console.log('🔄 Updating fileUploadState with excavationPermit creation date:', value);
                setFileUploadState(prev => {
                    const newState = {
                        ...prev,
                        excavationPermit: {
                            ...prev.excavationPermit,
                            creationDate: value
                        }
                    };
                    console.log('🔄 New fileUploadState:', newState);
                    return newState;
                });
            } else if (fieldPath === 'insuranceSpecification.file' && value) {
                console.log('🔄 Updating fileUploadState with insuranceSpecification file URL:', value);
                setFileUploadState(prev => {
                    const newState = {
                        ...prev,
                        insuranceSpecification: {
                            ...prev.insuranceSpecification,
                            url: value
                        }
                    };
                    console.log('🔄 New fileUploadState:', newState);
                    return newState;
                });
            } else if (fieldPath === 'insuranceSpecification.thumbnailUrl' && value) {
                console.log('🔄 Updating fileUploadState with insuranceSpecification thumbnail URL:', value);
                setFileUploadState(prev => {
                    const newState = {
                        ...prev,
                        insuranceSpecification: {
                            ...prev.insuranceSpecification,
                            thumbnailUrl: value
                        }
                    };
                    console.log('🔄 New fileUploadState:', newState);
                    return newState;
                });
            } else if (fieldPath === 'insuranceSpecification.fileCreationDate' && value) {
                console.log('🔄 Updating fileUploadState with insuranceSpecification creation date:', value);
                setFileUploadState(prev => {
                    const newState = {
                        ...prev,
                        insuranceSpecification: {
                            ...prev.insuranceSpecification,
                            creationDate: value
                        }
                    };
                    console.log('🔄 New fileUploadState:', newState);
                    return newState;
                });
            } else if (fieldPath === 'insuranceContractClause.file' && value) {
                console.log('🔄 Updating fileUploadState with insuranceContractClause file URL:', value);
                setFileUploadState(prev => {
                    const newState = {
                        ...prev,
                        insuranceContractClause: {
                            ...prev.insuranceContractClause,
                            url: value
                        }
                    };
                    console.log('🔄 New fileUploadState:', newState);
                    return newState;
                });
            } else if (fieldPath === 'insuranceContractClause.thumbnailUrl' && value) {
                console.log('🔄 Updating fileUploadState with insuranceContractClause thumbnail URL:', value);
                setFileUploadState(prev => {
                    const newState = {
                        ...prev,
                        insuranceContractClause: {
                            ...prev.insuranceContractClause,
                            thumbnailUrl: value
                        }
                    };
                    console.log('🔄 New fileUploadState:', newState);
                    return newState;
                });
            } else if (fieldPath === 'insuranceContractClause.fileCreationDate' && value) {
                console.log('🔄 Updating fileUploadState with insuranceContractClause creation date:', value);
                setFileUploadState(prev => {
                    const newState = {
                        ...prev,
                        insuranceContractClause: {
                            ...prev.insuranceContractClause,
                            creationDate: value
                        }
                    };
                    console.log('🔄 New fileUploadState:', newState);
                    return newState;
                });
            } else if (fieldPath === 'proposalForm.file' && value) {
                console.log('🔄 Updating fileUploadState with proposalForm file URL:', value);
                setFileUploadState(prev => {
                    const newState = {
                        ...prev,
                        proposalForm: {
                            ...prev.proposalForm,
                            url: value
                        }
                    };
                    console.log('🔄 New fileUploadState:', newState);
                    return newState;
                });
            } else if (fieldPath === 'proposalForm.thumbnailUrl' && value) {
                console.log('🔄 Updating fileUploadState with proposalForm thumbnail URL:', value);
                setFileUploadState(prev => {
                    const newState = {
                        ...prev,
                        proposalForm: {
                            ...prev.proposalForm,
                            thumbnailUrl: value
                        }
                    };
                    console.log('🔄 New fileUploadState:', newState);
                    return newState;
                });
            } else if (fieldPath === 'proposalForm.fileCreationDate' && value) {
                console.log('🔄 Updating fileUploadState with proposalForm creation date:', value);
                setFileUploadState(prev => {
                    const newState = {
                        ...prev,
                        proposalForm: {
                            ...prev.proposalForm,
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

    const toggleSubcontractorExpansion = (index: number) => {
        setExpandedSubcontractors(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
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

    // Load claims when project is loaded
    useEffect(() => {
        if (project && (project._id || project.id)) {
            loadClaims();
        }
    }, [project]);

    // Load bank names and branches from enrichment data
    useEffect(() => {
        const loadBankData = async () => {
            try {
                console.log('🔄 Loading bank data from /api/enrichment/banks');
                const response = await fetch('/api/enrichment/banks');
                console.log('🔄 Response status:', response.status);
                if (response.ok) {
                    const banks = await response.json();
                    console.log('🔄 Banks data:', banks);
                    const bankNamesList = banks.map((bank: any) => bank.bank_name).filter(Boolean);
                    console.log('🔄 Bank names list:', bankNamesList);
                    setBankNames(bankNamesList);

                    // Create branches mapping and branch details
                    const branchesMap: { [bankName: string]: string[] } = {};
                    const detailsMap: { [key: string]: { address: string, email: string } } = {};
                    banks.forEach((bank: any) => {
                        if (bank.bank_name && bank.branch_number) {
                            if (!branchesMap[bank.bank_name]) {
                                branchesMap[bank.bank_name] = [];
                            }
                            branchesMap[bank.bank_name].push(bank.branch_number);

                            // Create unique key for branch details
                            const branchKey = `${bank.bank_name}_${bank.branch_number}`;
                            // Only add if we have actual data
                            if (bank.address) {
                                detailsMap[branchKey] = {
                                    address: bank.address || '',
                                    amount: '' // Amount is manual input, not from database
                                };
                            }
                        }
                    });
                    setBankBranches(branchesMap);
                    setBranchDetails(detailsMap);
                    console.log('🔄 Bank branches map:', branchesMap);
                    console.log('🔄 Branch details map:', detailsMap);
                } else {
                    console.error('🔄 Failed to load banks, status:', response.status);
                    const errorText = await response.text();
                    console.error('🔄 Error response:', errorText);
                }
            } catch (error) {
                console.error('Error loading bank data:', error);
            }
        };
        loadBankData();
    }, []);

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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Left side - Logo and title */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
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
            <Box sx={{ p: 2 }}>
                <Paper elevation={1} sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
                    {/* Project Header and Tabs - Combined Sticky */}
                    <Box sx={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
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
                            color: 'black',
                            flexWrap: 'wrap',
                            gap: 1
                        }}>
                            <Typography variant="h6" sx={{ fontWeight: 500, color: 'black', wordBreak: 'break-word', maxWidth: '60%' }}>
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
                                                    borderColor: '#6b47c1', // סגול שוקו
                                                    color: '#6b47c1',
                                                    '&:hover': {
                                                        borderColor: '#5a3aa1',
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
                                                    bgcolor: '#6b47c1',
                                                    '&:hover': {
                                                        bgcolor: '#5a3aa1'
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
                                                    borderColor: '#6b47c1', // סגול שוקו
                                                    color: '#6b47c1',
                                                    '&:hover': {
                                                        borderColor: '#5a3aa1',
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
                                                    bgcolor: '#6b47c1',
                                                    '&:hover': {
                                                        bgcolor: '#5a3aa1'
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
                                variant="scrollable"
                                scrollButtons="auto"
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
                                }}
                            >
                                <Tab label="כללי" />
                                <Tab label="תוכניות" />
                                <Tab label="פיננסים" />
                                <Tab label="ביטוח" />
                                <Tab label="תביעות" />
                                {(project?.status === 'current' || project?.status === 'completed') && (
                                    <Tab label="דשבורד" />
                                )}
                            </Tabs>
                        </Box>
                    </Box>

                    {/* Tab Content */}
                    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, pb: { xs: 3, sm: 4, md: 6 }, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', width: '100%', maxWidth: '100%' }}>
                        {activeTab === 0 && (
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 }, flex: 1, bgcolor: 'white', p: { xs: 1, sm: 2 }, borderRadius: 1 }}>
                                    {/* Row 1: שם הפרויקט, עיר */}
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: { xs: 2, sm: 3 } }}>
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
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: { xs: 2, sm: 3 } }}>
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
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: { xs: 2, sm: 3 } }}>
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


                                        <TableContainer component={Paper} sx={{ overflow: 'auto', maxWidth: '100%', boxShadow: 'none', border: 'none' }}>
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
                                                                                    borderColor: '#6b47c1',
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
                                                                                borderColor: '#6b47c1',
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
                                                                                color: '#6b47c1',
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
                                                                            borderColor: '#6b47c1',
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
                                                                            borderColor: '#6b47c1',
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
                                                                            borderColor: '#6b47c1',
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
                                                                                    color: '#6b47c1',
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
                                                                                    backgroundColor: 'error.main',
                                                                                    '& img': {
                                                                                        filter: 'brightness(0) invert(1)'
                                                                                    }
                                                                                },
                                                                                '&:focus': {
                                                                                    color: 'white',
                                                                                    backgroundColor: 'error.main',
                                                                                    '& img': {
                                                                                        filter: 'brightness(0) invert(1)'
                                                                                    }
                                                                                }
                                                                            }}
                                                                            title="מחק בעל עניין"
                                                                        >
                                                                            <img
                                                                                src="/assets/icon-trash.svg"
                                                                                alt="מחק"
                                                                                style={{
                                                                                    width: '16px',
                                                                                    height: '16px',
                                                                                    filter: 'brightness(0) saturate(100%) invert(40%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(86%)'
                                                                                }}
                                                                            />
                                                                        </IconButton>
                                                                    )}
                                                                </Box>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}

                                                    {/* Add button row */}
                                                    <TableRow>
                                                        <TableCell colSpan={6} sx={{ textAlign: 'center', py: 2 }}>
                                                            <Button
                                                                variant="outlined"
                                                                onClick={addStakeholder}
                                                                disabled={mode === 'view' || !canEdit}
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
                                </Box>

                            </Box>
                        )}

                        {/* Role Holders Section */}
                        {activeTab === 0 && (
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', mb: 3 }}>
                                <Box sx={{
                                    display: 'grid',
                                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(300px, 1fr))' },
                                    gap: { xs: 2, sm: 3 },
                                    p: 3,
                                    backgroundColor: 'white',
                                }}>
                                    {/* Role Holders Table */}
                                    <Box sx={{ gridColumn: '1 / -1', mt: 2 }}>
                                        <Typography variant="h6" gutterBottom sx={{ color: 'text.secondary', mb: 2 }}>
                                            בעלי תפקיד
                                        </Typography>

                                        <TableContainer component={Paper} sx={{ overflow: 'auto', maxWidth: '100%', boxShadow: 'none', border: 'none' }}>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                                                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#374151', textAlign: 'right', minWidth: '150px' }}>
                                                            תפקיד
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#374151', textAlign: 'right' }}>
                                                            שם מלא
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#374151', textAlign: 'right' }}>
                                                            טלפון נייד
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
                                                    {/* Default mandatory roles */}
                                                    <TableRow sx={{ '&:hover': { backgroundColor: '#F9FAFB' } }}>
                                                        <TableCell>
                                                            <TextField
                                                                fullWidth
                                                                variant="outlined"
                                                                size="small"
                                                                value="מנהל העבודה"
                                                                disabled
                                                                sx={{
                                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                        borderColor: '#6b47c1',
                                                                    },
                                                                    '& .MuiInputBase-input.Mui-disabled': {
                                                                        color: 'text.primary',
                                                                        WebkitTextFillColor: 'unset'
                                                                    }
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <TextField
                                                                fullWidth
                                                                variant="outlined"
                                                                size="small"
                                                                value={project?.roleHolders?.[0]?.fullName || ''}
                                                                onChange={(e) => handleNestedFieldChange(`roleHolders.0.fullName`, e.target.value)}
                                                                disabled={mode === 'view' || !canEdit}
                                                                placeholder="שם מלא"
                                                                sx={{
                                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                        borderColor: '#6b47c1',
                                                                    },
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <TextField
                                                                fullWidth
                                                                variant="outlined"
                                                                size="small"
                                                                value={project?.roleHolders?.[0]?.mobilePhone || ''}
                                                                onChange={(e) => handleNestedFieldChange(`roleHolders.0.mobilePhone`, e.target.value)}
                                                                disabled={mode === 'view' || !canEdit}
                                                                placeholder="טלפון נייד"
                                                                sx={{
                                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                        borderColor: '#6b47c1',
                                                                    },
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <TextField
                                                                fullWidth
                                                                variant="outlined"
                                                                size="small"
                                                                value={project?.roleHolders?.[0]?.email || ''}
                                                                onChange={(e) => handleNestedFieldChange(`roleHolders.0.email`, e.target.value)}
                                                                disabled={mode === 'view' || !canEdit}
                                                                placeholder="אימייל"
                                                                sx={{
                                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                        borderColor: '#6b47c1',
                                                                    },
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            {/* No delete button for mandatory role */}
                                                        </TableCell>
                                                    </TableRow>
                                                    <TableRow sx={{ '&:hover': { backgroundColor: '#F9FAFB' } }}>
                                                        <TableCell>
                                                            <TextField
                                                                fullWidth
                                                                variant="outlined"
                                                                size="small"
                                                                value="עוזר בטיחות"
                                                                disabled
                                                                sx={{
                                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                        borderColor: '#6b47c1',
                                                                    },
                                                                    '& .MuiInputBase-input.Mui-disabled': {
                                                                        color: 'text.primary',
                                                                        WebkitTextFillColor: 'unset'
                                                                    }
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <TextField
                                                                fullWidth
                                                                variant="outlined"
                                                                size="small"
                                                                value={project?.roleHolders?.[1]?.fullName || ''}
                                                                onChange={(e) => handleNestedFieldChange(`roleHolders.1.fullName`, e.target.value)}
                                                                disabled={mode === 'view' || !canEdit}
                                                                placeholder="שם מלא"
                                                                sx={{
                                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                        borderColor: '#6b47c1',
                                                                    },
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <TextField
                                                                fullWidth
                                                                variant="outlined"
                                                                size="small"
                                                                value={project?.roleHolders?.[1]?.mobilePhone || ''}
                                                                onChange={(e) => handleNestedFieldChange(`roleHolders.1.mobilePhone`, e.target.value)}
                                                                disabled={mode === 'view' || !canEdit}
                                                                placeholder="טלפון נייד"
                                                                sx={{
                                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                        borderColor: '#6b47c1',
                                                                    },
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <TextField
                                                                fullWidth
                                                                variant="outlined"
                                                                size="small"
                                                                value={project?.roleHolders?.[1]?.email || ''}
                                                                onChange={(e) => handleNestedFieldChange(`roleHolders.1.email`, e.target.value)}
                                                                disabled={mode === 'view' || !canEdit}
                                                                placeholder="אימייל"
                                                                sx={{
                                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                        borderColor: '#6b47c1',
                                                                    },
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            {/* No delete button for mandatory role */}
                                                        </TableCell>
                                                    </TableRow>

                                                    {/* Additional roles */}
                                                    {project?.roleHolders && project.roleHolders.map((roleHolder, index) => (
                                                        <TableRow key={roleHolder.id} sx={{ '&:hover': { backgroundColor: '#F9FAFB' } }}>
                                                            <TableCell>
                                                                <Autocomplete
                                                                    value={roleHolder.role}
                                                                    onChange={(event, newValue) => {
                                                                        handleNestedFieldChange(`roleHolders.${index}.role`, newValue || '');
                                                                    }}
                                                                    onInputChange={(event, newInputValue) => {
                                                                        handleNestedFieldChange(`roleHolders.${index}.role`, newInputValue);
                                                                    }}
                                                                    freeSolo
                                                                    options={[
                                                                        'ממונה ביטחון',
                                                                        'מפקח',
                                                                        'מנהל פרויקט',
                                                                        'מהנדס ראשי',
                                                                        'מהנדס מבנים',
                                                                        'מהנדס חשמל',
                                                                        'מהנדס אינסטלציה',
                                                                        'מהנדס מיזוג אוויר',
                                                                        'מהנדס בטיחות',
                                                                        'מהנדס איכות',
                                                                        'מהנדס סביבה',
                                                                        'מהנדס תכנון',
                                                                        'מהנדס ביצוע',
                                                                        'מהנדס בקרה',
                                                                        'מהנדס תחזוקה',
                                                                        'מהנדס מערכות',
                                                                        'מהנדס תשתיות',
                                                                        'מהנדס תחבורה',
                                                                        'מהנדס נוף',
                                                                        'מהנדס גיאוטכני',
                                                                        'מהנדס אקוסטי',
                                                                        'מהנדס אש',
                                                                        'מהנדס אנרגיה',
                                                                        'מהנדס מים',
                                                                        'מהנדס ביוב',
                                                                        'מהנדס גז',
                                                                        'מהנדס תקשורת',
                                                                        'מהנדס אבטחה',
                                                                        'מהנדס מעליות',
                                                                        'מהנדס כיבוי',
                                                                        'מהנדס אזעקה',
                                                                        'מהנדס תאורה',
                                                                        'מהנדס ניקוז',
                                                                        'מהנדס חימום',
                                                                        'מהנדס אוורור',
                                                                        'מהנדס קירור',
                                                                        'מהנדס חימום מים',
                                                                        'מהנדס סולארי',
                                                                        'מהנדס רוח',
                                                                        'מהנדס גיאותרמי',
                                                                        'מהנדס ביוגז',
                                                                        'מהנדס מיחזור',
                                                                        'מהנדס טיהור',
                                                                        'מהנדס סינון',
                                                                        'מהנדס חיטוי',
                                                                        'מהנדס ניקוי',
                                                                        'מהנדס תחזוקה',
                                                                        'מהנדס שירות',
                                                                        'מהנדס לוגיסטיקה',
                                                                        'מהנדס אספקה',
                                                                        'מהנדס הובלה',
                                                                        'מהנדס אחסון',
                                                                        'מהנדס אריזה',
                                                                        'מהנדס סימון',
                                                                        'מהנדס זיהוי',
                                                                        'מהנדס בקרת איכות',
                                                                        'מהנדס בדיקות',
                                                                        'מהנדס ניסויים',
                                                                        'מהנדס מדידות',
                                                                        'מהנדס תיעוד',
                                                                        'מהנדס דיווח',
                                                                        'מהנדס ניתוח',
                                                                        'מהנדס הערכה',
                                                                        'מהנדס תכנון',
                                                                        'מהנדס עיצוב',
                                                                        'מהנדס פיתוח',
                                                                        'מהנדס מחקר',
                                                                        'מהנדס חדשנות',
                                                                        'מהנדס טכנולוגיה',
                                                                        'מהנדס דיגיטל',
                                                                        'מהנדס מידע',
                                                                        'מהנדס נתונים',
                                                                        'מהנדס בינה מלאכותית',
                                                                        'מהנדס למידת מכונה',
                                                                        'מהנדס רובוטיקה',
                                                                        'מהנדס אוטומציה',
                                                                        'מהנדס IoT',
                                                                        'מהנדס בלוקציין',
                                                                        'מהנדס ענן',
                                                                        'מהנדס אבטחת מידע',
                                                                        'מהנדס רשתות',
                                                                        'מהנדס תוכנה',
                                                                        'מהנדס חומרה',
                                                                        'מהנדס מערכות',
                                                                        'מהנדס אינטגרציה',
                                                                        'מהנדס בדיקות תוכנה',
                                                                        'מהנדס DevOps',
                                                                        'מהנדס CI/CD',
                                                                        'מהנדס מיקרו-שירותים',
                                                                        'מהנדס API',
                                                                        'מהנדס מסדי נתונים',
                                                                        'מהנדס ביג דאטה',
                                                                        'מהנדס אנליטיקה',
                                                                        'מהנדס BI',
                                                                        'מהנדס דשבורדים',
                                                                        'מהנדס דוחות',
                                                                        'מהנדס ויזואליזציה',
                                                                        'מהנדס UX/UI',
                                                                        'מהנדס חוויית משתמש',
                                                                        'מהנדס ממשק משתמש',
                                                                        'מהנדס נגישות',
                                                                        'מהנדס ביצועים',
                                                                        'מהנדס אופטימיזציה',
                                                                        'מהנדס קנה מידה',
                                                                        'מהנדס זמינות',
                                                                        'מהנדס אמינות',
                                                                        'מהנדס תחזוקה מונעת',
                                                                        'מהנדס תחזוקה מתקנת',
                                                                        'מהנדס תחזוקה מנבאת',
                                                                        'מהנדס תחזוקה חכמה',
                                                                        'מהנדס תחזוקה דיגיטלית',
                                                                        'מהנדס תחזוקה אוטומטית',
                                                                        'מהנדס תחזוקה רובוטית',
                                                                        'מהנדס תחזוקה מרחוק',
                                                                        'מהנדס תחזוקה מונעת AI',
                                                                        'מהנדס תחזוקה חכמה',
                                                                        'מהנדס תחזוקה דיגיטלית',
                                                                        'מהנדס תחזוקה אוטומטית',
                                                                        'מהנדס תחזוקה רובוטית',
                                                                        'מהנדס תחזוקה מרחוק',
                                                                        'מהנדס תחזוקה מונעת AI'
                                                                    ]}
                                                                    disabled={mode === 'view' || !canEdit}
                                                                    renderInput={(params) => (
                                                                        <TextField
                                                                            {...params}
                                                                            variant="outlined"
                                                                            size="small"
                                                                            placeholder="בחר תפקיד"
                                                                            sx={{
                                                                                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                                    borderColor: '#6b47c1',
                                                                                },
                                                                            }}
                                                                        />
                                                                    )}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <TextField
                                                                    fullWidth
                                                                    variant="outlined"
                                                                    size="small"
                                                                    value={roleHolder.fullName || ''}
                                                                    onChange={(e) => handleNestedFieldChange(`roleHolders.${index}.fullName`, e.target.value)}
                                                                    disabled={mode === 'view' || !canEdit}
                                                                    placeholder="שם מלא"
                                                                    sx={{
                                                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                            borderColor: '#6b47c1',
                                                                        },
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <TextField
                                                                    fullWidth
                                                                    variant="outlined"
                                                                    size="small"
                                                                    value={roleHolder.mobilePhone || ''}
                                                                    onChange={(e) => handleNestedFieldChange(`roleHolders.${index}.mobilePhone`, e.target.value)}
                                                                    disabled={mode === 'view' || !canEdit}
                                                                    placeholder="טלפון נייד"
                                                                    sx={{
                                                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                            borderColor: '#6b47c1',
                                                                        },
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <TextField
                                                                    fullWidth
                                                                    variant="outlined"
                                                                    size="small"
                                                                    value={roleHolder.email || ''}
                                                                    onChange={(e) => handleNestedFieldChange(`roleHolders.${index}.email`, e.target.value)}
                                                                    disabled={mode === 'view' || !canEdit}
                                                                    placeholder="אימייל"
                                                                    sx={{
                                                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                            borderColor: '#6b47c1',
                                                                        },
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                                    <IconButton
                                                                        onClick={() => {
                                                                            if (window.confirm('האם אתה בטוח שברצונך למחוק את בעל התפקיד?')) {
                                                                                const newRoleHolders = project?.roleHolders?.filter((_, i) => i !== index) || [];
                                                                                handleNestedFieldChange('roleHolders', newRoleHolders);
                                                                            }
                                                                        }}
                                                                        disabled={mode === 'view' || !canEdit}
                                                                        sx={{
                                                                            color: 'grey.600',
                                                                            '&:hover': {
                                                                                color: 'white',
                                                                                backgroundColor: 'error.main',
                                                                                '& img': {
                                                                                    filter: 'brightness(0) invert(1)'
                                                                                }
                                                                            },
                                                                            '&:focus': {
                                                                                color: 'white',
                                                                                backgroundColor: 'error.main',
                                                                                '& img': {
                                                                                    filter: 'brightness(0) invert(1)'
                                                                                }
                                                                            }
                                                                        }}
                                                                        title="מחק בעל תפקיד"
                                                                    >
                                                                        <img
                                                                            src="/assets/icon-trash.svg"
                                                                            alt="מחק"
                                                                            style={{
                                                                                width: '16px',
                                                                                height: '16px',
                                                                                filter: 'brightness(0) saturate(100%) invert(40%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(86%)'
                                                                            }}
                                                                        />
                                                                    </IconButton>
                                                                </Box>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}

                                                    {/* Add button row */}
                                                    <TableRow>
                                                        <TableCell colSpan={5} sx={{ textAlign: 'center', py: 2 }}>
                                                            <Button
                                                                variant="outlined"
                                                                onClick={() => {
                                                                    const newRoleHolder = {
                                                                        id: Date.now().toString(),
                                                                        role: '',
                                                                        fullName: '',
                                                                        mobilePhone: '',
                                                                        email: ''
                                                                    };
                                                                    const currentRoleHolders = project?.roleHolders || [];
                                                                    handleNestedFieldChange('roleHolders', [...currentRoleHolders, newRoleHolder]);
                                                                }}
                                                                disabled={mode === 'view' || !canEdit}
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
                                </Box>
                            </Box>
                        )}

                        {/* Subcontractors Section */}
                        {activeTab === 0 && (
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <Box sx={{
                                    display: 'grid',
                                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(300px, 1fr))' },
                                    gap: { xs: 2, sm: 3 },
                                    p: 3,
                                    backgroundColor: 'white',
                                }}>
                                    {/* Subcontractors Table */}
                                    <Box sx={{ gridColumn: '1 / -1', mt: 2 }}>
                                        <Typography variant="h6" gutterBottom sx={{ color: 'text.secondary', mb: 2 }}>
                                            קבלני משנה
                                        </Typography>

                                        <TableContainer component={Paper} sx={{ overflow: 'auto', maxWidth: '100%', boxShadow: 'none', border: 'none' }}>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                                                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#374151', textAlign: 'right', minWidth: '120px' }}>
                                                            תחום
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#374151', textAlign: 'right' }}>
                                                            ח״פ
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#374151', textAlign: 'right' }}>
                                                            שם החברה
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#374151', textAlign: 'right' }}>
                                                            עיר
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#374151', textAlign: 'right' }}>
                                                            מספר קבלן
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem', color: '#374151', width: 80, textAlign: 'right' }}>
                                                            פעולות
                                                        </TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {project.subcontractors.map((subcontractor, index) => (
                                                        <React.Fragment key={subcontractor.id}>
                                                            <TableRow sx={{ '&:hover': { backgroundColor: '#F9FAFB' } }}>
                                                                <TableCell>
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
                                                                                        borderColor: '#6b47c1',
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
                                                                            variant="outlined"
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
                                                                                    borderColor: '#6b47c1',
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
                                                                                    color: '#6b47c1',
                                                                                    verticalAlign: 'center'
                                                                                }}
                                                                            />
                                                                        )}
                                                                    </Box>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <TextField
                                                                        fullWidth
                                                                        value={subcontractor.companyName}
                                                                        onChange={(e) => handleSubcontractorChange(index, 'companyName', e.target.value)}
                                                                        disabled={mode === 'view' || !canEdit}
                                                                        variant="outlined"
                                                                        size="small"
                                                                        placeholder="שם החברה"
                                                                        inputProps={{ style: { textAlign: 'right' } }}
                                                                        sx={{
                                                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                                borderColor: '#6b47c1',
                                                                            },
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <TextField
                                                                        fullWidth
                                                                        value={subcontractor.address}
                                                                        onChange={(e) => handleSubcontractorChange(index, 'address', e.target.value)}
                                                                        disabled={mode === 'view' || !canEdit}
                                                                        variant="outlined"
                                                                        size="small"
                                                                        placeholder="עיר"
                                                                        inputProps={{ style: { textAlign: 'right' } }}
                                                                        sx={{
                                                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                                borderColor: '#6b47c1',
                                                                            },
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <TextField
                                                                        fullWidth
                                                                        value={subcontractor.companyId && subcontractor.companyId.length >= 8
                                                                            ? (subcontractor.contractorNumber || 'אינו קבלן רשום')
                                                                            : ''}
                                                                        disabled={true} // Read-only field
                                                                        variant="outlined"
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
                                                                <TableCell>
                                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                                        <IconButton
                                                                            onClick={() => toggleSubcontractorExpansion(index)}
                                                                            disabled={mode === 'view' || !canEdit}
                                                                            sx={{
                                                                                color: 'grey.600',
                                                                                '&:hover': {
                                                                                    color: '#6b47c1',
                                                                                    backgroundColor: 'rgba(107, 70, 193, 0.1)'
                                                                                }
                                                                            }}
                                                                            title={expandedSubcontractors[index] ? "סגור פרטים" : "פתח פרטים"}
                                                                        >
                                                                            <img
                                                                                src="/assets/iconArrowOpenDown.svg"
                                                                                alt={expandedSubcontractors[index] ? "סגור" : "פתח"}
                                                                                style={{
                                                                                    width: '16px',
                                                                                    height: '16px',
                                                                                    transform: expandedSubcontractors[index] ? 'rotate(180deg)' : 'rotate(0deg)',
                                                                                    transition: 'transform 0.2s ease-in-out'
                                                                                }}
                                                                            />
                                                                        </IconButton>
                                                                        <IconButton
                                                                            onClick={() => removeSubcontractor(index)}
                                                                            disabled={mode === 'view' || !canEdit}
                                                                            sx={{
                                                                                color: 'grey.600',
                                                                                '&:hover': {
                                                                                    color: 'white',
                                                                                    backgroundColor: 'error.main',
                                                                                    '& img': {
                                                                                        filter: 'brightness(0) invert(1)'
                                                                                    }
                                                                                },
                                                                                '&:focus': {
                                                                                    color: 'white',
                                                                                    backgroundColor: 'error.main',
                                                                                    '& img': {
                                                                                        filter: 'brightness(0) invert(1)'
                                                                                    }
                                                                                }
                                                                            }}
                                                                            title="מחק קבלן משנה"
                                                                        >
                                                                            <img
                                                                                src="/assets/icon-trash.svg"
                                                                                alt="מחק"
                                                                                style={{
                                                                                    width: '16px',
                                                                                    height: '16px',
                                                                                    filter: 'brightness(0) saturate(100%) invert(40%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(86%)'
                                                                                }}
                                                                            />
                                                                        </IconButton>
                                                                    </Box>
                                                                </TableCell>
                                                            </TableRow>

                                                            {/* Expanded row with agreement details */}
                                                            {expandedSubcontractors[index] && (
                                                                <TableRow>
                                                                    <TableCell colSpan={6} sx={{ padding: 2, backgroundColor: '#f8f9fa' }}>
                                                                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                                                            <Box>
                                                                                <FileUpload
                                                                                    label="הסכם התקשרות"
                                                                                    value={(subcontractor as any).agreementFile || ''}
                                                                                    thumbnailUrl={(subcontractor as any).agreementThumbnail || ''}
                                                                                    projectId={project?._id || project?.id}
                                                                                    onChange={async (url, thumbnailUrl) => {
                                                                                        handleSubcontractorChange(index, 'agreementFile' as any, url);
                                                                                        if (thumbnailUrl) {
                                                                                            handleSubcontractorChange(index, 'agreementThumbnail' as any, thumbnailUrl);
                                                                                        }
                                                                                    }}
                                                                                    onDelete={async () => {
                                                                                        if (window.confirm('האם אתה בטוח שברצונך למחוק את הסכם ההתקשרות?')) {
                                                                                            handleSubcontractorChange(index, 'agreementFile' as any, '');
                                                                                            handleSubcontractorChange(index, 'agreementThumbnail' as any, '');
                                                                                        }
                                                                                    }}
                                                                                    disabled={mode === 'view' || !canEdit}
                                                                                    showCreationDate={false}
                                                                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                                                />
                                                                            </Box>
                                                                            <Box>
                                                                                <TextField
                                                                                    fullWidth
                                                                                    label="תאריך תוקף"
                                                                                    type="date"
                                                                                    value={(subcontractor as any).agreementValidUntil || ''}
                                                                                    onChange={(e) => handleSubcontractorChange(index, 'agreementValidUntil' as any, e.target.value)}
                                                                                    disabled={mode === 'view' || !canEdit}
                                                                                    variant="outlined"
                                                                                    size="small"
                                                                                    InputLabelProps={{ shrink: true }}
                                                                                    sx={{
                                                                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                                                            borderColor: '#6b47c1',
                                                                                        },
                                                                                    }}
                                                                                />
                                                                            </Box>
                                                                        </Box>
                                                                    </TableCell>
                                                                </TableRow>
                                                            )}
                                                        </React.Fragment>
                                                    ))}

                                                    {/* Add button row */}
                                                    <TableRow>
                                                        <TableCell colSpan={6} sx={{ textAlign: 'center', py: 2 }}>
                                                            <Button
                                                                variant="outlined"
                                                                onClick={addSubcontractor}
                                                                disabled={mode === 'view' || !canEdit}
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
                                                    gap: { xs: 0.5, sm: 1 },
                                                    direction: 'rtl',
                                                    justifyContent: 'flex-start'
                                                }}>
                                                    {/* File Upload Icon */}
                                                    <FileUpload
                                                        label="תוכניות (גרמושקה)"
                                                        value={fileUploadState.garmoshka?.url || project?.garmoshka?.file || ''}
                                                        thumbnailUrl={fileUploadState.garmoshka?.thumbnailUrl || project?.garmoshka?.thumbnailUrl || ''}
                                                        projectId={project?._id || project?.id}
                                                        onChange={async (url, thumbnailUrl) => {
                                                            console.log('🔄 Garmoshka FileUpload onChange called with:', { url, thumbnailUrl });

                                                            // Update fileUploadState immediately for UI display
                                                            setFileUploadState(prev => {
                                                                const newState = {
                                                                    ...prev,
                                                                    garmoshka: {
                                                                        ...prev.garmoshka,
                                                                        url: url,
                                                                        thumbnailUrl: thumbnailUrl,
                                                                        creationDate: prev.garmoshka?.creationDate || new Date().toISOString().split('T')[0]
                                                                    }
                                                                };
                                                                console.log('🔄 Updated garmoshka fileUploadState:', newState);
                                                                return newState;
                                                            });

                                                            // Save to database immediately if we have a project ID
                                                            if (project?._id || project?.id) {
                                                                try {
                                                                    console.log('💾 Saving garmoshka file data to database immediately...');
                                                                    const { projectsAPI } = await import('../services/api');

                                                                    const updateData = {
                                                                        'garmoshka.file': url,
                                                                        'garmoshka.thumbnailUrl': thumbnailUrl || '',
                                                                        'garmoshka.fileCreationDate': fileUploadState.garmoshka?.creationDate || new Date().toISOString().split('T')[0]
                                                                    };

                                                                    console.log('💾 Garmoshka update data:', updateData);
                                                                    await projectsAPI.update(project._id || project.id, updateData);
                                                                    console.log('✅ Garmoshka file data saved to database successfully');

                                                                    // Auto-save the project after successful upload
                                                                    console.log('💾 Auto-saving project after garmoshka upload');
                                                                    await handleSave();
                                                                    console.log('✅ Project auto-saved after garmoshka upload');
                                                                } catch (error) {
                                                                    console.error('❌ Failed to save garmoshka file data to database:', error);
                                                                }
                                                            } else {
                                                                console.log('⚠️ No project ID available, cannot save garmoshka to database yet');
                                                            }

                                                            // Also try to update project state (may fail if project is null)
                                                            handleNestedFieldChange('garmoshka.file', url);
                                                            if (thumbnailUrl) {
                                                                handleNestedFieldChange('garmoshka.thumbnailUrl', thumbnailUrl);
                                                            }
                                                            // Update creation date if not already set
                                                            if (!fileUploadState.garmoshka?.creationDate) {
                                                                const currentDate = new Date().toISOString().split('T')[0];
                                                                handleNestedFieldChange('garmoshka.fileCreationDate', currentDate);
                                                            }
                                                        }}
                                                        onCreationDateChange={async (date) => {
                                                            console.log('🔄 Garmoshka onCreationDateChange called with:', date);

                                                            // Update fileUploadState immediately for UI display
                                                            setFileUploadState(prev => ({
                                                                ...prev,
                                                                garmoshka: {
                                                                    ...prev.garmoshka,
                                                                    creationDate: date
                                                                }
                                                            }));

                                                            // Save to database immediately if we have a project ID
                                                            if (project?._id || project?.id) {
                                                                try {
                                                                    console.log('💾 Saving garmoshka creation date to database immediately...');
                                                                    const { projectsAPI } = await import('../services/api');

                                                                    const updateData = {
                                                                        'garmoshka.fileCreationDate': date
                                                                    };

                                                                    console.log('💾 Garmoshka creation date update data:', updateData);
                                                                    await projectsAPI.update(project._id || project.id, updateData);
                                                                    console.log('✅ Garmoshka creation date saved to database successfully');
                                                                } catch (error) {
                                                                    console.error('❌ Failed to save garmoshka creation date to database:', error);
                                                                }
                                                            } else {
                                                                console.log('⚠️ No project ID available, cannot save garmoshka creation date to database yet');
                                                            }

                                                            // Also try to update project state (may fail if project is null)
                                                            handleNestedFieldChange('garmoshka.fileCreationDate', date);
                                                        }}
                                                        onDelete={async () => {
                                                            // Get current file URLs from state or project
                                                            const currentFileUrl = fileUploadState.garmoshka?.url || project?.garmoshka?.file;
                                                            const currentThumbnailUrl = fileUploadState.garmoshka?.thumbnailUrl || project?.garmoshka?.thumbnailUrl;

                                                            if (!currentFileUrl && !currentThumbnailUrl) {
                                                                console.log('No garmoshka file to delete');
                                                                return;
                                                            }

                                                            try {
                                                                // 1. FIRST: Clear from UI immediately for better UX
                                                                console.log('🗑️ Clearing garmoshka file from UI');
                                                                setFileUploadState(prev => ({
                                                                    ...prev,
                                                                    garmoshka: { url: '', thumbnailUrl: '', creationDate: '' }
                                                                }));

                                                                // Clear creation date from UI
                                                                handleNestedFieldChange('garmoshka.fileCreationDate', '');

                                                                // Also update project state directly for immediate UI update
                                                                if (project) {
                                                                    const updatedProject = {
                                                                        ...project,
                                                                        garmoshka: {
                                                                            ...project.garmoshka,
                                                                            file: '',
                                                                            thumbnailUrl: '',
                                                                            fileCreationDate: ''
                                                                        }
                                                                    };
                                                                    setProject(updatedProject);
                                                                }

                                                                // 2. THEN: Delete from blob storage if URLs exist
                                                                if (currentFileUrl || currentThumbnailUrl) {
                                                                    console.log('🗑️ Deleting garmoshka files from blob storage:', { currentFileUrl, currentThumbnailUrl });
                                                                    const { authenticatedFetch } = await import('../config/api');
                                                                    const response = await authenticatedFetch('/api/delete-project-file', {
                                                                        method: 'DELETE',
                                                                        headers: {
                                                                            'Content-Type': 'application/json',
                                                                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                                                                        },
                                                                        body: JSON.stringify({
                                                                            fileUrl: currentFileUrl,
                                                                            thumbnailUrl: currentThumbnailUrl
                                                                        })
                                                                    });

                                                                    if (!response.ok) {
                                                                        const errorText = await response.text();
                                                                        console.error('❌ Delete garmoshka file failed:', response.status, errorText);
                                                                        throw new Error('Failed to delete garmoshka file from storage');
                                                                    }
                                                                    console.log('✅ Garmoshka files deleted from blob storage successfully');
                                                                }

                                                                // 3. FINALLY: Update database and auto-save
                                                                if (project?._id || project?.id) {
                                                                    console.log('🗑️ Updating database to clear garmoshka file data');
                                                                    const { projectsAPI } = await import('../services/api');
                                                                    const projectId = project._id || project.id;

                                                                    const updateData = {
                                                                        'garmoshka.file': '',
                                                                        'garmoshka.thumbnailUrl': '',
                                                                        'garmoshka.fileCreationDate': '',
                                                                        // Remove duplicate fields
                                                                        'garmoshkaFile': '',
                                                                        'garmoshkaFileCreationDate': ''
                                                                    };

                                                                    await projectsAPI.update(projectId, updateData);
                                                                    console.log('✅ Database updated successfully');

                                                                    // Auto-save the project after successful deletion
                                                                    console.log('💾 Auto-saving project after garmoshka deletion');
                                                                    await handleSave();
                                                                    console.log('✅ Project auto-saved after garmoshka deletion');
                                                                }

                                                                console.log('✅ Garmoshka file deletion completed successfully');

                                                            } catch (error) {
                                                                console.error('❌ Error deleting garmoshka file:', error);
                                                                alert('שגיאה במחיקת הקובץ: ' + error.message);

                                                                // Revert UI changes if deletion failed
                                                                console.log('🔄 Reverting UI changes due to garmoshka deletion failure');
                                                                setFileUploadState(prev => ({
                                                                    ...prev,
                                                                    garmoshka: {
                                                                        url: prev.garmoshka?.url || '',
                                                                        thumbnailUrl: prev.garmoshka?.thumbnailUrl || '',
                                                                        creationDate: prev.garmoshka?.creationDate || ''
                                                                    }
                                                                }));
                                                            }
                                                        }}
                                                        disabled={mode === 'view' || !canEdit}
                                                        accept=".pdf,.dwg,.dwf"
                                                        showCreationDate={true}
                                                        creationDateValue={fileUploadState.garmoshka?.creationDate || project?.garmoshka?.fileCreationDate || ''}
                                                        projectId={project?._id || project?.id}
                                                        autoSave={true}
                                                        onAutoSave={handleSave}
                                                    />


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
                                                                    color: '#6b47c1',
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
                                                                        color: isAnalyzing ? '#6b47c1' : 'inherit',
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

                                                </Box>

                                                {/* תת-סקשן: מיקום וכתובת */}
                                                <Box sx={{ mb: 4, direction: 'rtl' }}>
                                                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary', textAlign: 'right' }}>
                                                        מיקום וכתובת
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, direction: 'rtl' }}>
                                                        {/* Address and Coordinates Row */}
                                                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3, direction: 'rtl' }}>
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
                                                        </Box>

                                                        {/* Plot Details Table - Full Width */}
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
                                                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                                                    gap: { xs: 1, sm: 2 },
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
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.governmentProgram === false ? '#6b47c1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.governmentProgram === false ? 'white' : '#6b47c1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.governmentProgram === false ? '#5a3aa1' : '#f3f4f6',
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
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.governmentProgram === true ? '#6b47c1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.governmentProgram === true ? 'white' : '#6b47c1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.governmentProgram === true ? '#5a3aa1' : '#f3f4f6',
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
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.constructionRenovation === false ? '#6b47c1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.constructionRenovation === false ? 'white' : '#6b47c1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.constructionRenovation === false ? '#5a3aa1' : '#f3f4f6',
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
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.constructionRenovation === true ? '#6b47c1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.constructionRenovation === true ? 'white' : '#6b47c1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.constructionRenovation === true ? '#5a3aa1' : '#f3f4f6',
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
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.demolition === false ? '#6b47c1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.demolition === false ? 'white' : '#6b47c1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.demolition === false ? '#5a3aa1' : '#f3f4f6',
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
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.demolition === true ? '#6b47c1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.demolition === true ? 'white' : '#6b47c1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.demolition === true ? '#5a3aa1' : '#f3f4f6',
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
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.civilEngineering === false ? '#6b47c1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.civilEngineering === false ? 'white' : '#6b47c1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.civilEngineering === false ? '#5a3aa1' : '#f3f4f6',
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
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.civilEngineering === true ? '#6b47c1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.civilEngineering === true ? 'white' : '#6b47c1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.civilEngineering === true ? '#5a3aa1' : '#f3f4f6',
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
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.tama38_1 === false ? '#6b47c1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.tama38_1 === false ? 'white' : '#6b47c1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.tama38_1 === false ? '#5a3aa1' : '#f3f4f6',
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
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.tama38_1 === true ? '#6b47c1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.tama38_1 === true ? 'white' : '#6b47c1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.tama38_1 === true ? '#5a3aa1' : '#f3f4f6',
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
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.tama38_2 === false ? '#6b47c1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.tama38_2 === false ? 'white' : '#6b47c1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.tama38_2 === false ? '#5a3aa1' : '#f3f4f6',
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
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.tama38_2 === true ? '#6b47c1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.tama38_2 === true ? 'white' : '#6b47c1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.tama38_2 === true ? '#5a3aa1' : '#f3f4f6',
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
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.preservation === false ? '#6b47c1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.preservation === false ? 'white' : '#6b47c1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.preservation === false ? '#5a3aa1' : '#f3f4f6',
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
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.preservation === true ? '#6b47c1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.preservation === true ? 'white' : '#6b47c1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.preservation === true ? '#5a3aa1' : '#f3f4f6',
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

                                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(250px, 1fr))' }, gap: 3, mb: 3 }}>
                                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: { xs: 2, sm: 3 } }}>
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
                                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(250px, 1fr))' }, gap: 3, mt: 3 }}>
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
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.sharedBasementFloors === false ? '#6b47c1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.sharedBasementFloors === false ? 'white' : '#6b47c1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.sharedBasementFloors === false ? '#5a3aa1' : '#f3f4f6',
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
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.sharedBasementFloors === true ? '#6b47c1' : 'transparent',
                                                                    color: project?.engineeringQuestionnaire?.buildingPlan?.sharedBasementFloors === true ? 'white' : '#6b47c1',
                                                                    '&:hover': {
                                                                        backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.sharedBasementFloors === true ? '#5a3aa1' : '#f3f4f6',
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
                                                        label="סה״כ מ״ר בנוי מרתף"
                                                        type="number"
                                                        value={project?.engineeringQuestionnaire?.buildingPlan?.totalBasementArea || ''}
                                                        onChange={(e) => handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.totalBasementArea', parseFloat(e.target.value) || 0)}
                                                        disabled={mode === 'view' || !canEdit}
                                                    />
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
                                                    value={fileUploadState.buildingPermit?.url || project?.engineeringQuestionnaire?.buildingPlan?.buildingPermit?.file || ''}
                                                    thumbnailUrl={fileUploadState.buildingPermit?.thumbnailUrl || project?.engineeringQuestionnaire?.buildingPlan?.buildingPermit?.thumbnailUrl || ''}
                                                    onChange={(url, thumbnailUrl) => {
                                                        console.log('🔄 BuildingPermit FileUpload onChange called with:', { url, thumbnailUrl });
                                                        handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.buildingPermit.file', url);
                                                        if (thumbnailUrl) {
                                                            handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.buildingPermit.thumbnailUrl', thumbnailUrl);
                                                        }
                                                        // Update creation date if not already set
                                                        if (!fileUploadState.buildingPermit?.creationDate) {
                                                            const currentDate = new Date().toISOString().split('T')[0];
                                                            handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.buildingPermit.fileCreationDate', currentDate);
                                                        }
                                                    }}
                                                    onCreationDateChange={async (date) => {
                                                        console.log('🔄 BuildingPermit onCreationDateChange called with:', date);

                                                        // Update fileUploadState immediately for UI display
                                                        setFileUploadState(prev => ({
                                                            ...prev,
                                                            buildingPermit: {
                                                                ...prev.buildingPermit,
                                                                creationDate: date
                                                            }
                                                        }));

                                                        // Save to database immediately if we have a project ID
                                                        if (project?._id || project?.id) {
                                                            try {
                                                                console.log('💾 Saving buildingPermit creation date to database immediately...');
                                                                const { projectsAPI } = await import('../services/api');

                                                                const updateData = {
                                                                    'engineeringQuestionnaire.buildingPlan.buildingPermit.fileCreationDate': date
                                                                };

                                                                console.log('💾 BuildingPermit creation date update data:', updateData);
                                                                await projectsAPI.update(project._id || project.id, updateData);
                                                                console.log('✅ BuildingPermit creation date saved to database successfully');
                                                            } catch (error) {
                                                                console.error('❌ Failed to save buildingPermit creation date to database:', error);
                                                            }
                                                        } else {
                                                            console.log('⚠️ No project ID available, cannot save buildingPermit creation date to database yet');
                                                        }

                                                        // Also try to update project state (may fail if project is null)
                                                        handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.buildingPermit.fileCreationDate', date);
                                                    }}
                                                    onDelete={async () => {
                                                        // Get current file URLs from state or project
                                                        const currentFileUrl = fileUploadState.buildingPermit?.url || project?.engineeringQuestionnaire?.buildingPlan?.buildingPermit?.file;
                                                        const currentThumbnailUrl = fileUploadState.buildingPermit?.thumbnailUrl || project?.engineeringQuestionnaire?.buildingPlan?.buildingPermit?.thumbnailUrl;

                                                        if (!currentFileUrl && !currentThumbnailUrl) {
                                                            console.log('No buildingPermit file to delete');
                                                            return;
                                                        }

                                                        try {
                                                            // 1. FIRST: Clear from UI immediately for better UX
                                                            console.log('🗑️ Clearing buildingPermit file from UI');
                                                            setFileUploadState(prev => ({
                                                                ...prev,
                                                                buildingPermit: { url: '', thumbnailUrl: '', creationDate: '' }
                                                            }));

                                                            // Clear creation date from UI
                                                            handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.buildingPermit.fileCreationDate', '');

                                                            // Also update project state directly for immediate UI update
                                                            if (project) {
                                                                const updatedProject = {
                                                                    ...project,
                                                                    engineeringQuestionnaire: {
                                                                        ...project.engineeringQuestionnaire,
                                                                        buildingPlan: {
                                                                            ...project.engineeringQuestionnaire?.buildingPlan,
                                                                            buildingPermit: {
                                                                                ...project.engineeringQuestionnaire?.buildingPlan?.buildingPermit,
                                                                                file: '',
                                                                                thumbnailUrl: '',
                                                                                fileCreationDate: ''
                                                                            }
                                                                        }
                                                                    }
                                                                };
                                                                setProject(updatedProject);
                                                            }

                                                            // 2. THEN: Delete from blob storage if URLs exist
                                                            if (currentFileUrl || currentThumbnailUrl) {
                                                                console.log('🗑️ Deleting buildingPermit files from blob storage:', { currentFileUrl, currentThumbnailUrl });
                                                                const { authenticatedFetch } = await import('../config/api');
                                                                const response = await authenticatedFetch('/api/delete-project-file', {
                                                                    method: 'DELETE',
                                                                    headers: {
                                                                        'Content-Type': 'application/json',
                                                                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                                                                    },
                                                                    body: JSON.stringify({
                                                                        fileUrl: currentFileUrl,
                                                                        thumbnailUrl: currentThumbnailUrl
                                                                    })
                                                                });

                                                                if (!response.ok) {
                                                                    const errorText = await response.text();
                                                                    console.error('❌ Delete buildingPermit file failed:', response.status, errorText);
                                                                    throw new Error('Failed to delete buildingPermit file from storage');
                                                                }
                                                                console.log('✅ BuildingPermit files deleted from blob storage successfully');
                                                            }

                                                            // 3. FINALLY: Update database and auto-save
                                                            if (project?._id || project?.id) {
                                                                console.log('🗑️ Updating database to clear buildingPermit file data');
                                                                const { projectsAPI } = await import('../services/api');
                                                                const projectId = project._id || project.id;

                                                                const updateData = {
                                                                    'engineeringQuestionnaire.buildingPlan.buildingPermit': null // מוחק את כל האובייקט המקונן
                                                                };

                                                                console.log('🗑️ BuildingPermit delete update data (using null for object):', updateData);
                                                                console.log('🗑️ About to call projectsAPI.update with project ID:', projectId);

                                                                // Add detailed logging for debugging
                                                                console.log('🔍 DEBUG: Full API call details:');
                                                                console.log('🔍 DEBUG: URL will be: /api/projects/' + projectId);
                                                                console.log('🔍 DEBUG: Method: PUT');
                                                                console.log('🔍 DEBUG: Headers: Content-Type: application/json');
                                                                console.log('🔍 DEBUG: Body (stringified):', JSON.stringify(updateData));

                                                                try {
                                                                    const result = await projectsAPI.update(projectId, updateData);
                                                                    console.log('✅ Database updated successfully, result:', result);
                                                                    console.log('✅ BuildingPermit deletion completed successfully');

                                                                    // Verify the deletion worked by fetching the updated project
                                                                    console.log('🔍 Verifying deletion by fetching updated project...');
                                                                    try {
                                                                        const updatedProject = await projectsAPI.getById(projectId);
                                                                        console.log('🔍 Updated project buildingPermit field:', updatedProject.engineeringQuestionnaire?.buildingPlan?.buildingPermit);
                                                                        if (updatedProject.engineeringQuestionnaire?.buildingPlan?.buildingPermit === null ||
                                                                            updatedProject.engineeringQuestionnaire?.buildingPlan?.buildingPermit === undefined) {
                                                                            console.log('✅ Verification: buildingPermit successfully deleted from MongoDB');
                                                                        } else {
                                                                            console.log('❌ Verification: buildingPermit still exists in MongoDB:', updatedProject.engineeringQuestionnaire?.buildingPlan?.buildingPermit);
                                                                        }
                                                                    } catch (verificationError) {
                                                                        console.error('❌ Verification failed:', verificationError);
                                                                    }
                                                                } catch (apiError) {
                                                                    console.error('❌ API update failed:', apiError);
                                                                    throw apiError; // Re-throw to trigger the catch block
                                                                }

                                                                // Auto-save the project after successful deletion
                                                                console.log('💾 Auto-saving project after buildingPermit deletion');
                                                                await handleSave();
                                                                console.log('✅ Project auto-saved after buildingPermit deletion');
                                                            }

                                                            console.log('✅ BuildingPermit file deletion completed successfully');

                                                        } catch (error) {
                                                            console.error('❌ Error deleting buildingPermit file:', error);
                                                            alert('שגיאה במחיקת הקובץ: ' + error.message);

                                                            // Revert UI changes if deletion failed
                                                            console.log('🔄 Reverting UI changes due to buildingPermit deletion failure');
                                                            setFileUploadState(prev => ({
                                                                ...prev,
                                                                buildingPermit: {
                                                                    url: prev.buildingPermit?.url || '',
                                                                    thumbnailUrl: prev.buildingPermit?.thumbnailUrl || '',
                                                                    creationDate: prev.buildingPermit?.creationDate || ''
                                                                }
                                                            }));
                                                        }
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    showCreationDate={true}
                                                    creationDateValue={fileUploadState.buildingPermit?.creationDate || project?.engineeringQuestionnaire?.buildingPlan?.buildingPermit?.fileCreationDate || ''}
                                                    projectId={project?._id || project?.id}
                                                    autoSave={true}
                                                    onAutoSave={handleSave}
                                                />

                                                <FileUpload
                                                    label="היתר חפירה"
                                                    value={fileUploadState.excavationPermit?.url || project?.engineeringQuestionnaire?.buildingPlan?.excavationPermit?.file || ''}
                                                    thumbnailUrl={fileUploadState.excavationPermit?.thumbnailUrl || project?.engineeringQuestionnaire?.buildingPlan?.excavationPermit?.thumbnailUrl || ''}
                                                    onChange={async (url, thumbnailUrl) => {
                                                        console.log('🔄 ExcavationPermit FileUpload onChange called with:', { url, thumbnailUrl });
                                                        console.log('🔍 DEBUG: Starting excavationPermit onChange process...');
                                                        console.log('🔍 DEBUG: Current project:', project);
                                                        console.log('🔍 DEBUG: Current fileUploadState:', fileUploadState);
                                                        console.log('🔍 DEBUG: onChange callback is executing!');

                                                        try {
                                                            // Update fileUploadState first
                                                            console.log('🔍 DEBUG: Updating fileUploadState...');
                                                            setFileUploadState(prev => ({
                                                                ...prev,
                                                                excavationPermit: {
                                                                    ...prev.excavationPermit,
                                                                    url: url,
                                                                    thumbnailUrl: thumbnailUrl || ''
                                                                }
                                                            }));
                                                            console.log('🔍 DEBUG: fileUploadState updated successfully');

                                                            console.log('🔍 DEBUG: Calling handleNestedFieldChange for file...');
                                                            handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.excavationPermit.file', url);
                                                            console.log('🔍 DEBUG: handleNestedFieldChange for file completed');

                                                            if (thumbnailUrl) {
                                                                console.log('🔍 DEBUG: Calling handleNestedFieldChange for thumbnail...');
                                                                handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.excavationPermit.thumbnailUrl', thumbnailUrl);
                                                                console.log('🔍 DEBUG: handleNestedFieldChange for thumbnail completed');
                                                            }

                                                            // Update creation date if not already set
                                                            if (!fileUploadState.excavationPermit?.creationDate) {
                                                                const currentDate = new Date().toISOString().split('T')[0];
                                                                console.log('🔍 DEBUG: Setting creation date to:', currentDate);
                                                                handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.excavationPermit.fileCreationDate', currentDate);
                                                                console.log('🔍 DEBUG: handleNestedFieldChange for creation date completed');
                                                            }
                                                            console.log('🔍 DEBUG: All handleNestedFieldChange calls completed');
                                                        } catch (error) {
                                                            console.error('❌ Error in onChange setup:', error);
                                                        }

                                                        console.log('🔍 DEBUG: Finished try-catch block, proceeding to database save...');
                                                        console.log('🔍 DEBUG: About to start database save logic...');

                                                        // Save to database immediately if we have a project ID
                                                        console.log('🔍 DEBUG: About to check conditions for database save...');
                                                        console.log('🔍 DEBUG: Checking conditions for database save...');
                                                        console.log('🔍 DEBUG: url =', url);
                                                        console.log('🔍 DEBUG: project?._id =', project?._id);
                                                        console.log('🔍 DEBUG: project?.id =', project?.id);
                                                        console.log('🔍 DEBUG: project =', project);

                                                        if (url && (project?._id || project?.id)) {
                                                            console.log('🔍 DEBUG: Conditions met, proceeding with database save...');
                                                            console.log('🔍 DEBUG: Project ID:', project._id || project.id);
                                                            console.log('🔍 DEBUG: URL:', url);
                                                            console.log('🔍 DEBUG: Thumbnail URL:', thumbnailUrl);

                                                            try {
                                                                console.log('💾 Saving excavationPermit file data to database immediately...');
                                                                const { projectsAPI } = await import('../services/api');
                                                                console.log('🔍 DEBUG: projectsAPI imported successfully');

                                                                const updateData: any = {
                                                                    'engineeringQuestionnaire.buildingPlan.excavationPermit.file': url
                                                                };

                                                                if (thumbnailUrl) {
                                                                    updateData['engineeringQuestionnaire.buildingPlan.excavationPermit.thumbnailUrl'] = thumbnailUrl;
                                                                }

                                                                // Add creation date if not already set
                                                                if (!fileUploadState.excavationPermit?.creationDate) {
                                                                    const currentDate = new Date().toISOString().split('T')[0];
                                                                    updateData['engineeringQuestionnaire.buildingPlan.excavationPermit.fileCreationDate'] = currentDate;
                                                                }

                                                                console.log('💾 ExcavationPermit file update data:', updateData);
                                                                console.log('🔍 DEBUG: About to call projectsAPI.update with project ID:', project._id || project.id);
                                                                console.log('🔍 DEBUG: Full API call details:');
                                                                console.log('🔍 DEBUG: - URL: /api/projects/' + (project._id || project.id));
                                                                console.log('🔍 DEBUG: - Method: PUT');
                                                                console.log('🔍 DEBUG: - Body:', JSON.stringify(updateData));

                                                                const result = await projectsAPI.update(project._id || project.id, updateData);
                                                                console.log('✅ ExcavationPermit file data saved to database successfully, result:', result);
                                                                console.log('🔍 DEBUG: API call completed, checking result...');
                                                                console.log('🔍 DEBUG: Result type:', typeof result);
                                                                console.log('🔍 DEBUG: Result keys:', Object.keys(result || {}));

                                                                // Update project state AFTER successful database save
                                                                console.log('🔍 DEBUG: Updating project state with new file data after successful save...');
                                                                if (project) {
                                                                    const updatedProject = {
                                                                        ...project,
                                                                        engineeringQuestionnaire: {
                                                                            ...project.engineeringQuestionnaire,
                                                                            buildingPlan: {
                                                                                ...project.engineeringQuestionnaire?.buildingPlan,
                                                                                excavationPermit: {
                                                                                    ...project.engineeringQuestionnaire?.buildingPlan?.excavationPermit,
                                                                                    file: url,
                                                                                    thumbnailUrl: thumbnailUrl || '',
                                                                                    fileCreationDate: fileUploadState.excavationPermit?.creationDate || new Date().toISOString().split('T')[0]
                                                                                }
                                                                            }
                                                                        }
                                                                    };
                                                                    setProject(updatedProject);
                                                                    console.log('🔍 DEBUG: Project state updated with excavationPermit data after successful save');
                                                                }
                                                            } catch (error) {
                                                                console.error('❌ Failed to save excavationPermit file data to database:', error);
                                                                console.error('❌ Error details:', error);
                                                            }
                                                        } else {
                                                            console.log('⚠️ No project ID available, cannot save excavationPermit file data to database yet');
                                                            console.log('⚠️ DEBUG: url =', url, 'project?._id =', project?._id, 'project?.id =', project?.id);
                                                        }

                                                        console.log('✅ ExcavationPermit file upload process completed');
                                                    }}
                                                    onDelete={async () => {
                                                        // Get current file URLs from state or project
                                                        const currentFileUrl = fileUploadState.excavationPermit?.url || project?.engineeringQuestionnaire?.buildingPlan?.excavationPermit?.file;
                                                        const currentThumbnailUrl = fileUploadState.excavationPermit?.thumbnailUrl || project?.engineeringQuestionnaire?.buildingPlan?.excavationPermit?.thumbnailUrl;

                                                        if (!currentFileUrl && !currentThumbnailUrl) {
                                                            console.log('No excavationPermit file to delete');
                                                            return;
                                                        }

                                                        try {
                                                            // 1. FIRST: Clear from UI immediately for better UX
                                                            console.log('🗑️ Clearing excavationPermit file from UI');
                                                            setFileUploadState(prev => ({
                                                                ...prev,
                                                                excavationPermit: { url: '', thumbnailUrl: '', creationDate: '' }
                                                            }));

                                                            // Clear creation date from UI
                                                            handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.excavationPermit.fileCreationDate', '');

                                                            // Also update project state directly for immediate UI update
                                                            console.log('🔍 DEBUG: Updating project state to clear excavationPermit data...');
                                                            if (project) {
                                                                const updatedProject = {
                                                                    ...project,
                                                                    engineeringQuestionnaire: {
                                                                        ...project.engineeringQuestionnaire,
                                                                        buildingPlan: {
                                                                            ...project.engineeringQuestionnaire?.buildingPlan,
                                                                            excavationPermit: {
                                                                                ...project.engineeringQuestionnaire?.buildingPlan?.excavationPermit,
                                                                                file: '',
                                                                                thumbnailUrl: '',
                                                                                fileCreationDate: ''
                                                                            }
                                                                        }
                                                                    }
                                                                };
                                                                setProject(updatedProject);
                                                                console.log('🔍 DEBUG: Project state updated to clear excavationPermit data');
                                                            }

                                                            // 2. THEN: Delete from blob storage if URLs exist
                                                            if (currentFileUrl || currentThumbnailUrl) {
                                                                console.log('🗑️ Deleting excavationPermit files from blob storage:', { currentFileUrl, currentThumbnailUrl });
                                                                const { authenticatedFetch } = await import('../config/api');
                                                                const response = await authenticatedFetch('/api/delete-project-file', {
                                                                    method: 'DELETE',
                                                                    headers: {
                                                                        'Content-Type': 'application/json',
                                                                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                                                                    },
                                                                    body: JSON.stringify({
                                                                        fileUrl: currentFileUrl,
                                                                        thumbnailUrl: currentThumbnailUrl
                                                                    })
                                                                });

                                                                if (!response.ok) {
                                                                    const errorText = await response.text();
                                                                    console.error('❌ Delete excavationPermit file failed:', response.status, errorText);
                                                                    throw new Error('Failed to delete excavationPermit file from storage');
                                                                }
                                                                console.log('✅ ExcavationPermit files deleted from blob storage successfully');
                                                            }

                                                            // 3. FINALLY: Update database and auto-save
                                                            if (project?._id || project?.id) {
                                                                console.log('🗑️ Updating database to clear excavationPermit file data');
                                                                const { projectsAPI } = await import('../services/api');
                                                                const projectId = project._id || project.id;

                                                                const updateData = {
                                                                    'engineeringQuestionnaire.buildingPlan.excavationPermit': null // מוחק את כל האובייקט המקונן
                                                                };

                                                                console.log('🗑️ ExcavationPermit delete update data (using null for object):', updateData);
                                                                console.log('🗑️ About to call projectsAPI.update with project ID:', projectId);

                                                                // Add detailed logging for debugging
                                                                console.log('🔍 DEBUG: Full API call details for deletion:');
                                                                console.log('🔍 DEBUG: URL will be: /api/projects/' + projectId);
                                                                console.log('🔍 DEBUG: Method: PUT');
                                                                console.log('🔍 DEBUG: Headers: Content-Type: application/json');
                                                                console.log('🔍 DEBUG: Body (stringified):', JSON.stringify(updateData));

                                                                try {
                                                                    const result = await projectsAPI.update(projectId, updateData);
                                                                    console.log('✅ Database updated successfully, result:', result);
                                                                    console.log('✅ ExcavationPermit deletion completed successfully');

                                                                    // Verify the deletion worked by fetching the updated project
                                                                    console.log('🔍 Verifying deletion by fetching updated project...');
                                                                    try {
                                                                        const updatedProject = await projectsAPI.getById(projectId);
                                                                        console.log('🔍 Updated project excavationPermit field:', updatedProject.engineeringQuestionnaire?.buildingPlan?.excavationPermit);
                                                                        if (updatedProject.engineeringQuestionnaire?.buildingPlan?.excavationPermit === null ||
                                                                            updatedProject.engineeringQuestionnaire?.buildingPlan?.excavationPermit === undefined) {
                                                                            console.log('✅ Verification: excavationPermit successfully deleted from MongoDB');
                                                                        } else {
                                                                            console.log('❌ Verification: excavationPermit still exists in MongoDB:', updatedProject.engineeringQuestionnaire?.buildingPlan?.excavationPermit);
                                                                        }
                                                                    } catch (verificationError) {
                                                                        console.error('❌ Verification failed:', verificationError);
                                                                    }
                                                                } catch (apiError) {
                                                                    console.error('❌ API update failed:', apiError);
                                                                    throw apiError; // Re-throw to trigger the catch block
                                                                }

                                                                console.log('✅ ExcavationPermit deletion process completed');
                                                            } else {
                                                                console.log('⚠️ No project ID available for excavationPermit deletion');
                                                            }

                                                            console.log('✅ ExcavationPermit file deletion completed successfully');

                                                        } catch (error: any) {
                                                            console.error('❌ Error deleting excavationPermit file:', error);
                                                            alert('שגיאה במחיקת הקובץ: ' + error.message);

                                                            // Revert UI changes if deletion failed
                                                            console.log('🔄 Reverting UI changes due to excavationPermit deletion failure');
                                                            setFileUploadState(prev => ({
                                                                ...prev,
                                                                excavationPermit: {
                                                                    url: prev.excavationPermit?.url || '',
                                                                    thumbnailUrl: prev.excavationPermit?.thumbnailUrl || '',
                                                                    creationDate: prev.excavationPermit?.creationDate || ''
                                                                }
                                                            }));
                                                        }
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    showCreationDate={true}
                                                    creationDateValue={fileUploadState.excavationPermit?.creationDate || project?.engineeringQuestionnaire?.buildingPlan?.excavationPermit?.fileCreationDate || ''}
                                                    onCreationDateChange={async (date) => {
                                                        console.log('🔄 ExcavationPermit onCreationDateChange called with:', date);

                                                        // Update fileUploadState immediately for UI display
                                                        setFileUploadState(prev => ({
                                                            ...prev,
                                                            excavationPermit: {
                                                                ...prev.excavationPermit,
                                                                creationDate: date
                                                            }
                                                        }));

                                                        // Save to database immediately if we have a project ID
                                                        if (project?._id || project?.id) {
                                                            try {
                                                                console.log('💾 Saving excavationPermit creation date to database immediately...');
                                                                const { projectsAPI } = await import('../services/api');

                                                                const updateData = {
                                                                    'engineeringQuestionnaire.buildingPlan.excavationPermit.fileCreationDate': date
                                                                };

                                                                console.log('💾 ExcavationPermit creation date update data:', updateData);
                                                                await projectsAPI.update(project._id || project.id, updateData);
                                                                console.log('✅ ExcavationPermit creation date saved to database successfully');
                                                            } catch (error) {
                                                                console.error('❌ Failed to save excavationPermit creation date to database:', error);
                                                            }
                                                        } else {
                                                            console.log('⚠️ No project ID available, cannot save excavationPermit creation date to database yet');
                                                        }

                                                        // Also try to update project state (may fail if project is null)
                                                        handleNestedFieldChange('engineeringQuestionnaire.buildingPlan.excavationPermit.fileCreationDate', date);
                                                    }}
                                                    projectId={project?._id || project?.id}
                                                    autoSave={true}
                                                    onAutoSave={handleSave}
                                                />


                                                <FileUpload
                                                    label="הצהרת תכנון לפי תקן 413 (רעידות אדמה)"
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
                                                                color: '#6b47c1',
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
                                                                    color: isAnalyzing ? '#6b47c1' : 'inherit',
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
                                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: { xs: 1, sm: 1.5 }, mb: 2 }}>
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
                                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: { xs: 1, sm: 1.5 }, mb: 3 }}>
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
                                                        color: '#6b47c1',
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
                                                        color: '#6b47c1',
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
                                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(250px, 1fr))' }, gap: 3 }}>

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
                                                                backgroundColor: project?.engineeringQuestionnaire?.soilConsultantReport?.perimeterDewatering === false ? '#6b47c1' : 'transparent',
                                                                color: project?.engineeringQuestionnaire?.soilConsultantReport?.perimeterDewatering === false ? 'white' : '#6b47c1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.engineeringQuestionnaire?.soilConsultantReport?.perimeterDewatering === false ? '#5a3aa1' : '#f3f4f6',
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
                                                                backgroundColor: project?.engineeringQuestionnaire?.soilConsultantReport?.perimeterDewatering === true ? '#6b47c1' : 'transparent',
                                                                color: project?.engineeringQuestionnaire?.soilConsultantReport?.perimeterDewatering === true ? 'white' : '#6b47c1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.engineeringQuestionnaire?.soilConsultantReport?.perimeterDewatering === true ? '#5a3aa1' : '#f3f4f6',
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
                                                                color: '#6b47c1',
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
                                                                    color: isAnalyzing ? '#6b47c1' : 'inherit',
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
                                                                backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.workOnExistingStructure === false ? '#6b47c1' : 'transparent',
                                                                color: project?.engineeringQuestionnaire?.buildingPlan?.workOnExistingStructure === false ? 'white' : '#6b47c1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.workOnExistingStructure === false ? '#5a3aa1' : '#f3f4f6',
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
                                                                backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.workOnExistingStructure === true ? '#6b47c1' : 'transparent',
                                                                color: project?.engineeringQuestionnaire?.buildingPlan?.workOnExistingStructure === true ? 'white' : '#6b47c1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.workOnExistingStructure === true ? '#5a3aa1' : '#f3f4f6',
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
                                                                backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.demolitionWork === false ? '#6b47c1' : 'transparent',
                                                                color: project?.engineeringQuestionnaire?.buildingPlan?.demolitionWork === false ? 'white' : '#6b47c1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.demolitionWork === false ? '#5a3aa1' : '#f3f4f6',
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
                                                                backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.demolitionWork === true ? '#6b47c1' : 'transparent',
                                                                color: project?.engineeringQuestionnaire?.buildingPlan?.demolitionWork === true ? 'white' : '#6b47c1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.engineeringQuestionnaire?.buildingPlan?.demolitionWork === true ? '#5a3aa1' : '#f3f4f6',
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



                                    {/* שורה 7 - הוצאות שכר אדריכלים ואחרים */}
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 2,
                                        mb: 2
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
                                                    הוצאות שכר אדריכלים ואחרים
                                                </Typography>
                                                <Box sx={{
                                                    display: 'flex',
                                                    gap: 0,
                                                    alignItems: 'center',
                                                    justifyContent: 'flex-start',
                                                    marginLeft: '10px'
                                                }}>
                                                    <Typography variant="body2" sx={{ color: 'text.secondary', ml: 1 }}>(במקרה ביטוח)</Typography>
                                                    <Button
                                                        variant="text"
                                                        onClick={() => handleNestedFieldChange('insuranceSpecification.architectFees', false)}
                                                        disabled={mode === 'view' || !canEdit}
                                                        sx={{
                                                            borderRadius: '0 4px 4px 0',
                                                            border: '1px solid #d1d5db',
                                                            borderLeft: 'none',
                                                            backgroundColor: project?.insuranceSpecification?.architectFees === false ? '#6b47c1' : 'transparent',
                                                            color: project?.insuranceSpecification?.architectFees === false ? 'white' : '#6b47c1',
                                                            '&:hover': {
                                                                backgroundColor: project?.insuranceSpecification?.architectFees === false ? '#5a3aa1' : '#f3f4f6',
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
                                                        onClick={() => handleNestedFieldChange('insuranceSpecification.architectFees', true)}
                                                        disabled={mode === 'view' || !canEdit}
                                                        sx={{
                                                            borderRadius: '4px 0 0 4px',
                                                            border: '1px solid #d1d5db',
                                                            backgroundColor: project?.insuranceSpecification?.architectFees === true ? '#6b47c1' : 'transparent',
                                                            color: project?.insuranceSpecification?.architectFees === true ? 'white' : '#6b47c1',
                                                            '&:hover': {
                                                                backgroundColor: project?.insuranceSpecification?.architectFees === true ? '#5a3aa1' : '#f3f4f6',
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
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            justifyContent: 'flex-end'
                                        }}>
                                            {project?.insuranceSpecification?.architectFees === true && (
                                                <TextField
                                                    fullWidth
                                                    label="סכום הביטוח (₪)"
                                                    value={project?.insuranceSpecification?.architectFeesAmount ?
                                                        parseInt(project.insuranceSpecification.architectFeesAmount.toString()).toLocaleString('he-IL') : ''}
                                                    onChange={(e) => {
                                                        const numericValue = e.target.value.replace(/[^\d]/g, '');
                                                        handleNestedFieldChange('insuranceSpecification.architectFeesAmount', numericValue || '');
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    size="small"
                                                    type="text"
                                                    inputMode="numeric"
                                                    sx={{
                                                        direction: 'rtl',
                                                        '& .MuiInputBase-root': {
                                                            minHeight: '56px'
                                                        },
                                                        '& .MuiInputLabel-root': {
                                                            top: '0px'
                                                        }
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Box>

                                    {/* שורה 8 - הוצאות בגין שינויים ותוספות על פי דרישת הרשויות */}
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 2,
                                        mb: 2
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
                                                    הוצאות בגין שינויים ותוספות על פי דרישת הרשויות
                                                </Typography>
                                                <Box sx={{
                                                    display: 'flex',
                                                    gap: 0,
                                                    alignItems: 'center',
                                                    justifyContent: 'flex-start',
                                                    marginLeft: '10px'
                                                }}>
                                                    <Typography variant="body2" sx={{ color: 'text.secondary', ml: 1 }}>(במקרה ביטוח)</Typography>
                                                    <Button
                                                        variant="text"
                                                        onClick={() => handleNestedFieldChange('insuranceSpecification.authorityChanges', false)}
                                                        disabled={mode === 'view' || !canEdit}
                                                        sx={{
                                                            borderRadius: '0 4px 4px 0',
                                                            border: '1px solid #d1d5db',
                                                            borderLeft: 'none',
                                                            backgroundColor: project?.insuranceSpecification?.authorityChanges === false ? '#6b47c1' : 'transparent',
                                                            color: project?.insuranceSpecification?.authorityChanges === false ? 'white' : '#6b47c1',
                                                            '&:hover': {
                                                                backgroundColor: project?.insuranceSpecification?.authorityChanges === false ? '#5a3aa1' : '#f3f4f6',
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
                                                        onClick={() => handleNestedFieldChange('insuranceSpecification.authorityChanges', true)}
                                                        disabled={mode === 'view' || !canEdit}
                                                        sx={{
                                                            borderRadius: '4px 0 0 4px',
                                                            border: '1px solid #d1d5db',
                                                            backgroundColor: project?.insuranceSpecification?.authorityChanges === true ? '#6b47c1' : 'transparent',
                                                            color: project?.insuranceSpecification?.authorityChanges === true ? 'white' : '#6b47c1',
                                                            '&:hover': {
                                                                backgroundColor: project?.insuranceSpecification?.authorityChanges === true ? '#5a3aa1' : '#f3f4f6',
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
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            justifyContent: 'flex-end'
                                        }}>
                                            {project?.insuranceSpecification?.authorityChanges === true && (
                                                <TextField
                                                    fullWidth
                                                    label="סכום הביטוח (₪)"
                                                    value={project?.insuranceSpecification?.authorityChangesAmount ?
                                                        parseInt(project.insuranceSpecification.authorityChangesAmount.toString()).toLocaleString('he-IL') : ''}
                                                    onChange={(e) => {
                                                        const numericValue = e.target.value.replace(/[^\d]/g, '');
                                                        handleNestedFieldChange('insuranceSpecification.authorityChangesAmount', numericValue || '');
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    size="small"
                                                    type="text"
                                                    inputMode="numeric"
                                                    sx={{
                                                        direction: 'rtl',
                                                        '& .MuiInputBase-root': {
                                                            minHeight: '56px'
                                                        },
                                                        '& .MuiInputLabel-root': {
                                                            top: '0px'
                                                        }
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Box>

                                </Box>

                                {/* סקר סביבתי */}
                                <Box sx={{ mb: 4 }}>

                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3, mb: 3 }}>
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
                                                    color: isAnalyzing ? '#6b47c1' : 'inherit',
                                                    fontStyle: isAnalyzing ? 'italic' : 'normal'
                                                },
                                                '& .MuiOutlinedInput-root': {
                                                    '&.Mui-focused fieldset': {
                                                        borderColor: '#6b47c1',
                                                    },
                                                },
                                                '& .MuiInputLabel-root': {
                                                    color: '#6b47c1',
                                                    '&.Mui-focused': {
                                                        color: '#6b47c1',
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
                                                    color: isAnalyzing ? '#6b47c1' : 'inherit',
                                                    fontStyle: isAnalyzing ? 'italic' : 'normal'
                                                },
                                                '& .MuiOutlinedInput-root': {
                                                    '&.Mui-focused fieldset': {
                                                        borderColor: '#6b47c1',
                                                    },
                                                },
                                                '& .MuiInputLabel-root': {
                                                    color: '#6b47c1',
                                                    '&.Mui-focused': {
                                                        color: '#6b47c1',
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
                                                        backgroundColor: project?.environmentalSurvey?.adjacentBuildings?.exists === false ? '#6b47c1' : 'transparent',
                                                        color: project?.environmentalSurvey?.adjacentBuildings?.exists === false ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.environmentalSurvey?.adjacentBuildings?.exists === false ? '#5a3aa1' : '#f3f4f6',
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
                                                        backgroundColor: project?.environmentalSurvey?.adjacentBuildings?.exists === true ? '#6b47c1' : 'transparent',
                                                        color: project?.environmentalSurvey?.adjacentBuildings?.exists === true ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.environmentalSurvey?.adjacentBuildings?.exists === true ? '#5a3aa1' : '#f3f4f6',
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
                                                        backgroundColor: project?.environmentalSurvey?.electricalCables?.exists === false ? '#6b47c1' : 'transparent',
                                                        color: project?.environmentalSurvey?.electricalCables?.exists === false ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.environmentalSurvey?.electricalCables?.exists === false ? '#5a3aa1' : '#f3f4f6',
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
                                                        backgroundColor: project?.environmentalSurvey?.electricalCables?.exists === true ? '#6b47c1' : 'transparent',
                                                        color: project?.environmentalSurvey?.electricalCables?.exists === true ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.environmentalSurvey?.electricalCables?.exists === true ? '#5a3aa1' : '#f3f4f6',
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
                                                        backgroundColor: project?.environmentalSurvey?.undergroundInfrastructure?.exists === false ? '#6b47c1' : 'transparent',
                                                        color: project?.environmentalSurvey?.undergroundInfrastructure?.exists === false ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.environmentalSurvey?.undergroundInfrastructure?.exists === false ? '#5a3aa1' : '#f3f4f6',
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
                                                        backgroundColor: project?.environmentalSurvey?.undergroundInfrastructure?.exists === true ? '#6b47c1' : 'transparent',
                                                        color: project?.environmentalSurvey?.undergroundInfrastructure?.exists === true ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.environmentalSurvey?.undergroundInfrastructure?.exists === true ? '#5a3aa1' : '#f3f4f6',
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
                                                        backgroundColor: project?.environmentalSurvey?.kindergartens?.exists === false ? '#6b47c1' : 'transparent',
                                                        color: project?.environmentalSurvey?.kindergartens?.exists === false ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.environmentalSurvey?.kindergartens?.exists === false ? '#5a3aa1' : '#f3f4f6',
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
                                                        backgroundColor: project?.environmentalSurvey?.kindergartens?.exists === true ? '#6b47c1' : 'transparent',
                                                        color: project?.environmentalSurvey?.kindergartens?.exists === true ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.environmentalSurvey?.kindergartens?.exists === true ? '#5a3aa1' : '#f3f4f6',
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
                                                        backgroundColor: project?.environmentalSurvey?.onMountainRidge === false ? '#6b47c1' : 'transparent',
                                                        color: project?.environmentalSurvey?.onMountainRidge === false ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.environmentalSurvey?.onMountainRidge === false ? '#5a3aa1' : '#f3f4f6',
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
                                                        backgroundColor: project?.environmentalSurvey?.onMountainRidge === true ? '#6b47c1' : 'transparent',
                                                        color: project?.environmentalSurvey?.onMountainRidge === true ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.environmentalSurvey?.onMountainRidge === true ? '#5a3aa1' : '#f3f4f6',
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
                                                        backgroundColor: project?.environmentalSurvey?.inValley === false ? '#6b47c1' : 'transparent',
                                                        color: project?.environmentalSurvey?.inValley === false ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.environmentalSurvey?.inValley === false ? '#5a3aa1' : '#f3f4f6',
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
                                                        backgroundColor: project?.environmentalSurvey?.inValley === true ? '#6b47c1' : 'transparent',
                                                        color: project?.environmentalSurvey?.inValley === true ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.environmentalSurvey?.inValley === true ? '#5a3aa1' : '#f3f4f6',
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

                                        {/* שאלות עבודות בניה */}
                                        <Box sx={{ gridColumn: '1 / -1', mb: 2 }}>
                                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                                עבודות בניה מיוחדות
                                            </Typography>

                                            {/* גריד של 2 עמודות */}
                                            <Box sx={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: 2,
                                                mb: 2
                                            }}>
                                                {/* שורה 1 - עבודות פיצוץ */}
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
                                                        עבודות פיצוץ
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
                                                            onClick={() => handleNestedFieldChange('environmentalSurvey.blastingWork', false)}
                                                            disabled={mode === 'view' || !canEdit}
                                                            sx={{
                                                                borderRadius: '0 4px 4px 0',
                                                                border: '1px solid #d1d5db',
                                                                borderLeft: 'none',
                                                                backgroundColor: project?.environmentalSurvey?.blastingWork === false ? '#6b47c1' : 'transparent',
                                                                color: project?.environmentalSurvey?.blastingWork === false ? 'white' : '#6b47c1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.environmentalSurvey?.blastingWork === false ? '#5a3aa1' : '#f3f4f6',
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
                                                            onClick={() => handleNestedFieldChange('environmentalSurvey.blastingWork', true)}
                                                            disabled={mode === 'view' || !canEdit}
                                                            sx={{
                                                                borderRadius: '4px 0 0 4px',
                                                                border: '1px solid #d1d5db',
                                                                backgroundColor: project?.environmentalSurvey?.blastingWork === true ? '#6b47c1' : 'transparent',
                                                                color: project?.environmentalSurvey?.blastingWork === true ? 'white' : '#6b47c1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.environmentalSurvey?.blastingWork === true ? '#5a3aa1' : '#f3f4f6',
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
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'flex-end'
                                                }}>
                                                    {project?.environmentalSurvey?.blastingWork === true && (
                                                        <TextField
                                                            fullWidth
                                                            label="שם הקבלן המבצע"
                                                            value={project?.environmentalSurvey?.blastingContractor || ''}
                                                            onChange={(e) => handleNestedFieldChange('environmentalSurvey.blastingContractor', e.target.value)}
                                                            disabled={mode === 'view' || !canEdit}
                                                            size="small"
                                                            sx={{
                                                                direction: 'rtl',
                                                                '& .MuiInputBase-root': {
                                                                    minHeight: '56px'
                                                                }
                                                            }}
                                                        />
                                                    )}
                                                </Box>

                                                {/* שורה 2 - עבודות חציבה */}
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
                                                        עבודות חציבה
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
                                                            onClick={() => handleNestedFieldChange('environmentalSurvey.quarryingWork', false)}
                                                            disabled={mode === 'view' || !canEdit}
                                                            sx={{
                                                                borderRadius: '0 4px 4px 0',
                                                                border: '1px solid #d1d5db',
                                                                borderLeft: 'none',
                                                                backgroundColor: project?.environmentalSurvey?.quarryingWork === false ? '#6b47c1' : 'transparent',
                                                                color: project?.environmentalSurvey?.quarryingWork === false ? 'white' : '#6b47c1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.environmentalSurvey?.quarryingWork === false ? '#5a3aa1' : '#f3f4f6',
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
                                                            onClick={() => handleNestedFieldChange('environmentalSurvey.quarryingWork', true)}
                                                            disabled={mode === 'view' || !canEdit}
                                                            sx={{
                                                                borderRadius: '4px 0 0 4px',
                                                                border: '1px solid #d1d5db',
                                                                backgroundColor: project?.environmentalSurvey?.quarryingWork === true ? '#6b47c1' : 'transparent',
                                                                color: project?.environmentalSurvey?.quarryingWork === true ? 'white' : '#6b47c1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.environmentalSurvey?.quarryingWork === true ? '#5a3aa1' : '#f3f4f6',
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
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'flex-end'
                                                }}>
                                                    {project?.environmentalSurvey?.quarryingWork === true && (
                                                        <TextField
                                                            fullWidth
                                                            label="שם הקבלן המבצע"
                                                            value={project?.environmentalSurvey?.quarryingContractor || ''}
                                                            onChange={(e) => handleNestedFieldChange('environmentalSurvey.quarryingContractor', e.target.value)}
                                                            disabled={mode === 'view' || !canEdit}
                                                            size="small"
                                                            sx={{
                                                                direction: 'rtl',
                                                                '& .MuiInputBase-root': {
                                                                    minHeight: '56px'
                                                                }
                                                            }}
                                                        />
                                                    )}
                                                </Box>

                                                {/* שורה 3 - עבודות הריסה */}
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
                                                        עבודות הריסה
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
                                                            onClick={() => handleNestedFieldChange('environmentalSurvey.demolitionWork', false)}
                                                            disabled={mode === 'view' || !canEdit}
                                                            sx={{
                                                                borderRadius: '0 4px 4px 0',
                                                                border: '1px solid #d1d5db',
                                                                borderLeft: 'none',
                                                                backgroundColor: project?.environmentalSurvey?.demolitionWork === false ? '#6b47c1' : 'transparent',
                                                                color: project?.environmentalSurvey?.demolitionWork === false ? 'white' : '#6b47c1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.environmentalSurvey?.demolitionWork === false ? '#5a3aa1' : '#f3f4f6',
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
                                                            onClick={() => handleNestedFieldChange('environmentalSurvey.demolitionWork', true)}
                                                            disabled={mode === 'view' || !canEdit}
                                                            sx={{
                                                                borderRadius: '4px 0 0 4px',
                                                                border: '1px solid #d1d5db',
                                                                backgroundColor: project?.environmentalSurvey?.demolitionWork === true ? '#6b47c1' : 'transparent',
                                                                color: project?.environmentalSurvey?.demolitionWork === true ? 'white' : '#6b47c1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.environmentalSurvey?.demolitionWork === true ? '#5a3aa1' : '#f3f4f6',
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
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'flex-end'
                                                }}>
                                                    {project?.environmentalSurvey?.demolitionWork === true && (
                                                        <TextField
                                                            fullWidth
                                                            label="שם הקבלן המבצע"
                                                            value={project?.environmentalSurvey?.demolitionContractor || ''}
                                                            onChange={(e) => handleNestedFieldChange('environmentalSurvey.demolitionContractor', e.target.value)}
                                                            disabled={mode === 'view' || !canEdit}
                                                            size="small"
                                                            sx={{
                                                                direction: 'rtl',
                                                                '& .MuiInputBase-root': {
                                                                    minHeight: '56px'
                                                                }
                                                            }}
                                                        />
                                                    )}
                                                </Box>

                                                {/* שורה 4 - קירות תמך */}
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
                                                        קירות תמך
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
                                                            onClick={() => handleNestedFieldChange('environmentalSurvey.retainingWalls', false)}
                                                            disabled={mode === 'view' || !canEdit}
                                                            sx={{
                                                                borderRadius: '0 4px 4px 0',
                                                                border: '1px solid #d1d5db',
                                                                borderLeft: 'none',
                                                                backgroundColor: project?.environmentalSurvey?.retainingWalls === false ? '#6b47c1' : 'transparent',
                                                                color: project?.environmentalSurvey?.retainingWalls === false ? 'white' : '#6b47c1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.environmentalSurvey?.retainingWalls === false ? '#5a3aa1' : '#f3f4f6',
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
                                                            onClick={() => handleNestedFieldChange('environmentalSurvey.retainingWalls', true)}
                                                            disabled={mode === 'view' || !canEdit}
                                                            sx={{
                                                                borderRadius: '4px 0 0 4px',
                                                                border: '1px solid #d1d5db',
                                                                backgroundColor: project?.environmentalSurvey?.retainingWalls === true ? '#6b47c1' : 'transparent',
                                                                color: project?.environmentalSurvey?.retainingWalls === true ? 'white' : '#6b47c1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.environmentalSurvey?.retainingWalls === true ? '#5a3aa1' : '#f3f4f6',
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
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'flex-end'
                                                }}>
                                                    {project?.environmentalSurvey?.retainingWalls === true && (
                                                        <TextField
                                                            fullWidth
                                                            label="שם הקבלן המבצע"
                                                            value={project?.environmentalSurvey?.retainingWallsContractor || ''}
                                                            onChange={(e) => handleNestedFieldChange('environmentalSurvey.retainingWallsContractor', e.target.value)}
                                                            disabled={mode === 'view' || !canEdit}
                                                            size="small"
                                                            sx={{
                                                                direction: 'rtl',
                                                                '& .MuiInputBase-root': {
                                                                    minHeight: '56px'
                                                                }
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            </Box>
                                        </Box>

                                        {/* טבלת מרחקים לשירותי חירום */}
                                        <Box sx={{ gridColumn: '1 / -1', mb: 2 }}>
                                            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                                שירותי חירום
                                            </Typography>
                                            <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e0e0e0', overflow: 'auto', maxWidth: '100%' }}>
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
                                                                            '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
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
                                                                            '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
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
                                                                            '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
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
                                                                            '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
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
                                                                            '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
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
                                                                            '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
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
                                                                            '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
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
                                                                            '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
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
                                                                            '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
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
                                                                            '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
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
                                                                            '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
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
                                                                            '&.Mui-focused fieldset': { borderColor: '#6b47c1' }
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
                                            label="חוות דעת הידרולוג"
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
                                                        backgroundColor: project?.hydrologicalPlan?.runoffTreatmentPlan === false ? '#6b47c1' : 'transparent',
                                                        color: project?.hydrologicalPlan?.runoffTreatmentPlan === false ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.hydrologicalPlan?.runoffTreatmentPlan === false ? '#5a3aa1' : '#f3f4f6',
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
                                                        backgroundColor: project?.hydrologicalPlan?.runoffTreatmentPlan === true ? '#6b47c1' : 'transparent',
                                                        color: project?.hydrologicalPlan?.runoffTreatmentPlan === true ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.hydrologicalPlan?.runoffTreatmentPlan === true ? '#5a3aa1' : '#f3f4f6',
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
                                                        backgroundColor: project?.hydrologicalPlan?.entrancesOppositeWaterFlow === false ? '#6b47c1' : 'transparent',
                                                        color: project?.hydrologicalPlan?.entrancesOppositeWaterFlow === false ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.hydrologicalPlan?.entrancesOppositeWaterFlow === false ? '#5a3aa1' : '#f3f4f6',
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
                                                        backgroundColor: project?.hydrologicalPlan?.entrancesOppositeWaterFlow === true ? '#6b47c1' : 'transparent',
                                                        color: project?.hydrologicalPlan?.entrancesOppositeWaterFlow === true ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.hydrologicalPlan?.entrancesOppositeWaterFlow === true ? '#5a3aa1' : '#f3f4f6',
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
                                                        backgroundColor: project?.hydrologicalPlan?.basementPumpsAvailable === false ? '#6b47c1' : 'transparent',
                                                        color: project?.hydrologicalPlan?.basementPumpsAvailable === false ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.hydrologicalPlan?.basementPumpsAvailable === false ? '#5a3aa1' : '#f3f4f6',
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
                                                        backgroundColor: project?.hydrologicalPlan?.basementPumpsAvailable === true ? '#6b47c1' : 'transparent',
                                                        color: project?.hydrologicalPlan?.basementPumpsAvailable === true ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.hydrologicalPlan?.basementPumpsAvailable === true ? '#5a3aa1' : '#f3f4f6',
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

                                    {/* שורה ראשונה - העלאת קובץ, שם קובץ, תאריך */}
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 3, mb: 3 }}>
                                        <FileUpload
                                            label="לוח זמנים לפרוייקט (גאנט)"
                                            value={project?.schedule?.file}
                                            onChange={(url) => handleNestedFieldChange('schedule.file', url)}
                                            onDelete={() => handleNestedFieldChange('schedule.file', '')}
                                            disabled={mode === 'view' || !canEdit}
                                            accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png"
                                            projectId={project?._id || project?.id}
                                        />

                                        <TextField
                                            fullWidth
                                            label="שם הקובץ"
                                            value={project?.schedule?.fileName || ''}
                                            onChange={(e) => handleNestedFieldChange('schedule.fileName', e.target.value)}
                                            disabled={mode === 'view' || !canEdit}
                                        />

                                        <TextField
                                            fullWidth
                                            label="תאריך יצירת המסמך"
                                            type="date"
                                            value={project?.schedule?.fileCreationDate || ''}
                                            onChange={(e) => handleNestedFieldChange('schedule.fileCreationDate', e.target.value)}
                                            disabled={mode === 'view' || !canEdit}
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Box>

                                    {/* שורה שנייה - שאר השדות */}
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(300px, 1fr))' }, gap: 3, mb: 3 }}>
                                        <FormControl fullWidth>
                                            <InputLabel
                                                shrink={true}
                                                sx={{
                                                    '&.Mui-focused': {
                                                        color: '#8B5CF6'
                                                    }
                                                }}
                                            >רמת הפירוט</InputLabel>
                                            <Select
                                                value={project?.schedule?.detailLevel || ''}
                                                onChange={(e) => handleNestedFieldChange('schedule.detailLevel', e.target.value)}
                                                disabled={mode === 'view' || !canEdit}
                                                variant="outlined"
                                                sx={{
                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: '#8B5CF6'
                                                    }
                                                }}
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
                                    </Box>
                                </Box>

                                {/* סקשן בטיחות */}
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                        בטיחות
                                    </Typography>

                                    <FileUpload
                                        label="תוכנית התארגנות אתר"
                                        value={fileUploadState.siteOrganizationPlan?.url || project?.siteOrganizationPlan?.file || ''}
                                        thumbnailUrl={fileUploadState.siteOrganizationPlan?.thumbnailUrl || project?.siteOrganizationPlan?.thumbnailUrl || ''}
                                        projectId={project?._id || project?.id}
                                        onChange={async (url, thumbnailUrl) => {
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

                                            // Save to database immediately if we have a project ID
                                            if (project?._id || project?.id) {
                                                try {
                                                    console.log('💾 Saving file data to database immediately...');
                                                    const { projectsAPI } = await import('../services/api');

                                                    const updateData = {
                                                        'siteOrganizationPlan.file': url,
                                                        'siteOrganizationPlan.thumbnailUrl': thumbnailUrl || ''
                                                    };

                                                    console.log('💾 Update data:', updateData);
                                                    await projectsAPI.update(project._id || project.id, updateData);
                                                    console.log('✅ File data saved to database successfully');

                                                    // Auto-save the project after successful upload
                                                    console.log('💾 Auto-saving project after upload');
                                                    await handleSave();
                                                    console.log('✅ Project auto-saved after upload');
                                                } catch (error) {
                                                    console.error('❌ Failed to save file data to database:', error);
                                                }
                                            } else {
                                                console.log('⚠️ No project ID available, cannot save to database yet');
                                            }

                                            // Also try to update project state (may fail if project is null)
                                            handleNestedFieldChange('siteOrganizationPlan.file', url);
                                            if (thumbnailUrl) {
                                                handleNestedFieldChange('siteOrganizationPlan.thumbnailUrl', thumbnailUrl);
                                            }
                                        }}
                                        onDelete={async () => {
                                            console.log('🗑️ Deleting site organization plan file');

                                            try {
                                                // Check if project exists
                                                if (!project) {
                                                    console.error('❌ Project is null, cannot delete file');
                                                    alert('שגיאה: לא ניתן למחוק קובץ - פרויקט לא נטען');
                                                    return;
                                                }

                                                // Get current values before deletion
                                                const currentFileUrl = fileUploadState.siteOrganizationPlan?.url || project?.siteOrganizationPlan?.file;
                                                const currentThumbnailUrl = fileUploadState.siteOrganizationPlan?.thumbnailUrl || project?.siteOrganizationPlan?.thumbnailUrl;

                                                console.log('🗑️ Current file URL:', currentFileUrl);
                                                console.log('🗑️ Current thumbnail URL:', currentThumbnailUrl);

                                                // 1. FIRST: Clear UI immediately for better UX
                                                console.log('🔄 Clearing fileUploadState for immediate UI update');
                                                setFileUploadState(prev => {
                                                    const newState = {
                                                        ...prev,
                                                        siteOrganizationPlan: {
                                                            url: '',
                                                            thumbnailUrl: '',
                                                            creationDate: ''
                                                        }
                                                    };
                                                    console.log('🔄 New fileUploadState after clearing:', newState);
                                                    return newState;
                                                });

                                                // Update local state immediately
                                                handleNestedFieldChange('siteOrganizationPlan.file', '');
                                                handleNestedFieldChange('siteOrganizationPlan.thumbnailUrl', '');
                                                handleNestedFieldChange('siteOrganizationPlan.fileCreationDate', '');

                                                // 2. THEN: Delete from blob storage if URLs exist
                                                if (currentFileUrl || currentThumbnailUrl) {
                                                    console.log('🗑️ Deleting files from blob storage:', { currentFileUrl, currentThumbnailUrl });
                                                    const { authenticatedFetch } = await import('../config/api');
                                                    const response = await authenticatedFetch('/api/delete-project-file', {
                                                        method: 'DELETE',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                                                        },
                                                        body: JSON.stringify({
                                                            fileUrl: currentFileUrl,
                                                            thumbnailUrl: currentThumbnailUrl
                                                        })
                                                    });

                                                    if (!response.ok) {
                                                        const errorText = await response.text();
                                                        console.error('❌ Delete file failed:', response.status, errorText);
                                                        throw new Error('Failed to delete file from storage');
                                                    }
                                                    console.log('✅ Files deleted from blob storage successfully');
                                                }

                                                // 3. FINALLY: Update database and auto-save
                                                if (project?._id || project?.id) {
                                                    console.log('🗑️ Updating database to clear file data');
                                                    const { projectsAPI } = await import('../services/api');
                                                    const projectId = project._id || project.id;

                                                    const updateData = {
                                                        'siteOrganizationPlan.file': '',
                                                        'siteOrganizationPlan.thumbnailUrl': '',
                                                        'siteOrganizationPlan.fileCreationDate': ''
                                                    };

                                                    await projectsAPI.update(projectId, updateData);
                                                    console.log('✅ Database updated successfully');

                                                    // Auto-save the project after successful deletion
                                                    console.log('💾 Auto-saving project after deletion');
                                                    await handleSave();
                                                    console.log('✅ Project auto-saved after deletion');
                                                }

                                                console.log('✅ File deletion completed successfully');

                                            } catch (error) {
                                                console.error('❌ Error deleting file:', error);
                                                alert('שגיאה במחיקת הקובץ: ' + error.message);

                                                // Revert UI changes if deletion failed
                                                console.log('🔄 Reverting UI changes due to deletion failure');
                                                setFileUploadState(prev => {
                                                    const newState = {
                                                        ...prev,
                                                        siteOrganizationPlan: {
                                                            url: prev.siteOrganizationPlan?.url || '',
                                                            thumbnailUrl: prev.siteOrganizationPlan?.thumbnailUrl || '',
                                                            creationDate: prev.siteOrganizationPlan?.creationDate || ''
                                                        }
                                                    };
                                                    return newState;
                                                });
                                            }
                                        }}
                                        disabled={mode === 'view' || !canEdit}
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        showCreationDate={true}
                                        creationDateValue={fileUploadState.siteOrganizationPlan?.creationDate || project?.siteOrganizationPlan?.fileCreationDate || ''}
                                        onCreationDateChange={async (date) => {
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

                                            // Save to database immediately if we have a project ID
                                            if (project?._id || project?.id) {
                                                try {
                                                    console.log('💾 Saving creation date to database immediately...');
                                                    const { projectsAPI } = await import('../services/api');

                                                    const updateData = {
                                                        'siteOrganizationPlan.fileCreationDate': date
                                                    };

                                                    console.log('💾 Update data:', updateData);
                                                    await projectsAPI.update(project._id || project.id, updateData);
                                                    console.log('✅ Creation date saved to database successfully');

                                                    // Auto-save the project after successful creation date update
                                                    console.log('💾 Auto-saving project after creation date update');
                                                    await handleSave();
                                                    console.log('✅ Project auto-saved after creation date update');
                                                } catch (error) {
                                                    console.error('❌ Failed to save creation date to database:', error);
                                                }
                                            } else {
                                                console.log('⚠️ No project ID available, cannot save to database yet');
                                            }

                                            // Also try to update project state (may fail if project is null)
                                            handleNestedFieldChange('siteOrganizationPlan.fileCreationDate', date);
                                        }}
                                        projectId={project?._id || project?.id}
                                        autoSave={true}
                                        onAutoSave={handleSave}
                                    />

                                    <Box sx={{ mt: 4 }}>
                                        <FileUpload
                                            label="תוכנית אבטחת אתר"
                                            value={fileUploadState.siteSecurityPlan?.url || project?.siteSecurityPlan?.file || ''}
                                            thumbnailUrl={fileUploadState.siteSecurityPlan?.thumbnailUrl || project?.siteSecurityPlan?.thumbnailUrl || ''}
                                            projectId={project?._id || project?.id}
                                            onChange={async (url, thumbnailUrl) => {
                                                console.log('🔄 FileUpload onChange called with:', { url, thumbnailUrl });

                                                // Update fileUploadState immediately for UI display
                                                setFileUploadState(prev => {
                                                    const newState = {
                                                        ...prev,
                                                        siteSecurityPlan: {
                                                            ...prev.siteSecurityPlan,
                                                            url: url,
                                                            thumbnailUrl: thumbnailUrl
                                                        }
                                                    };
                                                    console.log('🔄 Updated fileUploadState:', newState);
                                                    return newState;
                                                });

                                                // Save to database immediately if we have a project ID
                                                if (project?._id || project?.id) {
                                                    try {
                                                        console.log('💾 Saving file data to database immediately...');
                                                        const { projectsAPI } = await import('../services/api');

                                                        const updateData = {
                                                            'siteSecurityPlan.file': url,
                                                            'siteSecurityPlan.thumbnailUrl': thumbnailUrl || ''
                                                        };

                                                        console.log('💾 Update data:', updateData);
                                                        await projectsAPI.update(project._id || project.id, updateData);
                                                        console.log('✅ File data saved to database successfully');

                                                        // Auto-save the project after successful upload
                                                        console.log('💾 Auto-saving project after upload');
                                                        await handleSave();
                                                        console.log('✅ Project auto-saved after upload');
                                                    } catch (error) {
                                                        console.error('❌ Failed to save file data to database:', error);
                                                    }
                                                } else {
                                                    console.log('⚠️ No project ID available, cannot save to database yet');
                                                }

                                                // Also try to update project state (may fail if project is null)
                                                handleNestedFieldChange('siteSecurityPlan.file', url);
                                                if (thumbnailUrl) {
                                                    handleNestedFieldChange('siteSecurityPlan.thumbnailUrl', thumbnailUrl);
                                                }
                                            }}
                                            onDelete={async () => {
                                                console.log('🗑️ Deleting site security plan file');

                                                try {
                                                    // Check if project exists
                                                    if (!project) {
                                                        console.error('❌ Project is null, cannot delete file');
                                                        alert('שגיאה: לא ניתן למחוק קובץ - פרויקט לא נטען');
                                                        return;
                                                    }

                                                    // Get current values before deletion
                                                    const currentFileUrl = fileUploadState.siteSecurityPlan?.url || project?.siteSecurityPlan?.file;
                                                    const currentThumbnailUrl = fileUploadState.siteSecurityPlan?.thumbnailUrl || project?.siteSecurityPlan?.thumbnailUrl;

                                                    console.log('🗑️ Current file URL:', currentFileUrl);
                                                    console.log('🗑️ Current thumbnail URL:', currentThumbnailUrl);

                                                    // 1. FIRST: Clear UI immediately for better UX
                                                    console.log('🔄 Clearing fileUploadState for immediate UI update');
                                                    setFileUploadState(prev => {
                                                        const newState = {
                                                            ...prev,
                                                            siteSecurityPlan: {
                                                                url: '',
                                                                thumbnailUrl: '',
                                                                creationDate: ''
                                                            }
                                                        };
                                                        console.log('🔄 New fileUploadState after clearing:', newState);
                                                        return newState;
                                                    });

                                                    // Update local state immediately
                                                    handleNestedFieldChange('siteSecurityPlan.file', '');
                                                    handleNestedFieldChange('siteSecurityPlan.thumbnailUrl', '');
                                                    handleNestedFieldChange('siteSecurityPlan.fileCreationDate', '');

                                                    // 2. THEN: Delete from blob storage if URLs exist
                                                    if (currentFileUrl || currentThumbnailUrl) {
                                                        console.log('🗑️ Deleting files from blob storage:', { currentFileUrl, currentThumbnailUrl });
                                                        const { authenticatedFetch } = await import('../config/api');
                                                        const response = await authenticatedFetch('/api/delete-project-file', {
                                                            method: 'DELETE',
                                                            headers: {
                                                                'Content-Type': 'application/json',
                                                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                                                            },
                                                            body: JSON.stringify({
                                                                fileUrl: currentFileUrl,
                                                                thumbnailUrl: currentThumbnailUrl
                                                            })
                                                        });

                                                        if (!response.ok) {
                                                            const errorText = await response.text();
                                                            console.error('❌ Delete file failed:', response.status, errorText);
                                                            throw new Error('Failed to delete file from storage');
                                                        }
                                                        console.log('✅ Files deleted from blob storage successfully');
                                                    }

                                                    // 3. FINALLY: Update database and auto-save
                                                    if (project?._id || project?.id) {
                                                        console.log('🗑️ Updating database to clear file data');
                                                        const { projectsAPI } = await import('../services/api');
                                                        const projectId = project._id || project.id;

                                                        const updateData = {
                                                            'siteSecurityPlan.file': '',
                                                            'siteSecurityPlan.thumbnailUrl': '',
                                                            'siteSecurityPlan.fileCreationDate': ''
                                                        };

                                                        await projectsAPI.update(projectId, updateData);
                                                        console.log('✅ Database updated successfully');

                                                        // Auto-save the project after successful deletion
                                                        console.log('💾 Auto-saving project after deletion');
                                                        await handleSave();
                                                        console.log('✅ Project auto-saved after deletion');
                                                    }

                                                    console.log('✅ File deletion completed successfully');

                                                } catch (error) {
                                                    console.error('❌ Error deleting file:', error);
                                                    alert('שגיאה במחיקת הקובץ: ' + error.message);

                                                    // Revert UI changes if deletion failed
                                                    console.log('🔄 Reverting UI changes due to deletion failure');
                                                    setFileUploadState(prev => {
                                                        const newState = {
                                                            ...prev,
                                                            siteSecurityPlan: {
                                                                url: prev.siteSecurityPlan?.url || '',
                                                                thumbnailUrl: prev.siteSecurityPlan?.thumbnailUrl || '',
                                                                creationDate: prev.siteSecurityPlan?.creationDate || ''
                                                            }
                                                        };
                                                        return newState;
                                                    });
                                                }
                                            }}
                                            disabled={mode === 'view' || !canEdit}
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            showCreationDate={true}
                                            creationDateValue={fileUploadState.siteSecurityPlan?.creationDate || project?.siteSecurityPlan?.fileCreationDate || ''}
                                            onCreationDateChange={async (date) => {
                                                console.log('🔄 FileUpload onCreationDateChange called with:', date);

                                                // Update fileUploadState immediately for UI display
                                                setFileUploadState(prev => {
                                                    const newState = {
                                                        ...prev,
                                                        siteSecurityPlan: {
                                                            ...prev.siteSecurityPlan,
                                                            creationDate: date
                                                        }
                                                    };
                                                    console.log('🔄 Updated fileUploadState with creation date:', newState);
                                                    return newState;
                                                });

                                                // Save to database immediately if we have a project ID
                                                if (project?._id || project?.id) {
                                                    try {
                                                        console.log('💾 Saving creation date to database immediately...');
                                                        const { projectsAPI } = await import('../services/api');

                                                        const updateData = {
                                                            'siteSecurityPlan.fileCreationDate': date
                                                        };

                                                        console.log('💾 Update data:', updateData);
                                                        await projectsAPI.update(project._id || project.id, updateData);
                                                        console.log('✅ Creation date saved to database successfully');

                                                        // Auto-save the project after successful creation date update
                                                        console.log('💾 Auto-saving project after creation date update');
                                                        await handleSave();
                                                        console.log('✅ Project auto-saved after creation date update');
                                                    } catch (error) {
                                                        console.error('❌ Failed to save creation date to database:', error);
                                                    }
                                                } else {
                                                    console.log('⚠️ No project ID available, cannot save to database yet');
                                                }

                                                // Also try to update project state (may fail if project is null)
                                                handleNestedFieldChange('siteSecurityPlan.fileCreationDate', date);
                                            }}
                                            projectId={project?._id || project?.id}
                                            autoSave={true}
                                            onAutoSave={handleSave}
                                        />
                                    </Box>
                                </Box>

                                {/* סקשן תחזוקת מכונות וציוד */}
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                        תחזוקת מכונות וציוד
                                    </Typography>

                                    {/* גריד של 2 עמודות */}
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 2,
                                        mb: 2
                                    }}>
                                        {/* שורה 1 - איש/צוות תחזוקה מיומן */}
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            mb: 2,
                                            border: '1px solid #d1d5db',
                                            borderRadius: '4px',
                                            padding: '12px',
                                            backgroundColor: 'white',
                                            minHeight: '56px'
                                        }}>
                                            <Checkbox
                                                checked={project?.machineMaintenance?.skilledMaintenance === true}
                                                onChange={(e) => handleNestedFieldChange('machineMaintenance.skilledMaintenance', e.target.checked)}
                                                disabled={mode === 'view' || !canEdit}
                                                sx={{
                                                    color: '#8B5CF6',
                                                    '&.Mui-checked': {
                                                        color: '#8B5CF6',
                                                    },
                                                }}
                                            />
                                            <Typography variant="body2" sx={{ mr: 1 }}>
                                                איש/צוות תחזוקה מיומן המועסק במישרין
                                            </Typography>
                                        </Box>
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'flex-end'
                                        }}>
                                            {/* אין שדה נוסף לאפשרות זו */}
                                        </Box>

                                        {/* שורה 2 - חברה חיצונית */}
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            mb: 2,
                                            border: '1px solid #d1d5db',
                                            borderRadius: '4px',
                                            padding: '12px',
                                            backgroundColor: 'white',
                                            minHeight: '56px'
                                        }}>
                                            <Checkbox
                                                checked={project?.machineMaintenance?.externalCompany === true}
                                                onChange={(e) => handleNestedFieldChange('machineMaintenance.externalCompany', e.target.checked)}
                                                disabled={mode === 'view' || !canEdit}
                                                sx={{
                                                    color: '#8B5CF6',
                                                    '&.Mui-checked': {
                                                        color: '#8B5CF6',
                                                    },
                                                }}
                                            />
                                            <Typography variant="body2" sx={{ mr: 1 }}>
                                                חברה חיצונית המספקת שרותי תחזוקה
                                            </Typography>
                                        </Box>
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'flex-end'
                                        }}>
                                            {project?.machineMaintenance?.externalCompany === true && (
                                                <TextField
                                                    fullWidth
                                                    label="שם החברה"
                                                    value={project?.machineMaintenance?.externalCompanyName || ''}
                                                    onChange={(e) => handleNestedFieldChange('machineMaintenance.externalCompanyName', e.target.value)}
                                                    disabled={mode === 'view' || !canEdit}
                                                    size="small"
                                                    sx={{
                                                        direction: 'rtl',
                                                        '& .MuiInputBase-root': {
                                                            minHeight: '56px'
                                                        },
                                                        '& .MuiInputLabel-root': {
                                                            top: '-8px'
                                                        }
                                                    }}
                                                />
                                            )}
                                        </Box>

                                        {/* שורה 3 - גורם מקצועי אחר */}
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            mb: 2,
                                            border: '1px solid #d1d5db',
                                            borderRadius: '4px',
                                            padding: '12px',
                                            backgroundColor: 'white',
                                            minHeight: '56px'
                                        }}>
                                            <Checkbox
                                                checked={project?.machineMaintenance?.otherProfessional === true}
                                                onChange={(e) => handleNestedFieldChange('machineMaintenance.otherProfessional', e.target.checked)}
                                                disabled={mode === 'view' || !canEdit}
                                                sx={{
                                                    color: '#8B5CF6',
                                                    '&.Mui-checked': {
                                                        color: '#8B5CF6',
                                                    },
                                                }}
                                            />
                                            <Typography variant="body2" sx={{ mr: 1 }}>
                                                גורם מקצועי אחר המספק שרותי תחזוקה
                                            </Typography>
                                        </Box>
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'flex-end'
                                        }}>
                                            {project?.machineMaintenance?.otherProfessional === true && (
                                                <TextField
                                                    fullWidth
                                                    label="פירוט הגורם המקצועי"
                                                    value={project?.machineMaintenance?.otherProfessionalDetails || ''}
                                                    onChange={(e) => handleNestedFieldChange('machineMaintenance.otherProfessionalDetails', e.target.value)}
                                                    disabled={mode === 'view' || !canEdit}
                                                    size="small"
                                                    sx={{
                                                        direction: 'rtl',
                                                        '& .MuiInputBase-root': {
                                                            minHeight: '56px'
                                                        },
                                                        '& .MuiInputLabel-root': {
                                                            top: '-8px'
                                                        }
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        )}


                        {activeTab === 2 && (
                            <Box>
                                {/* סקשן 1 - דוח FS (אפ.אס) */}
                                <Box sx={{ mb: 4 }}>
                                    <FileUpload
                                        label="דוח FS (אפ.אס)"
                                        value={fileUploadState.reportFS?.url || project?.reportFS?.file || ''}
                                        thumbnailUrl={fileUploadState.reportFS?.thumbnailUrl || project?.reportFS?.thumbnailUrl || ''}
                                        projectId={project?._id || project?.id}
                                        aiIcon={
                                            <AutoAwesomeIcon
                                                sx={{
                                                    color: '#6b47c1',
                                                    fontSize: '24px',
                                                    filter: 'drop-shadow(0 0 4px rgba(107, 70, 193, 0.3))'
                                                }}
                                            />
                                        }
                                        onChange={async (url, thumbnailUrl) => {
                                            console.log('🔄 Zero Report FileUpload onChange called with:', { url, thumbnailUrl });

                                            setFileUploadState(prev => ({
                                                ...prev,
                                                reportFS: {
                                                    ...prev.reportFS,
                                                    url: url,
                                                    thumbnailUrl: thumbnailUrl
                                                }
                                            }));

                                            if (project?._id || project?.id) {
                                                try {
                                                    const { projectsAPI } = await import('../services/api');
                                                    const updateData = {
                                                        'reportFS.file': url,
                                                        'reportFS.thumbnailUrl': thumbnailUrl || ''
                                                    };
                                                    await projectsAPI.update(project._id || project.id, updateData);
                                                    await handleSave();
                                                } catch (error) {
                                                    console.error('❌ Failed to save zero report file:', error);
                                                }
                                            }

                                            handleNestedFieldChange('reportFS.file', url);
                                            if (thumbnailUrl) {
                                                handleNestedFieldChange('reportFS.thumbnailUrl', thumbnailUrl);
                                            }
                                        }}
                                        onDelete={async () => {
                                            console.log('🗑️ Deleting zero report file');
                                            try {
                                                if (!project) {
                                                    console.error('❌ Project is null, cannot delete file');
                                                    alert('שגיאה: לא ניתן למחוק קובץ - פרויקט לא נטען');
                                                    return;
                                                }

                                                const currentFileUrl = fileUploadState.reportFS?.url || project?.reportFS?.file;
                                                const currentThumbnailUrl = fileUploadState.reportFS?.thumbnailUrl || project?.reportFS?.thumbnailUrl;

                                                setFileUploadState(prev => ({
                                                    ...prev,
                                                    reportFS: {
                                                        url: '',
                                                        thumbnailUrl: '',
                                                        creationDate: ''
                                                    }
                                                }));

                                                handleNestedFieldChange('reportFS.file', '');
                                                handleNestedFieldChange('reportFS.thumbnailUrl', '');
                                                handleNestedFieldChange('reportFS.fileCreationDate', '');

                                                if (currentFileUrl || currentThumbnailUrl) {
                                                    const { authenticatedFetch } = await import('../config/api');
                                                    const response = await authenticatedFetch('/api/delete-project-file', {
                                                        method: 'DELETE',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                                                        },
                                                        body: JSON.stringify({
                                                            fileUrl: currentFileUrl,
                                                            thumbnailUrl: currentThumbnailUrl
                                                        })
                                                    });

                                                    if (!response.ok) {
                                                        throw new Error('Failed to delete file from storage');
                                                    }
                                                }

                                                if (project?._id || project?.id) {
                                                    const { projectsAPI } = await import('../services/api');
                                                    const projectId = project._id || project.id;
                                                    const updateData = {
                                                        'reportFS.file': '',
                                                        'reportFS.thumbnailUrl': '',
                                                        'reportFS.fileCreationDate': ''
                                                    };
                                                    await projectsAPI.update(projectId, updateData);
                                                    await handleSave();
                                                }

                                                console.log('✅ Zero report file deletion completed successfully');
                                            } catch (error) {
                                                console.error('❌ Error deleting zero report file:', error);
                                                alert('שגיאה במחיקת הקובץ: ' + error.message);
                                            }
                                        }}
                                        disabled={mode === 'view' || !canEdit}
                                        accept=".xlsx,.xls,.csv"
                                        showCreationDate={true}
                                        creationDateValue={fileUploadState.reportFS?.creationDate || project?.reportFS?.fileCreationDate || ''}
                                        onCreationDateChange={async (date) => {
                                            console.log('🔄 Zero Report onCreationDateChange called with:', date);

                                            setFileUploadState(prev => ({
                                                ...prev,
                                                reportFS: {
                                                    ...prev.reportFS,
                                                    creationDate: date
                                                }
                                            }));

                                            if (project?._id || project?.id) {
                                                try {
                                                    const { projectsAPI } = await import('../services/api');
                                                    const updateData = {
                                                        'reportFS.fileCreationDate': date
                                                    };
                                                    await projectsAPI.update(project._id || project.id, updateData);
                                                    await handleSave();
                                                } catch (error) {
                                                    console.error('❌ Failed to save zero report creation date:', error);
                                                }
                                            }

                                            handleNestedFieldChange('reportFS.fileCreationDate', date);
                                        }}
                                        projectId={project?._id || project?.id}
                                        autoSave={true}
                                        onAutoSave={handleSave}
                                    />
                                </Box>

                                {/* סקשן 2 - דוח שמאי */}
                                <Box sx={{ mb: 4 }}>
                                    <FileUpload
                                        label="דוח שמאי"
                                        value={fileUploadState.appraiserReport?.url || project?.appraiserReport?.file || ''}
                                        thumbnailUrl={fileUploadState.appraiserReport?.thumbnailUrl || project?.appraiserReport?.thumbnailUrl || ''}
                                        projectId={project?._id || project?.id}
                                        onChange={async (url, thumbnailUrl) => {
                                            console.log('🔄 Appraiser Report FileUpload onChange called with:', { url, thumbnailUrl });

                                            setFileUploadState(prev => ({
                                                ...prev,
                                                appraiserReport: {
                                                    ...prev.appraiserReport,
                                                    url: url,
                                                    thumbnailUrl: thumbnailUrl
                                                }
                                            }));

                                            if (project?._id || project?.id) {
                                                try {
                                                    const { projectsAPI } = await import('../services/api');
                                                    const updateData = {
                                                        'appraiserReport.file': url,
                                                        'appraiserReport.thumbnailUrl': thumbnailUrl || ''
                                                    };
                                                    await projectsAPI.update(project._id || project.id, updateData);
                                                    await handleSave();
                                                } catch (error) {
                                                    console.error('❌ Failed to save appraiser report file:', error);
                                                }
                                            }

                                            handleNestedFieldChange('appraiserReport.file', url);
                                            if (thumbnailUrl) {
                                                handleNestedFieldChange('appraiserReport.thumbnailUrl', thumbnailUrl);
                                            }
                                        }}
                                        onDelete={async () => {
                                            console.log('🗑️ Deleting appraiser report file');
                                            try {
                                                if (!project) {
                                                    console.error('❌ Project is null, cannot delete file');
                                                    alert('שגיאה: לא ניתן למחוק קובץ - פרויקט לא נטען');
                                                    return;
                                                }

                                                const currentFileUrl = fileUploadState.appraiserReport?.url || project?.appraiserReport?.file;
                                                const currentThumbnailUrl = fileUploadState.appraiserReport?.thumbnailUrl || project?.appraiserReport?.thumbnailUrl;

                                                setFileUploadState(prev => ({
                                                    ...prev,
                                                    appraiserReport: {
                                                        url: '',
                                                        thumbnailUrl: '',
                                                        creationDate: ''
                                                    }
                                                }));

                                                handleNestedFieldChange('appraiserReport.file', '');
                                                handleNestedFieldChange('appraiserReport.thumbnailUrl', '');
                                                handleNestedFieldChange('appraiserReport.fileCreationDate', '');

                                                if (currentFileUrl || currentThumbnailUrl) {
                                                    const { authenticatedFetch } = await import('../config/api');
                                                    const response = await authenticatedFetch('/api/delete-project-file', {
                                                        method: 'DELETE',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                                                        },
                                                        body: JSON.stringify({
                                                            fileUrl: currentFileUrl,
                                                            thumbnailUrl: currentThumbnailUrl
                                                        })
                                                    });

                                                    if (!response.ok) {
                                                        throw new Error('Failed to delete file from storage');
                                                    }
                                                }

                                                if (project?._id || project?.id) {
                                                    const { projectsAPI } = await import('../services/api');
                                                    const projectId = project._id || project.id;
                                                    const updateData = {
                                                        'appraiserReport.file': '',
                                                        'appraiserReport.thumbnailUrl': '',
                                                        'appraiserReport.fileCreationDate': ''
                                                    };
                                                    await projectsAPI.update(projectId, updateData);
                                                    await handleSave();
                                                }

                                                console.log('✅ Appraiser report file deletion completed successfully');
                                            } catch (error) {
                                                console.error('❌ Error deleting appraiser report file:', error);
                                                alert('שגיאה במחיקת הקובץ: ' + error.message);
                                            }
                                        }}
                                        disabled={mode === 'view' || !canEdit}
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                        showCreationDate={true}
                                        creationDateValue={fileUploadState.appraiserReport?.creationDate || project?.appraiserReport?.fileCreationDate || ''}
                                        onCreationDateChange={async (date) => {
                                            console.log('🔄 Appraiser Report onCreationDateChange called with:', date);

                                            setFileUploadState(prev => ({
                                                ...prev,
                                                appraiserReport: {
                                                    ...prev.appraiserReport,
                                                    creationDate: date
                                                }
                                            }));

                                            if (project?._id || project?.id) {
                                                try {
                                                    const { projectsAPI } = await import('../services/api');
                                                    const updateData = {
                                                        'appraiserReport.fileCreationDate': date
                                                    };
                                                    await projectsAPI.update(project._id || project.id, updateData);
                                                    await handleSave();
                                                } catch (error) {
                                                    console.error('❌ Failed to save appraiser report creation date:', error);
                                                }
                                            }

                                            handleNestedFieldChange('appraiserReport.fileCreationDate', date);
                                        }}
                                        projectId={project?._id || project?.id}
                                        autoSave={true}
                                        onAutoSave={handleSave}
                                    />
                                </Box>

                                {/* סקשן 3 - טבלת עלות בניית כל מבנה */}
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                        עלויות לפי מבנים
                                    </Typography>
                                    {project?.engineeringQuestionnaire?.buildingPlan?.numberOfBuildings > 0 ? (
                                        <TableContainer component={Paper} sx={{ border: '1px solid #e0e0e0', overflow: 'auto', maxWidth: '100%' }}>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                                        <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>שם המבנה</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>עלות בנייה (₪)</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {Array.from({ length: project.engineeringQuestionnaire.buildingPlan.numberOfBuildings }, (_, index) => {
                                                        const building = project.engineeringQuestionnaire.buildingPlan.buildings?.[index];
                                                        const buildingName = building?.buildingName || `בניין ${index + 1}`;
                                                        return (
                                                            <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                                <TableCell sx={{ padding: 1 }}>
                                                                    <TextField
                                                                        fullWidth
                                                                        size="small"
                                                                        value={buildingName}
                                                                        disabled={true}
                                                                        variant="outlined"
                                                                        sx={{
                                                                            '& .MuiOutlinedInput-root': { height: 40 },
                                                                            '& .MuiInputBase-input': {
                                                                                color: 'text.secondary',
                                                                                backgroundColor: '#f5f5f5'
                                                                            }
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell sx={{ padding: 1 }}>
                                                                    <TextField
                                                                        fullWidth
                                                                        size="small"
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        value={building?.constructionCost ? '₪ ' + parseInt(building.constructionCost.toString()).toLocaleString('he-IL') : ''}
                                                                        onChange={(e) => {
                                                                            const numericValue = e.target.value.replace(/[^\d]/g, '');
                                                                            handleNestedFieldChange(`engineeringQuestionnaire.buildingPlan.buildings.${index}.constructionCost`, numericValue);
                                                                        }}
                                                                        disabled={mode === 'view' || !canEdit}
                                                                        placeholder="עלות בנייה"
                                                                        variant="outlined"
                                                                        sx={{
                                                                            '& .MuiOutlinedInput-root': { height: 40 },
                                                                            '& .MuiInputBase-input': {
                                                                                textAlign: 'right',
                                                                                direction: 'ltr'
                                                                            }
                                                                        }}
                                                                    />
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    ) : (
                                        <Box sx={{ p: 3, textAlign: 'center', backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                אין מבנים מוגדרים. אנא הגדר מספר בניינים בטאב "תוכניות" כדי לראות את הטבלה.
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>


                                {/* סקשן 3 - עלויות לפי שטחים */}
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                        עלויות לפי שטחים
                                    </Typography>
                                    <TableContainer component={Paper} sx={{ border: '1px solid #e0e0e0', overflow: 'auto', maxWidth: '100%' }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', minWidth: '200px' }}>סוג השטח</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>גודל השטח (מ״ר)</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>עלות בניה למ״ר (₪)</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>עלות הבניה (₪)</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>פעולות</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {(project?.budgetEstimate && project.budgetEstimate.length > 0 ? project.budgetEstimate : [{ areaName: '', areaSize: '', costPerSquareMeter: '' }]).map((area, index) => {
                                                    const areaSize = parseInt(area.areaSize || '0');
                                                    const costPerSqm = parseInt(area.costPerSquareMeter || '0');
                                                    const totalCost = areaSize * costPerSqm;
                                                    const isFirstRow = index === 0;

                                                    return (
                                                        <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                            <TableCell sx={{ padding: 1 }}>
                                                                <Autocomplete
                                                                    freeSolo
                                                                    options={['מרתף', 'מסחרי', 'מגורים', 'ציבורי', 'משרדים', 'חניה', 'מחסן', 'מטבח', 'סלון', 'חדרי שירות']}
                                                                    value={area.areaName || ''}
                                                                    onChange={(event, newValue) => {
                                                                        handleNestedFieldChange(`budgetEstimate.${index}.areaName`, newValue || '');
                                                                    }}
                                                                    onInputChange={(event, newInputValue) => {
                                                                        handleNestedFieldChange(`budgetEstimate.${index}.areaName`, newInputValue);
                                                                    }}
                                                                    renderInput={(params) => (
                                                                        <TextField
                                                                            {...params}
                                                                            size="small"
                                                                            placeholder="סוג השטח"
                                                                            variant="outlined"
                                                                            sx={{ '& .MuiOutlinedInput-root': { height: 40 } }}
                                                                        />
                                                                    )}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1 }}>
                                                                <TextField
                                                                    fullWidth
                                                                    size="small"
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    value={area.areaSize && area.areaSize !== '0' ? parseInt(String(area.areaSize)).toLocaleString('he-IL') : ''}
                                                                    onChange={(e) => {
                                                                        const numericValue = e.target.value.replace(/[^\d]/g, '');
                                                                        handleNestedFieldChange(`budgetEstimate.${index}.areaSize`, numericValue);
                                                                    }}
                                                                    placeholder="גודל השטח"
                                                                    variant="outlined"
                                                                    sx={{
                                                                        '& .MuiOutlinedInput-root': { height: 40 },
                                                                        '& .MuiInputBase-input': {
                                                                            textAlign: 'right',
                                                                            direction: 'ltr'
                                                                        }
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1 }}>
                                                                <TextField
                                                                    fullWidth
                                                                    size="small"
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    value={area.costPerSquareMeter && area.costPerSquareMeter !== '0' ? '₪ ' + parseInt(String(area.costPerSquareMeter)).toLocaleString('he-IL') : ''}
                                                                    onChange={(e) => {
                                                                        const numericValue = e.target.value.replace(/[^\d]/g, '');
                                                                        handleNestedFieldChange(`budgetEstimate.${index}.costPerSquareMeter`, numericValue);
                                                                    }}
                                                                    placeholder="עלות למ״ר"
                                                                    variant="outlined"
                                                                    sx={{
                                                                        '& .MuiOutlinedInput-root': { height: 40 },
                                                                        '& .MuiInputBase-input': {
                                                                            textAlign: 'right',
                                                                            direction: 'ltr'
                                                                        }
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1 }}>
                                                                <TextField
                                                                    fullWidth
                                                                    size="small"
                                                                    value={totalCost > 0 ? '₪ ' + totalCost.toLocaleString('he-IL') : ''}
                                                                    disabled={true}
                                                                    variant="outlined"
                                                                    sx={{
                                                                        '& .MuiOutlinedInput-root': { height: 40 },
                                                                        '& .MuiInputBase-input': {
                                                                            textAlign: 'right',
                                                                            direction: 'ltr',
                                                                            color: 'text.secondary',
                                                                            backgroundColor: '#f5f5f5'
                                                                        }
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1 }}>
                                                                {!isFirstRow && (
                                                                    <IconButton
                                                                        onClick={() => {
                                                                            if (window.confirm('האם אתה בטוח שברצונך למחוק את השטח?')) {
                                                                                const currentAreas = project?.budgetEstimate || [];
                                                                                const newAreas = currentAreas.filter((_, i) => i !== index);
                                                                                handleNestedFieldChange('budgetEstimate', newAreas);
                                                                            }
                                                                        }}
                                                                        title="מחיקה"
                                                                        sx={{
                                                                            '& img': {
                                                                                filter: 'brightness(0) saturate(0)',
                                                                                width: '16px',
                                                                                height: '16px'
                                                                            },
                                                                            '&:hover, &:focus': {
                                                                                backgroundColor: '#f44336',
                                                                                borderRadius: '50%'
                                                                            },
                                                                            '&:hover img, &:focus img': {
                                                                                filter: 'brightness(0) invert(1)'
                                                                            }
                                                                        }}
                                                                    >
                                                                        <img src="/assets/icon-trash.svg" alt="מחיקה" />
                                                                    </IconButton>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                                <TableRow>
                                                    <TableCell colSpan={5} sx={{ padding: 1, textAlign: 'center' }}>
                                                        <Button
                                                            variant="outlined"
                                                            onClick={() => {
                                                                const newArea = { areaName: '', areaSize: '', costPerSquareMeter: '' };
                                                                const currentAreas = project?.budgetEstimate || [];
                                                                handleNestedFieldChange('budgetEstimate', [...currentAreas, newArea]);
                                                            }}
                                                            sx={{ mr: 1 }}
                                                        >
                                                            + הוספה
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>

                                {/* סקשן 4 - חלוקה תקציבית לפי שלבי בניה */}
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                        עלויות לפי שלבי בניה
                                    </Typography>
                                    <TableContainer component={Paper} sx={{ border: '1px solid #e0e0e0', overflow: 'auto', maxWidth: '100%' }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>שם השלב</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>עלות השלב (₪)</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>פעולות</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {(project?.budgetAllocation && project.budgetAllocation.length > 0 ? project.budgetAllocation : [{ phaseName: '', phaseCost: '' }]).map((phase, index) => {
                                                    const isFirstRow = index === 0;
                                                    return (
                                                        <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                            <TableCell sx={{ padding: 1 }}>
                                                                <Autocomplete
                                                                    freeSolo
                                                                    options={['חפירה', 'שלד', 'גמר']}
                                                                    value={phase.phaseName || ''}
                                                                    onChange={(event, newValue) => {
                                                                        handleNestedFieldChange(`budgetAllocation.${index}.phaseName`, newValue || '');
                                                                    }}
                                                                    onInputChange={(event, newInputValue) => {
                                                                        handleNestedFieldChange(`budgetAllocation.${index}.phaseName`, newInputValue);
                                                                    }}
                                                                    renderInput={(params) => (
                                                                        <TextField
                                                                            {...params}
                                                                            size="small"
                                                                            placeholder="שם השלב"
                                                                            variant="outlined"
                                                                            sx={{ '& .MuiOutlinedInput-root': { height: 40 } }}
                                                                        />
                                                                    )}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1 }}>
                                                                <TextField
                                                                    fullWidth
                                                                    size="small"
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    value={phase.phaseCost && phase.phaseCost !== '0' ? '₪ ' + parseInt(String(phase.phaseCost)).toLocaleString('he-IL') : ''}
                                                                    onChange={(e) => {
                                                                        const numericValue = e.target.value.replace(/[^\d]/g, '');
                                                                        handleNestedFieldChange(`budgetAllocation.${index}.phaseCost`, numericValue);
                                                                    }}
                                                                    placeholder="עלות השלב"
                                                                    variant="outlined"
                                                                    sx={{
                                                                        '& .MuiOutlinedInput-root': { height: 40 },
                                                                        '& .MuiInputBase-input': {
                                                                            textAlign: 'right',
                                                                            direction: 'ltr'
                                                                        }
                                                                    }}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1 }}>
                                                                {!isFirstRow && (
                                                                    <IconButton
                                                                        onClick={() => {
                                                                            if (window.confirm('האם אתה בטוח שברצונך למחוק את השלב?')) {
                                                                                const currentPhases = project?.budgetAllocation || [];
                                                                                const newPhases = currentPhases.filter((_, i) => i !== index);
                                                                                handleNestedFieldChange('budgetAllocation', newPhases);
                                                                            }
                                                                        }}
                                                                        title="מחיקה"
                                                                        sx={{
                                                                            '& img': {
                                                                                filter: 'brightness(0) saturate(0)',
                                                                                width: '16px',
                                                                                height: '16px'
                                                                            },
                                                                            '&:hover, &:focus': {
                                                                                backgroundColor: '#f44336',
                                                                                borderRadius: '50%'
                                                                            },
                                                                            '&:hover img, &:focus img': {
                                                                                filter: 'brightness(0) invert(1)'
                                                                            }
                                                                        }}
                                                                    >
                                                                        <img src="/assets/icon-trash.svg" alt="מחיקה" />
                                                                    </IconButton>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                                <TableRow>
                                                    <TableCell colSpan={3} sx={{ padding: 1, textAlign: 'center' }}>
                                                        <Button
                                                            variant="outlined"
                                                            onClick={() => {
                                                                const newPhase = { phaseName: '', phaseCost: '' };
                                                                const currentPhases = project?.budgetAllocation || [];
                                                                handleNestedFieldChange('budgetAllocation', [...currentPhases, newPhase]);
                                                            }}
                                                            sx={{ mr: 1 }}
                                                        >
                                                            + הוספה
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>

                                {/* סקשן בניה ואיכלוס במקביל או מדורג */}
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                        בניה ואיכלוס במקביל או מדורג
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={4}
                                        value={project?.constructionAndOccupancyType || ''}
                                        onChange={(e) => handleNestedFieldChange('constructionAndOccupancyType', e.target.value)}
                                        disabled={mode === 'view' || !canEdit}
                                        placeholder="בניה ואיכלוס במקביל או מדורג, נא לפרט"
                                        variant="outlined"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                minHeight: '100px'
                                            }
                                        }}
                                    />
                                </Box>

                                {/* סקשן דוחות מפקח */}
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                        דוחות מפקח
                                    </Typography>
                                    <TableContainer component={Paper} sx={{ border: '1px solid #e0e0e0', overflow: 'auto', maxWidth: '100%' }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '30%' }}>דוח מפקח</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '20%' }}>תאריך יצירת הקובץ</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '45%' }}>הערות</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '5%' }}></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {(project?.supervisorReports && project.supervisorReports.length > 0 ? project.supervisorReports : [{ file: '', creationDate: '', notes: '' }]).map((report, index) => {
                                                    const isFirstRow = index === 0;
                                                    return (
                                                        <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                            <TableCell sx={{ padding: 1, width: '30%' }}>
                                                                <FileUpload
                                                                    label=""
                                                                    value={report.file || ''}
                                                                    thumbnailUrl={report.thumbnailUrl || ''}
                                                                    projectId={project?._id || project?.id}
                                                                    onChange={async (url, thumbnailUrl) => {
                                                                        handleNestedFieldChange(`supervisorReports.${index}.file`, url);
                                                                        if (thumbnailUrl) {
                                                                            handleNestedFieldChange(`supervisorReports.${index}.thumbnailUrl`, thumbnailUrl);
                                                                        }
                                                                    }}
                                                                    onDelete={async () => {
                                                                        if (window.confirm('האם אתה בטוח שברצונך למחוק את הקובץ?')) {
                                                                            handleNestedFieldChange(`supervisorReports.${index}.file`, '');
                                                                            handleNestedFieldChange(`supervisorReports.${index}.thumbnailUrl`, '');
                                                                        }
                                                                    }}
                                                                    disabled={mode === 'view' || !canEdit}
                                                                    showCreationDate={false}
                                                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1, width: '20%' }}>
                                                                <TextField
                                                                    fullWidth
                                                                    size="small"
                                                                    type="date"
                                                                    value={report.creationDate || ''}
                                                                    onChange={(e) => {
                                                                        handleNestedFieldChange(`supervisorReports.${index}.creationDate`, e.target.value);
                                                                    }}
                                                                    placeholder="תאריך יצירת הקובץ"
                                                                    variant="outlined"
                                                                    InputLabelProps={{ shrink: true }}
                                                                    sx={{ '& .MuiOutlinedInput-root': { height: 40 } }}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1, width: '45%' }}>
                                                                <TextField
                                                                    fullWidth
                                                                    size="small"
                                                                    value={report.notes || ''}
                                                                    onChange={(e) => {
                                                                        handleNestedFieldChange(`supervisorReports.${index}.notes`, e.target.value);
                                                                    }}
                                                                    placeholder="הערות"
                                                                    variant="outlined"
                                                                    sx={{ '& .MuiOutlinedInput-root': { height: 40 } }}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1, width: '5%' }}>
                                                                {!isFirstRow && (
                                                                    <IconButton
                                                                        onClick={() => {
                                                                            if (window.confirm('האם אתה בטוח שברצונך למחוק את הדוח?')) {
                                                                                const currentReports = project?.supervisorReports || [];
                                                                                const newReports = currentReports.filter((_, i) => i !== index);
                                                                                handleNestedFieldChange('supervisorReports', newReports);
                                                                            }
                                                                        }}
                                                                        title="מחיקה"
                                                                        sx={{
                                                                            '& img': {
                                                                                filter: 'brightness(0) saturate(0)',
                                                                                width: '16px',
                                                                                height: '16px'
                                                                            },
                                                                            '&:hover, &:focus': {
                                                                                backgroundColor: '#f44336',
                                                                                borderRadius: '50%'
                                                                            },
                                                                            '&:hover img, &:focus img': {
                                                                                filter: 'brightness(0) invert(1)'
                                                                            }
                                                                        }}
                                                                    >
                                                                        <img src="/assets/icon-trash.svg" alt="מחיקה" />
                                                                    </IconButton>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                                <TableRow>
                                                    <TableCell colSpan={4} sx={{ padding: 1, textAlign: 'center' }}>
                                                        <Button
                                                            variant="outlined"
                                                            onClick={() => {
                                                                const newReport = { file: '', creationDate: '', notes: '' };
                                                                const currentReports = project?.supervisorReports || [];
                                                                handleNestedFieldChange('supervisorReports', [...currentReports, newReport]);
                                                            }}
                                                            sx={{ mr: 1 }}
                                                        >
                                                            + הוספה
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            </Box>
                        )}

                        {activeTab === 3 && (
                            <Box>
                                {/* שורה 1 - מסמכי הפוליסה */}
                                <Box sx={{ mb: 4 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 32,
                                                height: 32,
                                                borderRadius: '50%',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                                },
                                                '&:focus-within': {
                                                    backgroundColor: 'rgba(0, 0, 0, 0.08)',
                                                    outline: '2px solid rgba(139, 92, 246, 0.3)',
                                                    outlineOffset: '2px',
                                                }
                                            }}
                                            tabIndex={0}
                                        >
                                            <AutoAwesomeIcon
                                                sx={{
                                                    color: '#8B5CF6',
                                                    filter: 'drop-shadow(0 2px 4px rgba(139, 92, 246, 0.3))'
                                                }}
                                            />
                                        </Box>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.secondary', ml: 0.5 }}>
                                            מסמכי הפוליסה
                                        </Typography>
                                    </Box>
                                    <TableContainer component={Paper} sx={{ border: '1px solid #e0e0e0', overflow: 'auto', maxWidth: '100%' }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '20%' }}>סוג המסמך</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '15%' }}>קובץ</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '12%' }}>תאריך תוקף</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '28%' }}>מספר פוליסה</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '20%' }}>מבטח</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '5%' }}></TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {(project?.policyDocuments && project.policyDocuments.length > 0 ? project.policyDocuments : [{ documentType: 'פוליסה', file: '', validUntil: '', policyNumber: '', insurer: '' }]).map((document, index) => {
                                                    const isFirstRow = index === 0;
                                                    return (
                                                        <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                            <TableCell sx={{ padding: 1, width: '20%' }}>
                                                                <Autocomplete
                                                                    freeSolo
                                                                    options={['פוליסה', 'תוספת', 'כתב כיסוי']}
                                                                    value={document.documentType || ''}
                                                                    onChange={async (event, newValue) => {
                                                                        const value = newValue || '';
                                                                        console.log('🔍 Policy document documentType onChange called with:', { value, index });

                                                                        handleNestedFieldChange(`policyDocuments.${index}.documentType`, value);

                                                                        // Save to database immediately if we have a project ID
                                                                        if (project?._id || project?.id) {
                                                                            console.log('🔍 Saving policy document documentType to database...');
                                                                            try {
                                                                                const { projectsAPI } = await import('../services/api');
                                                                                const currentDocuments = project?.policyDocuments || [];
                                                                                const updatedDocuments = [...currentDocuments];
                                                                                updatedDocuments[index] = {
                                                                                    ...updatedDocuments[index],
                                                                                    documentType: value
                                                                                };

                                                                                const updateData = {
                                                                                    'policyDocuments': updatedDocuments
                                                                                };

                                                                                console.log('🔍 Saving policy document documentType to database:', updateData);
                                                                                const result = await projectsAPI.update(project._id || project.id, updateData);
                                                                                console.log('✅ Policy document documentType saved successfully:', result);

                                                                                // Update project state after successful save
                                                                                setProject(prev => ({
                                                                                    ...prev,
                                                                                    policyDocuments: updatedDocuments
                                                                                }));
                                                                            } catch (error) {
                                                                                console.error('❌ Error saving policy document documentType:', error);
                                                                            }
                                                                        }
                                                                    }}
                                                                    onInputChange={async (event, newInputValue) => {
                                                                        const value = newInputValue;
                                                                        console.log('🔍 Policy document documentType onInputChange called with:', { value, index });

                                                                        handleNestedFieldChange(`policyDocuments.${index}.documentType`, value);

                                                                        // Save to database immediately if we have a project ID
                                                                        if (project?._id || project?.id) {
                                                                            console.log('🔍 Saving policy document documentType to database...');
                                                                            try {
                                                                                const { projectsAPI } = await import('../services/api');
                                                                                const currentDocuments = project?.policyDocuments || [];
                                                                                const updatedDocuments = [...currentDocuments];
                                                                                updatedDocuments[index] = {
                                                                                    ...updatedDocuments[index],
                                                                                    documentType: value
                                                                                };

                                                                                const updateData = {
                                                                                    'policyDocuments': updatedDocuments
                                                                                };

                                                                                console.log('🔍 Saving policy document documentType to database:', updateData);
                                                                                const result = await projectsAPI.update(project._id || project.id, updateData);
                                                                                console.log('✅ Policy document documentType saved successfully:', result);

                                                                                // Update project state after successful save
                                                                                setProject(prev => ({
                                                                                    ...prev,
                                                                                    policyDocuments: updatedDocuments
                                                                                }));
                                                                            } catch (error) {
                                                                                console.error('❌ Error saving policy document documentType:', error);
                                                                            }
                                                                        }
                                                                    }}
                                                                    renderInput={(params) => (
                                                                        <TextField
                                                                            {...params}
                                                                            size="small"
                                                                            placeholder="סוג המסמך"
                                                                            variant="outlined"
                                                                            sx={{ '& .MuiOutlinedInput-root': { height: 40 } }}
                                                                        />
                                                                    )}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1, width: '15%' }}>
                                                                <FileUpload
                                                                    label=""
                                                                    value={document.file || ''}
                                                                    thumbnailUrl={document.thumbnailUrl || ''}
                                                                    projectId={project?._id || project?.id}
                                                                    onChange={async (url, thumbnailUrl) => {
                                                                        console.log('🔍 Policy document onChange called with:', { url, thumbnailUrl, index });

                                                                        handleNestedFieldChange(`policyDocuments.${index}.file`, url);
                                                                        if (thumbnailUrl) {
                                                                            handleNestedFieldChange(`policyDocuments.${index}.thumbnailUrl`, thumbnailUrl);
                                                                        }

                                                                        // Save to database immediately if we have a project ID
                                                                        if (url && (project?._id || project?.id)) {
                                                                            console.log('🔍 Saving policy document to database...');
                                                                            try {
                                                                                const { projectsAPI } = await import('../services/api');
                                                                                const currentDocuments = project?.policyDocuments || [];
                                                                                const updatedDocuments = [...currentDocuments];
                                                                                
                                                                                // Preserve existing document data and only update file-related fields
                                                                                updatedDocuments[index] = {
                                                                                    ...updatedDocuments[index],
                                                                                    file: url,
                                                                                    thumbnailUrl: thumbnailUrl || ''
                                                                                };

                                                                                const updateData = {
                                                                                    'policyDocuments': updatedDocuments
                                                                                };

                                                                                console.log('🔍 Saving policy document to database:', updateData);
                                                                                const result = await projectsAPI.update(project._id || project.id, updateData);
                                                                                console.log('✅ Policy document saved successfully:', result);

                                                                                // Update project state after successful save
                                                                                setProject(prev => ({
                                                                                    ...prev,
                                                                                    policyDocuments: updatedDocuments
                                                                                }));
                                                                            } catch (error) {
                                                                                console.error('❌ Error saving policy document:', error);
                                                                            }
                                                                        }
                                                                    }}
                                                                    onDelete={async () => {
                                                                        // Single confirmation dialog
                                                                        const confirmed = window.confirm('האם אתה בטוח שברצונך למחוק את הקובץ?');
                                                                        if (!confirmed) return;

                                                                        console.log('🗑️ Policy document onDelete called for index:', index);

                                                                        // Get current file URLs before deletion
                                                                        const currentFileUrl = document.file;
                                                                        const currentThumbnailUrl = document.thumbnailUrl;

                                                                        console.log('🗑️ Current file URL:', currentFileUrl);
                                                                        console.log('🗑️ Current thumbnail URL:', currentThumbnailUrl);

                                                                        // Clear from UI immediately
                                                                        handleNestedFieldChange(`policyDocuments.${index}.file`, '');
                                                                        handleNestedFieldChange(`policyDocuments.${index}.thumbnailUrl`, '');

                                                                        // Delete from database
                                                                        if (project?._id || project?.id) {
                                                                            try {
                                                                                const { projectsAPI } = await import('../services/api');
                                                                                const currentDocuments = project?.policyDocuments || [];
                                                                                const updatedDocuments = [...currentDocuments];
                                                                                
                                                                                // Preserve existing document data and only clear file-related fields
                                                                                updatedDocuments[index] = {
                                                                                    ...updatedDocuments[index],
                                                                                    file: '',
                                                                                    thumbnailUrl: ''
                                                                                };

                                                                                const updateData = {
                                                                                    'policyDocuments': updatedDocuments
                                                                                };

                                                                                console.log('🗑️ Deleting policy document from database:', updateData);
                                                                                const result = await projectsAPI.update(project._id || project.id, updateData);
                                                                                console.log('✅ Policy document deleted successfully:', result);

                                                                                // Update project state after successful deletion
                                                                                setProject(prev => ({
                                                                                    ...prev,
                                                                                    policyDocuments: updatedDocuments
                                                                                }));

                                                                                // Delete files from blob storage
                                                                                if (currentFileUrl || currentThumbnailUrl) {
                                                                                    try {
                                                                                        console.log('🗑️ Deleting files from blob:', { currentFileUrl, currentThumbnailUrl });
                                                                                        const deleteResponse = await fetch('/api/project-files/delete-project-file', {
                                                                                            method: 'DELETE',
                                                                                            headers: {
                                                                                                'Content-Type': 'application/json',
                                                                                            },
                                                                                            body: JSON.stringify({ 
                                                                                                fileUrl: currentFileUrl,
                                                                                                thumbnailUrl: currentThumbnailUrl
                                                                                            })
                                                                                        });
                                                                                        if (deleteResponse.ok) {
                                                                                            const result = await deleteResponse.json();
                                                                                            console.log('✅ Files deleted from blob successfully:', result);
                                                                                        } else {
                                                                                            console.error('❌ Failed to delete files from blob');
                                                                                        }
                                                                                    } catch (error) {
                                                                                        console.error('❌ Error deleting files from blob:', error);
                                                                                    }
                                                                                }
                                                                            } catch (error) {
                                                                                console.error('❌ Error deleting policy document:', error);
                                                                            }
                                                                        }
                                                                    }}
                                                                    disabled={mode === 'view' || !canEdit}
                                                                    showCreationDate={false}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1, width: '12%' }}>
                                                                <TextField
                                                                    fullWidth
                                                                    size="small"
                                                                    type="date"
                                                                    value={document.validUntil || ''}
                                                                    onChange={async (e) => {
                                                                        const value = e.target.value;
                                                                        console.log('🔍 Policy document validUntil onChange called with:', { value, index });

                                                                        handleNestedFieldChange(`policyDocuments.${index}.validUntil`, value);

                                                                        // Save to database immediately if we have a project ID
                                                                        if (project?._id || project?.id) {
                                                                            console.log('🔍 Saving policy document validUntil to database...');
                                                                            try {
                                                                                const { projectsAPI } = await import('../services/api');
                                                                                const currentDocuments = project?.policyDocuments || [];
                                                                                const updatedDocuments = [...currentDocuments];
                                                                                updatedDocuments[index] = {
                                                                                    ...updatedDocuments[index],
                                                                                    validUntil: value
                                                                                };

                                                                                const updateData = {
                                                                                    'policyDocuments': updatedDocuments
                                                                                };

                                                                                console.log('🔍 Saving policy document validUntil to database:', updateData);
                                                                                const result = await projectsAPI.update(project._id || project.id, updateData);
                                                                                console.log('✅ Policy document validUntil saved successfully:', result);

                                                                                // Update project state after successful save
                                                                                setProject(prev => ({
                                                                                    ...prev,
                                                                                    policyDocuments: updatedDocuments
                                                                                }));
                                                                            } catch (error) {
                                                                                console.error('❌ Error saving policy document validUntil:', error);
                                                                            }
                                                                        }
                                                                    }}
                                                                    placeholder="תאריך תוקף"
                                                                    variant="outlined"
                                                                    InputLabelProps={{ shrink: true }}
                                                                    sx={{ '& .MuiOutlinedInput-root': { height: 40 } }}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1, width: '28%' }}>
                                                                <TextField
                                                                    fullWidth
                                                                    size="small"
                                                                    value={document.policyNumber || ''}
                                                                    onChange={async (e) => {
                                                                        const value = e.target.value;
                                                                        console.log('🔍 Policy document policyNumber onChange called with:', { value, index });

                                                                        handleNestedFieldChange(`policyDocuments.${index}.policyNumber`, value);

                                                                        // Save to database immediately if we have a project ID
                                                                        if (project?._id || project?.id) {
                                                                            console.log('🔍 Saving policy document policyNumber to database...');
                                                                            try {
                                                                                const { projectsAPI } = await import('../services/api');
                                                                                const currentDocuments = project?.policyDocuments || [];
                                                                                const updatedDocuments = [...currentDocuments];
                                                                                updatedDocuments[index] = {
                                                                                    ...updatedDocuments[index],
                                                                                    policyNumber: value
                                                                                };

                                                                                const updateData = {
                                                                                    'policyDocuments': updatedDocuments
                                                                                };

                                                                                console.log('🔍 Saving policy document policyNumber to database:', updateData);
                                                                                const result = await projectsAPI.update(project._id || project.id, updateData);
                                                                                console.log('✅ Policy document policyNumber saved successfully:', result);

                                                                                // Update project state after successful save
                                                                                setProject(prev => ({
                                                                                    ...prev,
                                                                                    policyDocuments: updatedDocuments
                                                                                }));
                                                                            } catch (error) {
                                                                                console.error('❌ Error saving policy document policyNumber:', error);
                                                                            }
                                                                        }
                                                                    }}
                                                                    placeholder="מספר פוליסה"
                                                                    variant="outlined"
                                                                    sx={{ '& .MuiOutlinedInput-root': { height: 40 } }}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1, width: '20%' }}>
                                                                <Autocomplete
                                                                    freeSolo
                                                                    options={['הראל', 'כלל', 'הפניקס', 'מנורה', 'מגדל', 'איילון', 'הכשרה', 'AIG', 'ליברה', 'שירביט', 'שומרה', 'ווישור', 'אנקור', 'סקוריטס']}
                                                                    value={document.insurer || ''}
                                                                    onChange={async (event, newValue) => {
                                                                        const value = newValue || '';
                                                                        console.log('🔍 Policy document insurer onChange called with:', { value, index });

                                                                        handleNestedFieldChange(`policyDocuments.${index}.insurer`, value);

                                                                        // Save to database immediately if we have a project ID
                                                                        if (project?._id || project?.id) {
                                                                            console.log('🔍 Saving policy document insurer to database...');
                                                                            try {
                                                                                const { projectsAPI } = await import('../services/api');
                                                                                const currentDocuments = project?.policyDocuments || [];
                                                                                const updatedDocuments = [...currentDocuments];
                                                                                updatedDocuments[index] = {
                                                                                    ...updatedDocuments[index],
                                                                                    insurer: value
                                                                                };

                                                                                const updateData = {
                                                                                    'policyDocuments': updatedDocuments
                                                                                };

                                                                                console.log('🔍 Saving policy document insurer to database:', updateData);
                                                                                const result = await projectsAPI.update(project._id || project.id, updateData);
                                                                                console.log('✅ Policy document insurer saved successfully:', result);

                                                                                // Update project state after successful save
                                                                                setProject(prev => ({
                                                                                    ...prev,
                                                                                    policyDocuments: updatedDocuments
                                                                                }));
                                                                            } catch (error) {
                                                                                console.error('❌ Error saving policy document insurer:', error);
                                                                            }
                                                                        }
                                                                    }}
                                                                    onInputChange={async (event, newInputValue) => {
                                                                        const value = newInputValue;
                                                                        console.log('🔍 Policy document insurer onInputChange called with:', { value, index });

                                                                        handleNestedFieldChange(`policyDocuments.${index}.insurer`, value);

                                                                        // Save to database immediately if we have a project ID
                                                                        if (project?._id || project?.id) {
                                                                            console.log('🔍 Saving policy document insurer to database...');
                                                                            try {
                                                                                const { projectsAPI } = await import('../services/api');
                                                                                const currentDocuments = project?.policyDocuments || [];
                                                                                const updatedDocuments = [...currentDocuments];
                                                                                updatedDocuments[index] = {
                                                                                    ...updatedDocuments[index],
                                                                                    insurer: value
                                                                                };

                                                                                const updateData = {
                                                                                    'policyDocuments': updatedDocuments
                                                                                };

                                                                                console.log('🔍 Saving policy document insurer to database:', updateData);
                                                                                const result = await projectsAPI.update(project._id || project.id, updateData);
                                                                                console.log('✅ Policy document insurer saved successfully:', result);

                                                                                // Update project state after successful save
                                                                                setProject(prev => ({
                                                                                    ...prev,
                                                                                    policyDocuments: updatedDocuments
                                                                                }));
                                                                            } catch (error) {
                                                                                console.error('❌ Error saving policy document insurer:', error);
                                                                            }
                                                                        }
                                                                    }}
                                                                    renderInput={(params) => (
                                                                        <TextField
                                                                            {...params}
                                                                            size="small"
                                                                            placeholder="מבטח"
                                                                            variant="outlined"
                                                                            sx={{ '& .MuiOutlinedInput-root': { height: 40 } }}
                                                                        />
                                                                    )}
                                                                />
                                                            </TableCell>
                                                            <TableCell sx={{ padding: 1, width: '5%' }}>
                                                                {!isFirstRow && (
                                                                    <IconButton
                                                                        onClick={() => {
                                                                            if (window.confirm('האם אתה בטוח שברצונך למחוק את המסמך?')) {
                                                                                const currentDocuments = project?.policyDocuments || [];
                                                                                const newDocuments = currentDocuments.filter((_, i) => i !== index);
                                                                                handleNestedFieldChange('policyDocuments', newDocuments);
                                                                            }
                                                                        }}
                                                                        title="מחיקה"
                                                                        sx={{
                                                                            '& img': {
                                                                                filter: 'brightness(0) saturate(0)',
                                                                                width: '16px',
                                                                                height: '16px'
                                                                            },
                                                                            '&:hover, &:focus': {
                                                                                backgroundColor: '#f44336',
                                                                                borderRadius: '50%'
                                                                            },
                                                                            '&:hover img, &:focus img': {
                                                                                filter: 'brightness(0) invert(1)'
                                                                            }
                                                                        }}
                                                                    >
                                                                        <img src="/assets/icon-trash.svg" alt="מחיקה" />
                                                                    </IconButton>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                                <TableRow>
                                                    <TableCell colSpan={6} sx={{ padding: 1, textAlign: 'center' }}>
                                                        <Button
                                                            variant="outlined"
                                                            onClick={() => {
                                                                const newDocument = { documentType: '', file: '', validUntil: '', policyNumber: '', insurer: '' };
                                                                const currentDocuments = project?.policyDocuments || [];
                                                                handleNestedFieldChange('policyDocuments', [...currentDocuments, newDocument]);
                                                            }}
                                                            sx={{ mr: 1 }}
                                                        >
                                                            + הוספה
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>

                                {/* שורה 2 - מפרט יועץ הביטוח */}
                                <Box sx={{ mb: 4 }}>
                                    <FileUpload
                                        label="מפרט יועץ הביטוח"
                                        value={fileUploadState.insuranceSpecification?.url || project?.insuranceSpecification?.file || ''}
                                        thumbnailUrl={fileUploadState.insuranceSpecification?.thumbnailUrl || project?.insuranceSpecification?.thumbnailUrl || ''}
                                        projectId={project?._id || project?.id}
                                        showCreationDate={true}
                                        creationDateValue={fileUploadState.insuranceSpecification?.creationDate || project?.insuranceSpecification?.fileCreationDate || ''}
                                        onCreationDateChange={async (date) => {
                                            setFileUploadState(prev => ({
                                                ...prev,
                                                insuranceSpecification: {
                                                    ...prev.insuranceSpecification,
                                                    creationDate: date
                                                }
                                            }));
                                            handleNestedFieldChange('insuranceSpecification.fileCreationDate', date);
                                        }}
                                        onChange={async (url, thumbnailUrl) => {
                                            console.log('🔍 Insurance specification onChange called with:', { url, thumbnailUrl });

                                            setFileUploadState(prev => ({
                                                ...prev,
                                                insuranceSpecification: {
                                                    ...prev.insuranceSpecification,
                                                    url: url,
                                                    thumbnailUrl: thumbnailUrl
                                                }
                                            }));
                                            handleNestedFieldChange('insuranceSpecification.file', url);
                                            if (thumbnailUrl) {
                                                handleNestedFieldChange('insuranceSpecification.thumbnailUrl', thumbnailUrl);
                                            }

                                            // Save to database immediately if we have a project ID
                                            if (url && (project?._id || project?.id)) {
                                                console.log('🔍 Saving insurance specification to database...');
                                                try {
                                                    const { projectsAPI } = await import('../services/api');
                                                    const updateData = {
                                                        'insuranceSpecification.file': url,
                                                        'insuranceSpecification.thumbnailUrl': thumbnailUrl || '',
                                                        'insuranceSpecification.fileCreationDate': new Date().toISOString().split('T')[0]
                                                    };

                                                    console.log('🔍 Saving insurance specification to database:', updateData);
                                                    const result = await projectsAPI.update(project._id || project.id, updateData);
                                                    console.log('✅ Insurance specification saved successfully:', result);

                                                    // Update project state after successful save
                                                    setProject(prev => ({
                                                        ...prev,
                                                        insuranceSpecification: {
                                                            ...prev?.insuranceSpecification,
                                                            file: url,
                                                            thumbnailUrl: thumbnailUrl || '',
                                                            fileCreationDate: new Date().toISOString().split('T')[0]
                                                        }
                                                    }));
                                                } catch (error) {
                                                    console.error('❌ Error saving insurance specification:', error);
                                                }
                                            }
                                        }}
                                        onDelete={async () => {
                                            console.log('🗑️ Insurance specification onDelete called');

                                            // Clear local state
                                            setFileUploadState(prev => ({
                                                ...prev,
                                                insuranceSpecification: {
                                                    ...prev.insuranceSpecification,
                                                    url: '',
                                                    thumbnailUrl: ''
                                                }
                                            }));

                                            // Delete from database
                                            if (project?._id || project?.id) {
                                                try {
                                                    const { projectsAPI } = await import('../services/api');
                                                    const updateData = {
                                                        'insuranceSpecification.file': null,
                                                        'insuranceSpecification.thumbnailUrl': null,
                                                        'insuranceSpecification.fileCreationDate': null
                                                    };

                                                    console.log('🗑️ Deleting insurance specification from database:', updateData);
                                                    const result = await projectsAPI.update(project._id || project.id, updateData);
                                                    console.log('✅ Insurance specification deleted successfully:', result);

                                                    // Update project state after successful deletion
                                                    setProject(prev => ({
                                                        ...prev,
                                                        insuranceSpecification: {
                                                            ...prev?.insuranceSpecification,
                                                            file: null,
                                                            thumbnailUrl: null,
                                                            fileCreationDate: null
                                                        }
                                                    }));
                                                } catch (error) {
                                                    console.error('❌ Error deleting insurance specification:', error);
                                                }
                                            }
                                        }}
                                        disabled={mode === 'view' || !canEdit}
                                    />
                                </Box>

                                {/* שורה 2 - סעיף הביטוח בחוזה / מכרז */}
                                <Box sx={{ mb: 4 }}>
                                    <FileUpload
                                        label="סעיף הביטוח בחוזה / מכרז"
                                        value={fileUploadState.insuranceContractClause?.url || project?.insuranceContractClause?.file || ''}
                                        thumbnailUrl={fileUploadState.insuranceContractClause?.thumbnailUrl || project?.insuranceContractClause?.thumbnailUrl || ''}
                                        projectId={project?._id || project?.id}
                                        showCreationDate={true}
                                        creationDateValue={fileUploadState.insuranceContractClause?.creationDate || project?.insuranceContractClause?.fileCreationDate || ''}
                                        onCreationDateChange={async (date) => {
                                            setFileUploadState(prev => ({
                                                ...prev,
                                                insuranceContractClause: {
                                                    ...prev.insuranceContractClause,
                                                    creationDate: date
                                                }
                                            }));
                                            handleNestedFieldChange('insuranceContractClause.fileCreationDate', date);
                                        }}
                                        onChange={async (url, thumbnailUrl) => {
                                            console.log('🔍 Insurance contract clause onChange called with:', { url, thumbnailUrl });

                                            setFileUploadState(prev => ({
                                                ...prev,
                                                insuranceContractClause: {
                                                    ...prev.insuranceContractClause,
                                                    url: url,
                                                    thumbnailUrl: thumbnailUrl
                                                }
                                            }));
                                            handleNestedFieldChange('insuranceContractClause.file', url);
                                            if (thumbnailUrl) {
                                                handleNestedFieldChange('insuranceContractClause.thumbnailUrl', thumbnailUrl);
                                            }

                                            // Save to database immediately if we have a project ID
                                            if (url && (project?._id || project?.id)) {
                                                console.log('🔍 Saving insurance contract clause to database...');
                                                try {
                                                    const { projectsAPI } = await import('../services/api');
                                                    const updateData = {
                                                        'insuranceContractClause.file': url,
                                                        'insuranceContractClause.thumbnailUrl': thumbnailUrl || '',
                                                        'insuranceContractClause.fileCreationDate': new Date().toISOString().split('T')[0]
                                                    };

                                                    console.log('🔍 Saving insurance contract clause to database:', updateData);
                                                    const result = await projectsAPI.update(project._id || project.id, updateData);
                                                    console.log('✅ Insurance contract clause saved successfully:', result);

                                                    // Update project state after successful save
                                                    setProject(prev => ({
                                                        ...prev,
                                                        insuranceContractClause: {
                                                            ...prev?.insuranceContractClause,
                                                            file: url,
                                                            thumbnailUrl: thumbnailUrl || '',
                                                            fileCreationDate: new Date().toISOString().split('T')[0]
                                                        }
                                                    }));
                                                } catch (error) {
                                                    console.error('❌ Error saving insurance contract clause:', error);
                                                }
                                            }
                                        }}
                                        onDelete={async () => {
                                            console.log('🗑️ Insurance contract clause onDelete called');

                                            // Clear local state
                                            setFileUploadState(prev => ({
                                                ...prev,
                                                insuranceContractClause: {
                                                    ...prev.insuranceContractClause,
                                                    url: '',
                                                    thumbnailUrl: ''
                                                }
                                            }));

                                            // Delete from database
                                            if (project?._id || project?.id) {
                                                try {
                                                    const { projectsAPI } = await import('../services/api');
                                                    const updateData = {
                                                        'insuranceContractClause.file': null,
                                                        'insuranceContractClause.thumbnailUrl': null,
                                                        'insuranceContractClause.fileCreationDate': null
                                                    };

                                                    console.log('🗑️ Deleting insurance contract clause from database:', updateData);
                                                    const result = await projectsAPI.update(project._id || project.id, updateData);
                                                    console.log('✅ Insurance contract clause deleted successfully:', result);

                                                    // Update project state after successful deletion
                                                    setProject(prev => ({
                                                        ...prev,
                                                        insuranceContractClause: {
                                                            ...prev?.insuranceContractClause,
                                                            file: null,
                                                            thumbnailUrl: null,
                                                            fileCreationDate: null
                                                        }
                                                    }));
                                                } catch (error) {
                                                    console.error('❌ Error deleting insurance contract clause:', error);
                                                }
                                            }
                                        }}
                                        disabled={mode === 'view' || !canEdit}
                                    />
                                </Box>

                                {/* שורה 3 - טופס הצעה */}
                                <Box sx={{ mb: 4 }}>
                                    <FileUpload
                                        label="טופס הצעה"
                                        value={fileUploadState.proposalForm?.url || project?.proposalForm?.file || ''}
                                        thumbnailUrl={fileUploadState.proposalForm?.thumbnailUrl || project?.proposalForm?.thumbnailUrl || ''}
                                        projectId={project?._id || project?.id}
                                        showCreationDate={true}
                                        creationDateValue={fileUploadState.proposalForm?.creationDate || project?.proposalForm?.fileCreationDate || ''}
                                        onCreationDateChange={async (date) => {
                                            setFileUploadState(prev => ({
                                                ...prev,
                                                proposalForm: {
                                                    ...prev.proposalForm,
                                                    creationDate: date
                                                }
                                            }));
                                            handleNestedFieldChange('proposalForm.fileCreationDate', date);
                                        }}
                                        onChange={async (url, thumbnailUrl) => {
                                            console.log('🔍 Proposal form onChange called with:', { url, thumbnailUrl });

                                            setFileUploadState(prev => ({
                                                ...prev,
                                                proposalForm: {
                                                    ...prev.proposalForm,
                                                    url: url,
                                                    thumbnailUrl: thumbnailUrl
                                                }
                                            }));
                                            handleNestedFieldChange('proposalForm.file', url);
                                            if (thumbnailUrl) {
                                                handleNestedFieldChange('proposalForm.thumbnailUrl', thumbnailUrl);
                                            }

                                            // Save to database immediately if we have a project ID
                                            if (url && (project?._id || project?.id)) {
                                                console.log('🔍 Saving proposal form to database...');
                                                try {
                                                    const { projectsAPI } = await import('../services/api');
                                                    const updateData = {
                                                        'proposalForm.file': url,
                                                        'proposalForm.thumbnailUrl': thumbnailUrl || '',
                                                        'proposalForm.fileCreationDate': new Date().toISOString().split('T')[0]
                                                    };

                                                    console.log('🔍 Saving proposal form to database:', updateData);
                                                    const result = await projectsAPI.update(project._id || project.id, updateData);
                                                    console.log('✅ Proposal form saved successfully:', result);

                                                    // Update project state after successful save
                                                    setProject(prev => ({
                                                        ...prev,
                                                        proposalForm: {
                                                            ...prev?.proposalForm,
                                                            file: url,
                                                            thumbnailUrl: thumbnailUrl || '',
                                                            fileCreationDate: new Date().toISOString().split('T')[0]
                                                        }
                                                    }));
                                                } catch (error) {
                                                    console.error('❌ Error saving proposal form:', error);
                                                }
                                            }
                                        }}
                                        onDelete={async () => {
                                            console.log('🗑️ Proposal form onDelete called');

                                            // Clear local state
                                            setFileUploadState(prev => ({
                                                ...prev,
                                                proposalForm: {
                                                    ...prev.proposalForm,
                                                    url: '',
                                                    thumbnailUrl: ''
                                                }
                                            }));

                                            // Delete from database
                                            if (project?._id || project?.id) {
                                                try {
                                                    const { projectsAPI } = await import('../services/api');
                                                    const updateData = {
                                                        'proposalForm.file': null,
                                                        'proposalForm.thumbnailUrl': null,
                                                        'proposalForm.fileCreationDate': null
                                                    };

                                                    console.log('🗑️ Deleting proposal form from database:', updateData);
                                                    const result = await projectsAPI.update(project._id || project.id, updateData);
                                                    console.log('✅ Proposal form deleted successfully:', result);

                                                    // Update project state after successful deletion
                                                    setProject(prev => ({
                                                        ...prev,
                                                        proposalForm: {
                                                            ...prev?.proposalForm,
                                                            file: null,
                                                            thumbnailUrl: null,
                                                            fileCreationDate: null
                                                        }
                                                    }));
                                                } catch (error) {
                                                    console.error('❌ Error deleting proposal form:', error);
                                                }
                                            }
                                        }}
                                        disabled={mode === 'view' || !canEdit}
                                    />
                                </Box>


                                {/* סקשן מפרט הביטוח */}
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                        מפרט הביטוח
                                    </Typography>

                                    {/* גריד של 2 עמודות */}
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 2,
                                        mb: 2
                                    }}>
                                        {/* עמודה שמאלית - שדה סכום ביטוח הרכוש */}
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            justifyContent: 'flex-end'
                                        }}>
                                            <TextField
                                                fullWidth
                                                label="סכום ביטוח הרכוש (₪)"
                                                value={project?.insuranceSpecification?.propertyInsuranceAmount ?
                                                    parseInt(project.insuranceSpecification.propertyInsuranceAmount.toString()).toLocaleString('he-IL') :
                                                    (project?.valueNis ? parseInt(project.valueNis.toString()).toLocaleString('he-IL') : '')}
                                                onChange={(e) => {
                                                    const numericValue = e.target.value.replace(/[^\d]/g, '');
                                                    handleNestedFieldChange('insuranceSpecification.propertyInsuranceAmount', numericValue || '');
                                                }}
                                                disabled={mode === 'view' || !canEdit}
                                                size="small"
                                                type="text"
                                                inputMode="numeric"
                                                sx={{
                                                    direction: 'rtl',
                                                    '& .MuiInputBase-root': {
                                                        minHeight: '56px'
                                                    },
                                                    '& .MuiInputLabel-root': {
                                                        top: '0px'
                                                    }
                                                }}
                                                InputProps={{
                                                    endAdornment: (
                                                        <Typography sx={{
                                                            color: 'text.secondary',
                                                            ml: 1,
                                                            fontSize: '1rem',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            ₪
                                                        </Typography>
                                                    )
                                                }}
                                            />
                                        </Box>


                                        {/* עמודה ימנית - ההערה */}
                                        <Box sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'flex-start',
                                            padding: '16px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '4px',
                                            backgroundColor: 'white',
                                            minHeight: '120px'
                                        }}>
                                            <Typography variant="body2" sx={{
                                                lineHeight: 1.6,
                                                color: 'text.secondary',
                                                direction: 'rtl',
                                                textAlign: 'right'
                                            }}>
                                                מלוא העלות של עבודות הפרויקט המושלמות במועד המסירה או במועד תחילת השימוש בו, כולל חומרים ו/או ציוד ו/או מערכות בבעלות המבוטח או שהוא אחראי עבורם או שסופקו על ידי מזמין העבודות, המהווים חלק בלתי נפרד מהעבודות
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* שורה נפרדת - כיסוי להקמת מכונות וציוד */}
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 2,
                                        mb: 2
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
                                                    כיסוי להקמת מכונות וציוד
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
                                                        onClick={() => handleNestedFieldChange('insuranceSpecification.machineryCoverage', false)}
                                                        disabled={mode === 'view' || !canEdit}
                                                        sx={{
                                                            borderRadius: '0 4px 4px 0',
                                                            border: '1px solid #d1d5db',
                                                            borderLeft: 'none',
                                                            backgroundColor: project?.insuranceSpecification?.machineryCoverage === false ? '#6b47c1' : 'transparent',
                                                            color: project?.insuranceSpecification?.machineryCoverage === false ? 'white' : '#6b47c1',
                                                            '&:hover': {
                                                                backgroundColor: project?.insuranceSpecification?.machineryCoverage === false ? '#5a3aa1' : '#f3f4f6',
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
                                                        onClick={() => handleNestedFieldChange('insuranceSpecification.machineryCoverage', true)}
                                                        disabled={mode === 'view' || !canEdit}
                                                        sx={{
                                                            borderRadius: '4px 0 0 4px',
                                                            border: '1px solid #d1d5db',
                                                            backgroundColor: project?.insuranceSpecification?.machineryCoverage === true ? '#6b47c1' : 'transparent',
                                                            color: project?.insuranceSpecification?.machineryCoverage === true ? 'white' : '#6b47c1',
                                                            '&:hover': {
                                                                backgroundColor: project?.insuranceSpecification?.machineryCoverage === true ? '#5a3aa1' : '#f3f4f6',
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
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            justifyContent: 'flex-end'
                                        }}>
                                            {project?.insuranceSpecification?.machineryCoverage === true && (
                                                <TextField
                                                    fullWidth
                                                    label="תקופת ההרצה המבוקשת בימים (נכלל בתקופת הביטוח)"
                                                    value={project?.insuranceSpecification?.runPeriodDays || ''}
                                                    onChange={(e) => handleNestedFieldChange('insuranceSpecification.runPeriodDays', e.target.value)}
                                                    disabled={mode === 'view' || !canEdit}
                                                    size="small"
                                                    type="number"
                                                    inputMode="numeric"
                                                    sx={{
                                                        direction: 'rtl',
                                                        '& .MuiInputBase-root': {
                                                            minHeight: '56px'
                                                        },
                                                        '& .MuiInputLabel-root': {
                                                            top: '0px'
                                                        }
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Box>

                                    {/* שורות נוספות - כיסויים נוספים */}
                                    {/* שורה 1 - גניבה ו/או פריצה */}
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 2,
                                        mb: 2
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
                                                    גניבה ו/או פריצה
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
                                                        onClick={() => handleNestedFieldChange('insuranceSpecification.theftCoverage', false)}
                                                        disabled={mode === 'view' || !canEdit}
                                                        sx={{
                                                            borderRadius: '0 4px 4px 0',
                                                            border: '1px solid #d1d5db',
                                                            borderLeft: 'none',
                                                            backgroundColor: project?.insuranceSpecification?.theftCoverage === false ? '#6b47c1' : 'transparent',
                                                            color: project?.insuranceSpecification?.theftCoverage === false ? 'white' : '#6b47c1',
                                                            '&:hover': {
                                                                backgroundColor: project?.insuranceSpecification?.theftCoverage === false ? '#5a3aa1' : '#f3f4f6',
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
                                                        onClick={() => handleNestedFieldChange('insuranceSpecification.theftCoverage', true)}
                                                        disabled={mode === 'view' || !canEdit}
                                                        sx={{
                                                            borderRadius: '4px 0 0 4px',
                                                            border: '1px solid #d1d5db',
                                                            backgroundColor: project?.insuranceSpecification?.theftCoverage === true ? '#6b47c1' : 'transparent',
                                                            color: project?.insuranceSpecification?.theftCoverage === true ? 'white' : '#6b47c1',
                                                            '&:hover': {
                                                                backgroundColor: project?.insuranceSpecification?.theftCoverage === true ? '#5a3aa1' : '#f3f4f6',
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
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            justifyContent: 'flex-end'
                                        }}>
                                            {project?.insuranceSpecification?.theftCoverage === true && (
                                                <TextField
                                                    fullWidth
                                                    label="סכום הביטוח (₪)"
                                                    value={project?.insuranceSpecification?.theftCoverageAmount ?
                                                        parseInt(project.insuranceSpecification.theftCoverageAmount.toString()).toLocaleString('he-IL') : ''}
                                                    onChange={(e) => {
                                                        const numericValue = e.target.value.replace(/[^\d]/g, '');
                                                        handleNestedFieldChange('insuranceSpecification.theftCoverageAmount', numericValue || '');
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    size="small"
                                                    type="text"
                                                    inputMode="numeric"
                                                    sx={{
                                                        direction: 'rtl',
                                                        '& .MuiInputBase-root': {
                                                            minHeight: '56px'
                                                        },
                                                        '& .MuiInputLabel-root': {
                                                            top: '0px'
                                                        }
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Box>

                                    {/* שורה 2 - רכוש עליו עובדים */}
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 2,
                                        mb: 2
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
                                                    רכוש עליו עובדים
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
                                                        onClick={() => handleNestedFieldChange('insuranceSpecification.workPropertyCoverage', false)}
                                                        disabled={mode === 'view' || !canEdit}
                                                        sx={{
                                                            borderRadius: '0 4px 4px 0',
                                                            border: '1px solid #d1d5db',
                                                            borderLeft: 'none',
                                                            backgroundColor: project?.insuranceSpecification?.workPropertyCoverage === false ? '#6b47c1' : 'transparent',
                                                            color: project?.insuranceSpecification?.workPropertyCoverage === false ? 'white' : '#6b47c1',
                                                            '&:hover': {
                                                                backgroundColor: project?.insuranceSpecification?.workPropertyCoverage === false ? '#5a3aa1' : '#f3f4f6',
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
                                                        onClick={() => handleNestedFieldChange('insuranceSpecification.workPropertyCoverage', true)}
                                                        disabled={mode === 'view' || !canEdit}
                                                        sx={{
                                                            borderRadius: '4px 0 0 4px',
                                                            border: '1px solid #d1d5db',
                                                            backgroundColor: project?.insuranceSpecification?.workPropertyCoverage === true ? '#6b47c1' : 'transparent',
                                                            color: project?.insuranceSpecification?.workPropertyCoverage === true ? 'white' : '#6b47c1',
                                                            '&:hover': {
                                                                backgroundColor: project?.insuranceSpecification?.workPropertyCoverage === true ? '#5a3aa1' : '#f3f4f6',
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
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            justifyContent: 'flex-end'
                                        }}>
                                            {project?.insuranceSpecification?.workPropertyCoverage === true && (
                                                <TextField
                                                    fullWidth
                                                    label="סכום הביטוח (₪)"
                                                    value={project?.insuranceSpecification?.workPropertyCoverageAmount ?
                                                        parseInt(project.insuranceSpecification.workPropertyCoverageAmount.toString()).toLocaleString('he-IL') : ''}
                                                    onChange={(e) => {
                                                        const numericValue = e.target.value.replace(/[^\d]/g, '');
                                                        handleNestedFieldChange('insuranceSpecification.workPropertyCoverageAmount', numericValue || '');
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    size="small"
                                                    type="text"
                                                    inputMode="numeric"
                                                    sx={{
                                                        direction: 'rtl',
                                                        '& .MuiInputBase-root': {
                                                            minHeight: '56px'
                                                        },
                                                        '& .MuiInputLabel-root': {
                                                            top: '0px'
                                                        }
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Box>

                                    {/* שורה 3 - רכוש סמוך */}
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 2,
                                        mb: 2
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
                                                    רכוש סמוך
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
                                                        onClick={() => handleNestedFieldChange('insuranceSpecification.adjacentPropertyCoverage', false)}
                                                        disabled={mode === 'view' || !canEdit}
                                                        sx={{
                                                            borderRadius: '0 4px 4px 0',
                                                            border: '1px solid #d1d5db',
                                                            borderLeft: 'none',
                                                            backgroundColor: project?.insuranceSpecification?.adjacentPropertyCoverage === false ? '#6b47c1' : 'transparent',
                                                            color: project?.insuranceSpecification?.adjacentPropertyCoverage === false ? 'white' : '#6b47c1',
                                                            '&:hover': {
                                                                backgroundColor: project?.insuranceSpecification?.adjacentPropertyCoverage === false ? '#5a3aa1' : '#f3f4f6',
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
                                                        onClick={() => handleNestedFieldChange('insuranceSpecification.adjacentPropertyCoverage', true)}
                                                        disabled={mode === 'view' || !canEdit}
                                                        sx={{
                                                            borderRadius: '4px 0 0 4px',
                                                            border: '1px solid #d1d5db',
                                                            backgroundColor: project?.insuranceSpecification?.adjacentPropertyCoverage === true ? '#6b47c1' : 'transparent',
                                                            color: project?.insuranceSpecification?.adjacentPropertyCoverage === true ? 'white' : '#6b47c1',
                                                            '&:hover': {
                                                                backgroundColor: project?.insuranceSpecification?.adjacentPropertyCoverage === true ? '#5a3aa1' : '#f3f4f6',
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
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            justifyContent: 'flex-end'
                                        }}>
                                            {project?.insuranceSpecification?.adjacentPropertyCoverage === true && (
                                                <TextField
                                                    fullWidth
                                                    label="סכום הביטוח (₪)"
                                                    value={project?.insuranceSpecification?.adjacentPropertyCoverageAmount ?
                                                        parseInt(project.insuranceSpecification.adjacentPropertyCoverageAmount.toString()).toLocaleString('he-IL') : ''}
                                                    onChange={(e) => {
                                                        const numericValue = e.target.value.replace(/[^\d]/g, '');
                                                        handleNestedFieldChange('insuranceSpecification.adjacentPropertyCoverageAmount', numericValue || '');
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    size="small"
                                                    type="text"
                                                    inputMode="numeric"
                                                    sx={{
                                                        direction: 'rtl',
                                                        '& .MuiInputBase-root': {
                                                            minHeight: '56px'
                                                        },
                                                        '& .MuiInputLabel-root': {
                                                            top: '0px'
                                                        }
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Box>

                                    {/* שורה 4 - רכוש בהעברה */}
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 2,
                                        mb: 2
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
                                                    רכוש בהעברה
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
                                                        onClick={() => handleNestedFieldChange('insuranceSpecification.transitPropertyCoverage', false)}
                                                        disabled={mode === 'view' || !canEdit}
                                                        sx={{
                                                            borderRadius: '0 4px 4px 0',
                                                            border: '1px solid #d1d5db',
                                                            borderLeft: 'none',
                                                            backgroundColor: project?.insuranceSpecification?.transitPropertyCoverage === false ? '#6b47c1' : 'transparent',
                                                            color: project?.insuranceSpecification?.transitPropertyCoverage === false ? 'white' : '#6b47c1',
                                                            '&:hover': {
                                                                backgroundColor: project?.insuranceSpecification?.transitPropertyCoverage === false ? '#5a3aa1' : '#f3f4f6',
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
                                                        onClick={() => handleNestedFieldChange('insuranceSpecification.transitPropertyCoverage', true)}
                                                        disabled={mode === 'view' || !canEdit}
                                                        sx={{
                                                            borderRadius: '4px 0 0 4px',
                                                            border: '1px solid #d1d5db',
                                                            backgroundColor: project?.insuranceSpecification?.transitPropertyCoverage === true ? '#6b47c1' : 'transparent',
                                                            color: project?.insuranceSpecification?.transitPropertyCoverage === true ? 'white' : '#6b47c1',
                                                            '&:hover': {
                                                                backgroundColor: project?.insuranceSpecification?.transitPropertyCoverage === true ? '#5a3aa1' : '#f3f4f6',
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
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            justifyContent: 'flex-end'
                                        }}>
                                            {project?.insuranceSpecification?.transitPropertyCoverage === true && (
                                                <TextField
                                                    fullWidth
                                                    label="סכום הביטוח (₪)"
                                                    value={project?.insuranceSpecification?.transitPropertyCoverageAmount ?
                                                        parseInt(project.insuranceSpecification.transitPropertyCoverageAmount.toString()).toLocaleString('he-IL') : ''}
                                                    onChange={(e) => {
                                                        const numericValue = e.target.value.replace(/[^\d]/g, '');
                                                        handleNestedFieldChange('insuranceSpecification.transitPropertyCoverageAmount', numericValue || '');
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    size="small"
                                                    type="text"
                                                    inputMode="numeric"
                                                    sx={{
                                                        direction: 'rtl',
                                                        '& .MuiInputBase-root': {
                                                            minHeight: '56px'
                                                        },
                                                        '& .MuiInputLabel-root': {
                                                            top: '0px'
                                                        }
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Box>

                                    {/* שורה 5 - מבני עזר וציוד קל */}
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 2,
                                        mb: 2
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
                                                    מבני עזר וציוד קל<br />
                                                    (ערך פריט בודד עד 40,000 ₪)
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
                                                        onClick={() => handleNestedFieldChange('insuranceSpecification.auxiliaryBuildingsCoverage', false)}
                                                        disabled={mode === 'view' || !canEdit}
                                                        sx={{
                                                            borderRadius: '0 4px 4px 0',
                                                            border: '1px solid #d1d5db',
                                                            borderLeft: 'none',
                                                            backgroundColor: project?.insuranceSpecification?.auxiliaryBuildingsCoverage === false ? '#6b47c1' : 'transparent',
                                                            color: project?.insuranceSpecification?.auxiliaryBuildingsCoverage === false ? 'white' : '#6b47c1',
                                                            '&:hover': {
                                                                backgroundColor: project?.insuranceSpecification?.auxiliaryBuildingsCoverage === false ? '#5a3aa1' : '#f3f4f6',
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
                                                        onClick={() => handleNestedFieldChange('insuranceSpecification.auxiliaryBuildingsCoverage', true)}
                                                        disabled={mode === 'view' || !canEdit}
                                                        sx={{
                                                            borderRadius: '4px 0 0 4px',
                                                            border: '1px solid #d1d5db',
                                                            backgroundColor: project?.insuranceSpecification?.auxiliaryBuildingsCoverage === true ? '#6b47c1' : 'transparent',
                                                            color: project?.insuranceSpecification?.auxiliaryBuildingsCoverage === true ? 'white' : '#6b47c1',
                                                            '&:hover': {
                                                                backgroundColor: project?.insuranceSpecification?.auxiliaryBuildingsCoverage === true ? '#5a3aa1' : '#f3f4f6',
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
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            justifyContent: 'flex-end'
                                        }}>
                                            {project?.insuranceSpecification?.auxiliaryBuildingsCoverage === true && (
                                                <TextField
                                                    fullWidth
                                                    label="סכום הביטוח (₪)"
                                                    value={project?.insuranceSpecification?.auxiliaryBuildingsCoverageAmount ?
                                                        parseInt(project.insuranceSpecification.auxiliaryBuildingsCoverageAmount.toString()).toLocaleString('he-IL') : ''}
                                                    onChange={(e) => {
                                                        const numericValue = e.target.value.replace(/[^\d]/g, '');
                                                        handleNestedFieldChange('insuranceSpecification.auxiliaryBuildingsCoverageAmount', numericValue || '');
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    size="small"
                                                    type="text"
                                                    inputMode="numeric"
                                                    sx={{
                                                        direction: 'rtl',
                                                        '& .MuiInputBase-root': {
                                                            minHeight: '56px'
                                                        },
                                                        '& .MuiInputLabel-root': {
                                                            top: '0px'
                                                        }
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Box>

                                    {/* החזרי הוצאות במקרה ביטוח - 4 שורות חדשות */}
                                    {/* 1. הוצאות לפינוי הריסות (במקרה ביטוח) */}
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
                                            <Box sx={{ border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: 'white', minHeight: '56px', padding: '0 14px', direction: 'rtl', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                                <Typography sx={{ fontSize: '1rem', color: 'text.secondary', marginRight: '10px' }}>הוצאות לפינוי הריסות (במקרה ביטוח)</Typography>
                                                <Box sx={{ display: 'flex', gap: 0, alignItems: 'center', justifyContent: 'flex-start', marginLeft: '10px' }}>
                                                    <Button variant="text" onClick={() => handleNestedFieldChange('insuranceSpecification.debrisRemoval', false)} disabled={mode === 'view' || !canEdit} sx={{ borderRadius: '0 4px 4px 0', border: '1px solid #d1d5db', borderLeft: 'none', backgroundColor: project?.insuranceSpecification?.debrisRemoval === false ? '#6b47c1' : 'transparent', color: project?.insuranceSpecification?.debrisRemoval === false ? 'white' : '#6b47c1', '&:hover': { backgroundColor: project?.insuranceSpecification?.debrisRemoval === false ? '#5a3aa1' : '#f3f4f6' }, minWidth: '50px', height: '32px', textTransform: 'none', fontSize: '0.875rem', marginRight: '0px' }}>לא</Button>
                                                    <Button variant="text" onClick={() => handleNestedFieldChange('insuranceSpecification.debrisRemoval', true)} disabled={mode === 'view' || !canEdit} sx={{ borderRadius: '4px 0 0 4px', border: '1px solid #d1d5db', backgroundColor: project?.insuranceSpecification?.debrisRemoval === true ? '#6b47c1' : 'transparent', color: project?.insuranceSpecification?.debrisRemoval === true ? 'white' : '#6b47c1', '&:hover': { backgroundColor: project?.insuranceSpecification?.debrisRemoval === true ? '#5a3aa1' : '#f3f4f6' }, minWidth: '50px', height: '32px', textTransform: 'none', fontSize: '0.875rem' }}>כן</Button>
                                                </Box>
                                            </Box>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
                                            {project?.insuranceSpecification?.debrisRemoval === true && (
                                                <TextField fullWidth label="סכום הביטוח (₪)" value={project?.insuranceSpecification?.debrisRemovalAmount ? parseInt(project.insuranceSpecification.debrisRemovalAmount.toString()).toLocaleString('he-IL') : ''} onChange={(e) => { const numericValue = e.target.value.replace(/[^\d]/g, ''); handleNestedFieldChange('insuranceSpecification.debrisRemovalAmount', numericValue || ''); }} disabled={mode === 'view' || !canEdit} size="small" type="text" inputMode="numeric" sx={{ direction: 'rtl', '& .MuiInputBase-root': { minHeight: '56px' }, '& .MuiInputLabel-root': { top: '0px' } }} InputProps={{ endAdornment: (<Typography sx={{ color: 'text.secondary', ml: 1, fontSize: '1rem', fontWeight: 'bold' }}>₪</Typography>) }} />
                                            )}
                                        </Box>
                                    </Box>

                                    {/* 2. הוצאות שכר אדריכלים ואחרים (במקרה ביטוח) */}
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
                                            <Box sx={{ border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: 'white', minHeight: '56px', padding: '0 14px', direction: 'rtl', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                                <Typography sx={{ fontSize: '1rem', color: 'text.secondary', marginRight: '10px' }}>הוצאות שכר אדריכלים ואחרים (במקרה ביטוח)</Typography>
                                                <Box sx={{ display: 'flex', gap: 0, alignItems: 'center', justifyContent: 'flex-start', marginLeft: '10px' }}>
                                                    <Button variant="text" onClick={() => handleNestedFieldChange('insuranceSpecification.architectFees', false)} disabled={mode === 'view' || !canEdit} sx={{ borderRadius: '0 4px 4px 0', border: '1px solid #d1d5db', borderLeft: 'none', backgroundColor: project?.insuranceSpecification?.architectFees === false ? '#6b47c1' : 'transparent', color: project?.insuranceSpecification?.architectFees === false ? 'white' : '#6b47c1', '&:hover': { backgroundColor: project?.insuranceSpecification?.architectFees === false ? '#5a3aa1' : '#f3f4f6' }, minWidth: '50px', height: '32px', textTransform: 'none', fontSize: '0.875rem', marginRight: '0px' }}>לא</Button>
                                                    <Button variant="text" onClick={() => handleNestedFieldChange('insuranceSpecification.architectFees', true)} disabled={mode === 'view' || !canEdit} sx={{ borderRadius: '4px 0 0 4px', border: '1px solid #d1d5db', backgroundColor: project?.insuranceSpecification?.architectFees === true ? '#6b47c1' : 'transparent', color: project?.insuranceSpecification?.architectFees === true ? 'white' : '#6b47c1', '&:hover': { backgroundColor: project?.insuranceSpecification?.architectFees === true ? '#5a3aa1' : '#f3f4f6' }, minWidth: '50px', height: '32px', textTransform: 'none', fontSize: '0.875rem' }}>כן</Button>
                                                </Box>
                                            </Box>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
                                            {project?.insuranceSpecification?.architectFees === true && (
                                                <TextField fullWidth label="סכום הביטוח (₪)" value={project?.insuranceSpecification?.architectFeesAmount ? parseInt(project.insuranceSpecification.architectFeesAmount.toString()).toLocaleString('he-IL') : ''} onChange={(e) => { const numericValue = e.target.value.replace(/[^\d]/g, ''); handleNestedFieldChange('insuranceSpecification.architectFeesAmount', numericValue || ''); }} disabled={mode === 'view' || !canEdit} size="small" type="text" inputMode="numeric" sx={{ direction: 'rtl', '& .MuiInputBase-root': { minHeight: '56px' }, '& .MuiInputLabel-root': { top: '0px' } }} InputProps={{ endAdornment: (<Typography sx={{ color: 'text.secondary', ml: 1, fontSize: '1rem', fontWeight: 'bold' }}>₪</Typography>) }} />
                                            )}
                                        </Box>
                                    </Box>

                                    {/* 3. הוצאות בגין שינויים ותוספות על פי דרישת הרשויות (במקרה ביטוח) */}
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
                                            <Box sx={{ border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: 'white', minHeight: '56px', padding: '0 14px', direction: 'rtl', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                                <Typography sx={{ fontSize: '1rem', color: 'text.secondary', marginRight: '10px' }}>הוצאות בגין שינויים ותוספות על פי דרישת הרשויות (במקרה ביטוח)</Typography>
                                                <Box sx={{ display: 'flex', gap: 0, alignItems: 'center', justifyContent: 'flex-start', marginLeft: '10px' }}>
                                                    <Button variant="text" onClick={() => handleNestedFieldChange('insuranceSpecification.authorityChanges', false)} disabled={mode === 'view' || !canEdit} sx={{ borderRadius: '0 4px 4px 0', border: '1px solid #d1d5db', borderLeft: 'none', backgroundColor: project?.insuranceSpecification?.authorityChanges === false ? '#6b47c1' : 'transparent', color: project?.insuranceSpecification?.authorityChanges === false ? 'white' : '#6b47c1', '&:hover': { backgroundColor: project?.insuranceSpecification?.authorityChanges === false ? '#5a3aa1' : '#f3f4f6' }, minWidth: '50px', height: '32px', textTransform: 'none', fontSize: '0.875rem', marginRight: '0px' }}>לא</Button>
                                                    <Button variant="text" onClick={() => handleNestedFieldChange('insuranceSpecification.authorityChanges', true)} disabled={mode === 'view' || !canEdit} sx={{ borderRadius: '4px 0 0 4px', border: '1px solid #d1d5db', backgroundColor: project?.insuranceSpecification?.authorityChanges === true ? '#6b47c1' : 'transparent', color: project?.insuranceSpecification?.authorityChanges === true ? 'white' : '#6b47c1', '&:hover': { backgroundColor: project?.insuranceSpecification?.authorityChanges === true ? '#5a3aa1' : '#f3f4f6' }, minWidth: '50px', height: '32px', textTransform: 'none', fontSize: '0.875rem' }}>כן</Button>
                                                </Box>
                                            </Box>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
                                            {project?.insuranceSpecification?.authorityChanges === true && (
                                                <TextField fullWidth label="סכום הביטוח (₪)" value={project?.insuranceSpecification?.authorityChangesAmount ? parseInt(project.insuranceSpecification.authorityChangesAmount.toString()).toLocaleString('he-IL') : ''} onChange={(e) => { const numericValue = e.target.value.replace(/[^\d]/g, ''); handleNestedFieldChange('insuranceSpecification.authorityChangesAmount', numericValue || ''); }} disabled={mode === 'view' || !canEdit} size="small" type="text" inputMode="numeric" sx={{ direction: 'rtl', '& .MuiInputBase-root': { minHeight: '56px' }, '& .MuiInputLabel-root': { top: '0px' } }} InputProps={{ endAdornment: (<Typography sx={{ color: 'text.secondary', ml: 1, fontSize: '1rem', fontWeight: 'bold' }}>₪</Typography>) }} />
                                            )}
                                        </Box>
                                    </Box>

                                    {/* סקשן שיעבוד הרכוש */}
                                    <Box sx={{ mb: 4 }}>
                                        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                            שיעבוד הרכוש
                                        </Typography>

                                        {/* גריד 2 עמודות */}
                                        <Box sx={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: 2,
                                            mb: 2
                                        }}>
                                            {/* עמודה 1 - האם נדרש/קיים שיעבוד על הרכוש */}
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
                                                        האם נדרש/קיים שיעבוד על הרכוש
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
                                                            onClick={() => handleNestedFieldChange('insuranceSpecification.propertyPledge.required', false)}
                                                            disabled={mode === 'view' || !canEdit}
                                                            sx={{
                                                                borderRadius: '0 4px 4px 0',
                                                                border: '1px solid #d1d5db',
                                                                borderLeft: 'none',
                                                                backgroundColor: project?.insuranceSpecification?.propertyPledge?.required === false ? '#6b47c1' : 'transparent',
                                                                color: project?.insuranceSpecification?.propertyPledge?.required === false ? 'white' : '#6b47c1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.insuranceSpecification?.propertyPledge?.required === false ? '#5a3aa1' : '#f3f4f6',
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
                                                            onClick={() => handleNestedFieldChange('insuranceSpecification.propertyPledge.required', true)}
                                                            disabled={mode === 'view' || !canEdit}
                                                            sx={{
                                                                borderRadius: '4px 0 0 4px',
                                                                border: '1px solid #d1d5db',
                                                                backgroundColor: project?.insuranceSpecification?.propertyPledge?.required === true ? '#6b47c1' : 'transparent',
                                                                color: project?.insuranceSpecification?.propertyPledge?.required === true ? 'white' : '#6b47c1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.insuranceSpecification?.propertyPledge?.required === true ? '#5a3aa1' : '#f3f4f6',
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

                                            {/* עמודה 2 - ריקה כרגע */}
                                            <Box></Box>
                                        </Box>

                                        {/* טבלת משעבדים - מופיעה רק אם נבחר "כן" */}
                                        {project?.insuranceSpecification?.propertyPledge?.required === true && (
                                            <Box sx={{ mt: 2 }}>
                                                <TableContainer component={Paper} sx={{ border: '1px solid #e0e0e0', overflow: 'auto', maxWidth: '100%' }}>
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                                                <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '15%' }}>סיווג המשעבד</TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '20%' }}>שם</TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '10%' }}>מס׳ סניף</TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '30%' }}>כתובת מלאה</TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '15%' }}>סכום השיעבוד (₪)</TableCell>
                                                                <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '5%' }}></TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {(project?.insuranceSpecification?.propertyPledge?.pledgers && project.insuranceSpecification.propertyPledge.pledgers.length > 0 ? project.insuranceSpecification.propertyPledge.pledgers : [{ classification: 'בנק', name: '', address: '', amount: '', branchNumber: '' }]).map((pledger: any, index) => {
                                                                const isFirstRow = index === 0;
                                                                return (
                                                                    <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                                        <TableCell sx={{ padding: 1, width: '15%' }}>
                                                                            <Autocomplete
                                                                                freeSolo
                                                                                options={['בנק', 'חברת ביטוח', 'אחר']}
                                                                                value={(pledger as any).classification || 'בנק'}
                                                                                onChange={(event, newValue) => {
                                                                                    handleNestedFieldChange(`insuranceSpecification.propertyPledge.pledgers.${index}.classification`, newValue || 'בנק');
                                                                                }}
                                                                                onInputChange={(event, newInputValue) => {
                                                                                    handleNestedFieldChange(`insuranceSpecification.propertyPledge.pledgers.${index}.classification`, newInputValue);
                                                                                }}
                                                                                renderInput={(params) => (
                                                                                    <TextField
                                                                                        {...params}
                                                                                        size="small"
                                                                                        placeholder="סיווג המשעבד"
                                                                                        variant="outlined"
                                                                                        sx={{ '& .MuiOutlinedInput-root': { height: 40 } }}
                                                                                    />
                                                                                )}
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell sx={{ padding: 1, width: '20%' }}>
                                                                            {((pledger as any).classification || 'בנק') === 'בנק' ? (
                                                                                <Autocomplete
                                                                                    freeSolo
                                                                                    options={bankNames}
                                                                                    value={(pledger as any).name || ''}
                                                                                    onChange={(event, newValue) => {
                                                                                        console.log('🔄 Bank name selected:', newValue);
                                                                                        handleNestedFieldChange(`insuranceSpecification.propertyPledge.pledgers.${index}.name`, newValue || '');

                                                                                        // Clear branch number, address and amount when bank changes
                                                                                        handleNestedFieldChange(`insuranceSpecification.propertyPledge.pledgers.${index}.branchNumber`, '');
                                                                                        handleNestedFieldChange(`insuranceSpecification.propertyPledge.pledgers.${index}.address`, '');
                                                                                        handleNestedFieldChange(`insuranceSpecification.propertyPledge.pledgers.${index}.amount`, '');
                                                                                    }}
                                                                                    onInputChange={(event, newInputValue) => {
                                                                                        console.log('🔄 Bank name input changed:', newInputValue);
                                                                                        console.log('🔄 Available bank names:', bankNames);
                                                                                        handleNestedFieldChange(`insuranceSpecification.propertyPledge.pledgers.${index}.name`, newInputValue);
                                                                                    }}
                                                                                    renderInput={(params) => (
                                                                                        <TextField
                                                                                            {...params}
                                                                                            size="small"
                                                                                            placeholder="שם הבנק"
                                                                                            variant="outlined"
                                                                                            sx={{ '& .MuiOutlinedInput-root': { height: 40 } }}
                                                                                        />
                                                                                    )}
                                                                                />
                                                                            ) : (
                                                                                <TextField
                                                                                    fullWidth
                                                                                    size="small"
                                                                                    value={(pledger as any).name || ''}
                                                                                    onChange={(e) => {
                                                                                        handleNestedFieldChange(`insuranceSpecification.propertyPledge.pledgers.${index}.name`, e.target.value);
                                                                                    }}
                                                                                    placeholder="שם"
                                                                                    variant="outlined"
                                                                                    sx={{ '& .MuiOutlinedInput-root': { height: 40 } }}
                                                                                />
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell sx={{ padding: 1, width: '10%' }}>
                                                                            {(() => {
                                                                                const classification = (pledger as any).classification || 'בנק';
                                                                                console.log('🔄 Branch field - classification:', classification, 'pledger:', pledger);
                                                                                return classification === 'בנק' ? (
                                                                                    <Autocomplete
                                                                                        freeSolo
                                                                                        options={bankBranches[(pledger as any).name] || []}
                                                                                        value={(pledger as any).branchNumber || ''}
                                                                                        onChange={(event, newValue) => {
                                                                                            console.log('🔄 Branch number selected:', newValue);
                                                                                            handleNestedFieldChange(`insuranceSpecification.propertyPledge.pledgers.${index}.branchNumber`, newValue || '');

                                                                                            // Auto-fill address and email based on selected branch
                                                                                            if (newValue && (pledger as any).name) {
                                                                                                const branchKey = `${(pledger as any).name}_${newValue}`;
                                                                                                const branchInfo = branchDetails[branchKey];
                                                                                                if (branchInfo) {
                                                                                                    console.log('🔄 Auto-filling branch details:', branchInfo);
                                                                                                    // Only fill if we have actual data
                                                                                                    if (branchInfo.address) {
                                                                                                        handleNestedFieldChange(`insuranceSpecification.propertyPledge.pledgers.${index}.address`, branchInfo.address);
                                                                                                    }
                                                                                                    // Note: amount field is now manual input, not auto-filled from branch data
                                                                                                }
                                                                                            }
                                                                                        }}
                                                                                        onInputChange={(event, newInputValue) => {
                                                                                            console.log('🔄 Branch number input changed:', newInputValue);
                                                                                            console.log('🔄 Available branches for', (pledger as any).name, ':', bankBranches[(pledger as any).name]);
                                                                                            handleNestedFieldChange(`insuranceSpecification.propertyPledge.pledgers.${index}.branchNumber`, newInputValue);
                                                                                        }}
                                                                                        renderInput={(params) => (
                                                                                            <TextField
                                                                                                {...params}
                                                                                                size="small"
                                                                                                placeholder="מס׳ סניף"
                                                                                                variant="outlined"
                                                                                                sx={{ '& .MuiOutlinedInput-root': { height: 40 } }}
                                                                                            />
                                                                                        )}
                                                                                    />
                                                                                ) : (
                                                                                    <Box sx={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.disabled' }}>
                                                                                        -
                                                                                    </Box>
                                                                                );
                                                                            })()}
                                                                        </TableCell>
                                                                        <TableCell sx={{ padding: 1, width: '30%' }}>
                                                                            <TextField
                                                                                fullWidth
                                                                                size="small"
                                                                                value={(pledger as any).address || ''}
                                                                                onChange={(e) => {
                                                                                    handleNestedFieldChange(`insuranceSpecification.propertyPledge.pledgers.${index}.address`, e.target.value);
                                                                                }}
                                                                                placeholder="כתובת מלאה"
                                                                                variant="outlined"
                                                                                sx={{ '& .MuiOutlinedInput-root': { height: 40 } }}
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell sx={{ padding: 1, width: '15%' }}>
                                                                            <TextField
                                                                                fullWidth
                                                                                size="small"
                                                                                value={(pledger as any).amount ? parseInt((pledger as any).amount.toString()).toLocaleString('he-IL') : ''}
                                                                                onChange={(e) => {
                                                                                    const numericValue = e.target.value.replace(/[^\d]/g, '');
                                                                                    handleNestedFieldChange(`insuranceSpecification.propertyPledge.pledgers.${index}.amount`, numericValue || '');
                                                                                }}
                                                                                placeholder="סכום השיעבוד"
                                                                                variant="outlined"
                                                                                type="text"
                                                                                inputMode="numeric"
                                                                                sx={{
                                                                                    direction: 'rtl',
                                                                                    '& .MuiOutlinedInput-root': { height: 40 }
                                                                                }}
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell sx={{ padding: 1, width: '5%' }}>
                                                                            {!isFirstRow && (
                                                                                <IconButton
                                                                                    onClick={() => {
                                                                                        if (window.confirm('האם אתה בטוח שברצונך למחוק את המשעבד?')) {
                                                                                            const currentPledgers = project?.insuranceSpecification?.propertyPledge?.pledgers || [];
                                                                                            const newPledgers = currentPledgers.filter((_, i) => i !== index);
                                                                                            handleNestedFieldChange('insuranceSpecification.propertyPledge.pledgers', newPledgers);
                                                                                        }
                                                                                    }}
                                                                                    title="מחיקה"
                                                                                    sx={{
                                                                                        '& img': {
                                                                                            filter: 'brightness(0) saturate(0)',
                                                                                            width: '16px',
                                                                                            height: '16px'
                                                                                        },
                                                                                        '&:hover, &:focus': {
                                                                                            backgroundColor: '#f44336',
                                                                                            borderRadius: '50%'
                                                                                        },
                                                                                        '&:hover img, &:focus img': {
                                                                                            filter: 'brightness(0) invert(1)'
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <img src="/assets/icon-trash.svg" alt="מחיקה" />
                                                                                </IconButton>
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                            <TableRow>
                                                                <TableCell colSpan={6} sx={{ padding: 1, textAlign: 'center' }}>
                                                                    <Button
                                                                        variant="outlined"
                                                                        onClick={() => {
                                                                            const newPledger = { classification: 'בנק', name: '', address: '', amount: '', branchNumber: '' };
                                                                            const currentPledgers = project?.insuranceSpecification?.propertyPledge?.pledgers || [];
                                                                            handleNestedFieldChange('insuranceSpecification.propertyPledge.pledgers', [...currentPledgers, newPledger]);
                                                                        }}
                                                                        sx={{ mr: 1 }}
                                                                    >
                                                                        + הוספה
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

                                {/* סקשן חבות חוקית כלפי צד שלישי */}
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                        חבות חוקית כלפי צד שלישי
                                    </Typography>

                                    {/* גריד 2 עמודות */}
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 3,
                                        alignItems: 'flex-start'
                                    }}>
                                        {/* עמודה ראשונה - שאלה */}
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
                                                כיסוי לביטוח אחריות כלפי צד שלישי
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
                                                    onClick={() => handleNestedFieldChange('insuranceSpecification.thirdPartyLiability.hasCoverage', false)}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '0 4px 4px 0',
                                                        border: '1px solid #d1d5db',
                                                        borderLeft: 'none',
                                                        backgroundColor: project?.insuranceSpecification?.thirdPartyLiability?.hasCoverage === false ? '#6b47c1' : 'transparent',
                                                        color: project?.insuranceSpecification?.thirdPartyLiability?.hasCoverage === false ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.insuranceSpecification?.thirdPartyLiability?.hasCoverage === false ? '#5a3aa1' : '#f3f4f6',
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
                                                    onClick={() => handleNestedFieldChange('insuranceSpecification.thirdPartyLiability.hasCoverage', true)}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '4px 0 0 4px',
                                                        border: '1px solid #d1d5db',
                                                        backgroundColor: project?.insuranceSpecification?.thirdPartyLiability?.hasCoverage === true ? '#6b47c1' : 'transparent',
                                                        color: project?.insuranceSpecification?.thirdPartyLiability?.hasCoverage === true ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.insuranceSpecification?.thirdPartyLiability?.hasCoverage === true ? '#5a3aa1' : '#f3f4f6',
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

                                        {/* עמודה שנייה - שדה גבול אחריות */}
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', minHeight: '56px' }}>
                                            {project?.insuranceSpecification?.thirdPartyLiability?.hasCoverage === true && (
                                                <TextField
                                                    fullWidth
                                                    label="גבול אחריות (₪)"
                                                    value={project?.insuranceSpecification?.thirdPartyLiability?.liabilityLimit ? parseInt(project.insuranceSpecification.thirdPartyLiability.liabilityLimit.toString()).toLocaleString('he-IL') : ''}
                                                    onChange={(e) => {
                                                        const numericValue = e.target.value.replace(/[^\d]/g, '');
                                                        handleNestedFieldChange('insuranceSpecification.thirdPartyLiability.liabilityLimit', numericValue || '');
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    size="small"
                                                    type="text"
                                                    inputMode="numeric"
                                                    sx={{
                                                        direction: 'rtl',
                                                        '& .MuiInputBase-root': { minHeight: '56px' },
                                                        '& .MuiInputLabel-root': { top: '0px' }
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                </Box>

                                {/* שורות נוספות לחבות */}
                                <Box sx={{ mb: 4 }}>
                                    {/* שורה 1 - חבות בגין נזק תוצאתי לתת קרקע */}
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 3,
                                        alignItems: 'flex-start',
                                        mb: 3
                                    }}>
                                        {/* עמודה ראשונה - שאלה */}
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
                                                חבות בגין נזק תוצאתי הנובע מנזק לפריטים תת קרקעיים
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
                                                    onClick={() => handleNestedFieldChange('insuranceSpecification.consequentialDamage.hasCoverage', false)}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '0 4px 4px 0',
                                                        border: '1px solid #d1d5db',
                                                        borderLeft: 'none',
                                                        backgroundColor: project?.insuranceSpecification?.consequentialDamage?.hasCoverage === false ? '#6b47c1' : 'transparent',
                                                        color: project?.insuranceSpecification?.consequentialDamage?.hasCoverage === false ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.insuranceSpecification?.consequentialDamage?.hasCoverage === false ? '#5a3aa1' : '#f3f4f6',
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
                                                    onClick={() => handleNestedFieldChange('insuranceSpecification.consequentialDamage.hasCoverage', true)}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '4px 0 0 4px',
                                                        border: '1px solid #d1d5db',
                                                        backgroundColor: project?.insuranceSpecification?.consequentialDamage?.hasCoverage === true ? '#6b47c1' : 'transparent',
                                                        color: project?.insuranceSpecification?.consequentialDamage?.hasCoverage === true ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.insuranceSpecification?.consequentialDamage?.hasCoverage === true ? '#5a3aa1' : '#f3f4f6',
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

                                        {/* עמודה שנייה - שדה גבול אחריות */}
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', minHeight: '56px' }}>
                                            {project?.insuranceSpecification?.consequentialDamage?.hasCoverage === true && (
                                                <TextField
                                                    fullWidth
                                                    label="תת גבול אחריות (₪)"
                                                    value={project?.insuranceSpecification?.consequentialDamage?.liabilityLimit ? parseInt(project.insuranceSpecification.consequentialDamage.liabilityLimit.toString()).toLocaleString('he-IL') : ''}
                                                    onChange={(e) => {
                                                        const numericValue = e.target.value.replace(/[^\d]/g, '');
                                                        handleNestedFieldChange('insuranceSpecification.consequentialDamage.liabilityLimit', numericValue || '');
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    size="small"
                                                    type="text"
                                                    inputMode="numeric"
                                                    sx={{
                                                        direction: 'rtl',
                                                        '& .MuiInputBase-root': { minHeight: '56px' },
                                                        '& .MuiInputLabel-root': { top: '0px' }
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Box>

                                    {/* שורה 2 - חבות בגין רעידות והחלשת משען */}
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 3,
                                        alignItems: 'flex-start'
                                    }}>
                                        {/* עמודה ראשונה - שאלה */}
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
                                                חבות בגין רעידות והחלשת משען
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
                                                    onClick={() => handleNestedFieldChange('insuranceSpecification.vibrationsWeakening.hasCoverage', false)}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '0 4px 4px 0',
                                                        border: '1px solid #d1d5db',
                                                        borderLeft: 'none',
                                                        backgroundColor: project?.insuranceSpecification?.vibrationsWeakening?.hasCoverage === false ? '#6b47c1' : 'transparent',
                                                        color: project?.insuranceSpecification?.vibrationsWeakening?.hasCoverage === false ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.insuranceSpecification?.vibrationsWeakening?.hasCoverage === false ? '#5a3aa1' : '#f3f4f6',
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
                                                    onClick={() => handleNestedFieldChange('insuranceSpecification.vibrationsWeakening.hasCoverage', true)}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '4px 0 0 4px',
                                                        border: '1px solid #d1d5db',
                                                        backgroundColor: project?.insuranceSpecification?.vibrationsWeakening?.hasCoverage === true ? '#6b47c1' : 'transparent',
                                                        color: project?.insuranceSpecification?.vibrationsWeakening?.hasCoverage === true ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.insuranceSpecification?.vibrationsWeakening?.hasCoverage === true ? '#5a3aa1' : '#f3f4f6',
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

                                        {/* עמודה שנייה - שדה גבול אחריות */}
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', minHeight: '56px' }}>
                                            {project?.insuranceSpecification?.vibrationsWeakening?.hasCoverage === true && (
                                                <TextField
                                                    fullWidth
                                                    label="תת גבול אחריות (₪)"
                                                    value={project?.insuranceSpecification?.vibrationsWeakening?.liabilityLimit ? parseInt(project.insuranceSpecification.vibrationsWeakening.liabilityLimit.toString()).toLocaleString('he-IL') : ''}
                                                    onChange={(e) => {
                                                        const numericValue = e.target.value.replace(/[^\d]/g, '');
                                                        const numericAmount = parseInt(numericValue) || 0;

                                                        // הגבלה: 4,000,000 ₪ או 20% מגבול אחריות צד ג', הנמוך מביניהם
                                                        const thirdPartyLimit = parseInt(project?.insuranceSpecification?.thirdPartyLiability?.liabilityLimit || '0') || 0;
                                                        const twentyPercentLimit = Math.floor(thirdPartyLimit * 0.2);
                                                        const maxLimit = Math.min(4000000, twentyPercentLimit);

                                                        const finalValue = numericAmount > maxLimit ? maxLimit.toString() : numericValue;
                                                        handleNestedFieldChange('insuranceSpecification.vibrationsWeakening.liabilityLimit', finalValue || '');
                                                    }}
                                                    disabled={mode === 'view' || !canEdit}
                                                    size="small"
                                                    type="text"
                                                    inputMode="numeric"
                                                    helperText="מוגבל ל-4,000,000 ₪ או 20% מגבול אחריות צד ג', הנמוך מביניהם"
                                                    sx={{
                                                        direction: 'rtl',
                                                        '& .MuiInputBase-root': { minHeight: '56px' },
                                                        '& .MuiInputLabel-root': { top: '0px' }
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                </Box>

                                {/* סקשן חבות מעבידים */}
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 2, color: 'text.secondary' }}>
                                        חבות מעבידים
                                    </Typography>

                                    {/* גריד של 2 עמודות */}
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 3,
                                        alignItems: 'flex-start'
                                    }}>
                                        {/* עמודה ראשונה - שאלה */}
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
                                                כיסוי חבות מעבידים
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
                                                    onClick={() => handleNestedFieldChange('insuranceSpecification.employerLiability.hasCoverage', false)}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '0 4px 4px 0',
                                                        border: '1px solid #d1d5db',
                                                        borderLeft: 'none',
                                                        minWidth: '50px',
                                                        height: '32px',
                                                        textTransform: 'none',
                                                        fontSize: '0.875rem',
                                                        backgroundColor: project?.insuranceSpecification?.employerLiability?.hasCoverage === false ? '#6b47c1' : 'transparent',
                                                        color: project?.insuranceSpecification?.employerLiability?.hasCoverage === false ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.insuranceSpecification?.employerLiability?.hasCoverage === false ? '#553C9A' : '#F3F4F6'
                                                        }
                                                    }}
                                                >
                                                    לא
                                                </Button>
                                                <Button
                                                    variant="text"
                                                    onClick={() => handleNestedFieldChange('insuranceSpecification.employerLiability.hasCoverage', true)}
                                                    disabled={mode === 'view' || !canEdit}
                                                    sx={{
                                                        borderRadius: '4px 0 0 4px',
                                                        border: '1px solid #d1d5db',
                                                        minWidth: '50px',
                                                        height: '32px',
                                                        textTransform: 'none',
                                                        fontSize: '0.875rem',
                                                        backgroundColor: project?.insuranceSpecification?.employerLiability?.hasCoverage === true ? '#6b47c1' : 'transparent',
                                                        color: project?.insuranceSpecification?.employerLiability?.hasCoverage === true ? 'white' : '#6b47c1',
                                                        '&:hover': {
                                                            backgroundColor: project?.insuranceSpecification?.employerLiability?.hasCoverage === true ? '#553C9A' : '#F3F4F6'
                                                        }
                                                    }}
                                                >
                                                    כן
                                                </Button>
                                            </Box>
                                        </Box>

                                        {/* עמודה שנייה - שדה גבול אחריות */}
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', minHeight: '56px' }}>
                                            {project?.insuranceSpecification?.employerLiability?.hasCoverage === true && (
                                                <TextField
                                                    fullWidth
                                                    label="גבול אחריות (₪)"
                                                    value="20,000,000"
                                                    disabled={true}
                                                    size="small"
                                                    type="text"
                                                    sx={{
                                                        direction: 'rtl',
                                                        '& .MuiInputBase-root': {
                                                            minHeight: '56px',
                                                            backgroundColor: '#f5f5f5'
                                                        },
                                                        '& .MuiInputLabel-root': { top: '0px' }
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                    {/* שורות נוספות - מופיעות רק כאשר בוחרים כן בכיסוי חבות מעבידים */}
                                    {project?.insuranceSpecification?.employerLiability?.hasCoverage === true && (
                                        <>
                                            {/* שורה 1 - העסקת נוער */}
                                            <Box sx={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: 3,
                                                alignItems: 'flex-start',
                                                mt: 2
                                            }}>
                                                {/* עמודה ראשונה - שאלה */}
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
                                                        העסקת נוער
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
                                                            onClick={() => handleNestedFieldChange('insuranceSpecification.employerLiability.youthEmployment.hasCoverage', false)}
                                                            disabled={mode === 'view' || !canEdit}
                                                            sx={{
                                                                borderRadius: '0 4px 4px 0',
                                                                border: '1px solid #d1d5db',
                                                                borderLeft: 'none',
                                                                minWidth: '50px',
                                                                height: '32px',
                                                                textTransform: 'none',
                                                                fontSize: '0.875rem',
                                                                backgroundColor: project?.insuranceSpecification?.employerLiability?.youthEmployment?.hasCoverage === false ? '#6b47c1' : 'transparent',
                                                                color: project?.insuranceSpecification?.employerLiability?.youthEmployment?.hasCoverage === false ? 'white' : '#6b47c1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.insuranceSpecification?.employerLiability?.youthEmployment?.hasCoverage === false ? '#553C9A' : '#F3F4F6'
                                                                }
                                                            }}
                                                        >
                                                            לא
                                                        </Button>
                                                        <Button
                                                            variant="text"
                                                            onClick={() => handleNestedFieldChange('insuranceSpecification.employerLiability.youthEmployment.hasCoverage', true)}
                                                            disabled={mode === 'view' || !canEdit}
                                                            sx={{
                                                                borderRadius: '4px 0 0 4px',
                                                                border: '1px solid #d1d5db',
                                                                minWidth: '50px',
                                                                height: '32px',
                                                                textTransform: 'none',
                                                                fontSize: '0.875rem',
                                                                backgroundColor: project?.insuranceSpecification?.employerLiability?.youthEmployment?.hasCoverage === true ? '#6b47c1' : 'transparent',
                                                                color: project?.insuranceSpecification?.employerLiability?.youthEmployment?.hasCoverage === true ? 'white' : '#6b47c1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.insuranceSpecification?.employerLiability?.youthEmployment?.hasCoverage === true ? '#553C9A' : '#F3F4F6'
                                                                }
                                                            }}
                                                        >
                                                            כן
                                                        </Button>
                                                    </Box>
                                                </Box>
                                                {/* עמודה שנייה - שדה פירוט */}
                                                <Box sx={{ display: 'flex', alignItems: 'flex-start', minHeight: '56px' }}>
                                                    {project?.insuranceSpecification?.employerLiability?.youthEmployment?.hasCoverage === true && (
                                                        <TextField
                                                            fullWidth
                                                            label="פירוט"
                                                            value={project?.insuranceSpecification?.employerLiability?.youthEmployment?.details || ''}
                                                            onChange={(e) => handleNestedFieldChange('insuranceSpecification.employerLiability.youthEmployment.details', e.target.value)}
                                                            disabled={mode === 'view' || !canEdit}
                                                            size="small"
                                                            type="text"
                                                            sx={{
                                                                direction: 'rtl',
                                                                '& .MuiInputBase-root': { minHeight: '56px' },
                                                                '& .MuiInputLabel-root': { top: '0px' }
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            </Box>
                                        </>
                                    )}

                                    {/* שורות נוספות - מופיעות רק כאשר בוחרים כן בכיסוי חבות מעבידים */}
                                    {project?.insuranceSpecification?.employerLiability?.hasCoverage === true && (
                                        <>
                                            {/* שורה 2 - העסקת מתנדבים */}
                                            <Box sx={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: 3,
                                                alignItems: 'flex-start',
                                                mt: 2
                                            }}>
                                                {/* עמודה ראשונה - שאלה */}
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
                                                        העסקת מתנדבים
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
                                                            onClick={() => handleNestedFieldChange('insuranceSpecification.employerLiability.volunteerEmployment.hasCoverage', false)}
                                                            disabled={mode === 'view' || !canEdit}
                                                            sx={{
                                                                borderRadius: '0 4px 4px 0',
                                                                border: '1px solid #d1d5db',
                                                                borderLeft: 'none',
                                                                minWidth: '50px',
                                                                height: '32px',
                                                                textTransform: 'none',
                                                                fontSize: '0.875rem',
                                                                backgroundColor: project?.insuranceSpecification?.employerLiability?.volunteerEmployment?.hasCoverage === false ? '#6b47c1' : 'transparent',
                                                                color: project?.insuranceSpecification?.employerLiability?.volunteerEmployment?.hasCoverage === false ? 'white' : '#6b47c1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.insuranceSpecification?.employerLiability?.volunteerEmployment?.hasCoverage === false ? '#553C9A' : '#F3F4F6'
                                                                }
                                                            }}
                                                        >
                                                            לא
                                                        </Button>
                                                        <Button
                                                            variant="text"
                                                            onClick={() => handleNestedFieldChange('insuranceSpecification.employerLiability.volunteerEmployment.hasCoverage', true)}
                                                            disabled={mode === 'view' || !canEdit}
                                                            sx={{
                                                                borderRadius: '4px 0 0 4px',
                                                                border: '1px solid #d1d5db',
                                                                minWidth: '50px',
                                                                height: '32px',
                                                                textTransform: 'none',
                                                                fontSize: '0.875rem',
                                                                backgroundColor: project?.insuranceSpecification?.employerLiability?.volunteerEmployment?.hasCoverage === true ? '#6b47c1' : 'transparent',
                                                                color: project?.insuranceSpecification?.employerLiability?.volunteerEmployment?.hasCoverage === true ? 'white' : '#6b47c1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.insuranceSpecification?.employerLiability?.volunteerEmployment?.hasCoverage === true ? '#553C9A' : '#F3F4F6'
                                                                }
                                                            }}
                                                        >
                                                            כן
                                                        </Button>
                                                    </Box>
                                                </Box>

                                                {/* עמודה שנייה - שדה פירוט */}
                                                <Box sx={{ display: 'flex', alignItems: 'flex-start', minHeight: '56px' }}>
                                                    {project?.insuranceSpecification?.employerLiability?.volunteerEmployment?.hasCoverage === true && (
                                                        <TextField
                                                            fullWidth
                                                            label="פירוט"
                                                            value={project?.insuranceSpecification?.employerLiability?.volunteerEmployment?.details || ''}
                                                            onChange={(e) => handleNestedFieldChange('insuranceSpecification.employerLiability.volunteerEmployment.details', e.target.value)}
                                                            disabled={mode === 'view' || !canEdit}
                                                            size="small"
                                                            type="text"
                                                            sx={{
                                                                direction: 'rtl',
                                                                '& .MuiInputBase-root': { minHeight: '56px' },
                                                                '& .MuiInputLabel-root': { top: '0px' }
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            </Box>

                                            {/* שורה 3 - עובדים שאינם מכוסים לפי חוק ביטוח לאומי */}
                                            <Box sx={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: 3,
                                                alignItems: 'flex-start',
                                                mt: 2
                                            }}>
                                                {/* עמודה ראשונה - שאלה */}
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
                                                        עובדים שאינם מכוסים לפי חוק ביטוח לאומי
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
                                                            onClick={() => handleNestedFieldChange('insuranceSpecification.employerLiability.uncoveredEmployees.hasCoverage', false)}
                                                            disabled={mode === 'view' || !canEdit}
                                                            sx={{
                                                                borderRadius: '0 4px 4px 0',
                                                                border: '1px solid #d1d5db',
                                                                borderLeft: 'none',
                                                                minWidth: '50px',
                                                                height: '32px',
                                                                textTransform: 'none',
                                                                fontSize: '0.875rem',
                                                                backgroundColor: project?.insuranceSpecification?.employerLiability?.uncoveredEmployees?.hasCoverage === false ? '#6b47c1' : 'transparent',
                                                                color: project?.insuranceSpecification?.employerLiability?.uncoveredEmployees?.hasCoverage === false ? 'white' : '#6b47c1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.insuranceSpecification?.employerLiability?.uncoveredEmployees?.hasCoverage === false ? '#553C9A' : '#F3F4F6'
                                                                }
                                                            }}
                                                        >
                                                            לא
                                                        </Button>
                                                        <Button
                                                            variant="text"
                                                            onClick={() => handleNestedFieldChange('insuranceSpecification.employerLiability.uncoveredEmployees.hasCoverage', true)}
                                                            disabled={mode === 'view' || !canEdit}
                                                            sx={{
                                                                borderRadius: '4px 0 0 4px',
                                                                border: '1px solid #d1d5db',
                                                                minWidth: '50px',
                                                                height: '32px',
                                                                textTransform: 'none',
                                                                fontSize: '0.875rem',
                                                                backgroundColor: project?.insuranceSpecification?.employerLiability?.uncoveredEmployees?.hasCoverage === true ? '#6b47c1' : 'transparent',
                                                                color: project?.insuranceSpecification?.employerLiability?.uncoveredEmployees?.hasCoverage === true ? 'white' : '#6b47c1',
                                                                '&:hover': {
                                                                    backgroundColor: project?.insuranceSpecification?.employerLiability?.uncoveredEmployees?.hasCoverage === true ? '#553C9A' : '#F3F4F6'
                                                                }
                                                            }}
                                                        >
                                                            כן
                                                        </Button>
                                                    </Box>
                                                </Box>

                                                {/* עמודה שנייה - שדה פירוט */}
                                                <Box sx={{ display: 'flex', alignItems: 'flex-start', minHeight: '56px' }}>
                                                    {project?.insuranceSpecification?.employerLiability?.uncoveredEmployees?.hasCoverage === true && (
                                                        <TextField
                                                            fullWidth
                                                            label="פירוט"
                                                            value={project?.insuranceSpecification?.employerLiability?.uncoveredEmployees?.details || ''}
                                                            onChange={(e) => handleNestedFieldChange('insuranceSpecification.employerLiability.uncoveredEmployees.details', e.target.value)}
                                                            disabled={mode === 'view' || !canEdit}
                                                            size="small"
                                                            type="text"
                                                            sx={{
                                                                direction: 'rtl',
                                                                '& .MuiInputBase-root': { minHeight: '56px' },
                                                                '& .MuiInputLabel-root': { top: '0px' }
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            </Box>
                                        </>
                                    )}
                                </Box>
                            </Box>
                        )}

                        {activeTab === 4 && (
                            <Box>
                                {/* Search and Add Section */}
                                <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
                                    <TextField
                                        fullWidth
                                        placeholder="חיפוש תביעה"
                                        variant="outlined"
                                        size="small"
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
                                    <Button
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        onClick={handleOpenClaimDialog}
                                        sx={{
                                            backgroundColor: '#6b47c1',
                                            '&:hover': {
                                                backgroundColor: '#5a3aa1'
                                            },
                                            minWidth: 'auto',
                                            px: 3
                                        }}
                                    >
                                        הוספה
                                    </Button>
                                </Box>

                                {/* Filter Tabs */}
                                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                                    <Tabs
                                        value={claimsFilterTab}
                                        onChange={handleClaimsFilterTabChange}
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
                                        }}
                                    >
                                        <Tab label="הכל" />
                                        <Tab label="פתוחות" />
                                        <Tab label="סגורות" />
                                    </Tabs>
                                </Box>

                                {/* Claims Content Area */}
                                {loadingClaims ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                        <CircularProgress />
                                    </Box>
                                ) : (
                                    <Box sx={{ minHeight: '400px' }}>
                                        {claims.length === 0 ? (
                                            <Box sx={{
                                                minHeight: '400px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '1px dashed #e0e0e0',
                                                borderRadius: 1,
                                                backgroundColor: '#fafafa'
                                            }}>
                                                <Typography variant="body1" color="text.secondary">
                                                    {claimsFilterTab === 0 && 'אין תביעות להצגה'}
                                                    {claimsFilterTab === 1 && 'אין תביעות פתוחות'}
                                                    {claimsFilterTab === 2 && 'אין תביעות סגורות'}
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                                                <Table>
                                                    <TableHead>
                                                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>תיאור</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>סטטוס</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>תאריך יצירה</TableCell>
                                                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>פעולות</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {claims
                                                            .filter(claim => {
                                                                if (claimsFilterTab === 0) return true; // הכל
                                                                if (claimsFilterTab === 1) return claim.status === 'open'; // פתוחות
                                                                if (claimsFilterTab === 2) return claim.status === 'closed'; // סגורות
                                                                return true;
                                                            })
                                                            .map((claim, index) => (
                                                                <TableRow key={claim._id || index} sx={{ '&:hover': { backgroundColor: '#f5f5f5' } }}>
                                                                    <TableCell sx={{ textAlign: 'right' }}>{claim.description || 'ללא תיאור'}</TableCell>
                                                                    <TableCell sx={{ textAlign: 'right' }}>
                                                                        <Box sx={{
                                                                            display: 'inline-block',
                                                                            px: 2,
                                                                            py: 0.5,
                                                                            borderRadius: 1,
                                                                            backgroundColor: claim.status === 'open' ? '#e3f2fd' : '#f3e5f5',
                                                                            color: claim.status === 'open' ? '#1976d2' : '#7b1fa2',
                                                                            fontSize: '0.875rem',
                                                                            fontWeight: 'bold'
                                                                        }}>
                                                                            {claim.status === 'open' ? 'פתוחה' : 'סגורה'}
                                                                        </Box>
                                                                    </TableCell>
                                                                    <TableCell sx={{ textAlign: 'right' }}>
                                                                        {new Date(claim.createdAt).toLocaleDateString('he-IL')}
                                                                    </TableCell>
                                                                    <TableCell sx={{ textAlign: 'right' }}>
                                                                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                                                            <IconButton
                                                                                size="small"
                                                                                onClick={() => {
                                                                                    const claimUrl = `/claim-form?projectId=${project?._id || project?.id}&projectName=${encodeURIComponent(project?.projectName || '')}&claimId=${claim._id}&mode=edit`;
                                                                                    navigate(claimUrl);
                                                                                }}
                                                                                sx={{
                                                                                    color: '#666666',
                                                                                    borderRadius: '50%',
                                                                                    width: '32px',
                                                                                    height: '32px',
                                                                                    '&:hover': {
                                                                                        backgroundColor: '#6b47c1',
                                                                                        color: 'white'
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <EditIcon fontSize="small" />
                                                                            </IconButton>
                                                                            <IconButton
                                                                                size="small"
                                                                                onClick={() => handleDeleteClaim(claim._id)}
                                                                                sx={{
                                                                                    color: '#666666',
                                                                                    borderRadius: '50%',
                                                                                    width: '32px',
                                                                                    height: '32px',
                                                                                    '&:hover': {
                                                                                        backgroundColor: '#d32f2f',
                                                                                        color: 'white',
                                                                                        '& img': {
                                                                                            filter: 'brightness(0) invert(1)'
                                                                                        }
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <img
                                                                                    src={trashIconUrl}
                                                                                    alt="מחיקה"
                                                                                    style={{
                                                                                        width: '16px',
                                                                                        height: '16px'
                                                                                    }}
                                                                                />
                                                                            </IconButton>
                                                                        </Box>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        )}


                        {activeTab === 5 && (project?.status === 'current' || project?.status === 'completed') && (
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
                                                    bgcolor: '#6b47c1',
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
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(300px, 1fr))' }, gap: 3 }}>
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
                                                <Typography variant="h6" sx={{ color: '#6b47c1', fontWeight: 'bold' }}>
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
                                                <Typography variant="h6" sx={{ color: '#6b47c1', fontWeight: 'bold' }}>
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
                                                <Typography variant="h6" sx={{ color: '#6b47c1', fontWeight: 'bold' }}>
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
                                                <Typography variant="h6" sx={{ color: '#6b47c1', fontWeight: 'bold' }}>
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
                                                <Typography variant="h6" sx={{ color: '#6b47c1', fontWeight: 'bold' }}>
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
