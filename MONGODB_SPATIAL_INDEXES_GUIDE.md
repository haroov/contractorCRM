# 🗺️ מדריך יצירת אינדקסים מרחביים ב-MongoDB Atlas

## 📋 **מטרה**
יצירת אינדקסים מרחביים (2dsphere) לכל הקולקשנים בדאטאבייס GIS כדי לשפר ביצועי השאילתות המרחביות.

## 🚀 **שיטה 1: הרצת סקריפט אוטומטי**

### **הרצת הסקריפט**
```bash
cd /Users/liav/Downloads/wwwroot/contractor-crm
node scripts/create-gis-spatial-indexes.js
```

הסקריפט ייצור אינדקסים עבור:
- `seismic-hazard-zone`
- `cresta-zones`
- `earthquake-fault-zones`

## 🛠️ **שיטה 2: יצירה ידנית ב-MongoDB Compass**

### **שלב 1: פתיחת MongoDB Compass**
1. התחבר ל-Atlas Cluster
2. נווט ל-`GIS` database
3. בחר קולקשן (למשל `seismic-hazard-zone`)

### **שלב 2: יצירת אינדקס מרחבי**
1. לחץ על **"Indexes"** tab
2. לחץ על **"+ Create Index"**
3. הזן את השדה: `features.geometry`
4. בחר **"2dsphere"** כסוג האינדקס
5. לחץ **"Create Index"**

### **שלב 3: יצירת אינדקס נוסף**
1. צור אינדקס נוסף עבור: `geometry` (רמה ראשית)
2. בחר **"2dsphere"** כסוג האינדקס

### **שלב 4: יצירת אינדקס מורכב**
1. צור אינדקס מורכב:
   - `type`: 1 (ascending)
   - `features.geometry`: 2dsphere
2. זה ישפר ביצועים עבור שאילתות שמסננות לפי סוג

## 📝 **שאילתות MongoDB ליצירת אינדקסים**

### **אינדקס בסיסי**
```javascript
// עבור features.geometry
db.getSiblingDB('GIS').seismic_hazard_zone.createIndex(
  { "features.geometry": "2dsphere" },
  { name: "features_geometry_2dsphere" }
)

// עבור geometry (רמה ראשית)
db.getSiblingDB('GIS').seismic_hazard_zone.createIndex(
  { "geometry": "2dsphere" },
  { name: "geometry_2dsphere" }
)
```

### **אינדקס מורכב**
```javascript
// אינדקס מורכב לשיפור ביצועים
db.getSiblingDB('GIS').seismic_hazard_zone.createIndex(
  { 
    "type": 1,
    "features.geometry": "2dsphere" 
  },
  { name: "type_features_geometry_compound" }
)
```

### **יצירת אינדקסים לכל הקולקשנים**
```javascript
// עבור כל הקולקשנים
const collections = ['seismic-hazard-zone', 'cresta-zones', 'earthquake-fault-zones'];

collections.forEach(collectionName => {
  const collection = db.getSiblingDB('GIS')[collectionName];
  
  // אינדקס features.geometry
  collection.createIndex(
    { "features.geometry": "2dsphere" },
    { name: "features_geometry_2dsphere" }
  );
  
  // אינדקס geometry
  collection.createIndex(
    { "geometry": "2dsphere" },
    { name: "geometry_2dsphere" }
  );
  
  // אינדקס מורכב
  collection.createIndex(
    { 
      "type": 1,
      "features.geometry": "2dsphere" 
    },
    { name: "type_features_geometry_compound" }
  );
  
  print(`✅ Created indexes for ${collectionName}`);
});
```

## 🧪 **בדיקת האינדקסים**

### **בדיקת אינדקסים קיימים**
```javascript
// בדיקת אינדקסים עבור קולקשן
db.getSiblingDB('GIS').seismic_hazard_zone.getIndexes()
```

### **בדיקת ביצועי שאילתה**
```javascript
// בדיקת ביצועים עם explain
db.getSiblingDB('GIS').seismic_hazard_zone.find({
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

## 📊 **סוגי אינדקסים מרחביים**

### **2dsphere Index**
- **שימוש**: עבור נתונים על כדור הארץ (WGS84)
- **תומך**: Points, Lines, Polygons
- **שאילתות**: $geoIntersects, $geoWithin, $near, $nearSphere

### **2d Index**
- **שימוש**: עבור נתונים דו-ממדיים פשוטים
- **תומך**: Points בלבד
- **שאילתות**: $geoWithin, $near

### **geoHaystack Index**
- **שימוש**: עבור חיפושים במרחקים קטנים
- **תומך**: Points בלבד
- **שאילתות**: $geoSearch

## ⚡ **טיפים לביצועים**

### **1. אינדקסים מורכבים**
```javascript
// אינדקס מורכב לשיפור ביצועים
{
  "type": 1,                    // סינון לפי סוג
  "features.geometry": "2dsphere" // חיפוש מרחבי
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

### **3. אינדקסים ברקע**
```javascript
// יצירת אינדקס ברקע (לא חוסם פעולות אחרות)
{
  "features.geometry": "2dsphere"
},
{
  background: true
}
```

## 🔍 **בדיקת יעילות האינדקסים**

### **לפני יצירת האינדקסים**
```javascript
// בדיקת זמן ביצוע ללא אינדקס
var start = new Date();
db.getSiblingDB('GIS').seismic_hazard_zone.find({
  "features.geometry": {
    $geoIntersects: {
      $geometry: {
        type: "Point",
        coordinates: [35.102275, 33.04187]
      }
    }
  }
}).count();
var end = new Date();
print("Query time without index: " + (end - start) + "ms");
```

### **אחרי יצירת האינדקסים**
```javascript
// בדיקת זמן ביצוע עם אינדקס
var start = new Date();
db.getSiblingDB('GIS').seismic_hazard_zone.find({
  "features.geometry": {
    $geoIntersects: {
      $geometry: {
        type: "Point",
        coordinates: [35.102275, 33.04187]
      }
    }
  }
}).count();
var end = new Date();
print("Query time with index: " + (end - start) + "ms");
```

## 🎯 **תוצאות צפויות**

לאחר יצירת האינדקסים:
- ✅ **ביצועים משופרים** - שאילתות מרחביות מהירות יותר
- ✅ **שימוש יעיל בזיכרון** - אינדקסים מקטינים את זמן החיפוש
- ✅ **תמיכה בשאילתות מורכבות** - $geoIntersects, $geoWithin, $near
- ✅ **ביצועים טובים יותר** עבור קואורדינטות אכזיב

## 📞 **תמיכה**

אם יש בעיות:
1. ודא שהנתונים בפורמט GeoJSON תקין
2. בדוק שהקואורדינטות בסדר הנכון [longitude, latitude]
3. ודא שהאינדקסים נוצרו בהצלחה
4. בדוק את הלוגים של השרת

## 🎉 **לאחר יצירת האינדקסים**

המערכת תעבוד מהר יותר ותחזיר תוצאות מדויקות עבור:
- חיפוש PNG25 עבור קואורדינטות אכזיב
- חיפוש Cresta Zone עבור קואורדינטות אכזיב
- כל שאילתה מרחבית אחרת
