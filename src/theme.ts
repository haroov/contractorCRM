import { createTheme } from '@mui/material/styles';
import { Direction } from './locale';

export const createAppTheme = (direction: Direction) => createTheme({
    direction,
    palette: {
        primary: {
            main: '#6b47c1', // סגול שוקו
        },
        secondary: {
            main: '#6b47c1', // סגול שוקו
        },
    },
    typography: {
        fontFamily: 'Assistant, Arial, sans-serif',
    },
    components: {
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                            borderColor: '#6b47c1', // סגול שוקו
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#6b47c1', // סגול שוקו
                        },
                    },
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    '&.Mui-focused fieldset': {
                        borderColor: '#6b47c1', // סגול שוקו
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#6b47c1', // סגול שוקו
                    },
                },
            },
        },
        MuiFormControl: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                            borderColor: '#6b47c1', // סגול שוקו
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#6b47c1', // סגול שוקו
                        },
                    },
                },
            },
        },
        MuiSelect: {
            styleOverrides: {
                root: {
                    '&.Mui-focused fieldset': {
                        borderColor: '#6b47c1', // סגול שוקו
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#6b47c1', // סגול שוקו
                    },
                },
            },
        },
        MuiAutocomplete: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                            borderColor: '#6b47c1', // סגול שוקו
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#6b47c1', // סגול שוקו
                        },
                    },
                },
            },
        },
    },
});

// Keep the old export for backward compatibility during transition
export const theme = createAppTheme('rtl');
