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

interface User {
    _id: string;
    googleId: string;
    email: string;
    name: string;
    phone?: string;
    picture?: string;
    role: 'admin' | 'user';
    isActive: boolean;
    lastLogin?: string;
    createdAt: string;
}

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success' | 'error'}>({
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

    const loadUsers = async () => {
        try {
            setLoading(true);
            const response = await authenticatedFetch('/api/users');
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            } else {
                console.error('Failed to load users');
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
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, direction: 'rtl' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    ניהול משתמשים
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddUser}
                    sx={{ bgcolor: 'primary.main' }}
                >
                    הוסף משתמש חדש
                </Button>
            </Box>

            {/* Search */}
            <Box sx={{ mb: 3 }}>
                <TextField
                    placeholder="חיפוש לפי שם, אימייל או תפקיד..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ width: '100%', maxWidth: 400 }}
                    InputProps={{
                        startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                />
            </Box>

            {/* Active Users Table */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
                    משתמשים פעילים ({activeUsers.length})
                </Typography>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>משתמש</TableCell>
                                <TableCell>אימייל</TableCell>
                                <TableCell>טלפון</TableCell>
                                <TableCell>תפקיד</TableCell>
                                <TableCell>סטטוס</TableCell>
                                <TableCell>התחברות אחרונה</TableCell>
                                <TableCell>תאריך יצירה</TableCell>
                                <TableCell>פעולות</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {activeUsers.length > 0 ? (
                                activeUsers.map((user) => (
                                    <TableRow key={user._id}>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                {user.picture ? (
                                                    <Avatar
                                                        src={user.picture}
                                                        alt={user.name}
                                                        sx={{ width: 40, height: 40 }}
                                                    />
                                                ) : (
                                                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                                                        <PersonIcon />
                                                    </Avatar>
                                                )}
                                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                    {user.name}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                {user.email}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            {user.phone || '-'}
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
                                            {formatDate(user.lastLogin!)}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(user.createdAt)}
                                        </TableCell>
                                        <TableCell>
                                            <IconButton
                                                onClick={(e) => handleMenuOpen(e, user)}
                                                size="small"
                                            >
                                                <MoreVertIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                                        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                                            אין משתמשים פעילים
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>

            {/* Pending Users Table */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h5" sx={{ mb: 2, color: 'warning.main', fontWeight: 600 }}>
                    משתמשים ממתינים ({pendingUsers.length})
                </Typography>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>משתמש</TableCell>
                                <TableCell>אימייל</TableCell>
                                <TableCell>טלפון</TableCell>
                                <TableCell>תפקיד</TableCell>
                                <TableCell>סטטוס</TableCell>
                                <TableCell>התחברות אחרונה</TableCell>
                                <TableCell>תאריך יצירה</TableCell>
                                <TableCell>פעולות</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pendingUsers.length > 0 ? (
                                pendingUsers.map((user) => (
                                    <TableRow key={user._id}>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                {user.picture ? (
                                                    <Avatar
                                                        src={user.picture}
                                                        alt={user.name}
                                                        sx={{ width: 40, height: 40 }}
                                                    />
                                                ) : (
                                                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'warning.main' }}>
                                                        <PersonIcon />
                                                    </Avatar>
                                                )}
                                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                    {user.name}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                {user.email}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            {user.phone || '-'}
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
                                                label="ממתין"
                                                color="warning"
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                                                טרם התחבר
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(user.createdAt)}
                                        </TableCell>
                                        <TableCell>
                                            <IconButton
                                                onClick={(e) => handleMenuOpen(e, user)}
                                                size="small"
                                            >
                                                <MoreVertIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                                        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                                            אין משתמשים ממתינים
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
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
        role: user?.role || 'user',
        isActive: user?.isActive ?? true
    });

    const [errors, setErrors] = useState<{[key: string]: string}>({});

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
                helperText={errors.phone || 'פורמט: 05x-xxxxxxx (אופציונלי)'}
                placeholder="050-1234567"
                inputProps={{
                    maxLength: 11
                }}
            />
            <TextField
                fullWidth
                select
                label="תפקיד"
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
