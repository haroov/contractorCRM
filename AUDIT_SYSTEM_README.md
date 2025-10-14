# מערכת תיעוד פעילות (Audit System)

## סקירה כללית

מערכת תיעוד פעילות מתקדמת המבוססת על ארכיטקטורת Event-Driven לתיעוד כל הפעולות במערכת. המערכת מתעדת מי נכנס, מתי, מאיזה מכשיר, מה ראה ושינה, ומאפשרת מעקב מלא אחר פעילות המשתמשים.

## תכונות עיקריות

### 🔍 תיעוד מקיף
- **פעולות משתמשים**: התחברות, התנתקות, יצירה, עדכון, מחיקה, צפייה
- **מידע על המכשיר**: כתובת IP, דפדפן, מערכת הפעלה, סוג מכשיר
- **מעקב שינויים**: תיעוד מפורט של כל שינוי בנתונים (before/after)
- **הקשר מלא**: מידע על המשאב המושפע, סוג הפעולה, זמן ביצוע

### 📊 ניתוח ודוחות
- **דשבורד אינטראקטיבי**: צפייה בזמן אמת באירועים ופעילות
- **סטטיסטיקות מתקדמות**: ניתוח פעילות לפי משתמש, קטגוריה, זמן
- **ייצוא נתונים**: CSV, JSON לצורך ניתוח חיצוני
- **חיפוש וסינון**: חיפוש מתקדם בכל שדות האירועים

### 🔒 אבטחה ומעקב
- **זיהוי פעילות חשודה**: מעקב אחר ניסיונות גישה לא מורשית
- **מעקב כישלונות**: תיעוד כישלונות התחברות ושגיאות מערכת
- **רמות חומרה**: סיווג אירועים לפי רמת חשיבות
- **TTL אוטומטי**: ניקוי אוטומטי של אירועים ישנים

## ארכיטקטורה

### מבנה המערכת

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React)       │    │   (Express)     │    │   (MongoDB)     │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ Audit       │ │◄──►│ │ Audit       │ │◄──►│ │ audit_events│ │
│ │ Dashboard   │ │    │ │ Routes      │ │    │ │ Collection  │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │                 │    │                 │
│                 │    │ ┌─────────────┐ │    │                 │
│                 │    │ │ Audit       │ │    │                 │
│                 │    │ │ Service     │ │    │                 │
│                 │    │ │ (EventEmit) │ │    │                 │
│                 │    │ └─────────────┘ │    │                 │
│                 │    │                 │    │                 │
│                 │    │ ┌─────────────┐ │    │                 │
│                 │    │ │ Audit       │ │    │                 │
│                 │    │ │ Middleware  │ │    │                 │
│                 │    │ └─────────────┘ │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### רכיבי המערכת

#### 1. מודל הנתונים (`AuditEvent.js`)
```javascript
{
  eventType: String,           // סוג האירוע
  eventCategory: String,       // קטגוריית האירוע
  userId: ObjectId,           // מזהה המשתמש
  userEmail: String,          // אימייל המשתמש
  resourceType: String,       // סוג המשאב
  resourceId: String,         // מזהה המשאב
  action: String,             // סוג הפעולה
  description: String,        // תיאור האירוע
  changes: Array,             // שינויים שבוצעו
  deviceInfo: Object,         // מידע על המכשיר
  success: Boolean,           // האם הפעולה הצליחה
  severity: String,           // רמת חומרה
  timestamp: Date             // זמן האירוע
}
```

#### 2. שירות האירועים (`auditService.js`)
- **EventEmitter**: מנגנון אירועים אסינכרוני
- **Event Handlers**: מטפלים ספציפיים לכל סוג אירוע
- **Device Detection**: זיהוי אוטומטי של מידע המכשיר
- **Change Tracking**: מעקב אחר שינויים בנתונים

#### 3. Middleware (`auditMiddleware.js`)
- **Request Logging**: תיעוד כל בקשות HTTP
- **Authentication Events**: תיעוד התחברות והתנתקות
- **Error Tracking**: תיעוד שגיאות מערכת
- **Suspicious Activity**: זיהוי פעילות חשודה

#### 4. API Routes (`audit.js`)
- `GET /api/audit/events` - קבלת רשימת אירועים
- `GET /api/audit/statistics` - סטטיסטיקות מערכת
- `GET /api/audit/export` - ייצוא נתונים
- `GET /api/audit/security/events` - אירועי אבטחה

#### 5. Frontend Dashboard (`AuditDashboard.tsx`)
- **רשימת אירועים**: תצוגה מסוננת של כל האירועים
- **סטטיסטיקות**: גרפים וניתוחים חזותיים
- **חיפוש וסינון**: כלי חיפוש מתקדמים
- **ייצוא**: הורדת נתונים בפורמטים שונים

## התקנה והגדרה

### 1. התקנת התלויות
```bash
# התקנת חבילה נוספת לזיהוי User Agent
npm install ua-parser-js
```

### 2. יצירת אינדקסים במונגו
```bash
# הרצת סקריפט יצירת אינדקסים
node scripts/create-audit-indexes.js
```

### 3. שילוב במערכת הקיימת
הקבצים הבאים כבר שולבו במערכת:
- `server/models/AuditEvent.js` - מודל הנתונים
- `server/services/auditService.js` - שירות האירועים
- `server/middleware/auditMiddleware.js` - Middleware
- `server/routes/audit.js` - API Routes
- `src/components/AuditDashboard.tsx` - Frontend Dashboard

### 4. הפעלת המערכת
```bash
# הפעלת השרת
npm run server

# הפעלת הפרונטאנד
npm run dev
```

## שימוש במערכת

### גישה לדשבורד
1. התחבר כמשתמש admin
2. לחץ על התפריט העליון
3. בחר "מערכת ניטור פעילות"
4. או גש ישירות ל: `http://localhost:5173/audit`

### סינון ובחיפוש
- **לפי קטגוריה**: authentication, contractor, project, etc.
- **לפי רמת חומרה**: low, medium, high, critical
- **לפי סטטוס**: הצלחה/כישלון
- **לפי תאריך**: טווח תאריכים מותאם אישית
- **חיפוש חופשי**: בתיאור, משתמש, משאב

### ייצוא נתונים
- **CSV**: לניתוח ב-Excel
- **JSON**: לעיבוד אוטומטי
- **סינון לפני ייצוא**: ייצוא נתונים מסוננים בלבד

## API למפתחים

### קבלת אירועים
```javascript
// קבלת כל האירועים
GET /api/audit/events

// עם סינון
GET /api/audit/events?eventCategory=contractor&severity=high&startDate=2024-01-01

// פרמטרים זמינים:
// - page, limit (pagination)
// - eventType, eventCategory
// - userId, userEmail
// - resourceType, resourceId
// - success, severity
// - startDate, endDate
// - search (חיפוש חופשי)
```

### סטטיסטיקות
```javascript
// סטטיסטיקות כלליות
GET /api/audit/statistics

// עם טווח זמן
GET /api/audit/statistics?period=7d&startDate=2024-01-01&endDate=2024-01-31
```

### פעילות משתמש
```javascript
// פעילות של משתמש ספציפי
GET /api/audit/user/:userId/activity

// היסטוריית משאב
GET /api/audit/resource/:resourceType/:resourceId/history
```

### ייצוא נתונים
```javascript
// ייצוא CSV
GET /api/audit/export?format=csv&eventCategory=contractor

// ייצוא JSON
GET /api/audit/export?format=json&startDate=2024-01-01
```

## שילוב במערכת קיימת

### הוספת תיעוד לפעולות חדשות
```javascript
const auditService = require('./services/auditService');

// בתוך route handler
app.post('/api/my-resource', async (req, res) => {
  try {
    // יצירת המשאב
    const newResource = await createResource(req.body);
    
    // תיעוד האירוע
    auditService.logResourceCreated(req.user, {
      resourceType: 'my_resource',
      resourceId: newResource._id,
      resourceName: newResource.name
    }, req);
    
    res.json(newResource);
  } catch (error) {
    // תיעוד שגיאה
    auditService.logSystemError(error, req, req.user);
    res.status(500).json({ error: 'Failed to create resource' });
  }
});
```

### שימוש ב-Middleware
```javascript
const { auditResourceAccessMiddleware } = require('./middleware/auditMiddleware');

// הוספת middleware לתיעוד גישה למשאבים
app.get('/api/my-resources/:id', 
  auditResourceAccessMiddleware('my_resource'),
  async (req, res) => {
    // הקוד הרגיל שלך
  }
);
```

## בדיקת המערכת

### הרצת בדיקות
```bash
# בדיקה כללית של המערכת
node scripts/test-audit-system.js

# יצירת נתונים לדוגמה
node scripts/test-audit-system.js --sample-data
```

### מה נבדק?
- ✅ חיבור למונגו DB
- ✅ קיום אוסף audit_events
- ✅ אינדקסים ותפקודם
- ✅ טעינת מודלים ושירותים
- ✅ ביצועי שאילתות
- ✅ יצירה ואחזור של אירועים

## אבטחה ופרטיות

### הגנת מידע רגיש
- **סיסמאות**: לא נשמרות בלוגים
- **מידע אישי**: הצפנה ואנונימיזציה
- **גישה מוגבלת**: רק למשתמשי admin
- **TTL**: מחיקה אוטומטית אחרי שנתיים

### זיהוי פעילות חשודה
- **ניסיונות התחברות כושלים**: מעקב ואזהרות
- **פעילות יתר**: זיהוי בקשות מוגזמות
- **גישה לא מורשית**: תיעוד ניסיונות גישה אסורים
- **שינויים חשודים**: מעקב אחר שינויים בלתי רגילים

## ביצועים ואופטימיזציה

### אינדקסים
המערכת יוצרת אינדקסים מותאמים לשאילתות נפוצות:
- `timestamp_desc`: אירועים לפי זמן (הכי חדשים ראשון)
- `eventType_timestamp`: לפי סוג אירוע וזמן
- `userId_timestamp`: פעילות משתמש
- `resource_timestamp`: היסטוריית משאב
- `text_search`: חיפוש טקסט מלא

### ניהול נפח
- **TTL Index**: מחיקה אוטומטית אחרי שנתיים
- **Pagination**: טעינת נתונים בחלקים
- **Lazy Loading**: טעינה לפי דרישה
- **Compression**: דחיסת נתונים ישנים

## תחזוקה ומעקב

### ניקוי נתונים
```javascript
// מחיקת אירועים ישנים מ-X ימים
DELETE /api/audit/events/cleanup
{
  "olderThanDays": 365
}
```

### מעקב ביצועים
- **זמני תגובה**: מעקב אחר ביצועי API
- **נפח נתונים**: ניטור גודל האוסף
- **שימוש באינדקסים**: בדיקת יעילות השאילתות

### גיבוי ושחזור
```bash
# גיבוי אוסף audit_events
mongodump --db contractor-crm --collection audit_events

# שחזור
mongorestore --db contractor-crm --collection audit_events dump/contractor-crm/audit_events.bson
```

## פיתוח עתידי

### תכונות מתוכננות
- 🔄 **Undo/Redo**: ביטול ושחזור פעולות
- 📈 **Advanced Analytics**: ניתוחים מתקדמים יותר
- 🔔 **Real-time Alerts**: התראות בזמן אמת
- 📱 **Mobile Dashboard**: דשבורד נייד
- 🤖 **AI Anomaly Detection**: זיהוי אנומליות באמצעות AI

### הרחבות אפשריות
- **Elasticsearch Integration**: חיפוש מתקדם יותר
- **Grafana Dashboards**: ויזואליזציה מתקדמת
- **Slack/Teams Notifications**: התראות לצוותים
- **GDPR Compliance**: תמיכה מלאה ב-GDPR

## תמיכה ופתרון בעיות

### בעיות נפוצות

#### המערכת לא מתעדת אירועים
1. בדוק שהשרת רץ עם הקוד החדש
2. ודא שהמשתמש מחובר (req.user קיים)
3. בדוק לוגים לשגיאות במונגו
4. הרץ `node scripts/test-audit-system.js`

#### הדשבורד לא נטען
1. ודא שהמשתמש הוא admin
2. בדוק שה-route `/audit` מוגדר נכון
3. בדוק את קונסולת הדפדפן לשגיאות
4. ודא שה-API endpoints זמינים

#### ביצועים איטיים
1. בדוק שהאינדקסים נוצרו: `node scripts/create-audit-indexes.js`
2. הגבל את טווח התאריכים בשאילתות
3. השתמש ב-pagination
4. שקול ניקוי נתונים ישנים

### קבלת עזרה
- בדוק את הלוגים ב-`console.log`
- הרץ את סקריפט הבדיקה
- פתח issue ב-GitHub עם פרטי השגיאה

---

**מערכת תיעוד הפעילות מוכנה לשימוש!** 🎉

המערכת מספקת תיעוד מקיף ואמין של כל הפעילות במערכת, עם דשבורד אינטואיטיבי וכלי ניתוח מתקדמים. המערכת בנויה לביצועים גבוהים ומותאמת לצרכי אבטחה ופרטיות.