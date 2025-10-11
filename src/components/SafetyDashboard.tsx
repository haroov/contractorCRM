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
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
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

    useEffect(() => {
        fetchSafetyData();
    }, [projectId]);

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

            // Fetch unmatched reports for manual linking
            const unmatchedResponse = await fetch('/api/safety-reports/unmatched');
            const unmatchedData = await unmatchedResponse.json();

            if (unmatchedData.success) {
                setUnmatchedReports(unmatchedData.data);
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
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map((report, index) => ({
                date: formatDate(report.date),
                score: report.score,
                cumulative: reports.slice(0, index + 1).reduce((sum, r) => sum + r.score, 0) / (index + 1)
            }));
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

            {/* Charts - Temporarily disabled until recharts is installed */}
            {reports.length > 0 && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        גרפי בטיחות (יוצגו לאחר התקנת recharts)
                    </Typography>
                    <Box sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 1, textAlign: 'center' }}>
                        <Typography color="textSecondary">
                            גרפים יוצגו כאן לאחר התקנת חבילת recharts
                        </Typography>
                    </Box>
                </Box>
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
                                        <Tooltip title="פתח דוח בטיחות">
                                            <IconButton
                                                size="small"
                                                onClick={() => window.open(report.reportUrl, '_blank')}
                                            >
                                                <OpenInNew />
                                            </IconButton>
                                        </Tooltip>
                                        {report.issuesUrl && (
                                            <Tooltip title="פתח דוח חריגים">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => window.open(report.issuesUrl, '_blank')}
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
