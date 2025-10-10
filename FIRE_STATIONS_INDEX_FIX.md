# תיקון אינדקס מרחבי לתחנות כיבוי אש

## הבעיה
השירות מחזיר שגיאה:
```
error processing query: ns=GIS.fireStations Tree: GEONEAR field=geometry maxdist=1.79769e+308 isNearSphere=1
planner returned error :: caused by :: unable to find index for $geoNear query
```

## הסיבה
אין אינדקס מרחבי על הקולקשן `fireStations` ב-MongoDB Atlas.

## הפתרון

### שלב 1: פתח MongoDB Compass
1. **נווט ל-`GIS` database**
2. **לחץ על "Open MongoDB shell"**

### שלב 2: הרץ את הסקריפט
הדבק את הסקריפט הבא:

```javascript
// Create spatial index for fireStations collection
db.getCollection('fireStations').createIndex(
    { "geometry": "2dsphere" },
    { 
        name: "geometry_2dsphere",
        background: true
    }
);
```

### שלב 3: בדוק שהאינדקס נוצר
```javascript
// Check indexes
db.getCollection('fireStations').getIndexes();
```

### שלב 4: בדוק את השאילתה
```javascript
// Test query
db.getCollection('fireStations').aggregate([
    {
        $geoNear: {
            near: { type: "Point", coordinates: [35.102275, 33.04187] },
            key: "geometry",
            spherical: true,
            distanceField: "distance_m"
        }
    },
    { $limit: 1 }
]).toArray();
```

## סקריפט מלא
השתמש בסקריפט המלא מ-`scripts/create-fire-stations-index.js`:

1. **פתח את הקובץ** `scripts/create-fire-stations-index.js`
2. **העתק את כל התוכן**
3. **הדבק ב-MongoDB Compass shell**
4. **לחץ Enter**

## תוצאה צפויה
לאחר יצירת האינדקס, חיפוש תחנות הכיבוי יעבוד בצורה מושלמת!

## בדיקה מהירה
אחרי יצירת האינדקס, נסה שוב את כפתור החיפוש באפליקציה.
