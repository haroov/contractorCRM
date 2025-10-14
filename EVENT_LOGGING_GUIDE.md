# מדריך תשתית לוג אירועים (Event Logging Infrastructure)

## סקירה כללית

תשתית לוג האירועים מספקת מעקב מקיף אחר כל הפעולות במערכת, כולל כניסות, שמירות, עדכונים, מחיקות ועוד. התשתית מאפשרת:

- **מעקב מלא** - כל פעולה נשמרת עם פרטים מלאים
- **אבטחה** - זיהוי פעילות חשודה וניסיונות פריצה
- **ביקורת** - יכולת לבדוק מי עשה מה ומתי
- **סטטיסטיקות** - ניתוח פעילות המשתמשים והמערכת
- **גיבוי ושחזור** - תמיכה עתידית ב-undo ו-audit

## מבנה התשתית

### 1. מודל Event (`/server/models/Event.js`)

המודל הראשי המגדיר את מבנה הנתונים של כל אירוע:

```javascript
{
  eventId: String,           // מזהה ייחודי לאירוע
  eventType: String,         // סוג האירוע (LOGIN, CREATE, UPDATE, etc.)
  resourceType: String,      // סוג המשאב (USER, CONTRACTOR, etc.)
  resourceId: String,        // מזהה המשאב
  userId: ObjectId,          // מזהה המשתמש
  userName: String,          // שם המשתמש
  userEmail: String,         // אימייל המשתמש
  description: String,       // תיאור האירוע
  details: Object,           // פרטים נוספים
  changes: {                 // שינויים (לצורך audit)
    before: Object,
    after: Object
  },
  status: String,            // סטטוס (SUCCESS, FAILED, etc.)
  severity: String,          // חומרה (LOW, MEDIUM, HIGH, CRITICAL)
  timestamp: Date,           // זמן האירוע
  ipAddress: String,         // כתובת IP
  userAgent: String,         // User Agent
  sessionId: String          // מזהה הפעלה
}
```

### 2. שירות EventService (`/server/services/EventService.js`)

שירות מרכזי לניהול אירועים עם פונקציות מוכנות:

```javascript
// רישום אירוע כללי
await EventService.logEvent(eventData);

// רישום כניסה
await EventService.logLogin(user, request);

// רישום יצירה
await EventService.logCreate(resourceType, resourceId, user, request, data);

// רישום עדכון
await EventService.logUpdate(resourceType, resourceId, user, request, oldData, newData);

// רישום מחיקה
await EventService.logDelete(resourceType, resourceId, user, request, deletedData);

// רישום חיפוש
await EventService.logSearch(user, request, searchParams, resultCount);

// רישום שגיאת מערכת
await EventService.logSystemError(errorMessage, request, errorDetails);

// רישום התראת אבטחה
await EventService.logSecurityAlert(alertType, description, request, details);
```

### 3. Middleware (`/server/middleware/eventLogger.js`)

Middleware אוטומטי לרישום אירועים:

- **logApiRequest** - רישום אוטומטי של כל בקשות API
- **logAuthEvents** - רישום אוטומטי של אירועי אימות
- **logSecurityEvents** - זיהוי פעילות חשודה
- **logErrors** - רישום שגיאות מערכת
- **logDatabaseOperations** - רישום פעולות מסד נתונים

### 4. Routes (`/server/routes/events.js`)

API endpoints לניהול אירועים:

```
GET /api/events              - קבלת אירועים עם סינון
GET /api/events/stats        - סטטיסטיקות מערכת
GET /api/events/dashboard    - נתונים ללוח בקרה
GET /api/events/export       - ייצוא אירועים ל-CSV
POST /api/events/archive     - ארכוב אירועים ישנים
GET /api/events/user/:id/activity - פעילות משתמש ספציפי
```

## שימוש בתשתית

### 1. בצד השרת

```javascript
const EventService = require('./services/EventService');

// רישום אירוע ידני
await EventService.logEvent({
  eventType: 'CUSTOM_ACTION',
  resourceType: 'CONTRACTOR',
  resourceId: contractorId,
  userId: req.user._id,
  description: 'Custom action performed',
  details: { action: 'special_operation' }
});
```

### 2. בצד הלקוח

```javascript
import { useEventLogger } from './hooks/useEventLogger';

const { logUserAction, logError } = useEventLogger();

// רישום פעולת משתמש
await logUserAction('VIEW', 'CONTRACTOR', contractorId, { page: 'details' });

// רישום שגיאה
await logError(error, 'ContractorForm');
```

### 3. Middleware אוטומטי

התשתית כוללת middleware שמתחבר אוטומטית ומתעד:

- כל בקשות API
- אירועי אימות (כניסה/יציאה)
- פעילות חשודה
- שגיאות מערכת

## ממשק המשתמש

### 1. EventLogManager
קומפוננטה ראשית לניהול אירועים עם 3 טאבים:
- **לוח בקרה** - תצוגה כללית של אירועים
- **סטטיסטיקות** - גרפים וניתוחים
- **פעילות משתמשים** - מעקב אחר משתמש ספציפי

### 2. EventLogDashboard
לוח בקרה עם:
- סינון מתקדם
- חיפוש
- ייצוא ל-CSV
- תצוגת אירועים עם פרטים

### 3. EventStats
סטטיסטיקות עם:
- גרפי עמודות
- גרפי עוגה
- כרטיסי סיכום
- אירועים אחרונים

### 4. UserActivityLog
מעקב פעילות משתמש עם:
- סיכום פעולות
- תאריכי פעילות אחרונה
- סטטיסטיקות אישיות

## הגדרה והתקנה

### 1. הפעלת השרת

התשתית מופעלת אוטומטית עם השרת. ה-middleware מתחבר לכל הנתיבים ומתעד אירועים.

### 2. בדיקת התשתית

```bash
node scripts/test-event-logging.js
```

### 3. גישה לממשק

הוסף לנתיבי האפליקציה:
```javascript
import EventLogPage from './pages/EventLogPage';

// הוסף לנתיבים
<Route path="/events" element={<EventLogPage />} />
```

## סוגי אירועים נתמכים

### אירועי אימות
- `LOGIN` - כניסה מוצלחת
- `LOGOUT` - יציאה
- `LOGIN_FAILED` - כניסה נכשלה
- `PASSWORD_CHANGE` - שינוי סיסמה

### אירועי CRUD
- `CREATE` - יצירת רשומה
- `UPDATE` - עדכון רשומה
- `DELETE` - מחיקת רשומה
- `VIEW` - צפייה ברשומה

### אירועי מערכת
- `SEARCH` - חיפוש
- `EXPORT` - ייצוא
- `IMPORT` - ייבוא
- `DOWNLOAD` - הורדה
- `UPLOAD` - העלאה

### אירועי אבטחה
- `SECURITY_ALERT` - התראת אבטחה
- `PERMISSION_DENIED` - דחיית הרשאה
- `SYSTEM_ERROR` - שגיאת מערכת

## רמות חומרה

- **LOW** - פעילות רגילה
- **MEDIUM** - פעילות חשודה
- **HIGH** - פעילות מסוכנת
- **CRITICAL** - איום אבטחה

## אינדקסים למסד הנתונים

התשתית כוללת אינדקסים מותאמים לביצועים:

```javascript
// אינדקסים עיקריים
{ eventType: 1, timestamp: -1 }
{ resourceType: 1, resourceId: 1, timestamp: -1 }
{ userId: 1, timestamp: -1 }
{ sessionId: 1, timestamp: -1 }
{ ipAddress: 1, timestamp: -1 }
{ status: 1, timestamp: -1 }
{ severity: 1, timestamp: -1 }

// אינדקס טקסט לחיפוש
{ description: 'text', details: 'text' }
```

## תחזוקה

### 1. ארכוב אירועים ישנים

```javascript
// ארכוב אירועים בני יותר משנה
await EventService.archiveOldEvents(365);
```

### 2. ניקוי אירועים

```javascript
// מחיקת אירועים מארכובים
await Event.deleteMany({ isArchived: true, archivedAt: { $lt: cutoffDate } });
```

### 3. גיבוי

האירועים נשמרים ב-MongoDB Atlas עם גיבוי אוטומטי.

## אבטחה ופרטיות

- **הצפנת נתונים רגישים** - סיסמאות וטוקנים מוסרים
- **הגבלת גישה** - רק אדמינים יכולים לראות אירועים
- **שמירת IP** - למטרות אבטחה
- **סשן טרקינג** - מעקב אחר פעילות משתמש

## עתיד

התשתית מוכנה לתכונות עתידיות:

1. **Undo/Redo** - שחזור פעולות
2. **Real-time Alerts** - התראות בזמן אמת
3. **Machine Learning** - זיהוי אנומליות
4. **Compliance** - דוחות רגולציה
5. **Integration** - חיבור למערכות חיצוניות

## תמיכה

לשאלות או בעיות, פנה לצוות הפיתוח או בדוק את הלוגים ב-`/api/events`.