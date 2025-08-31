// שירות לניהול מילים אסורות במונגו
import { forbiddenWords } from '../data/forbiddenWords';

// ממשק למילה אסורה
export interface ForbiddenWord {
    _id?: string;
    word: string;
    category?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

// פונקציה להבאת כל המילים האסורות ממונגו
export const getForbiddenWords = async (): Promise<ForbiddenWord[]> => {
    try {
        // כאן תהיה קריאה למונגו
        // כרגע נחזיר את המערך הסטטי
        return forbiddenWords.map(word => ({
            word,
            category: 'general',
            createdAt: new Date(),
            updatedAt: new Date()
        }));
    } catch (error) {
        console.error('שגיאה בהבאת מילים אסורות:', error);
        return [];
    }
};

// פונקציה להוספת מילה אסורה למונגו
export const addForbiddenWord = async (word: string, category: string = 'general'): Promise<boolean> => {
    try {
        // כאן תהיה קריאה למונגו להוספת מילה
        console.log(`הוספת מילה אסורה: ${word} בקטגוריה: ${category}`);
        return true;
    } catch (error) {
        console.error('שגיאה בהוספת מילה אסורה:', error);
        return false;
    }
};

// פונקציה למחיקת מילה אסורה ממונגו
export const removeForbiddenWord = async (word: string): Promise<boolean> => {
    try {
        // כאן תהיה קריאה למונגו למחיקת מילה
        console.log(`מחיקת מילה אסורה: ${word}`);
        return true;
    } catch (error) {
        console.error('שגיאה במחיקת מילה אסורה:', error);
        return false;
    }
};

// פונקציה לעדכון מילה אסורה במונגו
export const updateForbiddenWord = async (oldWord: string, newWord: string, category?: string): Promise<boolean> => {
    try {
        // כאן תהיה קריאה למונגו לעדכון מילה
        console.log(`עדכון מילה אסורה: ${oldWord} -> ${newWord}`);
        return true;
    } catch (error) {
        console.error('שגיאה בעדכון מילה אסורה:', error);
        return false;
    }
};

// פונקציה לבדיקת מילה אם היא אסורה
export const isWordForbidden = async (word: string): Promise<boolean> => {
    try {
        const forbiddenWordsList = await getForbiddenWords();
        const normalizedWord = word.toLowerCase().trim();
        return forbiddenWordsList.some(forbiddenWord =>
            normalizedWord.includes(forbiddenWord.word.toLowerCase())
        );
    } catch (error) {
        console.error('שגיאה בבדיקת מילה אסורה:', error);
        return false;
    }
};

// פונקציה לייצוא המילים האסורות למערך
export const exportForbiddenWords = async (): Promise<string[]> => {
    try {
        const forbiddenWordsList = await getForbiddenWords();
        return forbiddenWordsList.map(item => item.word);
    } catch (error) {
        console.error('שגיאה בייצוא מילים אסורות:', error);
        return [];
    }
};

// פונקציה לייבוא מילים אסורות למערך
export const importForbiddenWords = async (words: string[]): Promise<boolean> => {
    try {
        for (const word of words) {
            await addForbiddenWord(word);
        }
        return true;
    } catch (error) {
        console.error('שגיאה בייבוא מילים אסורות:', error);
        return false;
    }
};
