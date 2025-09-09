import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';

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

    const handleSave = () => {
        if (onSave && contractor) {
            onSave(contractor);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
                פרטי קבלן - {contractor?.name || 'קבלן חדש'}
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 2 }}>
                שם החברה: {contractor?.name || 'לא מוגדר'}
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 2 }}>
                מספר חברה: {contractor?.company_id || 'לא מוגדר'}
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 2 }}>
                מספר קבלן: {contractor?.contractor_id || 'לא מוגדר'}
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 2 }}>
                אימייל: {contractor?.email || 'לא מוגדר'}
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 2 }}>
                טלפון: {contractor?.phone || 'לא מוגדר'}
            </Typography>
            
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button 
                    variant="contained" 
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? 'שומר...' : 'שמור'}
                </Button>
                
                <Button 
                    variant="outlined" 
                    onClick={onClose}
                >
                    סגור
                </Button>
            </Box>
        </Box>
    );
}
