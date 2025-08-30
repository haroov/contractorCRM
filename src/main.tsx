import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { theme } from './theme';
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './ErrorBoundary.tsx'

console.log('🚀 Starting application...');

// Create a simple cache for RTL
const cacheRtl = createCache({
  key: 'muirtl',
  prepend: true,
});

const rootElement = document.getElementById('root');
console.log('🔍 Root element:', rootElement);

if (!rootElement) {
  console.error('❌ Root element not found!');
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <CacheProvider value={cacheRtl}>
          <ThemeProvider theme={theme}>
            <App />
          </ThemeProvider>
        </CacheProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}
