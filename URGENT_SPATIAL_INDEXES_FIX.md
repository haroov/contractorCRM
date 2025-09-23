# 🚨 פתרון דחוף: יצירת אינדקסים מרחביים

## הבעיה

השגיאה `$geoNear requires a geo index to run` אומרת שחסרים אינדקסים מרחביים על הקולקשנים.

## פתרון מהיר

### שלב 1: פתח MongoDB Compass
1. **נווט ל-`GIS` database**
2. **לחץ על "Open MongoDB shell"**

### שלב 2: הרץ את הסקריפט המהיר

הדבק את הקוד הבא:

```javascript
// Create spatial index for seismic hazard zones
db.getCollection('seismic-hazard-zone').createIndex(
    { "geometry": "2dsphere" },
    { name: "geometry_2dsphere" }
);
print("✅ Created spatial index for seismic-hazard-zone");

// Create spatial index for Cresta zones
db.getCollection('cresta-zones').createIndex(
    { "geometry": "2dsphere" },
    { name: "geometry_2dsphere" }
);
print("✅ Created spatial index for cresta-zones");

// Create spatial index for earthquake fault zones
db.getCollection('earthquake-fault-zones').createIndex(
    { "geometry": "2dsphere" },
    { name: "geometry_2dsphere" }
);
print("✅ Created spatial index for earthquake-fault-zones");

// Create spatial index for earthquake fault zone 2
db.getCollection('earthquake-fault-zone-2').createIndex(
    { "geometry": "2dsphere" },
    { name: "geometry_2dsphere" }
);
print("✅ Created spatial index for earthquake-fault-zone-2");

print("🎉 All spatial indexes created successfully!");
```

### שלב 3: בדוק שהאינדקסים נוצרו

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
```

## פתרון מקיף

אם אתה רוצה פתרון מקיף יותר, השתמש בסקריפט המלא:

1. **פתח את הקובץ** `scripts/create-spatial-indexes-urgent.js`
2. **העתק את כל התוכן**
3. **הדבק ב-MongoDB Compass shell**
4. **לחץ Enter**

## מה קורה?

1. **יוצרים אינדקסים מרחביים** על שדה `geometry` בכל הקולקשנים
2. **האינדקסים מאפשרים** ל-`$geoNear` לעבוד
3. **השאילתות יעבדו** מהר יותר

## תוצאות צפויות

לאחר יצירת האינדקסים, אתה אמור לראות:
- ✅ הודעות הצלחה ליצירת אינדקסים
- ✅ תוצאות מ-`$geoNear` queries
- ✅ כפתורי הסינכרון יעבדו

## אם עדיין יש בעיות

1. **ודא שאתה ב-`GIS` database**
2. **ודא שהקולקשנים קיימים**
3. **נסה שוב את הסקריפט**

**לאחר יצירת האינדקסים, כפתורי הסינכרון יעבדו בצורה מושלמת!** 🎯
