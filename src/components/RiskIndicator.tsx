import React from 'react';
import { Alert, Box, Chip, Typography } from '@mui/material';
import { Warning as WarningIcon, Error as ErrorIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';

interface RiskIndicatorProps {
    status?: string;
    violator?: boolean;
    restrictions?: string[];
}

const RiskIndicator: React.FC<RiskIndicatorProps> = ({ status, violator, restrictions }) => {
    // Check if we have any data from the registry
    const hasRegistryData = status !== null || violator !== null || (restrictions && restrictions.length > 0);

    // If no registry data, show "לא התקבלו נתונים"
    if (!hasRegistryData) {
        return (
            <Box sx={{ mb: 2 }}>
                <Alert
                    severity="info"
                    sx={{
                        backgroundColor: '#e3f2fd',
                        border: '1px solid #2196f3',
                        '& .MuiAlert-icon': {
                            color: '#2196f3'
                        }
                    }}
                >
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                        לא התקבלו נתונים מרשום החברות
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#1976d2' }}>
                        המערכת לא קיבלה עדיין מידע עדכני על סטטוס החברה
                    </Typography>
                </Alert>
            </Box>
        );
    }

    // Check if there are actual risks
    const hasRisk = (status !== null && status !== 'פעילה') || violator === true || (restrictions && restrictions.length > 0);

    // If no risks, show "סטטוס: תקין"
    if (!hasRisk) {
        return (
            <Box sx={{ mb: 2 }}>
                <Alert
                    severity="success"
                    icon={<CheckCircleIcon />}
                    sx={{
                        backgroundColor: '#e8f5e8',
                        border: '1px solid #4caf50',
                        '& .MuiAlert-icon': {
                            color: '#4caf50'
                        }
                    }}
                >
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                        סטטוס: תקין
                    </Typography>
                </Alert>
            </Box>
        );
    }

    const getRiskLevel = () => {
        if (violator === true) return 'high';
        if (status && status !== 'פעילה') return 'medium';
        if (restrictions && restrictions.length > 0) return 'medium';
        return 'low';
    };

    const riskLevel = getRiskLevel();

    const getRiskColor = () => {
        switch (riskLevel) {
            case 'high': return 'error';
            case 'medium': return 'warning';
            default: return 'info';
        }
    };

    const getRiskIcon = () => {
        switch (riskLevel) {
            case 'high': return <ErrorIcon />;
            case 'medium': return <WarningIcon />;
            default: return <WarningIcon />;
        }
    };

    const getRiskMessage = () => {
        const messages = [];

        if (status && status !== 'פעילה') {
            messages.push(`סטטוס חברה: ${status}`);
        }

        if (violator === true) {
            messages.push('החברה מסווגת כמפרה');
        }

        if (restrictions && restrictions.length > 0) {
            messages.push(`הגבלות: ${restrictions.join(', ')}`);
        }

        return messages.join(' • ');
    };

    return (
        <Box sx={{ mb: 2 }}>
            <Alert
                severity={getRiskColor()}
                icon={getRiskIcon()}
                sx={{
                    backgroundColor: riskLevel === 'high' ? '#ffebee' : '#fff3e0',
                    border: riskLevel === 'high' ? '1px solid #f44336' : '1px solid #ff9800',
                    '& .MuiAlert-icon': {
                        color: riskLevel === 'high' ? '#f44336' : '#ff9800'
                    }
                }}
            >
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    ⚠️ אזהרת סיכון
                </Typography>
                <Typography variant="body2">
                    {getRiskMessage()}
                </Typography>
                {riskLevel === 'high' && (
                    <Box sx={{ mt: 1 }}>
                        <Chip
                            label="סיכון גבוה"
                            color="error"
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                        />
                    </Box>
                )}
            </Alert>
        </Box>
    );
};

export default RiskIndicator;
