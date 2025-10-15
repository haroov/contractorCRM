import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation resources
import heTranslation from '../public/locales/he/translation.json';
import enTranslation from '../public/locales/en/translation.json';

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

