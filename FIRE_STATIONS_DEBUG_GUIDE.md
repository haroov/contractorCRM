# מדריך לבדיקת תחנות כיבוי אש

## הבעיה
השירות עובד אבל לא מוצא תחנות כיבוי אש בקרבת אכזיב.

## הפתרון

### שלב 1: פתח MongoDB Compass
1. **נווט ל-`GIS` database**
2. **לחץ על "Open MongoDB shell"**

### שלב 2: הרץ את הפקודות הבאות

#### בדיקה בסיסית:
```javascript
// בדוק כמה תחנות יש
db.getCollection('fireStations').countDocuments()
```

#### בדוק תחנות לדוגמה:
```javascript
// קבל 3 תחנות לדוגמה
db.getCollection('fireStations').find({}).limit(3).toArray()
```

#### בדוק תחנות ליד אכזיב:
```javascript
// חפש תחנות ליד אכזיב
db.getCollection('fireStations').aggregate([
    {
        $geoNear: {
            near: { type: "Point", coordinates: [35.102275, 33.04187] },
            key: "geometry",
            spherical: true,
            distanceField: "distance_m"
        }
    },
    { $limit: 1 },
    {
        $project: {
            name: "$properties.Name",
            address: "$properties.address",
            phone: "$properties.EmergencyPhoneNumber",
            distance_km: { $divide: ["$distance_m", 1000] }
        }
    }
]).toArray()
```

### שלב 3: בדוק את התוצאות

#### אם יש תחנות:
- תראה את שם התחנה, כתובת, טלפון ומרחק
- זה אומר שהנתונים קיימים והבעיה היא בקואורדינטות

#### אם אין תחנות:
- תראה `[]` (מערך ריק)
- זה אומר שהנתונים לא מכסים את אזור אכזיב

### שלב 4: בדוק קואורדינטות אחרות

#### נסה עם קואורדינטות של נהריה:
```javascript
// חפש תחנות ליד נהריה
db.getCollection('fireStations').aggregate([
    {
        $geoNear: {
            near: { type: "Point", coordinates: [35.10789, 33.00828] },
            key: "geometry",
            spherical: true,
            distanceField: "distance_m"
        }
    },
    { $limit: 1 }
]).toArray()
```

#### נסה עם קואורדינטות של תל אביב:
```javascript
// חפש תחנות ליד תל אביב
db.getCollection('fireStations').aggregate([
    {
        $geoNear: {
            near: { type: "Point", coordinates: [34.7818, 32.0853] },
            key: "geometry",
            spherical: true,
            distanceField: "distance_m"
        }
    },
    { $limit: 1 }
]).toArray()
```

## תוצאות אפשריות

### ✅ אם נמצאו תחנות:
- הנתונים קיימים
- הבעיה היא בקואורדינטות שהמשתמש הזין
- צריך לתקן את הקואורדינטות בממשק

### ❌ אם לא נמצאו תחנות:
- הנתונים לא מכסים את האזור
- צריך להוסיף נתונים לאזור אכזיב
- או להגדיל את טווח החיפוש

## פתרונות נוספים

### אם הנתונים לא מכסים את האזור:
1. **הוסף תחנת כיבוי אש לנהריה** עם הקואורדינטות הנכונות
2. **הגדל את טווח החיפוש** בשירות
3. **תקן את הקואורדינטות** בממשק המשתמש

### אם הנתונים קיימים אבל לא נמצאים:
1. **בדוק את סדר הקואורדינטות** - [Longitude, Latitude] או [Latitude, Longitude]
2. **בדוק את פורמט הנתונים** - האם יש שדה `geometry` עם `coordinates`
3. **בדוק את האינדקס** - האם האינדקס המרחבי קיים
