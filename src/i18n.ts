import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources
const heTranslation = {
    "app": {
        "title": "שוקו ביטוח - מערכת ניהול קבלנים",
        "subtitle": "ניהול סיכונים באתרי בניה"
    },
    "menu": {
        "profile": "פרופיל",
        "userManagement": "ניהול משתמשים",
        "projects": "פרוייקטים",
        "contractors": "קבלנים",
        "logout": "התנתקות",
        "language": "שפה",
        "hebrew": "עברית",
        "english": "English"
    },
    "login": {
        "title": "התחברות למערכת",
        "email": "כתובת אימייל",
        "password": "סיסמה",
        "login": "התחבר",
        "contactLogin": "התחברות כקשר",
        "googleLogin": "התחבר עם Google",
        "otpSent": "קוד אימות נשלח לאימייל",
        "enterOtp": "הזן קוד אימות",
        "verify": "אימות",
        "resendOtp": "שלח קוד מחדש"
    },
    "common": {
        "save": "שמור",
        "cancel": "ביטול",
        "edit": "ערוך",
        "delete": "מחק",
        "add": "הוסף",
        "search": "חיפוש",
        "loading": "טוען...",
        "error": "שגיאה",
        "success": "הצלחה"
    }
};

const enTranslation = {
    "app": {
        "title": "Choco Insurance - Contractor Management System",
        "subtitle": "Construction Site Risk Management"
    },
    "menu": {
        "profile": "Profile",
        "userManagement": "User Management",
        "projects": "Projects",
        "contractors": "Contractors",
        "logout": "Logout",
        "language": "Language",
        "hebrew": "עברית",
        "english": "English"
    },
    "login": {
        "title": "System Login",
        "email": "Email Address",
        "password": "Password",
        "login": "Login",
        "contactLogin": "Login as Contact",
        "googleLogin": "Login with Google",
        "otpSent": "Verification code sent to email",
        "enterOtp": "Enter verification code",
        "verify": "Verify",
        "resendOtp": "Resend code"
    },
    "common": {
        "save": "Save",
        "cancel": "Cancel",
        "edit": "Edit",
        "delete": "Delete",
        "add": "Add",
        "search": "Search",
        "loading": "Loading...",
        "error": "Error",
        "success": "Success"
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            he: {
                translation: heTranslation
            },
            en: {
                translation: enTranslation
            }
        },
        fallbackLng: 'he',
        debug: false,

        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng'
        },

        interpolation: {
            escapeValue: false
        }
    });

export default i18n;

