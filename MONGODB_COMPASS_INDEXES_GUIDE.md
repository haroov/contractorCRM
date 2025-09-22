# 🗺️ מדריך יצירת אינדקסים מרחביים ב-MongoDB Compass

## 📋 **מטרה**
יצירת אינדקסים מרחביים (2dsphere) לכל הקולקשנים בדאטאבייס GIS באמצעות MongoDB Compass.

## 🚀 **שלב 1: פתיחת MongoDB Compass**

1. **פתח MongoDB Compass**
2. **התחבר ל-Atlas Cluster** שלך
3. **נווט ל-`GIS` database**

## 🛠️ **שלב 2: הרצת סקריפט אוטומטי**

### **פתיחת MongoDB Shell**
1. **לחץ על "Open MongoDB shell"** (כפתור בצד ימין)
2. **הדבק את הסקריפט** מ-`scripts/mongodb-compass-indexes.js`
3. **לחץ Enter** להרצת הסקריפט

### **הסקריפט יבצע:**
- ✅ יצירת אינדקסים מרחביים עבור כל הקולקשנים
- ✅ בדיקת אינדקסים קיימים
- ✅ יצירת אינדקסים מורכבים לביצועים טובים יותר
- ✅ בדיקת שאילתות מרחביות עם קואורדינטות אכזיב

## 🔧 **שלב 3: יצירה ידנית (אלטרנטיבה)**

אם אתה מעדיף ליצור אינדקסים ידנית:

### **עבור `seismic-hazard-zone`:**
1. **בחר את הקולקשן** `seismic-hazard-zone`
2. **לחץ על "Indexes" tab**
3. **לחץ על "+ Create Index"**
4. **הזן את השדה**: `features.geometry`
5. **בחר "2dsphere"** כסוג האינדקס
6. **לחץ "Create Index"**

### **עבור `cresta-zones`:**
1. **בחר את הקולקשן** `cresta-zones`
2. **חזור על התהליך** כמו למעלה

### **עבור `earthquake-fault-zones`:**
1. **בחר את הקולקשן** `earthquake-fault-zones`
2. **חזור על התהליך** כמו למעלה

## 📝 **שאילתות MongoDB ידניות**

אם אתה מעדיף להריץ שאילתות ידניות:

### **אינדקס בסיסי**
```javascript
use GIS;

// עבור seismic-hazard-zone
db['seismic-hazard-zone'].createIndex(
  { "features.geometry": "2dsphere" },
  { name: "features_geometry_2dsphere" }
);

// עבור cresta-zones
db['cresta-zones'].createIndex(
  { "features.geometry": "2dsphere" },
  { name: "features_geometry_2dsphere" }
);

// עבור earthquake-fault-zones
db['earthquake-fault-zones'].createIndex(
  { "features.geometry": "2dsphere" },
  { name: "features_geometry_2dsphere" }
);
```

### **אינדקס מורכב**
```javascript
// אינדקס מורכב לשיפור ביצועים
db['seismic-hazard-zone'].createIndex(
  { 
    "type": 1,
    "features.geometry": "2dsphere" 
  },
  { name: "type_features_geometry_compound" }
);
```

## 🧪 **בדיקת האינדקסים**

### **בדיקת אינדקסים קיימים**
```javascript
// בדיקת אינדקסים עבור קולקשן
db['seismic-hazard-zone'].getIndexes()
```

### **בדיקת ביצועי שאילתה**
```javascript
// בדיקת ביצועים עם explain
db['seismic-hazard-zone'].find({
  "features": {
    $elemMatch: {
      "geometry": {
        $geoIntersects: {
          $geometry: {
            type: "Point",
            coordinates: [35.102275, 33.04187]
          }
        }
      }
    }
  }
}).explain("executionStats")
```

## 🎯 **בדיקת שאילתות מרחביות**

### **חיפוש PNG25 עבור אכזיב**
```javascript
// חיפוש PNG25 עבור קואורדינטות אכזיב
db['seismic-hazard-zone'].findOne({
  "features": {
    $elemMatch: {
      "geometry": {
        $geoIntersects: {
          $geometry: {
            type: "Point",
            coordinates: [35.102275, 33.04187]
          }
        }
      }
    }
  }
});
```

### **חיפוש Cresta Zone עבור אכזיב**
```javascript
// חיפוש Cresta Zone עבור קואורדינטות אכזיב
db['cresta-zones'].findOne({
  "features": {
    $elemMatch: {
      "geometry": {
        $geoIntersects: {
          $geometry: {
            type: "Point",
            coordinates: [35.102275, 33.04187]
          }
        }
      }
    }
  }
});
```

## 📊 **תוצאות צפויות**

לאחר יצירת האינדקסים, השאילתות אמורות להחזיר:

### **עבור PNG25:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "Hazard": 0.175
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [...]
      }
    }
  ]
}
```

### **עבור Cresta:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "CRESTA_ID1": "ISR_Z",
        "Zone_Name1": "Northern"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [...]
      }
    }
  ]
}
```

## ⚡ **טיפים לביצועים**

### **1. אינדקסים ברקע**
```javascript
// יצירת אינדקס ברקע (לא חוסם פעולות אחרות)
{
  "features.geometry": "2dsphere"
},
{
  background: true
}
```

### **2. אינדקסים חלקיים**
```javascript
// אינדקס רק עבור מסמכים עם geometry
{
  "features.geometry": "2dsphere"
},
{
  partialFilterExpression: {
    "features.geometry": { $exists: true }
  }
}
```

### **3. אינדקסים מורכבים**
```javascript
// אינדקס מורכב לשיפור ביצועים
{
  "type": 1,                    // סינון לפי סוג
  "features.geometry": "2dsphere" // חיפוש מרחבי
}
```

## 🔍 **פתרון בעיות**

### **בעיה: אינדקס לא נוצר**
- **סיבה**: שגיאה בפורמט הנתונים
- **פתרון**: ודא שהנתונים בפורמט GeoJSON תקין

### **בעיה: שאילתה איטית**
- **סיבה**: אין אינדקס מרחבי
- **פתרון**: צור אינדקס 2dsphere

### **בעיה: שגיאת קואורדינטות**
- **סיבה**: סדר קואורדינטות לא נכון
- **פתרון**: ודא שהקואורדינטות הן [longitude, latitude]

## 🎉 **לאחר יצירת האינדקסים**

המערכת תעבוד מהר יותר ותחזיר תוצאות מדויקות עבור:
- ✅ חיפוש PNG25 עבור קואורדינטות אכזיב
- ✅ חיפוש Cresta Zone עבור קואורדינטות אכזיב
- ✅ כל שאילתה מרחבית אחרת
- ✅ ביצועים משופרים בכלל המערכת

## 📞 **תמיכה**

אם יש בעיות:
1. בדוק שהנתונים בפורמט GeoJSON תקין
2. ודא שהקואורדינטות בסדר הנכון [longitude, latitude]
3. בדוק שהאינדקסים נוצרו בהצלחה
4. בדוק את הלוגים של השרת
