import React, { useState } from "react";
import {
    TextField,
    Button,
    Card,
    CardContent,
    Typography,
    Box,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Checkbox,
    Divider,
    Stack,
} from "@mui/material";

import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
} from "@mui/icons-material";

type Contact = {
    id: string;
    role: string;
    fullName: string;
    email: string;
    mobile: string;
    permissions: 'Admin' | 'User';
};

type Activity = {
    id: string;
    activity_type: string;
    classification: string;
};

type Contractor = {
    // Basic Information
    name: string;
    name_english: string;
    company_id: string;
    company_type: string;
    contractor_id: string;
    foundation_date: string;

    // Contact Information
    city: string;
    address: string;
    phone: string;
    email: string;
    website: string;

    // Business Information
    activity_type: string;
    deescription: string;
    sector: string;
    segment: string;
    saftey_stars: number;
    iso45001: boolean;
    number_employees: number;

    // Activities Array
    activities: Activity[];

    // Projects 2025
    turnover: number;
    current_projects: number;
    current_projects_value_nis: number;
    premium_estimation_nis: number;

    // Projects 2026
    forcast_projects: number;
    forcast_projects_value_nis: number;

    // Management Contacts
    contacts: Contact[];

    notes: string;
};

type Errors = {
    company_id?: string;
    email?: string;
    phone?: string;
    [key: string]: string | undefined;
};

// Validation functions
const validateIsraeliID = (id: string): boolean => {
    const cleanId = id.replace(/[\s-]/g, '');
    if (!/^\d{9}$/.test(cleanId)) return false;

    let sum = 0;
    for (let i = 0; i < 8; i++) {
        let digit = parseInt(cleanId[i]);
        if (i % 2 === 0) {
            sum += digit;
        } else {
            digit *= 2;
            if (digit > 9) {
                digit = Math.floor(digit / 10) + (digit % 10);
            }
            sum += digit;
        }
    }

    const checkDigit = parseInt(cleanId[8]);
    const remainder = sum % 10;
    const expectedCheckDigit = remainder === 0 ? 0 : 10 - remainder;
    return checkDigit === expectedCheckDigit;
};

const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validateMobile = (mobile: string): boolean => {
    const mobileRegex = /^05\d{8}$/;
    return mobileRegex.test(mobile);
};

const generateId = (): string => {
    return Math.random().toString(36).substr(2, 9);
};

// Contact Dialog Component
const ContactDialog = ({
    open,
    onClose,
    contact,
    onSave,
    isEdit = false,
}: {
    open: boolean;
    onClose: () => void;
    contact: Contact;
    onSave: (contact: Contact) => void;
    isEdit?: boolean;
}) => {
    const [formData, setFormData] = useState<Contact>(contact);

    const handleChange = (field: keyof Contact, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onSave(formData);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {isEdit ? 'עריכת איש קשר' : 'הוספת איש קשר חדש'}
            </DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    <TextField
                        label="תפקיד"
                        value={formData.role}
                        onChange={(e) => handleChange('role', e.target.value)}
                        fullWidth
                        required
                    />
                    <TextField
                        label="שם מלא"
                        value={formData.fullName}
                        onChange={(e) => handleChange('fullName', e.target.value)}
                        fullWidth
                        required
                    />
                    <TextField
                        label="אימייל"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        fullWidth
                        required
                    />
                    <TextField
                        label="טלפון נייד"
                        type="tel"
                        value={formData.mobile}
                        onChange={(e) => {
                            // הגבלה על תווים מותרים - רק ספרות ומקף
                            const inputValue = e.target.value;
                            const allowedChars = /^[0-9\-]*$/;

                            if (!allowedChars.test(inputValue)) {
                                return; // לא לעדכן אם יש תווים לא מותרים
                            }

                            handleChange('mobile', inputValue);
                        }}
                        fullWidth
                        required
                        helperText="פורמט: 050-1234567"
                    />
                    <FormControl fullWidth>
                        <InputLabel>הרשאות</InputLabel>
                        <Select
                            value={formData.permissions}
                            label="הרשאות"
                            onChange={(e) => handleChange('permissions', e.target.value)}
                        >
                            <MenuItem value="Admin">מנהל</MenuItem>
                            <MenuItem value="User">משתמש</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, gap: 2 }}>
                <Button
                    onClick={onClose}
                    endIcon={<CancelIcon />}
                    variant="outlined"
                    sx={{ minWidth: 100, '& .MuiButton-endIcon': { marginRight: 1 } }}
                >
                    ביטול
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    endIcon={<SaveIcon />}
                    sx={{ minWidth: 100, '& .MuiButton-endIcon': { marginRight: 1 } }}
                >
                    שמור
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// Activity Dialog Component
const ActivityDialog = ({
    open,
    onClose,
    activity,
    onSave,
    isEdit = false,
}: {
    open: boolean;
    onClose: () => void;
    activity: Activity;
    onSave: (activity: Activity) => void;
    isEdit?: boolean;
}) => {
    const [formData, setFormData] = useState<Activity>(activity);

    const handleChange = (field: keyof Activity, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onSave(formData);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {isEdit ? 'עריכת תחום פעילות' : 'הוספת תחום פעילות חדש'}
            </DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    <TextField
                        label="תחום פעילות"
                        value={formData.activity_type}
                        onChange={(e) => handleChange('activity_type', e.target.value)}
                        fullWidth
                        required
                    />
                    <TextField
                        label="סיווג"
                        value={formData.classification}
                        onChange={(e) => handleChange('classification', e.target.value)}
                        fullWidth
                        required
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, gap: 2 }}>
                <Button
                    onClick={onClose}
                    endIcon={<CancelIcon />}
                    variant="outlined"
                    sx={{ minWidth: 100, '& .MuiButton-endIcon': { marginRight: 1 } }}
                >
                    ביטול
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    endIcon={<SaveIcon />}
                    sx={{ minWidth: 100, '& .MuiButton-endIcon': { marginRight: 1 } }}
                >
                    שמור
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// Confirmation Dialog Component
const ConfirmationDialog = ({
    open,
    onClose,
    onConfirm,
    title,
    message,
}: {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Typography>{message}</Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, gap: 2 }}>
                <Button
                    onClick={onClose}
                    endIcon={<CancelIcon />}
                    variant="outlined"
                    sx={{ minWidth: 100, '& .MuiButton-endIcon': { marginRight: 1 } }}
                >
                    ביטול
                </Button>
                <Button
                    onClick={() => {
                        onConfirm();
                        onClose();
                    }}
                    variant="contained"
                    color="error"
                    endIcon={<DeleteIcon />}
                    sx={{ minWidth: 100, '& .MuiButton-endIcon': { marginRight: 1 } }}
                >
                    מחק
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default function ContractorForm() {
    const [contractor, setContractor] = useState<Contractor>({
        name: "",
        name_english: "",
        company_id: "",
        company_type: "",
        contractor_id: "",
        foundation_date: "",
        city: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        activity_type: "",
        deescription: "",
        sector: "",
        segment: "",
        saftey_stars: 0,
        iso45001: false,
        number_employees: 0,
        activities: [],
        turnover: 0,
        current_projects: 0,
        current_projects_value_nis: 0,
        premium_estimation_nis: 0,
        forcast_projects: 0,
        forcast_projects_value_nis: 0,
        contacts: [],
        notes: "",
    });

    const [errors, setErrors] = useState<Errors>({});
    const [contactDialogOpen, setContactDialogOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [activityDialogOpen, setActivityDialogOpen] = useState(false);
    const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
    const [isActivityEditMode, setIsActivityEditMode] = useState(false);

    // Confirmation dialogs
    const [contactDeleteDialogOpen, setContactDeleteDialogOpen] = useState(false);
    const [contactToDelete, setContactToDelete] = useState<string | null>(null);
    const [activityDeleteDialogOpen, setActivityDeleteDialogOpen] = useState(false);
    const [activityToDelete, setActivityToDelete] = useState<string | null>(null);

    const handleChange = (field: keyof Contractor, value: any) => {
        setContractor(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const addContact = () => {
        setEditingContact({
            id: generateId(),
            role: "",
            fullName: "",
            email: "",
            mobile: "",
            permissions: 'User',
        });
        setIsEditMode(false);
        setContactDialogOpen(true);
    };

    const editContact = (contact: Contact) => {
        setEditingContact(contact);
        setIsEditMode(true);
        setContactDialogOpen(true);
    };

    const confirmDeleteContact = (id: string) => {
        setContactToDelete(id);
        setContactDeleteDialogOpen(true);
    };

    const deleteContact = () => {
        if (contactToDelete) {
            setContractor(prev => ({
                ...prev,
                contacts: prev.contacts.filter(c => c.id !== contactToDelete)
            }));
            setContactToDelete(null);
        }
    };

    const saveContact = (contact: Contact) => {
        if (isEditMode) {
            setContractor(prev => ({
                ...prev,
                contacts: prev.contacts.map(c =>
                    c.id === contact.id ? contact : c
                )
            }));
        } else {
            setContractor(prev => ({
                ...prev,
                contacts: [...prev.contacts, contact]
            }));
        }
    };

    const addActivity = () => {
        setEditingActivity({
            id: generateId(),
            activity_type: "",
            classification: ""
        });
        setIsActivityEditMode(false);
        setActivityDialogOpen(true);
    };

    const editActivity = (activity: Activity) => {
        setEditingActivity(activity);
        setIsActivityEditMode(true);
        setActivityDialogOpen(true);
    };

    const confirmDeleteActivity = (id: string) => {
        setActivityToDelete(id);
        setActivityDeleteDialogOpen(true);
    };

    const deleteActivity = () => {
        if (activityToDelete) {
            setContractor(prev => ({
                ...prev,
                activities: prev.activities.filter(a => a.id !== activityToDelete)
            }));
            setActivityToDelete(null);
        }
    };

    const saveActivity = (activity: Activity) => {
        if (isActivityEditMode) {
            setContractor(prev => ({
                ...prev,
                activities: prev.activities.map(a =>
                    a.id === activity.id ? activity : a
                )
            }));
        } else {
            setContractor(prev => ({
                ...prev,
                activities: [...prev.activities, activity]
            }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Errors = {};

        if (contractor.company_id && !validateIsraeliID(contractor.company_id)) {
            newErrors.company_id = "ת״ז לא תקין. אנא הכנס ת״ז בן 9 ספרות תקין.";
        }

        if (contractor.email && !validateEmail(contractor.email)) {
            newErrors.email = "כתובת אימייל לא תקינה.";
        }

        if (contractor.phone && !validateMobile(contractor.phone)) {
            newErrors.phone = "מספר טלפון לא תקין. אנא הכנס מספר בפורמט 05XXXXXXXX.";
        }

        if (contractor.contacts && Array.isArray(contractor.contacts)) {
            contractor.contacts.forEach((contact, index) => {
            if (contact.email && !validateEmail(contact.email)) {
                newErrors[`contact_${index}_email`] = "כתובת אימייל לא תקינה.";
            }
            if (contact.mobile && !validateMobile(contact.mobile)) {
                newErrors[`contact_${index}_mobile`] = "מספר טלפון לא תקין.";
            }
            });
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            console.log("פרטי קבלן:", contractor);
            alert("הטופס נשלח בהצלחה!");
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
                {/* Basic Information */}
                <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                        פרטים בסיסיים
                    </Typography>
                </Box>

                <TextField
                    label="שם חברה בעברית"
                    value={contractor.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    fullWidth
                    required
                    sx={{
                        '& .MuiInputBase-input': {
                            textAlign: 'right',
                            direction: 'rtl'
                        },
                        '& .MuiInputLabel-root': {
                            textAlign: 'right',
                            direction: 'rtl'
                        }
                    }}
                />

                <TextField
                    label="שם חברה באנגלית"
                    value={contractor.name_english}
                    onChange={(e) => handleChange('name_english', e.target.value)}
                    fullWidth
                    sx={{
                        '& .MuiInputBase-input': {
                            textAlign: 'right',
                            direction: 'rtl'
                        },
                        '& .MuiInputLabel-root': {
                            textAlign: 'right',
                            direction: 'rtl'
                        }
                    }}
                />

                <TextField
                    label="ח״פ"
                    value={contractor.company_id}
                    onChange={(e) => handleChange('company_id', e.target.value)}
                    fullWidth
                    required
                    error={!!errors.company_id}
                    helperText={errors.company_id}
                    placeholder="123456789"
                    sx={{
                        '& .MuiInputBase-input': {
                            textAlign: 'right',
                            direction: 'rtl'
                        },
                        '& .MuiInputLabel-root': {
                            textAlign: 'right',
                            direction: 'rtl'
                        }
                    }}
                />

                <FormControl fullWidth required>
                    <InputLabel>סוג החברה</InputLabel>
                    <Select
                        value={contractor.company_type}
                        label="סוג החברה"
                        onChange={(e) => handleChange('company_type', e.target.value)}
                        sx={{
                            '& .MuiSelect-select': {
                                textAlign: 'right',
                                direction: 'rtl'
                            },
                            '& .MuiInputLabel-root': {
                                textAlign: 'right',
                                direction: 'rtl'
                            }
                        }}
                    >
                        <MenuItem value="חברה פרטית">חברה פרטית</MenuItem>
                        <MenuItem value="חברה ציבורית">חברה ציבורית</MenuItem>
                        <MenuItem value="עמותה">עמותה</MenuItem>
                        <MenuItem value="אגודה שיתופית">אגודה שיתופית</MenuItem>
                        <MenuItem value="שותפות">שותפות</MenuItem>
                        <MenuItem value="עוסק מורשה">עוסק מורשה</MenuItem>
                        <MenuItem value="עוסק פטור">עוסק פטור</MenuItem>
                    </Select>
                </FormControl>

                <TextField
                    label="פנקס הקבלנים"
                    value={contractor.contractor_id}
                    onChange={(e) => handleChange('contractor_id', e.target.value)}
                    fullWidth
                    required
                    sx={{
                        '& .MuiInputBase-input': {
                            textAlign: 'right',
                            direction: 'rtl'
                        },
                        '& .MuiInputLabel-root': {
                            textAlign: 'right',
                            direction: 'rtl'
                        }
                    }}
                />

                <TextField
                    label="תאריך התאגדות"
                    type="date"
                    value={contractor.foundation_date}
                    onChange={(e) => handleChange('foundation_date', e.target.value)}
                    fullWidth
                    required
                    InputLabelProps={{
                        shrink: true,
                    }}
                    sx={{
                        '& .MuiInputBase-input': {
                            textAlign: 'right',
                            direction: 'rtl'
                        },
                        '& .MuiInputLabel-root': {
                            textAlign: 'right',
                            direction: 'rtl'
                        }
                    }}
                />

                {/* Contact Information */}
                <Box sx={{ gridColumn: '1 / -1' }}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                        פרטי קשר
                    </Typography>
                </Box>

                <TextField
                    label="עיר"
                    value={contractor.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    fullWidth
                    required
                    sx={{
                        '& .MuiInputBase-input': {
                            textAlign: 'right',
                            direction: 'rtl'
                        },
                        '& .MuiInputLabel-root': {
                            textAlign: 'right',
                            direction: 'rtl'
                        }
                    }}
                />

                <TextField
                    label="כתובת"
                    value={contractor.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    fullWidth
                    required
                    sx={{
                        '& .MuiInputBase-input': {
                            textAlign: 'right',
                            direction: 'rtl'
                        },
                        '& .MuiInputLabel-root': {
                            textAlign: 'right',
                            direction: 'rtl'
                        }
                    }}
                />

                <TextField
                    label="טלפון"
                    type="tel"
                    value={contractor.phone}
                    onChange={(e) => {
                        // הגבלה על תווים מותרים - רק ספרות ומקף
                        const inputValue = e.target.value;
                        const allowedChars = /^[0-9\-]*$/;

                        if (!allowedChars.test(inputValue)) {
                            return; // לא לעדכן אם יש תווים לא מותרים
                        }

                        handleChange('phone', inputValue);
                    }}
                    fullWidth
                    required
                    error={!!errors.phone}
                    helperText={errors.phone || "פורמט: 050-1234567"}
                    sx={{
                        '& .MuiInputBase-input': {
                            textAlign: 'right',
                            direction: 'rtl'
                        },
                        '& .MuiInputLabel-root': {
                            textAlign: 'right',
                            direction: 'rtl'
                        }
                    }}
                />

                <TextField
                    label="אימייל"
                    type="email"
                    value={contractor.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    fullWidth
                    required
                    error={!!errors.email}
                    helperText={errors.email}
                    sx={{
                        '& .MuiInputBase-input': {
                            textAlign: 'right',
                            direction: 'rtl'
                        },
                        '& .MuiInputLabel-root': {
                            textAlign: 'right',
                            direction: 'rtl'
                        }
                    }}
                />

                <TextField
                    label="אתר חברה"
                    value={contractor.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    fullWidth
                    sx={{
                        '& .MuiInputBase-input': {
                            textAlign: 'right',
                            direction: 'rtl'
                        },
                        '& .MuiInputLabel-root': {
                            textAlign: 'right',
                            direction: 'rtl'
                        }
                    }}
                />

                {/* Business Information */}
                <Box sx={{ gridColumn: '1 / -1' }}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                        פרטי עסק
                    </Typography>
                </Box>

                <TextField
                    label="סוג פעילות"
                    value={contractor.activity_type}
                    onChange={(e) => handleChange('activity_type', e.target.value)}
                    fullWidth
                    required
                    sx={{
                        '& .MuiInputBase-input': {
                            textAlign: 'right',
                            direction: 'rtl'
                        },
                        '& .MuiInputLabel-root': {
                            textAlign: 'right',
                            direction: 'rtl'
                        }
                    }}
                />

                <TextField
                    label="תחום עיסוק"
                    value={contractor.deescription}
                    onChange={(e) => handleChange('deescription', e.target.value)}
                    fullWidth
                    required
                    sx={{
                        '& .MuiInputBase-input': {
                            textAlign: 'right',
                            direction: 'rtl'
                        },
                        '& .MuiInputLabel-root': {
                            textAlign: 'right',
                            direction: 'rtl'
                        }
                    }}
                />

                <TextField
                    label="סקטור"
                    value={contractor.sector}
                    onChange={(e) => handleChange('sector', e.target.value)}
                    fullWidth
                    required
                    sx={{
                        '& .MuiInputBase-input': {
                            textAlign: 'right',
                            direction: 'rtl'
                        },
                        '& .MuiInputLabel-root': {
                            textAlign: 'right',
                            direction: 'rtl'
                        }
                    }}
                />

                <TextField
                    label="אופי החברה"
                    value={contractor.segment}
                    onChange={(e) => handleChange('segment', e.target.value)}
                    fullWidth
                    required
                    sx={{
                        '& .MuiInputBase-input': {
                            textAlign: 'right',
                            direction: 'rtl'
                        },
                        '& .MuiInputLabel-root': {
                            textAlign: 'right',
                            direction: 'rtl'
                        }
                    }}
                />

                <FormControl fullWidth>
                    <InputLabel>כוכבי בטיחות</InputLabel>
                    <Select
                        value={contractor.saftey_stars}
                        label="כוכבי בטיחות"
                        onChange={(e) => handleChange('saftey_stars', e.target.value)}
                        sx={{
                            '& .MuiSelect-select': {
                                textAlign: 'right',
                                direction: 'rtl'
                            },
                            '& .MuiInputLabel-root': {
                                textAlign: 'right',
                                direction: 'rtl'
                            }
                        }}
                    >
                        <MenuItem value={0}>ללא</MenuItem>
                        <MenuItem value={1}>1 כוכב</MenuItem>
                        <MenuItem value={2}>2 כוכבים</MenuItem>
                        <MenuItem value={3}>3 כוכבים</MenuItem>
                        <MenuItem value={4}>4 כוכבים</MenuItem>
                        <MenuItem value={5}>5 כוכבים</MenuItem>
                    </Select>
                </FormControl>

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={contractor.iso45001}
                            onChange={(e) => handleChange('iso45001', e.target.checked)}
                        />
                    }
                    label="ISO 45001"
                />

                <TextField
                    label="מספר מועסקים"
                    type="number"
                    value={contractor.number_employees}
                    onChange={(e) => handleChange('number_employees', Number(e.target.value))}
                    fullWidth
                    required
                    sx={{
                        '& .MuiInputBase-input': {
                            textAlign: 'right',
                            direction: 'rtl'
                        },
                        '& .MuiInputLabel-root': {
                            textAlign: 'right',
                            direction: 'rtl'
                        }
                    }}
                />

                {/* Activities Array */}
                <Box sx={{ gridColumn: '1 / -1' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                            תחומי פעילות
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={addActivity}
                            size="small"
                        >
                            הוסף תחום פעילות
                        </Button>
                    </Box>
                </Box>

                {contractor.activities.map((activity, index) => (
                    <Box key={activity.id} sx={{ gridColumn: '1 / -1' }}>
                        <Card variant="outlined">
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                        תחום פעילות {index + 1}
                                    </Typography>
                                    <Box>
                                        <IconButton
                                            size="small"
                                            onClick={() => editActivity(activity)}
                                            color="primary"
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => confirmDeleteActivity(activity.id)}
                                            color="error"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        <strong>תחום פעילות:</strong> {activity.activity_type}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        <strong>סיווג:</strong> {activity.classification}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>
                ))}

                {/* Projects Information */}
                <Box sx={{ gridColumn: '1 / -1' }}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                        פרויקטים 2025
                    </Typography>
                </Box>

                <TextField
                    label="מחזור הכנסות"
                    type="number"
                    value={contractor.turnover}
                    onChange={(e) => handleChange('turnover', Number(e.target.value))}
                    fullWidth
                    required
                    sx={{
                        '& .MuiInputBase-input': {
                            textAlign: 'right',
                            direction: 'rtl'
                        },
                        '& .MuiInputLabel-root': {
                            textAlign: 'right',
                            direction: 'rtl'
                        }
                    }}
                />

                <TextField
                    label="מספר פרוייקטים 2025"
                    type="number"
                    value={contractor.current_projects}
                    onChange={(e) => handleChange('current_projects', Number(e.target.value))}
                    fullWidth
                    required
                    sx={{
                        '& .MuiInputBase-input': {
                            textAlign: 'right',
                            direction: 'rtl'
                        },
                        '& .MuiInputLabel-root': {
                            textAlign: 'right',
                            direction: 'rtl'
                        }
                    }}
                />

                <TextField
                    label="שווי פרוייקטים 2025 (בש״ח)"
                    type="number"
                    value={contractor.current_projects_value_nis}
                    onChange={(e) => handleChange('current_projects_value_nis', Number(e.target.value))}
                    fullWidth
                    required
                    sx={{
                        '& .MuiInputBase-input': {
                            textAlign: 'right',
                            direction: 'rtl'
                        },
                        '& .MuiInputLabel-root': {
                            textAlign: 'right',
                            direction: 'rtl'
                        }
                    }}
                />

                <TextField
                    label="פרמיה משולמת 2025"
                    type="number"
                    value={contractor.premium_estimation_nis}
                    onChange={(e) => handleChange('premium_estimation_nis', Number(e.target.value))}
                    fullWidth
                    required
                    sx={{
                        '& .MuiInputBase-input': {
                            textAlign: 'right',
                            direction: 'rtl'
                        },
                        '& .MuiInputLabel-root': {
                            textAlign: 'right',
                            direction: 'rtl'
                        }
                    }}
                />

                <Box sx={{ gridColumn: '1 / -1' }}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                        פרויקטים 2026
                    </Typography>
                </Box>

                <TextField
                    label="מספר פרוייקטים 2026"
                    type="number"
                    value={contractor.forcast_projects}
                    onChange={(e) => handleChange('forcast_projects', Number(e.target.value))}
                    fullWidth
                    required
                    sx={{
                        '& .MuiInputBase-input': {
                            textAlign: 'right',
                            direction: 'rtl'
                        },
                        '& .MuiInputLabel-root': {
                            textAlign: 'right',
                            direction: 'rtl'
                        }
                    }}
                />

                <TextField
                    label="שווי פרוייקטים 2026 (בש״ח)"
                    type="number"
                    value={contractor.forcast_projects_value_nis}
                    onChange={(e) => handleChange('forcast_projects_value_nis', Number(e.target.value))}
                    fullWidth
                    required
                    sx={{
                        '& .MuiInputBase-input': {
                            textAlign: 'right',
                            direction: 'rtl'
                        },
                        '& .MuiInputLabel-root': {
                            textAlign: 'right',
                            direction: 'rtl'
                        }
                    }}
                />

                {/* Management Contacts */}
                <Box sx={{ gridColumn: '1 / -1' }}>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                            אנשי קשר בהנהלה
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={addContact}
                            size="small"
                        >
                            הוסף איש קשר
                        </Button>
                    </Box>
                </Box>

                {contractor.contacts.map((contact, index) => (
                    <Box key={contact.id} sx={{ gridColumn: '1 / -1' }}>
                        <Card variant="outlined">
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                        {contact.role}
                                    </Typography>
                                    <Box>
                                        <Chip
                                            label={contact.permissions === 'Admin' ? 'מנהל' : 'משתמש'}
                                            color={contact.permissions === 'Admin' ? 'primary' : 'default'}
                                            size="small"
                                            sx={{ mr: 1 }}
                                        />
                                        <IconButton
                                            size="small"
                                            onClick={() => editContact(contact)}
                                            color="primary"
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => confirmDeleteContact(contact.id)}
                                            color="error"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        <strong>שם:</strong> {contact.fullName}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        <strong>אימייל:</strong> {contact.email}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        <strong>טלפון:</strong> {contact.mobile}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>
                ))}

                {/* Notes */}
                <Box sx={{ gridColumn: '1 / -1' }}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                        הערות
                    </Typography>
                </Box>

                <Box sx={{ gridColumn: '1 / -1' }}>
                    <TextField
                        label="הערות כללי"
                        value={contractor.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        fullWidth
                        multiline
                        rows={4}
                        sx={{
                            '& .MuiInputBase-input': {
                                textAlign: 'right',
                                direction: 'rtl'
                            },
                            '& .MuiInputLabel-root': {
                                textAlign: 'right',
                                direction: 'rtl'
                            }
                        }}
                    />
                </Box>

                {/* Submit Button */}
                <Box sx={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        sx={{ px: 4, py: 1.5, fontSize: '1.1rem' }}
                    >
                        שלח טופס
                    </Button>
                </Box>
            </Box>

            {/* Contact Dialog */}
            {editingContact && (
                <ContactDialog
                    open={contactDialogOpen}
                    onClose={() => {
                        setContactDialogOpen(false);
                        setEditingContact(null);
                    }}
                    contact={editingContact}
                    onSave={saveContact}
                    isEdit={isEditMode}
                />
            )}

            {/* Activity Dialog */}
            {editingActivity && (
                <ActivityDialog
                    open={activityDialogOpen}
                    onClose={() => {
                        setActivityDialogOpen(false);
                        setEditingActivity(null);
                    }}
                    activity={editingActivity}
                    onSave={saveActivity}
                    isEdit={isActivityEditMode}
                />
            )}

            {/* Contact Delete Confirmation Dialog */}
            <ConfirmationDialog
                open={contactDeleteDialogOpen}
                onClose={() => setContactDeleteDialogOpen(false)}
                onConfirm={deleteContact}
                title="מחיקת איש קשר"
                message="האם אתה בטוח שברצונך למחוק את איש הקשר הזה? פעולה זו אינה הפיכה."
            />

            {/* Activity Delete Confirmation Dialog */}
            <ConfirmationDialog
                open={activityDeleteDialogOpen}
                onClose={() => setActivityDeleteDialogOpen(false)}
                onConfirm={deleteActivity}
                title="מחיקת תחום פעילות"
                message="האם אתה בטוח שברצונך למחוק את תחום הפעילות הזה? פעולה זו אינה הפיכה."
            />
        </Box>
    );
}
