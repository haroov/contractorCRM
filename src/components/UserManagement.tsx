import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
    Avatar,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Snackbar,
    Alert,
    CircularProgress
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    MoreVert as MoreVertIcon,
    Search as SearchIcon,
    Person as PersonIcon,
    Email as EmailIcon,
    AdminPanelSettings as AdminIcon,
    PersonAdd as UserIcon
} from '@mui/icons-material';
import { API_CONFIG, authenticatedFetch } from '../config/api';
import SkeletonLoader from './SkeletonLoader';

interface User {
    _id: string;
    googleId: string;
    email: string;
    name: string;
    phone?: string;
    picture?: string;
    role: 'admin' | 'user';
    position?: string; // New field for job position
    isActive: boolean;
    lastLogin?: string;
    createdAt: string;
}

interface UserManagementProps {
    onClose?: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onClose }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({
        open: false,
        message: '',
        severity: 'success'
    });

    // Load users from API
    useEffect(() => {
        // Check if we have sessionId in URL or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('sessionId') || localStorage.getItem('sessionId');

        if (sessionId) {
            // Save sessionId to localStorage if it came from URL
            if (urlParams.get('sessionId')) {
                localStorage.setItem('sessionId', sessionId);
            }
            loadUsers();
        } else {
            // No sessionId, redirect to login
            window.location.href = '/login';
        }
    }, []);

    // Handle close button
    const handleClose = () => {
        if (onClose) {
            onClose();
        } else {
            // Fallback: navigate back to main view
            const returnUrl = localStorage.getItem('userManagementReturnUrl') || '/';
            localStorage.removeItem('userManagementReturnUrl');
            window.location.href = returnUrl;
        }
    };

    const loadUsers = async () => {
        try {
            setLoading(true);
            console.log('🔍 Loading users - sessionId from localStorage:', localStorage.getItem('sessionId'));
            const response = await authenticatedFetch('/api/users');
            console.log('🔍 Users API response status:', response.status);
            console.log('🔍 Users API response headers:', response.headers.get('content-type'));
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Users loaded successfully:', data.length);
                setUsers(data);
            } else {
                console.error('Failed to load users - status:', response.status);
                const errorText = await response.text();
                console.error('Error response:', errorText.substring(0, 500));
                showSnackbar('שגיאה בטעינת המשתמשים', 'error');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            showSnackbar('שגיאה בטעינת המשתמשים', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showSnackbar = (message: string, severity: 'success' | 'error') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const handleAddUser = () => {
        setEditingUser(null);
        setDialogOpen(true);
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setDialogOpen(true);
    };

    const handleDeleteUser = (user: User) => {
        setUserToDelete(user);
        setDeleteDialogOpen(true);
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;

        try {
            const response = await authenticatedFetch(`/api/users/${userToDelete._id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setUsers(users.filter(u => u._id !== userToDelete._id));
                showSnackbar('המשתמש נמחק בהצלחה', 'success');
            } else {
                showSnackbar('שגיאה במחיקת המשתמש', 'error');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            showSnackbar('שגיאה במחיקת המשתמש', 'error');
        } finally {
            setDeleteDialogOpen(false);
            setUserToDelete(null);
        }
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: User) => {
        setMenuAnchor(event.currentTarget);
        setSelectedUser(user);
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
        setSelectedUser(null);
    };

    const handleSaveUser = async (userData: Partial<User>) => {
        try {
            let response;
            if (editingUser) {
                // Update existing user
                response = await authenticatedFetch(`/api/users/${editingUser._id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });
            } else {
                // Create new user
                response = await authenticatedFetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });
            }

            if (response.ok) {
                await loadUsers(); // Reload users
                setDialogOpen(false);
                setEditingUser(null);
                showSnackbar(editingUser ? 'המשתמש עודכן בהצלחה' : 'המשתמש נוצר בהצלחה', 'success');
            } else {
                showSnackbar('שגיאה בשמירת המשתמש', 'error');
            }
        } catch (error) {
            console.error('Error saving user:', error);
            showSnackbar('שגיאה בשמירת המשתמש', 'error');
        }
    };

    // Filter users based on search term
    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Separate users into active (logged in) and pending (never logged in)
    const activeUsers = filteredUsers.filter(user => user.lastLogin);
    const pendingUsers = filteredUsers.filter(user => !user.lastLogin);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('he-IL');
    };

    const getRoleColor = (role: string) => {
        return role === 'admin' ? 'error' : 'default';
    };

    const getRoleLabel = (role: string) => {
        return role === 'admin' ? 'מנהל' : 'משתמש';
    };

    if (loading) {
        return <SkeletonLoader />;
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', direction: 'rtl' }}>
            {/* Search and Add User */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2 }}>
                <TextField
                    placeholder="חיפוש משתמשים..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                    }}
                    sx={{ flex: 1, maxWidth: 400 }}
                />
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddUser}
                    sx={{ bgcolor: 'primary.main' }}
                >
                    הוספה
                </Button>
            </Box>

            {/* Users Table */}
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <TableContainer component={Paper} sx={{ height: '100%' }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ textAlign: 'right' }}>משתמש</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>אימייל</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>תפקיד</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>הרשאות</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>סטטוס</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>תאריך יצירה</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>פעולות</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredUsers.map((user) => (
                                <TableRow key={user._id} hover>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Avatar src={user.picture} sx={{ width: 40, height: 40 }}>
                                                {user.name.charAt(0)}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                    {user.name}
                                                </Typography>
                                                {user.phone && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {user.phone}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                            {user.email}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {user.position || 'לא הוגדר'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={getRoleLabel(user.role)}
                                            color={getRoleColor(user.role)}
                                            size="small"
                                            icon={user.role === 'admin' ? <AdminIcon /> : <UserIcon />}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={user.isActive ? 'פעיל' : 'לא פעיל'}
                                            color={user.isActive ? 'success' : 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {formatDate(user.createdAt)}
                                    </TableCell>
                                    <TableCell>
                                        <IconButton
                                            onClick={(e) => {
                                                setSelectedUser(user);
                                                setMenuAnchor(e.currentTarget);
                                            }}
                                        >
                                            <MoreVertIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>


            {/* Context Menu */}
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={() => {
                    if (selectedUser) handleEditUser(selectedUser);
                    handleMenuClose();
                }}>
                    <ListItemIcon>
                        <EditIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>עריכה</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => {
                    if (selectedUser) handleDeleteUser(selectedUser);
                    handleMenuClose();
                }} sx={{ color: 'error.main' }}>
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText>מחיקה</ListItemText>
                </MenuItem>
            </Menu>

            {/* Add/Edit User Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingUser ? 'עריכת משתמש' : 'הוספת משתמש חדש'}
                </DialogTitle>
                <DialogContent>
                    <UserForm
                        user={editingUser}
                        onSave={handleSaveUser}
                        onCancel={() => setDialogOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>מחיקת משתמש</DialogTitle>
                <DialogContent>
                    <Typography>
                        האם אתה בטוח שברצונך למחוק את המשתמש "{userToDelete?.name}"?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>ביטול</Button>
                    <Button onClick={confirmDeleteUser} color="error" variant="contained">
                        מחק
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

// User Form Component
interface UserFormProps {
    user: User | null;
    onSave: (userData: Partial<User>) => void;
    onCancel: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ user, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        position: user?.position || '',
        role: user?.role || 'user',
        isActive: user?.isActive ?? true
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // Forbidden words list
    const forbiddenWords = [
        'היטלר', 'זונה', 'אלוהים', 'שרמוטה', 'כלבה', 'מזדיין', 'זין', 'כוס', 'חמור',
        'hitler', 'bitch', 'whore', 'fuck', 'shit', 'damn', 'hell'
    ];

    const validateName = (name: string): string => {
        if (!name.trim()) return 'שם מלא הוא שדה חובה';

        // Check for forbidden words
        const lowerName = name.toLowerCase();
        for (const word of forbiddenWords) {
            if (lowerName.includes(word.toLowerCase())) {
                return 'השם מכיל מילים אסורות לשימוש';
            }
        }

        // Check for valid characters (Hebrew, English, spaces, and specific symbols)
        const validNameRegex = /^[\u0590-\u05FF\u0020\u0027\u0022a-zA-Z\s'-]+$/;
        if (!validNameRegex.test(name)) {
            return 'השם יכול להכיל רק אותיות בעברית, באנגלית, רווחים והסימנים ״ ׳';
        }

        return '';
    };

    const validateEmail = (email: string): string => {
        if (!email.trim()) return 'אימייל הוא שדה חובה';

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return 'אנא הזן כתובת מייל תקינה';
        }

        return '';
    };

    const validatePhone = (phone: string): string => {
        if (!phone.trim()) return ''; // Phone is optional

        const phoneRegex = /^05[0-9]-[0-9]{7}$/;
        if (!phoneRegex.test(phone)) {
            return 'מספר הטלפון חייב להיות בפורמט 05x-xxxxxxx';
        }

        return '';
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate all fields
        const nameError = validateName(formData.name);
        const emailError = validateEmail(formData.email);
        const phoneError = validatePhone(formData.phone);

        const newErrors = {
            name: nameError,
            email: emailError,
            phone: phoneError
        };

        setErrors(newErrors);

        // If no errors, submit the form
        if (!nameError && !emailError && !phoneError) {
            onSave(formData);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
                fullWidth
                label="שם מלא"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                margin="normal"
                required
                error={!!errors.name}
                helperText={errors.name}
                placeholder="הזן שם מלא בעברית או באנגלית"
            />
            <TextField
                fullWidth
                label="אימייל"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                margin="normal"
                required
                error={!!errors.email}
                helperText={errors.email}
                placeholder="example@domain.com"
            />
            <TextField
                fullWidth
                label="טלפון נייד"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                margin="normal"
                error={!!errors.phone}
                helperText={errors.phone}
                placeholder="050-1234567"
                inputProps={{
                    maxLength: 11
                }}
            />
            <TextField
                fullWidth
                label="תפקיד"
                value={formData.position}
                onChange={(e) => handleInputChange('position', e.target.value)}
                margin="normal"
                placeholder="חיתום, סיקור, תביעות, מכירות..."
                inputProps={{
                    list: 'position-options'
                }}
            />
            <datalist id="position-options">
                <option value="חיתום" />
                <option value="סיקור" />
                <option value="תביעות" />
                <option value="מכירות" />
                <option value="שירות לקוחות" />
                <option value="מנהל חשבונות" />
                <option value="מנהל סיכונים" />
                <option value="מנהל פרויקטים" />
                <option value="מנהל IT" />
                <option value="מנהל משאבי אנוש" />
                <option value="מנהל כספים" />
                <option value="מנהל שיווק" />
                <option value="מנהל מכירות" />
                <option value="מנהל תפעול" />
                <option value="מנהל אבטחה" />
                <option value="מנהל איכות" />
                <option value="מנהל לוגיסטיקה" />
                <option value="מנהל רכש" />
                <option value="מנהל משפטי" />
                <option value="מנהל רגולציה" />
            </datalist>
            <TextField
                fullWidth
                select
                label="הרשאות"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                margin="normal"
                SelectProps={{
                    native: true,
                }}
            >
                <option value="user">משתמש</option>
                <option value="admin">מנהל</option>
            </TextField>
            <TextField
                fullWidth
                select
                label="סטטוס"
                value={formData.isActive ? 'active' : 'inactive'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                margin="normal"
                SelectProps={{
                    native: true,
                }}
            >
                <option value="active">פעיל</option>
                <option value="inactive">לא פעיל</option>
            </TextField>
            <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}>
                <Button onClick={onCancel}>ביטול</Button>
                <Button type="submit" variant="contained">שמור</Button>
            </Box>
        </Box>
    );
};

export default UserManagement;
