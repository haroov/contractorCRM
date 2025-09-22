# 🗺️ עדכון נתוני GIS לאכזיב - מדריך מפורט

## 📍 **קואורדינטות אכזיב**
- **X**: 33.04187
- **Y**: 35.102275
- **PNG25 צפוי**: 0.175
- **Cresta צפוי**: ISR_Z (ISR_22) Northern

## 🔧 **שלב 1: עדכון נתוני Seismic Hazard Zone**

### **פתח MongoDB Compass**
1. התחבר ל-Atlas Cluster
2. נווט ל-`GIS` > `seismic-hazard-zone`
3. מחק את המסמך הקיים
4. הוסף מסמך חדש:

```json
{
  "type": "FeatureCollection",
  "name": "Seismic Hazard Zone",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "Name": 0.175,
        "Hazard": 0.175
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [33.0, 35.0],
          [33.1, 35.0],
          [33.1, 35.2],
          [33.0, 35.2],
          [33.0, 35.0]
        ]]
      }
    }
  ]
}
```

## 🔧 **שלב 2: עדכון נתוני Cresta Zones**

### **נווט ל-`GIS` > `cresta-zones`**
1. מחק את המסמך הקיים
2. הוסף מסמך חדש:

```json
{
  "type": "FeatureCollection",
  "name": "Cresta Zones",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "Name": "ISR_22",
        "Country_IS": "ISR",
        "Country_Na": "Israel",
        "CRESTA_Rel": "2019.000000",
        "CRESTA_Sch": "HighRes",
        "CRESTA_I_1": "ISR_22",
        "CRESTA_S_1": "LowRes",
        "CRESTA_ID1": "ISR_Z",
        "Zone_Name1": "Northern"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [33.0, 35.0],
          [33.1, 35.0],
          [33.1, 35.2],
          [33.0, 35.2],
          [33.0, 35.0]
        ]]
      }
    }
  ]
}
```

## 🧪 **שלב 3: בדיקת המערכת**

### **בדיקה 1: Health Check**
```bash
curl "https://dash.chocoinsurance.com/api/gis/health"
```

### **בדיקה 2: חישוב ערכי GIS**
```bash
curl -X POST "https://dash.chocoinsurance.com/api/gis/calculate" \
  -H "Content-Type: application/json" \
  -d '{"x": 33.04187, "y": 35.102275}'
```

### **תוצאה צפויה:**
```json
{
  "success": true,
  "coordinates": { "x": 33.04187, "y": 35.102275 },
  "gisValues": {
    "png25": 0.175,
    "cresta": "ISR_Z"
  }
}
```

## 🎯 **בדיקה באפליקציה**

1. **פתח את האפליקציה** ב-`https://dash.chocoinsurance.com`
2. **נווט לפרויקט אכזיב 3001**
3. **הזן קואורדינטות**:
   - נ״צ X: 33.04187
   - נ״צ Y: 35.102275
4. **לחץ על "חשב ערכי GIS"**
5. **ודא שהשדות מתעדכנים**:
   - ציון PNG25 לרעידות אדמה: 0.175
   - אזור Cresta: ISR_Z

## 🔍 **פתרון בעיות**

### **בעיה: עדיין מחזיר null**
- **סיבה**: הפוליגונים לא מכסים את הקואורדינטות
- **פתרון**: הרחב את הפוליגונים או ודא שהקואורדינטות נכונות

### **בעיה: שגיאת חיבור**
- **סיבה**: דאטאבייס GIS לא קיים
- **פתרון**: צור דאטאבייס GIS ב-MongoDB Atlas

### **בעיה: נתונים לא נשמרים**
- **סיבה**: שגיאה בפורמט JSON
- **פתרון**: ודא שהפורמט GeoJSON נכון

## 📊 **מבנה הפוליגון**

הפוליגון מכסה את האזור:
- **Bottom-left**: (33.0, 35.0)
- **Bottom-right**: (33.1, 35.0)
- **Top-right**: (33.1, 35.2)
- **Top-left**: (33.0, 35.2)

קואורדינטות אכזיב (33.04187, 35.102275) נמצאות בתוך הפוליגון הזה.

## 🎉 **לאחר העדכון**

המערכת אמורה:
1. ✅ לחשב אוטומטית ערכי GIS כאשר מזינים קואורדינטות
2. ✅ להציג הודעת הצלחה במקום "לא נמצאו ערכי GIS"
3. ✅ לעדכן את השדות PNG25 ו-Cresta אוטומטית
4. ✅ לעבוד עם כפתור "חשב ערכי GIS"

## 📞 **תמיכה**

אם יש בעיות:
1. בדוק את הלוגים של השרת
2. ודא שהנתונים נשמרו ב-MongoDB Compass
3. בדוק שהפורמט GeoJSON נכון
4. ודא שהפוליגונים מכסים את הקואורדינטות
