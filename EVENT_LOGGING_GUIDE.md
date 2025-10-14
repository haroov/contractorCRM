# מערכת רישום אירועים (Event Logging System)

מערכת תשתיתית מקיפה לרישום כל הפעילויות באפליקציה למטרות ביקורת, ניטור ובעתיד - יכולת ביטול פעולות (undo).

## תכונות עיקריות

### 🔐 רישום אירועי אימות
- התחברות והתנתקות משתמשים
- שליחה ואימות קודי OTP
- שינוי סיסמאות
- כשלונות בהתחברות

### 📝 רישום פעולות CRUD
- יצירה, עדכון ומחיקה של פרויקטים
- ניהול קבלנים
- העלאה ומחיקה של קבצים
- שינויים בנתונים עם מעקב אחר השדות שהשתנו

### 🖥️ רישום אירועי מערכת
- שגיאות ואזהרות
- ניסיונות גישה לא מורשים
- פעילות API
- אירועי GIS ואנליזות בטיחות

## מבנה הנתונים

### Event Schema
```javascript
{
  eventId: String,           // מזהה ייחודי לאירוע
  eventType: String,         // סוג האירוע (USER_LOGIN, CREATE, etc.)
  category: String,          // קטגוריה (AUTH, CRUD, FILE, etc.)
  userId: ObjectId,          // מזהה המשתמש
  userEmail: String,         // אימייל המשתמש
  userRole: String,          // תפקיד המשתמש
  sessionId: String,         // מזהה הסשן
  resourceType: String,      // סוג המשאב (project, contractor, etc.)
  resourceId: String,        // מזהה המשאב
  resourceName: String,      // שם המשאב
  action: String,            // הפעולה שבוצעה
  description: String,       // תיאור האירוע
  ipAddress: String,         // כתובת IP
  userAgent: String,         // דפדפן/אפליקציה
  requestMethod: String,     // HTTP method
  requestUrl: String,        // URL של הבקשה
  statusCode: Number,        // קוד תגובה HTTP
  responseTime: Number,      // זמן תגובה במילישניות
  oldData: Object,           // נתונים לפני השינוי
  newData: Object,           // נתונים אחרי השינוי
  changedFields: [String],   // רשימת שדות שהשתנו
  status: String,            // SUCCESS, FAILED, WARNING, INFO
  severity: String,          // LOW, MEDIUM, HIGH, CRITICAL
  timestamp: Date,           // זמן האירוע
  metadata: Object,          // מטא-דאטה נוסף
  error: {                   // פרטי שגיאה (במידה ויש)
    message: String,
    stack: String,
    code: String
  }
}
```

## שימוש במערכת

### 1. רישום אירועי אימות
```javascript
const eventLoggingService = require('../services/eventLoggingService');

// רישום התחברות מוצלחת
await eventLoggingService.logAuthEvent(
  'USER_LOGIN',
  user,
  req,
  { loginMethod: 'email', success: true }
);
```

### 2. רישום פעולות CRUD
```javascript
// רישום יצירת פרויקט
await eventLoggingService.logCrudEvent(
  'CREATE',
  'project',
  projectData,
  user,
  req
);

// רישום עדכון עם מעקב שינויים
await eventLoggingService.logCrudEvent(
  'UPDATE',
  'project',
  newProjectData,
  user,
  req,
  oldProjectData  // לצורך השוואה
);
```

### 3. רישום פעולות קבצים
```javascript
await eventLoggingService.logFileEvent(
  'UPLOAD',
  fileName,
  fileSize,
  user,
  req,
  { projectId: 'project123' }
);
```

### 4. רישום אירועי מערכת
```javascript
await eventLoggingService.logSystemEvent(
  'SYSTEM_ERROR',
  'Database connection failed',
  'HIGH',
  { database: 'mongodb', error: errorDetails }
);
```

### 5. רישום שגיאות
```javascript
await eventLoggingService.logError(
  error,
  req,
  user,
  { context: 'project creation' }
);
```

## Middleware אוטומטי

### 1. Middleware לבקשות HTTP
```javascript
app.use(requestLoggingMiddleware({
  logAllRequests: false,
  logOnlyErrors: false,
  excludePaths: ['/health', '/assets'],
  logRequestBody: false,
  logResponseBody: false
}));
```

### 2. Middleware לאירועי אימות
```javascript
router.post('/login', authEventMiddleware('USER_LOGIN'), async (req, res) => {
  // הקוד שלך כאן
});
```

### 3. Middleware לפעולות CRUD
```javascript
router.post('/projects', crudEventMiddleware('CREATE', 'project'), async (req, res) => {
  // הקוד שלך כאן
});
```

### 4. Middleware לטיפול בשגיאות
```javascript
app.use(errorLoggingMiddleware);
```

## API לשאילתות

### 1. קבלת אירועים עם סינון
```
GET /api/events?page=1&limit=50&eventType=USER_LOGIN&startDate=2024-01-01
```

### 2. סטטיסטיקות אירועים
```
GET /api/events/stats?startDate=2024-01-01&endDate=2024-01-31
```

### 3. אירועים של משתמש ספציפי
```
GET /api/events/user/507f1f77bcf86cd799439011
```

### 4. אירועים של משאב ספציפי
```
GET /api/events/resource/project/507f1f77bcf86cd799439022
```

### 5. ייצוא אירועים ל-CSV
```
GET /api/events/export?format=csv&eventType=USER_LOGIN
```

## הגדרות סביבה

```bash
# הפעלה/כיבוי של רישום אירועים
EVENT_LOGGING_ENABLED=true

# רמת רישום
EVENT_LOG_LEVEL=INFO

# הגדרות batch processing
EVENT_BATCH_SIZE=100
EVENT_FLUSH_INTERVAL=5000

# הגדרות רישום בקשות
LOG_ALL_REQUESTS=false
LOG_ONLY_ERRORS=false
LOG_REQUEST_BODY=false
LOG_RESPONSE_BODY=false

# TTL לאירועים (בשניות) - null = ללא תפוגה
EVENT_TTL=31536000
```

## אינדקסים במונגו DB

המערכת יוצרת אוטומטית את האינדקסים הבאים לביצועים מיטביים:

```javascript
// אינדקסים בסיסיים
{ timestamp: -1 }
{ eventType: 1, timestamp: -1 }
{ userId: 1, timestamp: -1 }
{ userEmail: 1, timestamp: -1 }
{ category: 1, timestamp: -1 }
{ resourceType: 1, resourceId: 1, timestamp: -1 }
{ status: 1, timestamp: -1 }
{ severity: 1, timestamp: -1 }
{ sessionId: 1, timestamp: -1 }
{ ipAddress: 1, timestamp: -1 }

// אינדקסים מורכבים
{ eventType: 1, userId: 1, timestamp: -1 }
{ category: 1, status: 1, timestamp: -1 }
{ resourceType: 1, action: 1, timestamp: -1 }
```

## סוגי אירועים נתמכים

### אימות (AUTH)
- `USER_LOGIN` - התחברות מוצלחת
- `USER_LOGOUT` - התנתקות
- `USER_LOGIN_FAILED` - כשלון בהתחברות
- `USER_OTP_SENT` - שליחת קוד OTP
- `USER_OTP_VERIFIED` - אימות קוד OTP
- `USER_PASSWORD_CHANGE` - שינוי סיסמה

### פעולות CRUD
- `CREATE` - יצירה
- `READ` - קריאה
- `UPDATE` - עדכון
- `DELETE` - מחיקה
- `BULK_UPDATE` - עדכון המוני
- `BULK_DELETE` - מחיקה המונית

### קבצים (FILE)
- `FILE_UPLOAD` - העלאת קובץ
- `FILE_DOWNLOAD` - הורדת קובץ
- `FILE_DELETE` - מחיקת קובץ
- `PDF_GENERATE` - יצירת PDF
- `THUMBNAIL_GENERATE` - יצירת תמונה ממוזערת

### פרויקטים (PROJECT)
- `PROJECT_CREATE` - יצירת פרויקט
- `PROJECT_UPDATE` - עדכון פרויקט
- `PROJECT_DELETE` - מחיקת פרויקט
- `PROJECT_ARCHIVE` - ארכוב פרויקט

### מערכת (SYSTEM)
- `SYSTEM_ERROR` - שגיאת מערכת
- `SYSTEM_WARNING` - אזהרת מערכת
- `SYSTEM_INFO` - מידע מערכת
- `API_RATE_LIMIT_HIT` - הגעה למגבלת קצב API
- `UNAUTHORIZED_ACCESS_ATTEMPT` - ניסיון גישה לא מורשה

## יתרונות המערכת

### 🔍 ביקורת מלאה
- מעקב אחר כל הפעילויות במערכת
- רישום מי עשה מה ומתי
- שמירה של נתונים לפני ואחרי שינויים

### 🛡️ אבטחה
- זיהוי ניסיונות גישה לא מורשים
- מעקב אחר כשלונות בהתחברות
- רישום פעילות חשודה

### 📊 ניטור וניתוח
- סטטיסטיקות שימוש
- זיהוי דפוסי שימוש
- ניתוח ביצועים

### 🔄 יכולת שחזור עתידית
- שמירת מצב הנתונים לפני שינויים
- אפשרות לביטול פעולות (undo)
- שחזור נתונים במקרה של תקלה

## הפעלת המערכת

המערכת מופעלת אוטומטיטית עם הפעלת השרת ומתחילה לרשום אירועים מיד.

### בדיקת תקינות
```bash
# בדיקת חיבור למונגו DB
curl http://localhost:3001/api/events/stats

# צפייה באירועים אחרונים
curl http://localhost:3001/api/events?limit=10
```

### ניטור לוגים
```bash
# צפייה בלוגים של השרת
tail -f server.log | grep "Event"
```

## תחזוקה

### ניקוי אירועים ישנים
אם הוגדר TTL, אירועים ישנים יימחקו אוטומטית. אחרת, ניתן למחוק ידנית:

```javascript
// מחיקת אירועים מעל 6 חודשים
const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
await Event.deleteMany({ timestamp: { $lt: sixMonthsAgo } });
```

### גיבוי אירועים
```bash
# גיבוי קולקציית האירועים
mongodump --uri="$MONGODB_URI" --collection=events --out=./backup/
```

המערכת מוכנה לשימוש ותתחיל לרשום אירועים אוטומטית עם הפעלת השרת! 🎉