import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import { createAppTheme } from './theme';
import { getDirection, getHtmlLang, type Language } from './locale';
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './ErrorBoundary.tsx'
import './i18n'
import i18n from './i18n'

console.log('🚀 Starting application...');

// Handle runtime errors to prevent console spam
window.addEventListener('error', (event) => {
  // Suppress common browser extension errors
  if (event.message && event.message.includes('message port closed')) {
    event.preventDefault();
    console.log('🔧 Suppressed browser extension error:', event.message);
    return false;
  }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Suppress common browser extension errors
  if (event.reason && event.reason.message && event.reason.message.includes('message port closed')) {
    event.preventDefault();
    console.log('🔧 Suppressed browser extension promise rejection:', event.reason.message);
    return false;
  }
});

// Create Emotion caches for LTR and RTL
const cacheLtr = createCache({
  key: 'mui',
  prepend: true,
});

const cacheRtl = createCache({
  key: 'muirtl',
  prepend: true,
  stylisPlugins: [rtlPlugin],
});

// App wrapper component to handle language changes
function AppWrapper() {
  const [language, setLanguage] = useState<Language>('he');
  const [theme, setTheme] = useState(createAppTheme('rtl'));

  useEffect(() => {
    // Get initial language from localStorage or default to Hebrew
    const savedLang = localStorage.getItem('i18nextLng') as Language || 'he';
    setLanguage(savedLang);

    const direction = getDirection(savedLang);
    setTheme(createAppTheme(direction));

    // Set document attributes
    document.documentElement.dir = direction;
    document.documentElement.lang = getHtmlLang(savedLang);
  }, []);

  // Listen for language changes from i18next
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      const newLang = lng as Language;
      setLanguage(newLang);

      const direction = getDirection(newLang);
      setTheme(createAppTheme(direction));

      // Update document attributes
      document.documentElement.dir = direction;
      document.documentElement.lang = getHtmlLang(newLang);
    };

    // Listen to i18next language changes
    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  const direction = getDirection(language);
  const cache = direction === 'rtl' ? cacheRtl : cacheLtr;

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    </CacheProvider>
  );
}

const rootElement = document.getElementById('root');
console.log('🔍 Root element:', rootElement);

if (!rootElement) {
  console.error('❌ Root element not found!');
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <AppWrapper />
      </ErrorBoundary>
    </StrictMode>,
  );
}
