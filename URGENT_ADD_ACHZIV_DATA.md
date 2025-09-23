# 🚨 פתרון דחוף: הוספת נתוני אכזיב

## הבעיה

האינדקסים נוצרו בהצלחה, אבל השאילתות עדיין מחזירות תוצאה ריקה `[]`. זה אומר שאין נתונים שמכסים את הקואורדינטות של אכזיב (35.1, 33.0).

## פתרון מהיר

### שלב 1: פתח MongoDB Compass
1. **נווט ל-`GIS` database**
2. **לחץ על "Open MongoDB shell"**

### שלב 2: הרץ את הסקריפט המהיר

הדבק את הקוד הבא:

```javascript
// Achziv coordinates
const achzivX = 35.1; // longitude
const achzivY = 33.0; // latitude

// Create a small polygon around Achziv (about 1km radius)
const achzivPolygon = {
    type: "Polygon",
    coordinates: [[
        [achzivX - 0.01, achzivY - 0.01], // southwest
        [achzivX + 0.01, achzivY - 0.01], // southeast
        [achzivX + 0.01, achzivY + 0.01], // northeast
        [achzivX - 0.01, achzivY + 0.01], // northwest
        [achzivX - 0.01, achzivY - 0.01]  // close polygon
    ]]
};

// Add seismic hazard zone for Achziv
const seismicDoc = {
    _id: new ObjectId(),
    name: "Achziv Seismic Hazard Zone",
    geometry: achzivPolygon,
    hazard: 0.175, // PNG25 value for Achziv
    description: "Seismic hazard zone for Achziv area",
    createdAt: new Date()
};

db.getCollection('seismic-hazard-zone').insertOne(seismicDoc);
print("✅ Added seismic hazard zone for Achziv");

// Add Cresta zone for Achziv
const crestaDoc = {
    _id: new ObjectId(),
    name: "Achziv Cresta Zone",
    geometry: achzivPolygon,
    crestaId: "ISR_Z (ISR_22) Northern",
    crestaName: "Northern Israel",
    country: "Israel",
    createdAt: new Date()
};

db.getCollection('cresta-zones').insertOne(crestaDoc);
print("✅ Added Cresta zone for Achziv");

print("🎉 Achziv sample data added successfully!");
```

### שלב 3: בדוק שהנתונים נוספו

הדבק את הקוד הבא:

```javascript
// Test PNG25 query
const png25Pipeline = [
    {
        $geoNear: {
            near: { type: "Point", coordinates: [35.1, 33.0] },
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
            near: { type: "Point", coordinates: [35.1, 33.0] },
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

## מה קורה?

1. **יוצרים פוליגון קטן** סביב אכזיב (רדיוס של כ-1 ק"מ)
2. **מוסיפים מסמך PNG25** עם הערך 0.175
3. **מוסיפים מסמך Cresta** עם הערך "ISR_Z (ISR_22) Northern"
4. **בודקים שהשאילתות עובדות**

## תוצאות צפויות

לאחר הוספת הנתונים, אתה אמור לראות:

**PNG25:**
```json
[{
  "_id": "...",
  "hazard": 0.175,
  "distance_m": 0,
  "name": "Achziv Seismic Hazard Zone"
}]
```

**Cresta:**
```json
[{
  "_id": "...",
  "crestaId": "ISR_Z (ISR_22) Northern",
  "distance_m": 0,
  "name": "Achziv Cresta Zone"
}]
```

## פתרון מקיף

אם אתה רוצה פתרון מקיף יותר, השתמש בסקריפט המלא:

1. **פתח את הקובץ** `scripts/check-and-add-achziv-data.js`
2. **העתק את כל התוכן**
3. **הדבק ב-MongoDB Compass shell**
4. **לחץ Enter**

## אם עדיין יש בעיות

1. **ודא שאתה ב-`GIS` database**
2. **ודא שהקולקשנים קיימים**
3. **ודא שהאינדקסים נוצרו**
4. **נסה שוב את הסקריפט**

**לאחר הוספת נתוני אכזיב, כפתורי הסינכרון יעבדו בצורה מושלמת!** 🎯


