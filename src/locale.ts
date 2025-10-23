export type Language = 'he' | 'en';
export type Direction = 'rtl' | 'ltr';

export const normalizeLanguage = (lng: string | Language): Language => {
    const lower = (lng || '').toString().toLowerCase();
    if (lower.startsWith('he')) return 'he';
    return 'en';
};

export const getDirection = (lang: Language): Direction => {
    // Swap mapping per request: ensure visible effect matches selected label
    return lang === 'he' ? 'rtl' : 'ltr';
};

export const getHtmlLang = (lang: Language): string => {
    return lang;
};

export const getTextAlign = (lang: Language): 'right' | 'left' => {
    return lang === 'he' ? 'right' : 'left';
};

