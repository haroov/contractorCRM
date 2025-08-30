import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    direction: 'rtl',
    palette: {
        primary: {
            main: '#1976d2',
        },
        secondary: {
            main: '#9c27b0',
        },
    },
    typography: {
        fontFamily: 'Assistant, Arial, sans-serif',
    },
});
