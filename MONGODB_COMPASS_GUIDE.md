# MongoDB Compass Connection Guide

## 🔗 חיבור ל-MongoDB Compass

### 📋 פרטי החיבור:
- **URI:** `mongodb://localhost:27017`
- **Database:** `contractor-crm`
- **Collection:** `contractors`

### 🚀 הוראות חיבור:

1. **פתח MongoDB Compass**
2. **הכנס את ה-URI:** `mongodb://localhost:27017`
3. **לחץ על "Connect"**
4. **בחר את הדאטאבייס:** `contractor-crm`
5. **פתח את הקולקציה:** `contractors`

### 📊 נתונים זמינים:

#### קבלנים בקולקציה:
1. **אלקטרה בניה בע״מ** (510617194) - רמת גן
2. **קבלן פרשקובסקי בע״מ** (20077) - תל אביב
3. **קבלן כהן ובניו** (20535) - ירושלים
4. **קבלן גולדברג** (13995) - באר שבע
5. **קבלן שפירא ובניו** (24984) - אשדוד

### 🔍 חיפוש נתונים:

#### חיפוש לפי שם:
```javascript
{ "name": "אלקטרה בניה בע״מ" }
```

#### חיפוש לפי עיר:
```javascript
{ "city": "תל אביב" }
```

#### חיפוש לפי ח"פ:
```javascript
{ "company_id": "510617194" }
```

#### חיפוש לפי דירוג בטיחות:
```javascript
{ "safetyRating": { $gte: 4 } }
```

### 📁 מבנה המסמך:

כל מסמך מכיל את השדות הבאים:
- `contractor_id` - מזהה קבלן
- `company_id` - ח"פ
- `name` - שם החברה
- `nameEnglish` - שם באנגלית
- `companyType` - סוג חברה
- `numberOfEmployees` - מספר עובדים
- `foundationDate` - תאריך הקמה
- `city` - עיר
- `address` - כתובת
- `email` - אימייל
- `phone` - טלפון
- `website` - אתר אינטרנט
- `sector` - סקטור
- `segment` - תחום פעילות
- `activityType` - סוג פעילות
- `description` - תיאור
- `activities` - פעילויות (array)
- `management_contacts` - אנשי קשר (array)
- `projects` - פרויקטים (array)
- `notes` - הערות
- `safetyRating` - דירוג בטיחות
- `isActive` - פעיל/לא פעיל
- `createdAt` - תאריך יצירה
- `updatedAt` - תאריך עדכון

### 🛠️ אינדקסים זמינים:
- `company_id` (unique)
- `contractor_id`
- `name`
- `city`
- `sector`

### 📝 הערות:
- הנתונים נשמרים ב-MongoDB קבוע
- הקולקציה מתעדכנת אוטומטית עם כל שינוי
- ניתן לראות את הנתונים בזמן אמת ב-Compass

