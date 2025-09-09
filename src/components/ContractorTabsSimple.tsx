import React, { useState } from 'react';
import { Box, Typography, Button, Tabs, Tab, TextField, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Checkbox } from '@mui/material';

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
    
    // Check if user can edit based on contact user permissions
    const canEdit = !isContactUser || contactUserPermissions === 'contact_manager' || contactUserPermissions === 'admin';

    const handleSave = () => {
        if (onSave && contractor) {
            onSave(contractor);
        }
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
                    <Tab label="פרטי חברה" />
                    <Tab label="מידע עסקי" />
                    <Tab label="פרויקטים" />
                    <Tab label="אנשי קשר" />
                </Tabs>
            </Box>

            {/* Tab Content */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
                {activeTab === 0 && (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            פרטי חברה
                        </Typography>
                        
                        <TextField
                            fullWidth
                            label="שם החברה"
                            value={contractor?.name || ''}
                            sx={{ mb: 2 }}
                            disabled={!canEdit}
                        />
                        
                        <TextField
                            fullWidth
                            label="מספר חברה (ח״פ)"
                            value={contractor?.company_id || ''}
                            sx={{ mb: 2 }}
                            disabled={!canEdit || !!contractor?.contractor_id}
                            helperText={contractor?.contractor_id ? "ניתן לערוך רק בקבלן חדש" : ""}
                        />
                        
                        <TextField
                            fullWidth
                            label="מספר קבלן"
                            value={contractor?.contractor_id || ''}
                            sx={{ mb: 2 }}
                            disabled={true}
                        />
                        
                        <TextField
                            fullWidth
                            label="אימייל"
                            value={contractor?.email || ''}
                            sx={{ mb: 2 }}
                            disabled={!canEdit}
                        />
                        
                        <TextField
                            fullWidth
                            label="טלפון"
                            value={contractor?.phone || ''}
                            sx={{ mb: 2 }}
                            disabled={!canEdit}
                        />
                        
                        <TextField
                            fullWidth
                            label="עיר"
                            value={contractor?.city || ''}
                            sx={{ mb: 2 }}
                            disabled={!canEdit}
                        />
                        
                        <TextField
                            fullWidth
                            label="כתובת"
                            value={contractor?.address || ''}
                            sx={{ mb: 2 }}
                            disabled={!canEdit}
                        />
                    </Box>
                )}
                
                {activeTab === 1 && (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            מידע עסקי
                        </Typography>
                        
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>סוג חברה</InputLabel>
                            <Select
                                value={contractor?.companyType || ''}
                                disabled={!canEdit}
                            >
                                <MenuItem value="בע״מ">בע״מ</MenuItem>
                                <MenuItem value="חברה פרטית">חברה פרטית</MenuItem>
                                <MenuItem value="שותפות">שותפות</MenuItem>
                            </Select>
                        </FormControl>
                        
                        <TextField
                            fullWidth
                            label="מספר עובדים"
                            type="number"
                            value={contractor?.numberOfEmployees || ''}
                            sx={{ mb: 2 }}
                            disabled={!canEdit}
                        />
                        
                        <TextField
                            fullWidth
                            label="תאריך הקמה"
                            type="date"
                            value={contractor?.foundationDate || ''}
                            sx={{ mb: 2 }}
                            disabled={!canEdit}
                        />
                        
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={contractor?.iso45001 || false}
                                    disabled={!canEdit}
                                />
                            }
                            label="ISO45001"
                        />
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
                        <Typography variant="h6" gutterBottom>
                            אנשי קשר
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            מספר אנשי קשר: {contractor?.contacts?.length || 0}
                        </Typography>
                    </Box>
                )}
            </Box>
        </Box>
    );
}
