# 🗺️ מדריך אינטגרציית GIS - חישוב PNG25 ו-Cresta

## 📋 **תיאור כללי**

המערכת כוללת כעת אינטגרציה מלאה עם נתוני GIS לחישוב אוטומטי של:
- **PNG25** - ציון רעידות אדמה (מקור: Seismic Hazard Zone)
- **Cresta** - אזור Cresta (מקור: Cresta Zones)

## 🔧 **רכיבי המערכת**

### 1. **שירות GIS בצד השרת** (`server/services/gisService.js`)
- חיבור ל-MongoDB עם גישה לדאטאבייס GIS
- אלגוריתם Point-in-Polygon לחישוב מיקום
- חיפוש ערכי PNG25 ו-Cresta על בסיס קואורדינטות

### 2. **API Endpoints** (`server/routes/gis.js`)
- `POST /api/gis/calculate` - חישוב ערכי GIS
- `POST /api/gis/update-project/:projectId` - עדכון פרויקט עם ערכי GIS
- `GET /api/gis/png25?x=33.04187&y=35.102275` - קבלת ערך PNG25
- `GET /api/gis/cresta?x=33.04187&y=35.102275` - קבלת אזור Cresta
- `GET /api/gis/health` - בדיקת תקינות השירות

### 3. **שירות GIS בצד הלקוח** (`src/services/gisService.ts`)
- ממשק TypeScript לשירותי GIS
- פונקציות לחישוב אוטומטי וידני
- טיפול בשגיאות והתראות

## 🚀 **איך זה עובד**

### **חישוב אוטומטי**
כאשר המשתמש מזין קואורדינטות X ו-Y בשדות "נ״צ X" ו"נ״צ Y", המערכת:
1. מזהה שינוי בקואורדינטות
2. קוראת לשירות GIS
3. מחשבת ערכי PNG25 ו-Cresta
4. מעדכנת אוטומטית את השדות המתאימים

### **חישוב ידני**
כפתור "חשב ערכי GIS" מאפשר:
1. חישוב ידני של ערכי GIS
2. עדכון השדות גם אם החישוב האוטומטי לא עבד
3. הודעות ברורות על הצלחה או כישלון

## 📊 **מבנה הנתונים**

### **קולקשן Seismic Hazard Zone**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "Hazard": 0.275  // ערך PNG25
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[x1, y1], [x2, y2], ...]]
      }
    }
  ]
}
```

### **קולקשן Cresta Zones**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "Name": "Zone Name"  // שם אזור Cresta
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[x1, y1], [x2, y2], ...]]
      }
    }
  ]
}
```

## 🔍 **אלגוריתם Point-in-Polygon**

המערכת משתמשת באלגוריתם Ray Casting:
1. שולחת קרן מהנקודה לכיוון אחד
2. סופרת כמה פעמים הקרן חוצה את גבולות הפוליגון
3. אם המספר אי-זוגי - הנקודה בתוך הפוליגון
4. אם המספר זוגי - הנקודה מחוץ לפוליגון

## 📝 **דוגמאות שימוש**

### **חישוב ערכי GIS**
```javascript
// בצד הלקוח
const gisValues = await gisService.calculateGISValues(33.04187, 35.102275);
console.log(gisValues);
// Output: { png25: 0.275, cresta: "Zone A" }
```

### **עדכון פרויקט**
```javascript
// עדכון פרויקט עם ערכי GIS
const result = await gisService.updateProjectWithGISValues(
  "projectId", 
  33.04187, 
  35.102275
);
```

### **API Call ישיר**
```bash
# חישוב ערכי GIS
curl -X POST http://localhost:3001/api/gis/calculate \
  -H "Content-Type: application/json" \
  -d '{"x": 33.04187, "y": 35.102275}'

# קבלת ערך PNG25
curl "http://localhost:3001/api/gis/png25?x=33.04187&y=35.102275"

# קבלת אזור Cresta
curl "http://localhost:3001/api/gis/cresta?x=33.04187&y=35.102275"
```

## ⚙️ **הגדרות סביבה**

### **משתני סביבה נדרשים**
```env
MONGODB_URI=mongodb://localhost:27017/contractor-crm
```

### **מבנה דאטאבייס**
```
MongoDB
├── contractor-crm (דאטאבייס ראשי)
│   ├── contractors
│   ├── projects
│   └── users
└── GIS (דאטאבייס GIS)
    ├── seismic-hazard-zone
    ├── cresta-zones
    └── earthquake-fault-zones
```

## 🐛 **טיפול בשגיאות**

### **שגיאות נפוצות**
1. **קואורדינטות חסרות** - המערכת תציג הודעה מתאימה
2. **חיבור לדאטאבייס** - בדיקת תקינות עם `/api/gis/health`
3. **נתוני GIS חסרים** - המערכת תחזיר `null` עבור ערכים לא נמצאים

### **לוגים**
```javascript
// לוגים מועילים לדיבוג
console.log('🔍 GIS Service: Calculating values for coordinates (33.04187, 35.102275)');
console.log('✅ GIS Service: Found PNG25 value 0.275 for coordinates (33.04187, 35.102275)');
console.log('✅ GIS Service: Found Cresta zone Zone A for coordinates (33.04187, 35.102275)');
```

## 🎯 **תכונות עתידיות**

- [ ] תמיכה בפורמטים נוספים של נתוני GIS
- [ ] שמירת cache של תוצאות חישוב
- [ ] תמיכה בפוליגונים מורכבים יותר
- [ ] אינטגרציה עם שירותי GIS חיצוניים
- [ ] ויזואליזציה של אזורי GIS על מפה

## 📞 **תמיכה**

לשאלות או בעיות עם אינטגרציית GIS, אנא בדקו:
1. לוגי השרת לפרטים על שגיאות
2. תקינות החיבור לדאטאבייס GIS
3. קיום נתוני GIS בקולקשנים המתאימים
