# 🗺️ מדריך הגדרת נתוני GIS - PNG25 ו-Cresta

## 📋 **מצב נוכחי**

המערכת מוכנה לעבוד עם נתוני GIS, אבל הנתונים עדיין לא הועלו לדאטאבייס GIS. לפי הבדיקה שלך:

- **קואורדינטות אכזיב**: (33.04187, 35.102275)
- **PNG25 צפוי**: 0.175
- **Cresta צפוי**: ISR_Z (ISR_22) Northern

## 🚀 **שלבי הגדרה**

### **שלב 1: חיבור ל-MongoDB Atlas**

1. **פתח MongoDB Compass**
2. **התחבר ל-Atlas Cluster**:
   ```
   mongodb+srv://choco_db_user:choco_db_password@cluster0.rtburip.mongodb.net/contractor-crm
   ```

### **שלב 2: יצירת דאטאבייס GIS**

1. **צור דאטאבייס חדש** בשם `GIS`
2. **צור קולקשן** בשם `seismic-hazard-zone`
3. **צור קולקשן** בשם `cresta-zones`

### **שלב 3: הוספת נתוני Seismic Hazard Zone**

**הוסף מסמך לקולקשן `seismic-hazard-zone`:**

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
          [33.1, 35.1],
          [33.0, 35.1],
          [33.0, 35.0]
        ]]
      }
    }
  ]
}
```

### **שלב 4: הוספת נתוני Cresta Zones**

**הוסף מסמך לקולקשן `cresta-zones`:**

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
          [33.1, 35.1],
          [33.0, 35.1],
          [33.0, 35.0]
        ]]
      }
    }
  ]
}
```

## 🧪 **בדיקת המערכת**

### **בדיקה 1: API Health Check**
```bash
curl https://contractor-crm-api.onrender.com/api/gis/health
```

### **בדיקה 2: חישוב ערכי GIS**
```bash
curl -X POST https://contractor-crm-api.onrender.com/api/gis/calculate \
  -H "Content-Type: application/json" \
  -d '{"x": 33.04187, "y": 35.102275}'
```

### **בדיקה 3: בדיקת PNG25**
```bash
curl "https://contractor-crm-api.onrender.com/api/gis/png25?x=33.04187&y=35.102275"
```

### **בדיקה 4: בדיקת Cresta**
```bash
curl "https://contractor-crm-api.onrender.com/api/gis/cresta?x=33.04187&y=35.102275"
```

## 🎯 **תוצאות צפויות**

לאחר הוספת הנתונים, המערכת אמורה להחזיר:

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

## 🔧 **פתרון בעיות**

### **בעיה: "לא נמצאו ערכי GIS"**
- **סיבה**: נתוני GIS לא קיימים בדאטאבייס
- **פתרון**: הוסף את הנתונים לפי השלבים למעלה

### **בעיה: שגיאת חיבור לדאטאבייס**
- **סיבה**: דאטאבייס GIS לא קיים
- **פתרון**: צור דאטאבייס GIS ב-MongoDB Atlas

### **בעיה: ערכים לא נכונים**
- **סיבה**: פוליגונים לא מכסים את הקואורדינטות
- **פתרון**: הרחב את הפוליגונים או הוסף פוליגונים נוספים

## 📊 **נתונים מורחבים**

למערכת מלאה, תוכל להוסיף:

### **אזורי רעידות אדמה נוספים**
```json
{
  "type": "Feature",
  "properties": {
    "Name": 0.275,
    "Hazard": 0.275
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [[
      [34.0, 32.0],
      [34.1, 32.0],
      [34.1, 32.1],
      [34.0, 32.1],
      [34.0, 32.0]
    ]]
  }
}
```

### **אזורי Cresta נוספים**
```json
{
  "type": "Feature",
  "properties": {
    "Name": "ISR_10",
    "CRESTA_ID1": "ISR_A",
    "Zone_Name1": "Central"
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [[
      [34.0, 32.0],
      [34.1, 32.0],
      [34.1, 32.1],
      [34.0, 32.1],
      [34.0, 32.0]
    ]]
  }
}
```

## 🎉 **לאחר ההגדרה**

1. **המערכת תחשב אוטומטית** ערכי PNG25 ו-Cresta כאשר המשתמש מזין קואורדינטות
2. **הכפתור "חשב ערכי GIS"** יעבוד ויעדכן את השדות
3. **המשתמש יקבל הודעות הצלחה** במקום "לא נמצאו ערכי GIS"

## 📞 **תמיכה**

אם יש בעיות:
1. בדוק את הלוגים של השרת ב-Render
2. ודא שהדאטאבייס GIS קיים ב-MongoDB Atlas
3. בדוק שהקולקשנים `seismic-hazard-zone` ו-`cresta-zones` קיימים
4. ודא שהנתונים בפורמט GeoJSON נכון
