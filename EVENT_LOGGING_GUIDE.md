# Event Logging Infrastructure Guide

## סקירה כללית

תשתית Event Logging מספקת מעקב מקיף אחר כל הפעולות במערכת, כולל:
- רישום אוטומטי של פעולות CRUD
- מעקב אחר פעולות אימות
- שמירת נתונים לפני ואחרי שינויים
- תמיכה בaudit trail מלא
- הכנה לפיצ'ר undo עתידי

## מבנה התשתית

### 1. מודל Event (`/server/models/Event.js`)

המודל מכיל את כל השדות הנדרשים לרישום אירועים:

```javascript
{
  userId: ObjectId,           // מי ביצע את הפעולה
  userEmail: String,          // אימייל המשתמש
  userName: String,           // שם המשתמש
  action: String,             // מה נעשה (CREATE, UPDATE, DELETE, etc.)
  entityType: String,         // על איזה ישות (CONTRACTOR, USER, etc.)
  entityId: ObjectId,         // מזהה הישות
  entityName: String,         // שם הישות
  timestamp: Date,            // מתי בוצעה הפעולה
  beforeData: Mixed,          // נתונים לפני השינוי
  afterData: Mixed,           // נתונים אחרי השינוי
  metadata: Mixed,            // נתונים נוספים
  ipAddress: String,          // כתובת IP
  userAgent: String,          // User Agent
  success: Boolean,           // האם הפעולה הצליחה
  errorMessage: String,       // הודעת שגיאה אם נכשלה
  sessionId: String,          // מזהה סשן
  requestId: String,          // מזהה בקשה
  severity: String,           // רמת חשיבות
  description: String         // תיאור הפעולה
}
```

### 2. EventService (`/server/services/EventService.js`)

שירות לניהול אירועים:

```javascript
// רישום פעולת CRUD
await EventService.logCrudAction({
  userId, userEmail, userName,
  action: 'CREATE',
  entityType: 'CONTRACTOR',
  entityId: contractorId,
  entityName: contractorName,
  beforeData: null,
  afterData: contractorData,
  metadata: { city: 'תל אביב' }
});

// רישום פעולת אימות
await EventService.logAuthAction({
  userId, userEmail, userName,
  action: 'LOGIN',
  success: true,
  ipAddress: '192.168.1.1'
});

// רישום פעולת מערכת
await EventService.logSystemAction({
  userId, userEmail, userName,
  action: 'UPLOAD',
  entityType: 'FILE',
  entityId: fileId,
  entityName: fileName
});
```

### 3. EventLogger Middleware (`/server/middleware/eventLogger.js`)

Middleware לאוטומציה של רישום אירועים:

```javascript
// Middleware לפעולות CRUD
EventLogger.crudLogger({
  entityType: 'CONTRACTOR',
  getEntityId: (req) => req.params.id,
  getEntityName: async (req, res) => res.locals.contractor?.name,
  getBeforeData: async (req) => { /* לוגיקה לקבלת נתונים לפני */ },
  getAfterData: async (req, res) => { /* לוגיקה לקבלת נתונים אחרי */ }
})

// Middleware לפעולות אימות
EventLogger.authLogger()

// Middleware לפעולות מערכת
EventLogger.systemLogger({
  entityType: 'FILE',
  getAction: (req) => 'UPLOAD'
})
```

### 4. API Routes

#### Events API (`/api/events`)

- `GET /api/events` - קבלת רשימת אירועים (admin only)
- `GET /api/events/stats` - סטטיסטיקות אירועים
- `GET /api/events/user/:userId` - אירועים של משתמש
- `GET /api/events/entity/:entityType/:entityId` - אירועים של ישות
- `GET /api/events/audit/:entityType/:entityId` - audit trail
- `POST /api/events/cleanup` - ניקוי אירועים ישנים
- `GET /api/events/export` - ייצוא אירועים

#### Audit API (`/api/audit`)

- `GET /api/audit/trail/:entityType/:entityId` - audit trail מלא
- `GET /api/audit/field-history/:entityType/:entityId/:fieldName` - היסטוריית שדה
- `GET /api/audit/stats` - סטטיסטיקות audit
- `GET /api/audit/undoable/:entityType/:entityId` - פעולות שניתן לבטל
- `POST /api/audit/undo/:eventId` - יצירת undo event
- `GET /api/audit/can-undo/:eventId` - בדיקת יכולת undo
- `GET /api/audit/report` - דוח audit
- `GET /api/audit/export` - ייצוא נתוני audit

### 5. AuditService (`/server/services/AuditService.js`)

שירות מתקדם לaudit:

```javascript
// קבלת audit trail
const trail = await AuditService.getAuditTrail('CONTRACTOR', contractorId);

// היסטוריית שדה ספציפי
const history = await AuditService.getFieldHistory('CONTRACTOR', contractorId, 'name');

// בדיקת יכולת undo
const canUndo = await AuditService.canUndo(eventId);

// יצירת undo event
const undoEvent = await AuditService.createUndoEvent(eventId, userId, userEmail, userName);

// דוח audit
const report = await AuditService.generateAuditReport({
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  entityType: 'CONTRACTOR'
});
```

## שימוש במערכת

### 1. רישום אוטומטי

התשתית מופעלת אוטומטית על כל הנתיבים הבאים:
- `/api/auth/*` - פעולות אימות
- `/api/users/*` - ניהול משתמשים
- `/api/contractors/*` - ניהול קבלנים
- `/api/upload/*` - העלאת קבצים
- `/api/safety-reports/*` - דוחות בטיחות
- `/api/gis/*` - נתוני GIS

### 2. רישום ידני

```javascript
const EventService = require('./services/EventService');

// רישום אירוע מותאם אישית
await EventService.logSystemAction({
  userId: user._id,
  userEmail: user.email,
  userName: user.name,
  action: 'CUSTOM_ACTION',
  entityType: 'CUSTOM_ENTITY',
  entityId: entityId,
  entityName: 'Custom Entity',
  metadata: { customField: 'value' },
  description: 'פעולה מותאמת אישית'
});
```

### 3. שאילתות אירועים

```javascript
// קבלת אירועים של משתמש
const userEvents = await EventService.getEventsByUser(userId, {
  limit: 50,
  action: 'UPDATE',
  startDate: '2024-01-01'
});

// חיפוש אירועים
const searchResults = await EventService.searchEvents({
  entityType: 'CONTRACTOR',
  action: 'DELETE',
  startDate: '2024-01-01',
  endDate: '2024-12-31'
});

// סטטיסטיקות
const stats = await EventService.getEventStats({
  startDate: '2024-01-01',
  entityType: 'CONTRACTOR'
});
```

## אינדקסים

המודל כולל אינדקסים מותאמים לביצועים:

```javascript
// אינדקסים בסיסיים
{ userId: 1, timestamp: -1 }
{ action: 1, timestamp: -1 }
{ entityType: 1, entityId: 1, timestamp: -1 }
{ timestamp: -1 }
{ userEmail: 1, timestamp: -1 }
{ sessionId: 1, timestamp: -1 }
{ success: 1, timestamp: -1 }
{ severity: 1, timestamp: -1 }

// אינדקסים מורכבים
{ entityType: 1, action: 1, timestamp: -1 }
{ userId: 1, action: 1, timestamp: -1 }
```

## ניקוי נתונים

```javascript
// ניקוי אירועים ישנים (מעל שנה)
const deletedCount = await EventService.cleanupOldEvents(365);

// ניקוי דרך API
POST /api/events/cleanup
{
  "daysOld": 365
}
```

## דוגמאות שימוש

### 1. מעקב אחר שינויים בקבלן

```javascript
// קבלת כל השינויים בקבלן
const contractorTrail = await AuditService.getAuditTrail('CONTRACTOR', contractorId);

// היסטוריית שינוי שם החברה
const nameHistory = await AuditService.getFieldHistory('CONTRACTOR', contractorId, 'name');
```

### 2. דוח פעילות משתמש

```javascript
// אירועים של משתמש ספציפי
const userEvents = await EventService.getEventsByUser(userId, {
  limit: 100,
  startDate: '2024-01-01'
});

// סטטיסטיקות משתמש
const userStats = await EventService.getEventStats({
  userId: userId,
  startDate: '2024-01-01'
});
```

### 3. דוח מערכת

```javascript
// דוח audit מלא
const report = await AuditService.generateAuditReport({
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  format: 'json'
});

// ייצוא ל-CSV
const csvReport = await AuditService.generateAuditReport({
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  format: 'csv'
});
```

## ביטחון

- כל הנתיבים מוגנים בהרשאות מתאימות
- רק מנהלים יכולים לצפות בנתוני audit
- משתמשים יכולים לראות רק את האירועים שלהם
- כל הנתונים מוצפנים בהתאם להגדרות MongoDB

## ביצועים

- אינדקסים מותאמים לשאילתות נפוצות
- ניקוי אוטומטי של נתונים ישנים
- הגבלת כמות נתונים בחזרה
- שימוש בaggregation pipelines לסטטיסטיקות

## עתיד

התשתית מוכנה לפיצ'רים עתידיים:
- **Undo/Redo** - ביטול פעולות
- **Real-time notifications** - התראות בזמן אמת
- **Advanced analytics** - ניתוח מתקדם
- **Compliance reporting** - דוחות תאימות
- **Data retention policies** - מדיניות שמירת נתונים