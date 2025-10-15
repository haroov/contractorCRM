export type Language = 'he' | 'en';
export type Direction = 'rtl' | 'ltr';

export const getDirection = (lang: Language): Direction => {
    return lang === 'he' ? 'rtl' : 'ltr';
};

export const getHtmlLang = (lang: Language): string => {
    return lang;
};

export const getTextAlign = (lang: Language): 'right' | 'left' => {
    return lang === 'he' ? 'right' : 'left';
};

