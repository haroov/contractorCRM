# מדריך אינטגרציה עם OpenAI API

## סקירה כללית

האפליקציה עכשיו כוללת אינטגרציה עם OpenAI API לניתוח אוטומטי של דוחות קרקע ומילוי שדות בטופס הפרויקט.

## תכונות חדשות

### 1. ניתוח אוטומטי של דוחות קרקע
- העלאת דוח קרקע (PDF, JPG, PNG)
- לחיצה על אייקון AI לניתוח אוטומטי
- מילוי אוטומטי של שדות רלוונטיים

### 2. שדות שמתמלאים אוטומטית
- סוג הקרקע (חולית/טיטית/אחר)
- עומק מי התהום
- עומק חפירה
- שטח החפירה
- שיטת ביצוע היסודות
- דיפון היקפי
- שיטת הבניה
- מפתח מירבי בין עמודים
- תיאור הסביבה
- תיאור המצב הקיים
- ציון PNG25 לרעידות אדמה
- אזור הפרויקט

## הגדרת משתני סביבה

### 1. OpenAI API Key
הוסף את המפתח שלך מ-OpenAI Platform:

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### 2. משתני סביבה נוספים
```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-here

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/contractor-crm

# Server Configuration
PORT=3001
NODE_ENV=development
```

## פריסה

### 1. התקנת תלויות
```bash
npm install --legacy-peer-deps
```

### 2. הפעלת השרת
```bash
npm run server
```

### 3. הפעלת האפליקציה
```bash
npm run dev
```

## שימוש

### 1. העלאת דוח קרקע
1. עבור לעמוד פרטי פרויקט
2. גלול לסקשן "דוח יועץ קרקע"
3. לחץ על "העלה דוח" ובחר קובץ PDF או תמונה

### 2. ניתוח אוטומטי
1. לאחר העלאת הקובץ, יופיע אייקון AI בצבע סגול שוקולד
2. לחץ על האייקון לניתוח אוטומטי
3. השדות יתמלאו אוטומטית על בסיס המידע בדוח
4. האייקון יעלם לאחר הניתוח (ניתוח חד-פעמי)

### 3. עריכת שדות
- ניתן לערוך את השדות לאחר המילוי האוטומטי
- העלאת קובץ חדש תאפס את מצב הניתוח ותאפשר ניתוח מחדש

## קבצים שנוספו/שונו

### קבצים חדשים
- `src/services/documentParserService.ts` - שירות ניתוח מסמכים
- `server/services/documentParserService.js` - גרסת JavaScript של השירות
- `server/routes/document-parser.js` - API endpoint לניתוח מסמכים

### קבצים שעודכנו
- `src/components/ProjectDetailsPage.tsx` - הוספת פונקציונליות מילוי אוטומטי
- `server/index.js` - הוספת נתיב document-parser
- `package.json` - הוספת תלות openai
- `render-env-vars.md` - הוספת משתנה OPENAI_API_KEY

## פתרון בעיות

### 1. שגיאת "Failed to parse document"
- ודא שה-OpenAI API key תקין
- ודא שהקובץ נגיש וקיים
- בדוק שהקובץ בפורמט נתמך (PDF, JPG, PNG)

### 2. האייקון AI לא מופיע
- ודא שהקובץ הועלה בהצלחה
- ודא שהמשתמש יכול לערוך (לא במצב view)
- ודא שהדוח לא נותח כבר

### 3. שגיאות API
- בדוק את הלוגים של השרת
- ודא שמשתני הסביבה מוגדרים נכון
- בדוק את החיבור לאינטרנט

## עלויות OpenAI

השימוש ב-OpenAI API כרוך בעלות:
- GPT-4o: ~$0.005 לכל 1K tokens
- Vision API: ~$0.01 לכל 1K tokens
- הערכה: ~$0.05-0.20 לכל דוח קרקע

## אבטחה

- API key נשמר בצד השרת בלבד
- לא נשמר מידע רגיש במסד הנתונים
- כל הבקשות עוברות דרך השרת עם אימות

## תמיכה

לשאלות או בעיות, פנה לצוות הפיתוח.
