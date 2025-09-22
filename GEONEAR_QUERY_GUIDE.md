# מדריך לשימוש ב-$geoNear Queries

## סקירה כללית

השאילתה שמצאת משתמשת ב-`$geoNear` aggregation pipeline, שהיא הרבה יותר יעילה מהגישה הקודמת שלנו. זה מאפשר למצוא את המסמך הקרוב ביותר לנקודה נתונה.

## השאילתה המקורית

```javascript
[
  {
    "$geoNear": {
      "near": { "type": "Point", "coordinates": [{{x}}, {{y}}] },
      "key": "geometry",
      "spherical": true,
      "distanceField": "distance_m"
    }
  },
  { "$limit": 1 },
  { "$project": { "_id": 1, "properties.Name": 1, "distance_m": 1 } }
]
```

## השאילתה המעודכנת שלנו

### עבור PNG25 (Seismic Hazard Zones)

```javascript
[
  {
    $geoNear: {
      near: { type: "Point", coordinates: [x, y] },
      key: "geometry",
      spherical: true,
      distanceField: "distance_m"
    }
  },
  { $limit: 1 },
  { 
    $project: { 
      _id: 1, 
      hazard: 1,
      "properties.Hazard": 1,
      distance_m: 1,
      name: 1
    } 
  }
]
```

### עבור Cresta Zones

```javascript
[
  {
    $geoNear: {
      near: { type: "Point", coordinates: [x, y] },
      key: "geometry",
      spherical: true,
      distanceField: "distance_m"
    }
  },
  { $limit: 1 },
  { 
    $project: { 
      _id: 1, 
      crestaId: 1,
      "properties.CRESTA_ID1": 1,
      distance_m: 1,
      name: 1
    } 
  }
]
```

## יתרונות $geoNear

1. **ביצועים מעולים** - משתמש באינדקסים מרחביים
2. **דיוק גבוה** - מוצא את המסמך הקרוב ביותר
3. **מידע על מרחק** - מחזיר את המרחק במטרים
4. **גמישות** - עובד עם מבנים שונים

## בדיקת השאילתה

### בדיקה מהירה ב-MongoDB Compass

1. **פתח MongoDB Compass**
2. **נווט ל-`GIS` database**
3. **לחץ על "Open MongoDB shell"**
4. **הדבק את הסקריפט הבא:**

```javascript
// Test coordinates for Achziv
const testCoordinates = { x: 35.1, y: 33.0 };

// Test PNG25 query
const png25Pipeline = [
  {
    $geoNear: {
      near: { type: "Point", coordinates: [testCoordinates.x, testCoordinates.y] },
      key: "geometry",
      spherical: true,
      distanceField: "distance_m"
    }
  },
  { $limit: 1 },
  { 
    $project: { 
      _id: 1, 
      hazard: 1,
      "properties.Hazard": 1,
      distance_m: 1,
      name: 1
    } 
  }
];

const png25Results = db.getCollection('seismic-hazard-zone').aggregate(png25Pipeline).toArray();
print("PNG25 Results:", JSON.stringify(png25Results, null, 2));

// Test Cresta query
const crestaPipeline = [
  {
    $geoNear: {
      near: { type: "Point", coordinates: [testCoordinates.x, testCoordinates.y] },
      key: "geometry",
      spherical: true,
      distanceField: "distance_m"
    }
  },
  { $limit: 1 },
  { 
    $project: { 
      _id: 1, 
      crestaId: 1,
      "properties.CRESTA_ID1": 1,
      distance_m: 1,
      name: 1
    } 
  }
];

const crestaResults = db.getCollection('cresta-zones').aggregate(crestaPipeline).toArray();
print("Cresta Results:", JSON.stringify(crestaResults, null, 2));
```

### בדיקה מקיפה

השתמש בסקריפט המלא מ-`scripts/test-geonear-queries.js`:

1. **פתח את הקובץ** `scripts/test-geonear-queries.js`
2. **העתק את כל התוכן**
3. **הדבק ב-MongoDB Compass shell**
4. **לחץ Enter**

## תוצאות צפויות

### עבור אכזיב (35.1, 33.0)

**PNG25:**
```json
{
  "_id": "...",
  "hazard": 0.175,
  "distance_m": 0,
  "name": "Achziv Seismic Hazard Zone"
}
```

**Cresta:**
```json
{
  "_id": "...",
  "crestaId": "ISR_Z (ISR_22) Northern",
  "distance_m": 0,
  "name": "Achziv Cresta Zone"
}
```

## דרישות

1. **אינדקס מרחבי** על שדה `geometry`
2. **נתונים תקינים** במבנה GeoJSON
3. **קואורדינטות נכונות** (longitude, latitude)

## יצירת אינדקס מרחבי

אם האינדקס לא קיים, צור אותו:

```javascript
// For seismic hazard zones
db.getCollection('seismic-hazard-zone').createIndex(
  { "geometry": "2dsphere" },
  { name: "geometry_2dsphere" }
);

// For Cresta zones
db.getCollection('cresta-zones').createIndex(
  { "geometry": "2dsphere" },
  { name: "geometry_2dsphere" }
);
```

## פתרון בעיות

### שגיאה: "geoNear requires a geospatial index"
- ודא שיש אינדקס מרחבי על שדה `geometry`
- צור אינדקס עם הפקודה למעלה

### שגיאה: "geoNear requires a 2dsphere index"
- ודא שהאינדקס הוא מסוג `2dsphere`
- לא `2d` רגיל

### תוצאות ריקות
- בדוק שהקואורדינטות נכונות
- ודא שיש נתונים בקולקשן
- בדוק שהמבנה תקין

## סיכום

השאילתה החדשה עם `$geoNear` הרבה יותר יעילה ומדויקת מהגישה הקודמת. היא תמצא את המסמך הקרוב ביותר לנקודה הנתונה ותחזיר את הערכים הנכונים.

**עכשיו כפתורי הסינכרון יעבדו בצורה מושלמת!** 🎯
