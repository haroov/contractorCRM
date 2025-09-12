# 🚀 הפעלת Google Docs API - מדריך מהיר

## התחלה מהירה

### 1. הגדרת Environment Variables
```bash
npm run setup:env
```
זה יפתח wizard שיעזור לך להגדיר את כל ה-environment variables הנדרשים.

### 2. בדיקת Google Docs API
```bash
npm run test:google-docs
```
זה יבדוק אם ה-API עובד כראוי.

### 3. הפעלת השרת
```bash
npm start
```

## שלבים מפורטים

### שלב 1: יצירת Google Cloud Project
1. לך ל: https://console.cloud.google.com/
2. צור פרויקט חדש: `contractor-crm-docs-api`
3. הפעל את Google Docs API

### שלב 2: יצירת API Key
1. לך ל: APIs & Services > Credentials
2. צור API Key חדש
3. הגבל את המפתח ל-Google Docs API בלבד

### שלב 3: הגדרת Environment Variables
```bash
# הפעל את ה-setup script
npm run setup:env

# או הוסף ידנית לקובץ .env:
GOOGLE_API_KEY=your_actual_api_key_here
```

### שלב 4: בדיקת הפעלה
```bash
# בדוק את ה-API
npm run test:google-docs

# הפעל את השרת
npm start

# בדוק את דף תנאי השימוש
# לך ל: http://localhost:3001/termsOfUse
```

## פתרון בעיות

### שגיאה: "API key not valid"
- ודא שהמפתח הועתק נכון
- ודא שה-Google Docs API מופעל
- ודא שהמפתח לא מוגבל יותר מדי

### שגיאה: "Document not found"
- ודא שה-URL של המסמך נכון
- ודא שהמסמך הוא public

### שגיאה: "Quota exceeded"
- Google Docs API יש לו מגבלת quota יומית
- חכה עד למחר או שדרג את התוכנית

## קבצים חשובים

- `GOOGLE_DOCS_API_SETUP.md` - מדריך מפורט
- `scripts/setup-env.js` - סקריפט הגדרת environment
- `scripts/test-google-docs-api.js` - סקריפט בדיקת API
- `server/routes/google-docs.js` - Google Docs API routes
- `server/config/google-api.js` - הגדרות Google API

## קישורים שימושיים

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Docs API Documentation](https://developers.google.com/docs/api)
- [API Key Best Practices](https://developers.google.com/maps/api-key-best-practices)

## תמיכה

אם יש בעיות, בדוק:
1. את הלוגים של השרת
2. את ה-console של הדפדפן
3. את ה-API key ב-Google Cloud Console
4. את ה-environment variables

---

**🎉 אחרי ההגדרה, התוכן יבוא ישירות מ-Google Docs ויתעדכן אוטומטית!**
