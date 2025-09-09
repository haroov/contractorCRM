import React, { useState } from 'react';
import { Box, Typography, Button, Tabs, Tab, TextField, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Checkbox, IconButton } from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';

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
                    </Box>
                )}
                
                {activeTab === 1 && (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            מידע עסקי
                        </Typography>
                        
                        <Box sx={{ mb: 2 }}>
                            <FormControl fullWidth sx={{ mb: 1 }}>
                                <InputLabel>מספר כוכבי בטיחות</InputLabel>
                                <Select
                                    value={contractor?.safetyRating || contractor?.safetyStars || ''}
                                    disabled={!canEdit}
                                >
                                    <MenuItem value={1}>1 כוכב</MenuItem>
                                    <MenuItem value={2}>2 כוכבים</MenuItem>
                                    <MenuItem value={3}>3 כוכבים</MenuItem>
                                    <MenuItem value={4}>4 כוכבים</MenuItem>
                                    <MenuItem value={5}>5 כוכבים</MenuItem>
                                    <MenuItem value={6}>6 כוכבים (זהב)</MenuItem>
                                </Select>
                            </FormControl>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TextField
                                    label="תאריך תוקף"
                                    type="date"
                                    value={contractor?.safetyRatingExpiry || ''}
                                    sx={{ flex: 1 }}
                                    disabled={!canEdit}
                                />
                                <IconButton 
                                    color="primary" 
                                    disabled={!canEdit}
                                    title="העלאת תעודת הסמכת כוכבי בטיחות"
                                >
                                    <CloudUploadIcon />
                                </IconButton>
                            </Box>
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={contractor?.iso45001 || false}
                                        disabled={!canEdit}
                                    />
                                }
                                label="ISO45001"
                                sx={{ mb: 1 }}
                            />
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TextField
                                    label="תאריך תוקף ISO45001"
                                    type="date"
                                    value={contractor?.iso45001Expiry || ''}
                                    sx={{ flex: 1 }}
                                    disabled={!canEdit}
                                />
                                <IconButton 
                                    color="primary" 
                                    disabled={!canEdit}
                                    title="העלאת תעודת ISO45001"
                                >
                                    <CloudUploadIcon />
                                </IconButton>
                            </Box>
                        </Box>
                        
                        {contractor?.classifications && Array.isArray(contractor.classifications) && contractor.classifications.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    סוגי רישיונות:
                                </Typography>
                                {contractor.classifications.map((classification: any, index: number) => (
                                    <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                                        • {classification?.classification_type || ''} - {classification?.classification || ''}
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
                        <Typography variant="h6" gutterBottom>
                            אנשי קשר
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            מספר אנשי קשר: {contractor?.contacts?.length || 0}
                        </Typography>
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
                            sx={{ mb: 2 }}
                            disabled={!canEdit}
                            placeholder="הוסף הערות על הקבלן..."
                        />
                        
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="הערות פנימיות"
                            value={contractor?.internalNotes || ''}
                            sx={{ mb: 2 }}
                            disabled={!canEdit}
                            placeholder="הערות פנימיות לצוות..."
                        />
                    </Box>
                )}
            </Box>
        </Box>
    );
}
