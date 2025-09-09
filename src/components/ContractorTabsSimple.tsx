import React, { useState, useRef } from 'react';
import { Box, Typography, Button, Tabs, Tab, TextField, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Checkbox, IconButton, Grid, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { CloudUpload as CloudUploadIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

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
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [uploadType, setUploadType] = useState<'safety' | 'iso' | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<{ [key: string]: string }>({});
    const [isUploading, setIsUploading] = useState(false);
    const [contactDialogOpen, setContactDialogOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Check if user can edit based on contact user permissions
    const canEdit = !isContactUser || contactUserPermissions === 'contact_manager' || contactUserPermissions === 'admin';

    const handleSave = () => {
        if (onSave && contractor) {
            onSave(contractor);
        }
    };

    const handleUploadClick = (type: 'safety' | 'iso') => {
        setUploadType(type);
        setUploadDialogOpen(true);
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
                const headers: {[key: string]: string} = {
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

                    alert('הקובץ הועלה בהצלחה!');
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
        if (window.confirm('האם אתה בטוח שברצונך למחוק את איש הקשר?')) {
            // TODO: Implement delete contact
            console.log('Delete contact:', contactId);
        }
    };

    const handleCloseContactDialog = () => {
        setContactDialogOpen(false);
        setEditingContact(null);
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

                        <Grid container spacing={2}>
                            {/* שורה ראשונה */}
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="מספר חברה (ח״פ)"
                                    value={contractor?.company_id || ''}
                                    disabled={!canEdit || !!contractor?.contractor_id}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="מספר קבלן"
                                    value={contractor?.contractor_id || ''}
                                    disabled={true}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="שם החברה (עברית)"
                                    value={contractor?.name || ''}
                                    disabled={!canEdit}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="שם החברה (אנגלית)"
                                    value={contractor?.nameEnglish || ''}
                                    disabled={!canEdit}
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
                                        value={contractor?.companyType || ''}
                                        disabled={!canEdit}
                                        sx={{
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderColor: '#d0d0d0'
                                            },
                                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                                borderColor: '#9c27b0'
                                            },
                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                borderColor: '#9c27b0'
                                            }
                                        }}
                                    >
                                        <MenuItem value="חברה פרטית">חברה פרטית</MenuItem>
                                        <MenuItem value="חברה ציבורית">חברה ציבורית</MenuItem>
                                        <MenuItem value="עוסק מורשה">עוסק מורשה</MenuItem>
                                        <MenuItem value="עוסק פטור">עוסק פטור</MenuItem>
                                        <MenuItem value="אגודה שיתופית">אגודה שיתופית</MenuItem>
                                        <MenuItem value="עמותה רשומה">עמותה רשומה</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="תאריך התאגדות"
                                    type="date"
                                    value={contractor?.foundationDate || ''}
                                    disabled={true}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="מספר עובדים"
                                    type="number"
                                    value={contractor?.numberOfEmployees || ''}
                                    disabled={!canEdit}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="עיר"
                                    value={contractor?.city || ''}
                                    disabled={!canEdit}
                                />
                            </Grid>
                            
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="כתובת"
                                    value={contractor?.address || ''}
                                    disabled={!canEdit}
                                />
                            </Grid>
                            
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="אימייל"
                                    value={contractor?.email || ''}
                                    disabled={!canEdit}
                                />
                            </Grid>
                            
                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="טלפון"
                                    value={contractor?.phone || ''}
                                    disabled={!canEdit}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                )}

                {activeTab === 1 && (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            מידע עסקי
                        </Typography>

                        <Grid container spacing={2}>
                            {/* שורה ראשונה - כוכבי בטיחות */}
                            <Grid item xs={12} sm={6} md={3}>
                                <FormControl fullWidth>
                                    <InputLabel sx={{
                                        backgroundColor: 'white',
                                        px: 1,
                                        '&.Mui-focused': {
                                            backgroundColor: 'white'
                                        }
                                    }}>
                                        מספר כוכבי בטיחות
                                    </InputLabel>
                                    <Select
                                        value={contractor?.safetyRating || contractor?.safetyStars || ''}
                                        disabled={!canEdit}
                                        sx={{
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderColor: '#d0d0d0'
                                            },
                                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                                borderColor: '#9c27b0'
                                            },
                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                borderColor: '#9c27b0'
                                            }
                                        }}
                                    >
                                        <MenuItem value={1}>1 כוכב</MenuItem>
                                        <MenuItem value={2}>2 כוכבים</MenuItem>
                                        <MenuItem value={3}>3 כוכבים</MenuItem>
                                        <MenuItem value={4}>4 כוכבים</MenuItem>
                                        <MenuItem value={5}>5 כוכבים</MenuItem>
                                        <MenuItem value={6}>6 כוכבים (זהב)</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                <TextField
                                    fullWidth
                                    label="תאריך תוקף"
                                    type="date"
                                    value={contractor?.safetyRatingExpiry || ''}
                                    disabled={!canEdit}
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
                                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 1 }}>
                                    <IconButton
                                        color="primary"
                                        disabled={!canEdit}
                                        title="העלאת תעודת הסמכת כוכבי בטיחות"
                                        onClick={() => handleUploadClick('safety')}
                                        sx={{
                                            border: '1px solid #d0d0d0',
                                            borderRadius: 1,
                                            height: '56px',
                                            width: '56px'
                                        }}
                                    >
                                        <CloudUploadIcon />
                                    </IconButton>
                                    {uploadedFiles.safety && (
                                        <Box sx={{
                                            width: 40,
                                            height: 40,
                                            border: '1px solid #d0d0d0',
                                            borderRadius: 1,
                                            overflow: 'hidden',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <img
                                                src={uploadedFiles.safety}
                                                alt="תצוגה מקדימה"
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                        </Box>
                                    )}
                                </Box>
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                {/* מקום ריק לשורה הראשונה */}
                            </Grid>

                            {/* שורה שנייה - ISO45001 */}
                            <Grid item xs={12} sm={6} md={3}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={contractor?.iso45001 || false}
                                            disabled={!canEdit}
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
                                    value={contractor?.iso45001Expiry || ''}
                                    disabled={!canEdit}
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
                                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', gap: 1 }}>
                                    <IconButton
                                        color="primary"
                                        disabled={!canEdit}
                                        title="העלאת תעודת ISO45001"
                                        onClick={() => handleUploadClick('iso')}
                                        sx={{
                                            border: '1px solid #d0d0d0',
                                            borderRadius: 1,
                                            height: '56px',
                                            width: '56px'
                                        }}
                                    >
                                        <CloudUploadIcon />
                                    </IconButton>
                                    {uploadedFiles.iso && (
                                        <Box sx={{
                                            width: 40,
                                            height: 40,
                                            border: '1px solid #d0d0d0',
                                            borderRadius: 1,
                                            overflow: 'hidden',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <img
                                                src={uploadedFiles.iso}
                                                alt="תצוגה מקדימה"
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                        </Box>
                                    )}
                                </Box>
                            </Grid>

                            <Grid item xs={12} sm={6} md={3}>
                                {/* מקום ריק לשורה השנייה */}
                            </Grid>
                        </Grid>

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
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">
                                אנשי קשר
                            </Typography>
                            {canEdit && (
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={handleAddContact}
                                    size="small"
                                >
                                    הוספה
                                </Button>
                            )}
                        </Box>

                        {contractor?.contacts && contractor.contacts.length > 0 ? (
                            <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>שם</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>תפקיד</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>טלפון</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>אימייל</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>הרשאות</TableCell>
                                            {canEdit && (
                                                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>פעולות</TableCell>
                                            )}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {contractor.contacts.map((contact: any, index: number) => (
                                            <TableRow key={contact.id || index}>
                                                <TableCell>{contact.name || contact.fullName || ''}</TableCell>
                                                <TableCell>{contact.role || contact.position || ''}</TableCell>
                                                <TableCell>{contact.phone || contact.phoneNumber || ''}</TableCell>
                                                <TableCell>{contact.email || contact.emailAddress || ''}</TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ 
                                                        color: contact.permissions === 'contact_manager' ? 'primary.main' : 'text.secondary',
                                                        fontWeight: contact.permissions === 'contact_manager' ? 'bold' : 'normal'
                                                    }}>
                                                        {contact.permissions === 'contact_manager' ? 'מנהל קשר' : 'משתמש קשר'}
                                                    </Typography>
                                                </TableCell>
                                                {canEdit && (
                                                    <TableCell sx={{ textAlign: 'center' }}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleEditContact(contact)}
                                                            sx={{ mr: 1 }}
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleDeleteContact(contact.id)}
                                                            sx={{ color: 'error.main' }}
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
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    אין אנשי קשר רשומים
                                </Typography>
                                {canEdit && (
                                    <Button
                                        variant="outlined"
                                        startIcon={<AddIcon />}
                                        onClick={handleAddContact}
                                    >
                                        הוסף איש קשר ראשון
                                    </Button>
                                )}
                            </Box>
                        )}
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

            {/* Contact Dialog */}
            <Dialog open={contactDialogOpen} onClose={handleCloseContactDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingContact ? 'עריכת איש קשר' : 'הוספת איש קשר'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <TextField
                            fullWidth
                            label="שם מלא"
                            defaultValue={editingContact?.name || editingContact?.fullName || ''}
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            fullWidth
                            label="תפקיד"
                            defaultValue={editingContact?.role || editingContact?.position || ''}
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            fullWidth
                            label="טלפון"
                            defaultValue={editingContact?.phone || editingContact?.phoneNumber || ''}
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            fullWidth
                            label="אימייל"
                            type="email"
                            defaultValue={editingContact?.email || editingContact?.emailAddress || ''}
                            sx={{ mb: 2 }}
                        />
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>הרשאות</InputLabel>
                            <Select
                                defaultValue={editingContact?.permissions || 'contact_user'}
                                sx={{
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#d0d0d0'
                                    },
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#9c27b0'
                                    },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#9c27b0'
                                    }
                                }}
                            >
                                <MenuItem value="contact_user">משתמש קשר</MenuItem>
                                <MenuItem value="contact_manager">מנהל קשר</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseContactDialog}>ביטול</Button>
                    <Button variant="contained" onClick={() => {
                        // TODO: Implement save contact
                        console.log('Save contact');
                        handleCloseContactDialog();
                    }}>
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
                                    startIcon={<CloudUploadIcon />}
                                    sx={{ mb: 2 }}
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
        </Box>
    );
}
