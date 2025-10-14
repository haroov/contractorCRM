# Event-Driven Audit Logging System

## תיאור כללי

מערכת תיעוד ומעקב אחר כל הפעולות במערכת בצורה אוטומטית ומקיפה. המערכת מתעדת כל פעולה - מי ביצע, מתי, מאיזה מכשיר, מה שונה, ועוד.

## ארכיטקטורה

### 1. Event-Driven Architecture
המערכת בנויה על בסיס EventEmitter של Node.js, מה שמאפשר:
- הפרדה בין הלוגיקה העסקית לבין תיעוד האירועים
- ביצועים מהירים - התיעוד לא חוסם את הפעולה העיקרית
- גמישות בהוספת סוגי אירועים חדשים

### 2. רכיבים עיקריים

#### AuditLog Model (`/server/models/AuditLog.js`)
- סכמת MongoDB מקיפה לשמירת כל המידע
- אינדקסים מותאמים לחיפושים מהירים
- שיטות סטטיות לשליפת מידע וניתוח

#### AuditService (`/server/services/auditService.js`)
- מנהל את כל האירועים במערכת
- מנתח מידע על המכשיר והמשתמש
- מחשב severity levels אוטומטית

#### Audit Middleware (`/server/middleware/audit.js`)
- מתעד כל בקשת HTTP
- מזהה סוג פעולה אוטומטית
- תומך בהגדרות גמישות

#### Audit Helper (`/server/lib/auditHelper.js`)
- פונקציות עזר לתיעוד פעולות ספציפיות
- אינטגרציה קלה עם קוד קיים

## סוגי אירועים

### Authentication Events
- `AUTH_LOGIN` - כניסה למערכת
- `AUTH_LOGOUT` - יציאה מהמערכת
- `AUTH_LOGIN_FAILED` - ניסיון כניסה כושל
- `AUTH_OTP_REQUEST` - בקשת קוד OTP
- `AUTH_OTP_VERIFY` - אימות קוד OTP

### Data Operations
- `DATA_VIEW` - צפייה במידע
- `DATA_CREATE` - יצירת רשומה
- `DATA_UPDATE` - עדכון רשומה
- `DATA_DELETE` - מחיקת רשומה

### Business Operations
- `PROJECT_CREATE/UPDATE/DELETE/VIEW` - פעולות על פרויקטים
- `CONTRACTOR_CREATE/UPDATE/DELETE/VIEW` - פעולות על קבלנים
- `FILE_UPLOAD/DOWNLOAD/DELETE` - פעולות על קבצים

### System Events
- `SYSTEM_ERROR` - שגיאת מערכת
- `PERMISSION_DENIED` - ניסיון גישה ללא הרשאה
- `API_CALL` - קריאה ל-API

## מידע שנשמר

### User Information
- מזהה משתמש
- אימייל
- שם
- תפקיד
- Session ID

### Device Information
- User Agent
- כתובת IP
- דפדפן
- מערכת הפעלה
- סוג מכשיר
- שפה
- אזור זמן

### Request Details
- Method (GET, POST, etc.)
- Path
- Query parameters
- Headers (מצונזרים)
- Status code
- Response time

### Data Changes
- Collection name
- Document ID
- שדות ששונו
- ערכים ישנים וחדשים

## API Endpoints

### Get Audit Logs
```
GET /api/audit/logs
```
פרמטרים:
- `page` - מספר עמוד
- `limit` - מספר רשומות לעמוד
- `startDate` - תאריך התחלה
- `endDate` - תאריך סיום
- `eventType` - סוג אירוע
- `userId` - מזהה משתמש
- `status` - סטטוס (SUCCESS/FAILURE)
- `severity` - חומרה (LOW/MEDIUM/HIGH/CRITICAL)

### Get User Activity
```
GET /api/audit/user/:userId/activity
```
מחזיר היסטוריית פעילות של משתמש

### Get Resource History
```
GET /api/audit/resource/:resourceType/:resourceId/history
```
מחזיר היסטוריית שינויים של משאב ספציפי

### Get Analytics
```
GET /api/audit/analytics
```
מחזיר סטטיסטיקות וניתוח אירועים

### Get Recent Events
```
GET /api/audit/recent-events
```
מחזיר אירועים חשובים אחרונים (HIGH/CRITICAL severity)

### Export Audit Logs
```
GET /api/audit/export
```
ייצוא לוגים בפורמט CSV

## שימוש בקוד

### תיעוד אוטומטי
המערכת מתעדת אוטומטית:
- כל בקשת HTTP
- התחברויות והתנתקויות
- פעולות CRUD
- העלאת והורדת קבצים

### תיעוד ידני
```javascript
// תיעוד פעולה מותאמת אישית
auditService.emit('project:action', {
  action: 'create',
  projectId: '123',
  projectName: 'New Project',
  userId: req.user._id,
  userEmail: req.user.email,
  deviceInfo: auditService.parseDeviceInfo(req)
});
```

### שימוש ב-Helper Functions
```javascript
// תיעוד פעולת התחברות
await logAuthEvent('login', req, user, true);

// תיעוד פעולה על פרויקט
await logProjectOperation('update', req, projectData, oldData);
```

## אבטחה

### צינזור מידע רגיש
- סיסמאות מצונזרות אוטומטית
- Headers רגישים (authorization, cookies) מוחלפים ב-[REDACTED]
- מידע רגיש לא נשמר בלוגים

### הרשאות
- רק מנהלים יכולים לצפות בלוגים מלאים
- משתמשים רגילים יכולים לראות רק את הפעילות שלהם
- API endpoints מוגנים באמצעות middleware

## אינדקסים ב-MongoDB

המערכת יוצרת אינדקסים אוטומטית עבור:
- `timestamp` - לחיפושים לפי זמן
- `userId` - לחיפוש פעילות משתמש
- `eventType` - לסינון לפי סוג אירוע
- `resourceType` + `resourceId` - לחיפוש היסטוריית משאב
- Text index על `action` ו-`description` - לחיפוש טקסט חופשי

## תחזוקה

### ניקוי אוטומטי
ניתן להגדיר TTL (Time To Live) לרשומות:
```javascript
// דוגמה: מחיקת לוגים אחרי 90 יום
expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
```

### גיבוי
מומלץ לגבות את collection `audit_logs` בצורה תקופתית

## עתיד - פיצ'רים מתוכננים

### Undo Operations
- שמירת מידע מלא לפני שינויים
- אפשרות לבטל פעולות

### History View
- תצוגת timeline של שינויים
- השוואה בין גרסאות

### Advanced Analytics
- דוחות מפורטים
- התראות על פעילות חשודה
- Machine learning לזיהוי אנומליות

## בדיקה

להרצת בדיקות המערכת:
```bash
node scripts/test-audit-system.js
```

## הגדרות נדרשות

### Environment Variables
```env
MONGODB_URI=mongodb+srv://your-atlas-url
```

### MongoDB Atlas
- יש להגדיר את ה-connection string ב-.env
- המערכת תיצור אוטומטית את ה-collection והאינדקסים

## תמיכה

במקרה של בעיות:
1. בדוק את הלוגים של השרת
2. וודא שה-MongoDB Atlas מחובר
3. בדוק שהאינדקסים נוצרו בהצלחה
4. השתמש בסקריפט הבדיקה לאיתור בעיות

## סיכום

המערכת מספקת תיעוד מלא ואוטומטי של כל הפעילות במערכת, עם יכולות חיפוש וניתוח מתקדמות. התיעוד נעשה בצורה אסינכרונית ולא משפיע על ביצועי המערכת.

