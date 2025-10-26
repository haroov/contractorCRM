import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    Button,
    Alert,
    CircularProgress,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Tooltip,
    LinearProgress
} from '@mui/material';
import {
    TrendingUp,
    TrendingDown,
    TrendingFlat,
    OpenInNew,
    Link as LinkIcon,
    Refresh,
    Warning,
    CheckCircle,
    Error
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
// import { format, parseISO, subDays } from 'date-fns';
// import { he } from 'date-fns/locale';

interface SafetyReport {
    _id: string;
    date: string;
    score: number;
    site: string;
    reportUrl: string;
    issuesUrl?: string;
    contractorName: string;
    projectId?: string;
    projectName?: string;
    matchConfidence?: number;
    createdAt: string;
    // Nested links coming from backend
    reports?: {
        daily?: {
            safetyIndex?: { url?: string; score?: number };
            findings?: { url?: string };
        };
        weekly?: {
            equipment?: { url?: string };
            workers?: { url?: string };
        };
    };
}

interface SafetyStats {
    totalReports: number;
    averageScore: number;
    latestScore: number;
    trend: 'improving' | 'declining' | 'stable';
    reports: SafetyReport[];
}

interface SafetyDashboardProps {
    projectId: string;
    projectName?: string;
}

const SafetyDashboard: React.FC<SafetyDashboardProps> = ({ projectId, projectName }) => {
    const [stats, setStats] = useState<SafetyStats | null>(null);
    const [reports, setReports] = useState<SafetyReport[]>([]);
    const [unmatchedReports, setUnmatchedReports] = useState<SafetyReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState<SafetyReport | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [selectedPoint, setSelectedPoint] = useState<any>(null);
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
    const [activeCoords, setActiveCoords] = useState<{ x: number; y: number } | null>(null);

    useEffect(() => {
        fetchSafetyData();
    }, [projectId]);

    // Handle ESC key to close tooltip
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && tooltipVisible) {
                setTooltipVisible(false);
                setSelectedPoint(null);
                setActiveCoords(null);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [tooltipVisible]);

    const fetchSafetyData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch safety statistics
            const statsResponse = await fetch(`/api/safety-reports/stats/summary?projectId=${projectId}&days=30`);
            const statsData = await statsResponse.json();

            if (statsData.success) {
                setStats(statsData.data);
            }

            // Fetch project safety reports
            const reportsResponse = await fetch(`/api/safety-reports/project/${projectId}`);
            const reportsData = await reportsResponse.json();

            if (reportsData.success) {
                setReports(reportsData.data);
            }

            // Fetch unmatched reports for manual linking (best-effort; ignore if endpoint missing)
            try {
                const unmatchedResponse = await fetch('/api/safety-reports/unmatched');
                if (unmatchedResponse.ok) {
                    const unmatchedData = await unmatchedResponse.json();
                    if (unmatchedData.success) {
                        setUnmatchedReports(unmatchedData.data);
                    }
                }
            } catch (e) {
                // Silently ignore unmatched fetch failures
                console.warn('Unmatched reports fetch skipped:', e);
            }

        } catch (err) {
            setError('שגיאה בטעינת נתוני הבטיחות');
            console.error('Error fetching safety data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleManualFetch = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/safety-reports/fetch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (data.success) {
                await fetchSafetyData(); // Refresh data
            } else {
                setError('שגיאה בקבלת דוחות בטיחות חדשים');
            }
        } catch (err) {
            setError('שגיאה בקבלת דוחות בטיחות חדשים');
            console.error('Error fetching reports:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLinkReport = async () => {
        if (!selectedReport || !selectedProjectId) return;

        try {
            const response = await fetch(`/api/safety-reports/${selectedReport._id}/link`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ projectId: selectedProjectId }),
            });

            const data = await response.json();

            if (data.success) {
                setLinkDialogOpen(false);
                setSelectedReport(null);
                setSelectedProjectId('');
                await fetchSafetyData(); // Refresh data
            } else {
                setError('שגיאה בקישור הדוח לפרויקט');
            }
        } catch (err) {
            setError('שגיאה בקישור הדוח לפרויקט');
            console.error('Error linking report:', err);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 85) return 'success';
        if (score >= 70) return 'warning';
        return 'error';
    };

    const getScoreIcon = (score: number) => {
        if (score >= 85) return <CheckCircle color="success" />;
        if (score >= 70) return <Warning color="warning" />;
        return <Error color="error" />;
    };

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'improving':
                return <TrendingUp color="success" />;
            case 'declining':
                return <TrendingDown color="error" />;
            default:
                return <TrendingFlat color="info" />;
        }
    };

    const getTrendText = (trend: string) => {
        switch (trend) {
            case 'improving':
                return 'משתפר';
            case 'declining':
                return 'יורד';
            default:
                return 'יציב';
        }
    };

    const formatDate = (dateString: string) => {
        try {
            // Simple date formatting without date-fns for now
            const date = new Date(dateString);
            return date.toLocaleDateString('he-IL');
        } catch {
            return dateString;
        }
    };

    const prepareChartData = () => {
        return reports
            .filter(report => report.score > 0) // Filter out zero scores (no work or system not working)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map((report, index, arr) => {
                console.log('Preparing chart data for report:', {
                    date: report.date,
                    reportUrl: report.reportUrl,
                    issuesUrl: report.issuesUrl,
                    reports: report.reports
                });

                return {
                    dateLabel: formatDate(report.date),
                    score: report.score,
                    avg30: Math.round((arr.slice(Math.max(0, index - 29), index + 1).reduce((s, r) => s + r.score, 0) / (Math.min(index + 1, 30))) * 10) / 10,
                    reportUrl: report.reportUrl || report.reports?.daily?.safetyIndex?.url,
                    issuesUrl: report.issuesUrl || report.reports?.daily?.findings?.url,
                    workersUrl: report.reports?.weekly?.workers?.url,
                    equipmentUrl: report.reports?.weekly?.equipment?.url
                };
            });
    };


    const handleChartContainerClick = (event: any) => {
        // Close tooltip when clicking outside the tooltip itself
        if (tooltipVisible && !event.target.closest('.tooltip-content')) {
            setTooltipVisible(false);
            setSelectedPoint(null);
            setActiveCoords(null);
        }
    };

    if (loading && !stats) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h2">
                    דשבורד בטיחות - {projectName}
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={handleManualFetch}
                    disabled={loading}
                >
                    קבלת דוחות חדשים
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {loading && <LinearProgress sx={{ mb: 2 }} />}

            {stats && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
                    {/* Current Score Card */}
                    <Box>
                        <Card>
                            <CardContent>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box>
                                        <Typography color="textSecondary" gutterBottom>
                                            ציון נוכחי
                                        </Typography>
                                        <Typography variant="h3" component="div" color={getScoreColor(stats.latestScore)}>
                                            {stats.latestScore}
                                        </Typography>
                                    </Box>
                                    {getScoreIcon(stats.latestScore)}
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>

                    {/* Average Score Card */}
                    <Box>
                        <Card>
                            <CardContent>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box>
                                        <Typography color="textSecondary" gutterBottom>
                                            ממוצע 30 יום
                                        </Typography>
                                        <Typography variant="h3" component="div" color={getScoreColor(stats.averageScore)}>
                                            {stats.averageScore}
                                        </Typography>
                                    </Box>
                                    {getScoreIcon(stats.averageScore)}
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>

                    {/* Trend Card */}
                    <Box>
                        <Card>
                            <CardContent>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box>
                                        <Typography color="textSecondary" gutterBottom>
                                            מגמה
                                        </Typography>
                                        <Typography variant="h6" component="div">
                                            {getTrendText(stats.trend)}
                                        </Typography>
                                    </Box>
                                    {getTrendIcon(stats.trend)}
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>

                    {/* Total Reports Card */}
                    <Box>
                        <Card>
                            <CardContent>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box>
                                        <Typography color="textSecondary" gutterBottom>
                                            סה"כ דוחות
                                        </Typography>
                                        <Typography variant="h3" component="div">
                                            {stats.totalReports}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>
                </Box>
            )}

            {reports.length > 0 && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            מגמת ציון בטיחות
                        </Typography>
                        <Box
                            className="chart-container"
                            sx={{ width: '100%', height: 300, position: 'relative' }}
                            onClick={(e) => {
                                console.log('Chart container clicked:', e);
                                if (selectedPoint && activeCoords) {
                                    console.log('Showing tooltip for selected point:', selectedPoint);
                                    console.log('Using active coordinates:', activeCoords);
                                    console.log('Selected point URLs:', {
                                        reportUrl: selectedPoint.reportUrl,
                                        issuesUrl: selectedPoint.issuesUrl,
                                        workersUrl: selectedPoint.workersUrl,
                                        equipmentUrl: selectedPoint.equipmentUrl
                                    });
                                    setTooltipVisible(true);

                                    // Calculate position relative to the chart container
                                    const chartContainer = e.currentTarget;
                                    const rect = chartContainer.getBoundingClientRect();

                                    // Tooltip dimensions
                                    const tooltipWidth = 200;
                                    const tooltipHeight = 120;

                                    // Use the actual data point coordinates
                                    let tooltipX = activeCoords.x;
                                    let tooltipY = activeCoords.y;

                                    // Add offset to position tooltip next to the point
                                    const offset = 15;

                                    // Determine which side to show tooltip based on point position
                                    const isRightSide = activeCoords.x > rect.width / 2;
                                    const isTopSide = activeCoords.y < rect.height / 2;
                                    
                                    if (isRightSide) {
                                        tooltipX = activeCoords.x + offset; // Show to the right
                                    } else {
                                        tooltipX = activeCoords.x - tooltipWidth - offset; // Show to the left
                                    }
                                    
                                    if (isTopSide) {
                                        tooltipY = activeCoords.y - tooltipHeight - offset; // Show above
                                    } else {
                                        tooltipY = activeCoords.y + offset; // Show below
                                    }

                                    // Ensure tooltip stays within bounds
                                    tooltipX = Math.max(10, Math.min(tooltipX, rect.width - tooltipWidth - 10));
                                    tooltipY = Math.max(10, Math.min(tooltipY, rect.height - tooltipHeight - 10));

                                    console.log('Tooltip position:', { x: tooltipX, y: tooltipY });
                                    setTooltipPosition({
                                        x: tooltipX,
                                        y: tooltipY
                                    });
                                } else {
                                    console.log('No selected point or coordinates, closing tooltip');
                                    setTooltipVisible(false);
                                }
                                handleChartContainerClick(e);
                            }}
                        >
                            <ResponsiveContainer>
                                <LineChart
                                    data={prepareChartData()}
                                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                                    onMouseMove={(state: any) => {
                                        if (state && state.activePayload && state.activePayload.length > 0) {
                                            console.log('Mouse moved over data point:', state.activePayload[0].payload);
                                            setSelectedPoint(state.activePayload[0].payload);

                                            // Capture the pixel coordinates of the data point
                                            if (state.activeCoordinate) {
                                                setActiveCoords({
                                                    x: state.activeCoordinate.x,
                                                    y: state.activeCoordinate.y
                                                });
                                                console.log('Active coordinates:', state.activeCoordinate);
                                            }
                                        }
                                    }}
                                    onMouseLeave={() => {
                                        // Only clear coordinates if tooltip is not visible
                                        if (!tooltipVisible) {
                                            setSelectedPoint(null);
                                            setActiveCoords(null);
                                        }
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                                    <Line
                                        type="monotone"
                                        dataKey="score"
                                        name="ציון"
                                        stroke="#8B5CF6"
                                        strokeWidth={3}
                                        dot={{ r: 6, fill: '#8B5CF6', strokeWidth: 2, stroke: '#fff', cursor: 'pointer' }}
                                        activeDot={{ r: 8, fill: '#8B5CF6', strokeWidth: 3, stroke: '#fff', cursor: 'pointer' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="avg30"
                                        name="ממוצע נע"
                                        stroke="#10B981"
                                        strokeWidth={2}
                                        dot={false}
                                        strokeDasharray="5 5"
                                    />
                                </LineChart>
                            </ResponsiveContainer>

                            {/* Custom Tooltip */}
                            {tooltipVisible && selectedPoint && tooltipPosition && (
                                <Box
                                    className="tooltip-content"
                                    sx={{
                                        position: 'absolute',
                                        top: tooltipPosition.y,
                                        left: tooltipPosition.x,
                                        bgcolor: 'white',
                                        color: '#333',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: 2,
                                        p: 2,
                                        minWidth: 200,
                                        boxShadow: 3,
                                        zIndex: 1000,
                                        '&::before': {
                                            content: '""',
                                            position: 'absolute',
                                            top: '50%',
                                            left: tooltipPosition.x > 200 ? '-8px' : '100%',
                                            transform: 'translateY(-50%)',
                                            width: 0,
                                            height: 0,
                                            borderTop: '8px solid transparent',
                                            borderBottom: '8px solid transparent',
                                            borderRight: tooltipPosition.x > 200 ? '8px solid #e0e0e0' : 'none',
                                            borderLeft: tooltipPosition.x <= 200 ? '8px solid #e0e0e0' : 'none'
                                        }
                                    }}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#333' }}>
                                            {selectedPoint.dateLabel}
                                        </Typography>
                                        <IconButton
                                            size="small"
                                            onClick={() => {
                                                setTooltipVisible(false);
                                                setSelectedPoint(null);
                                            }}
                                            sx={{ p: 0.25, ml: 1, color: '#666' }}
                                        >
                                            <Typography sx={{ fontSize: '14px', fontWeight: 'bold' }}>×</Typography>
                                        </IconButton>
                                    </Box>
                                    <Typography variant="body2" sx={{ color: '#8B5CF6', fontWeight: 600, mb: 0.5 }}>
                                        {selectedPoint.score} : ציון
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: '#10B981', mb: 1 }}>
                                        {selectedPoint.avg30} : ממוצע נע
                                    </Typography>

                                    {/* Report Links */}
                                    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                        {selectedPoint.reportUrl && (
                                            <a
                                                href={selectedPoint.reportUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    color: '#8B5CF6',
                                                    textDecoration: 'none',
                                                    fontSize: '12px',
                                                    fontWeight: 500,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                📊 דוח מדד בטיחות
                                            </a>
                                        )}
                                        {selectedPoint.issuesUrl && (
                                            <a
                                                href={selectedPoint.issuesUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    color: '#f59e0b',
                                                    textDecoration: 'none',
                                                    fontSize: '12px',
                                                    fontWeight: 500,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                ⚠️ דוח חריגים יומי
                                            </a>
                                        )}
                                        {selectedPoint.workersUrl && (
                                            <a
                                                href={selectedPoint.workersUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    color: '#10b981',
                                                    textDecoration: 'none',
                                                    fontSize: '12px',
                                                    fontWeight: 500,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                👷 כשירות עובדים (שבועי)
                                            </a>
                                        )}
                                        {selectedPoint.equipmentUrl && (
                                            <a
                                                href={selectedPoint.equipmentUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    color: '#3b82f6',
                                                    textDecoration: 'none',
                                                    fontSize: '12px',
                                                    fontWeight: 500,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                🔧 כשירות ציוד (שבועי)
                                            </a>
                                        )}
                                        {!selectedPoint.reportUrl && !selectedPoint.issuesUrl && !selectedPoint.workersUrl && !selectedPoint.equipmentUrl && (
                                            <Typography variant="body2" sx={{ color: '#999', fontSize: '11px', fontStyle: 'italic' }}>
                                                אין קישורים זמינים
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    </CardContent>
                </Card>
            )}

            {/* Recent Reports */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        דוחות אחרונים
                    </Typography>
                    {reports.length === 0 ? (
                        <Typography color="textSecondary">
                            אין דוחות בטיחות זמינים
                        </Typography>
                    ) : (
                        <List>
                            {reports.slice(0, 5).map((report) => (
                                <ListItem key={report._id} divider>
                                    <ListItemText
                                        primary={`${formatDate(report.date)} - ${report.site}`}
                                        secondary={`ציון: ${report.score} | קבלן: ${report.contractorName}`}
                                    />
                                    <ListItemSecondaryAction>
                                        <Chip
                                            label={report.score}
                                            color={getScoreColor(report.score)}
                                            size="small"
                                            sx={{ mr: 1 }}
                                        />
                                        {(report.reportUrl || report.reports?.daily?.safetyIndex?.url) && (
                                            <Tooltip title="פתח דוח בטיחות">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => window.open(report.reportUrl || report.reports?.daily?.safetyIndex?.url, '_blank')}
                                                >
                                                    <OpenInNew />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        {(report.issuesUrl || report.reports?.daily?.findings?.url) && (
                                            <Tooltip title="פתח דוח חריגים">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => window.open(report.issuesUrl || report.reports?.daily?.findings?.url, '_blank')}
                                                >
                                                    <Warning />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </CardContent>
            </Card>

            {/* Unmatched Reports */}
            {unmatchedReports.length > 0 && (
                <Card sx={{ mt: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            דוחות לא מקושרים ({unmatchedReports.length})
                        </Typography>
                        <List>
                            {unmatchedReports.slice(0, 3).map((report) => (
                                <ListItem key={report._id} divider>
                                    <ListItemText
                                        primary={`${formatDate(report.date)} - ${report.site}`}
                                        secondary={`ציון: ${report.score} | קבלן: ${report.contractorName}`}
                                    />
                                    <ListItemSecondaryAction>
                                        <Chip
                                            label={report.score}
                                            color={getScoreColor(report.score)}
                                            size="small"
                                            sx={{ mr: 1 }}
                                        />
                                        <Tooltip title="קשר לפרויקט">
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    setSelectedReport(report);
                                                    setLinkDialogOpen(true);
                                                }}
                                            >
                                                <LinkIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    </CardContent>
                </Card>
            )}

            {/* Link Dialog */}
            <Dialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>קישור דוח לפרויקט</DialogTitle>
                <DialogContent>
                    {selectedReport && (
                        <Box>
                            <Typography variant="body1" gutterBottom>
                                דוח: {selectedReport.site} - {formatDate(selectedReport.date)}
                            </Typography>
                            <FormControl fullWidth sx={{ mt: 2 }}>
                                <InputLabel>בחר פרויקט</InputLabel>
                                <Select
                                    value={selectedProjectId}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    label="בחר פרויקט"
                                >
                                    <MenuItem value={projectId}>{projectName}</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setLinkDialogOpen(false)}>ביטול</Button>
                    <Button onClick={handleLinkReport} variant="contained" disabled={!selectedProjectId}>
                        קשר
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SafetyDashboard;
