# מדריך שירות ניטור בטיחות (Safety Monitor Service)

## סקירה כללית

שירות ניטור הבטיחות מושך אוטומטית דוחות בטיחות יומיים ממיילים של SafeGuard AI, מנתח אותם, ומציג אותם בדשבורד הפרויקט עם גרפים יומיים ומצטברים.

## תכונות עיקריות

- **משיכה אוטומטית**: Cron job שרץ מדי יום בשעה 7:00 בבוקר
- **ניתוח PDF**: חילוץ ציון בטיחות, תאריך ושם האתר מהדוחות
- **קישור אוטומטי**: התאמה חכמה בין דוחות לפרוייקטים
- **דשבורד ויזואלי**: גרפים יומיים ומצטברים עם סטטיסטיקות
- **קישור ידני**: אפשרות לקשר דוחות שלא התאמו אוטומטית

## הגדרה ראשונית

### 1. הגדרת משתני סביבה

הוסף את המשתנים הבאים לקובץ `.env`:

```bash
# Gmail API Configuration
GMAIL_TARGET_EMAIL=ai@chocoinsurance.com
GMAIL_SENDER_FILTER=support@safeguardapps.com
# Comma-separated list of Hebrew incident subjects to detect (optional)
GMAIL_INCIDENT_SUBJECTS="דוח אירועי בטיחות, תאונה, בוצע דיווח חקיר, דיווח חקיר"

# Cron Job Schedule (default: 7:00 AM Israel time)
SAFETY_CRON_SCHEDULE=0 7 * * *

# MongoDB Configuration (already configured)
MONGODB_URI=your_mongodb_connection_string
MONGODB_DBNAME=contractor-crm
```

### 2. הגדרת Gmail API

#### שלב 1: יצירת פרויקט ב-Google Cloud Console
1. עבור ל-[Google Cloud Console](https://console.cloud.google.com/)
2. צור פרויקט חדש או בחר פרויקט קיים
3. הפעל את Gmail API

#### שלב 2: יצירת OAuth 2.0 Credentials
1. עבור ל-APIs & Services > Credentials
2. לחץ על "Create Credentials" > "OAuth 2.0 Client IDs"
3. בחר "Desktop application"
4. הורד את קובץ ה-credentials ושמור אותו כ-`server/credentials.json`

#### שלב 3: יצירת Token
הפעל את הסקריפט הבא ליצירת token:

```bash
npm run test:safety-monitor
```

במהלך הפעלת הסקריפט, תתבקש לאשר את הגישה לחשבון Gmail.

### 3. התקנת תלויות

```bash
npm install
```

## מבנה הנתונים

### MongoDB Collection: `safetyReports`

```javascript
{
  _id: "Safety_2025_01_15_Site_אכזיב_מגרש_3001",
  category: "Safety",
  operator: "Safeguard", 
  date: "15/01/2025",
  reportUrl: "https://www.safeguardapps.com/storage/servlet/Image?...",
  issuesUrl: "https://www.safeguardapps.com/storage/servlet/Image?...",
  score: 85,
  site: "אכזיב מגרש 3001",
  contractorName: "צמח המרמן",
  projectId: ObjectId("..."), // Auto-matched or manually linked
  projectName: "אכזיב 3001",
  matchConfidence: 0.95, // 0-1 confidence score
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### GET `/api/safety-reports`
קבלת כל דוחות הבטיחות עם אפשרות לסינון

**Query Parameters:**
- `projectId`: ID של פרויקט ספציפי
- `dateFrom`: תאריך התחלה (YYYY-MM-DD)
- `dateTo`: תאריך סיום (YYYY-MM-DD)
- `limit`: מספר מקסימלי של תוצאות

### GET `/api/safety-reports/:id`
קבלת דוח בטיחות ספציפי

### POST `/api/safety-reports/fetch`
הפעלה ידנית של משיכת דוחות חדשים

### PATCH `/api/safety-reports/:id/link`
קישור ידני של דוח לפרויקט

**Body:**
```json
{
  "projectId": "project_object_id"
}
```

### GET `/api/safety-reports/project/:projectId`
קבלת כל דוחות הבטיחות של פרויקט ספציפי

### GET `/api/safety-reports/stats/summary`
קבלת סטטיסטיקות בטיחות

**Query Parameters:**
- `projectId`: ID של פרויקט ספציפי
- `days`: מספר ימים לאחור (ברירת מחדל: 30)

### GET `/api/safety-reports/unmatched`
קבלת דוחות שלא קושרו לפרוייקטים

## אלגוריתם התאמת פרוייקטים

השירות משתמש באלגוריתם התאמה חכם:

1. **השוואת שם הפרויקט**: 70% משקל
2. **השוואת שם הקבלן**: 30% משקל
3. **דירוג דמיון**: אלגוריתם Levenshtein Distance
4. **סף התאמה**: 80% דמיון מינימלי

### דוגמאות התאמה:
- "אכזיב מגרש 3001" ↔ "אכזיב 3001" (95% דמיון)
- "צמח המרמן" ↔ "צמח המרמן בע״מ" (90% דמיון)

## דשבורד הבטיחות

### תכונות הדשבורד:
- **כרטיסי סטטיסטיקה**: ציון נוכחי, ממוצע 30 יום, מגמה, סה״כ דוחות
- **גרף יומי**: עמודות המציגות ציוני בטיחות לפי תאריך
- **גרף מצטבר**: קו מגמה של הממוצע המצטבר
- **רשימת דוחות**: 5 דוחות אחרונים עם קישורים ל-PDF
- **דוחות לא מקושרים**: רשימה של דוחות שדורשים קישור ידני

### צבעי ציונים:
- 🟢 ירוק: 85+ (מעולה)
- 🟡 צהוב: 70-84 (טוב)
- 🔴 אדום: מתחת ל-70 (דורש שיפור)

## בדיקות וניפוי שגיאות

### הפעלת בדיקות
```bash
npm run test:safety-monitor
```

### בדיקות זמינות:
1. **אתחול שירות**: בדיקת חיבור ל-MongoDB
2. **אלגוריתם התאמה**: בדיקת התאמת פרוייקטים
3. **חישוב דמיון**: בדיקת אלגוריתם Levenshtein
4. **פעולות MongoDB**: בדיקת CRUD operations
5. **אישור Gmail**: בדיקת חיבור ל-Gmail API
6. **ניתוח PDF**: בדיקת חילוץ נתונים מ-PDF
7. **ולידציה**: בדיקת שמירת נתונים

### לוגים
השירות כותב לוגים מפורטים:
- `server/safety-monitor.log`: לוגים של Cron job
- Console logs: לוגים בזמן אמת

## פתרון בעיות נפוצות

### בעיה: "Token file not found"
**פתרון**: הפעל את תהליך האישור מחדש:
```bash
npm run test:safety-monitor
```

### בעיה: "Failed to extract report fields"
**פתרון**: 
1. בדוק שהקובץ PDF תקין
2. ודא שהטקסט מכיל את השדות הנדרשים
3. עדכן את regex patterns ב-`extractDataFromPdf`

### בעיה: "No matching project found"
**פתרון**:
1. ודא ששמות הפרוייקטים במסד הנתונים תואמים למיילים
2. השתמש בקישור ידני בדשבורד
3. בדוק את רמת הדמיון באלגוריתם

### בעיה: Cron job לא רץ
**פתרון**:
1. בדוק את משתנה `SAFETY_CRON_SCHEDULE`
2. ודא שהשרת רץ ברקע
3. בדוק את לוגי השרת

## תחזוקה שוטפת

### ניטור ביצועים
- בדוק את לוגי השרת מדי יום
- עקוב אחר דוחות שלא התאמו
- בדוק את איכות הנתונים בדשבורד

### עדכונים
- עדכן regex patterns לפי שינויים בפורמט הדוחות
- הוסף פרוייקטים חדשים למסד הנתונים
- בדוק את תקינות Gmail API credentials

### גיבוי
- גבה את קובץ `token.json` באופן קבוע
- שמור עותק של `credentials.json` במקום בטוח
- גבה את מסד הנתונים MongoDB

## אבטחה

### הגנות מיושמות:
- OAuth 2.0 לאישור Gmail
- סינון מיילים לפי שולח ספציפי
- ולידציה של נתוני PDF
- הגבלת גישה ל-API endpoints

### המלצות:
- עדכן credentials באופן קבוע
- השתמש ב-HTTPS בפרודקשן
- הגבל גישה לקבצי credentials
- עקוב אחר לוגי גישה

## תמיכה

לבעיות או שאלות:
1. בדוק את הלוגים
2. הפעל את סקריפט הבדיקות
3. עיין במדריך זה
4. פנה לצוות הפיתוח

---

**גרסה**: 1.0  
**תאריך עדכון**: ינואר 2025  
**מפתח**: צוות פיתוח שוקו
