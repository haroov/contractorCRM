# מדריך הפעלת Google Docs API

## שלב 1: יצירת Google Cloud Project

1. **היכנס ל-Google Cloud Console:**
   - לך ל: https://console.cloud.google.com/
   - התחבר עם חשבון Google שלך

2. **צור פרויקט חדש:**
   - לחץ על "Select a project" בחלק העליון
   - לחץ על "New Project"
   - שם הפרויקט: `contractor-crm-docs-api`
   - לחץ "Create"

## שלב 2: הפעלת Google Docs API

1. **היכנס ל-APIs & Services:**
   - בתפריט השמאלי, לחץ על "APIs & Services" > "Library"

2. **חפש Google Docs API:**
   - חפש "Google Docs API"
   - לחץ על "Google Docs API"
   - לחץ "Enable"

## שלב 3: יצירת API Key

1. **היכנס ל-Credentials:**
   - בתפריט השמאלי, לחץ על "APIs & Services" > "Credentials"

2. **צור API Key:**
   - לחץ "Create Credentials" > "API Key"
   - העתק את המפתח שנוצר
   - לחץ "Restrict Key" (אופציונלי אבל מומלץ)

3. **הגבל את המפתח (מומלץ):**
   - Application restrictions: "HTTP referrers"
   - Website restrictions: `dash.chocoinsurance.com/*`
   - API restrictions: בחר "Google Docs API"

## שלב 4: הוספת Environment Variable

1. **צור קובץ .env בפרויקט:**
   ```bash
   touch .env
   ```

2. **הוסף את המפתח לקובץ .env:**
   ```env
   # Google Docs API Configuration
   GOOGLE_API_KEY=your_actual_api_key_here
   
   # MongoDB Configuration
   MONGODB_URI=mongodb+srv://liav:liav123@cluster0.8jqjq.mongodb.net/contractor-crm?retryWrites=true&w=majority
   
   # Session Configuration
   SESSION_SECRET=your_session_secret_here
   
   # Email Configuration (SendGrid)
   SENDGRID_API_KEY=your_sendgrid_api_key_here
   FROM_EMAIL=noreply@chocoinsurance.com
   
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   
   # Frontend Configuration
   VITE_API_BASE_URL=http://localhost:3001
   VITE_AUTH_BASE_URL=http://localhost:3001
   ```

3. **החלף את `your_actual_api_key_here` במפתח האמיתי שיצרת**

## שלב 5: הוספת Environment Variable ל-Render

1. **היכנס ל-Render Dashboard:**
   - לך ל: https://dashboard.render.com/
   - בחר את הפרויקט שלך

2. **הוסף Environment Variable:**
   - לחץ על "Environment"
   - הוסף: `GOOGLE_API_KEY` = `your_actual_api_key_here`
   - לחץ "Save Changes"

## שלב 6: בדיקת הפעלה

1. **הפעל את השרת:**
   ```bash
   npm start
   ```

2. **בדוק את ה-API:**
   - לך ל: http://localhost:3001/api/google-docs/terms-of-use-html
   - אתה אמור לראות את התוכן האמיתי מ-Google Docs

## פתרון בעיות

### שגיאה: "API key not valid"
- ודא שהמפתח הועתק נכון
- ודא שה-Google Docs API מופעל
- ודא שהמפתח לא מוגבל יותר מדי

### שגיאה: "Document not found"
- ודא שה-URL של המסמך נכון
- ודא שהמסמך הוא public או שהמפתח יש לו גישה אליו

### שגיאה: "Quota exceeded"
- Google Docs API יש לו מגבלת quota
- אם אתה חורג מהמגבלה, תצטרך לחכות או לשדרג את התוכנית

## הערות חשובות

1. **אבטחה:** לעולם אל תחלוק את ה-API key שלך
2. **Quota:** Google Docs API יש לו מגבלת שימוש יומית
3. **Public Documents:** המסמך צריך להיות public או שהמפתח צריך גישה אליו
4. **Caching:** המערכת תשמור cache של התוכן למשך זמן מסוים

## קישורים שימושיים

- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Docs API Documentation](https://developers.google.com/docs/api)
- [API Key Best Practices](https://developers.google.com/maps/api-key-best-practices)
