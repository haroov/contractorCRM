import React, { useState } from 'react';
import { Avatar, IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { AccountCircle as AccountCircleIcon, Language as LanguageIcon, Check as CheckIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { type Language, getDirection, getHtmlLang } from '../locale';
import i18nInstance from '../i18n';

interface UserMenuProps {
    user: {
        name: string;
        picture?: string;
        role: string;
    };
    onProfileClick: () => void;
    onUserManagementClick?: () => void;
    onViewModeToggle?: () => void;
    viewMode?: 'contractors' | 'projects';
    onLogout: () => void;
    showUserManagement?: boolean;
    showViewModeToggle?: boolean;
}

export default function UserMenu({
    user,
    onProfileClick,
    onUserManagementClick,
    onViewModeToggle,
    viewMode,
    onLogout,
    showUserManagement = false,
    showViewModeToggle = false
}: UserMenuProps) {
    const { t } = useTranslation();
    const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
    const [languageMenuAnchor, setLanguageMenuAnchor] = useState<null | HTMLElement>(null);

    const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setUserMenuAnchor(event.currentTarget);
    };

    const handleUserMenuClose = () => {
        setUserMenuAnchor(null);
    };

    const handleLanguageMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setLanguageMenuAnchor(event.currentTarget);
    };

    const handleLanguageMenuClose = () => {
        setLanguageMenuAnchor(null);
    };

    const changeLanguage = async (lang: Language) => {
        await i18nInstance.changeLanguage(lang);
        handleLanguageMenuClose();
    };

    const currentLanguage = i18nInstance.language as Language;

    return (
        <>
            <IconButton
                size="large"
                edge="end"
                aria-label="account of current user"
                aria-controls="user-menu"
                aria-haspopup="true"
                onClick={handleUserMenuOpen}
                color="inherit"
            >
                {user.picture ? (
                    <Avatar src={user.picture} alt={user.name} sx={{ width: 32, height: 32 }} />
                ) : (
                    <Avatar sx={{ width: 32, height: 32, bgcolor: '#6b47c1' }}>
                        <AccountCircleIcon />
                    </Avatar>
                )}
            </IconButton>

            {/* User Menu */}
            <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={handleUserMenuClose}
                id="user-menu"
                keepMounted
            >
                <MenuItem onClick={onProfileClick}>
                    <ListItemIcon>
                        <AccountCircleIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t('menu.profile')}</ListItemText>
                </MenuItem>

                {showUserManagement && onUserManagementClick && (
                    <MenuItem onClick={onUserManagementClick}>
                        <ListItemIcon>
                            <AccountCircleIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>{t('menu.userManagement')}</ListItemText>
                    </MenuItem>
                )}

                {showViewModeToggle && onViewModeToggle && (
                    <MenuItem onClick={onViewModeToggle}>
                        <ListItemIcon>
                            <AccountCircleIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>
                            {viewMode === 'contractors' ? t('menu.projects') : t('menu.contractors')}
                        </ListItemText>
                    </MenuItem>
                )}

                <MenuItem onClick={handleLanguageMenuOpen}>
                    <ListItemIcon>
                        <LanguageIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t('menu.language')}</ListItemText>
                </MenuItem>

                <MenuItem onClick={onLogout}>
                    <ListItemIcon>
                        <AccountCircleIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>{t('menu.logout')}</ListItemText>
                </MenuItem>
            </Menu>

            {/* Language Submenu */}
            <Menu
                anchorEl={languageMenuAnchor}
                open={Boolean(languageMenuAnchor)}
                onClose={handleLanguageMenuClose}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
            >
                <MenuItem
                    onClick={() => changeLanguage('he')}
                    selected={currentLanguage === 'he'}
                >
                    <ListItemText>{t('menu.hebrew')}</ListItemText>
                    {currentLanguage === 'he' && (
                        <ListItemIcon>
                            <CheckIcon fontSize="small" />
                        </ListItemIcon>
                    )}
                </MenuItem>
                <MenuItem
                    onClick={() => changeLanguage('en')}
                    selected={currentLanguage === 'en'}
                >
                    <ListItemText>{t('menu.english')}</ListItemText>
                    {currentLanguage === 'en' && (
                        <ListItemIcon>
                            <CheckIcon fontSize="small" />
                        </ListItemIcon>
                    )}
                </MenuItem>
            </Menu>
        </>
    );
}

