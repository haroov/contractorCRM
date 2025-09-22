# מדריך לשטיחת נתוני GIS

## סקירה כללית

מדריך זה מסביר כיצד לשטח את מבנה נתוני ה-GIS מ-MongoDB Atlas ממבנה מורכב עם `features` array למבנה שטוח ופשוט יותר.

## הבעיה הנוכחית

הנתונים הנוכחיים מאורגנים במבנה GeoJSON מורכב:
```json
{
  "_id": "...",
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "Hazard": 0.175,
        "Description": "..."
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [...]
      }
    }
  ]
}
```

## המבנה החדש (שטוח)

המבנה החדש יהיה פשוט יותר:
```json
{
  "_id": "...",
  "name": "Achziv Seismic Hazard Zone",
  "geometry": {
    "type": "Polygon",
    "coordinates": [...]
  },
  "hazard": 0.175,
  "description": "...",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## יתרונות המבנה השטוח

1. **פשטות**: כל מסמך מייצג אזור אחד
2. **ביצועים**: שאילתות מהירות יותר
3. **תחזוקה**: קל יותר לעדכן ולנהל
4. **אינדקסים**: אינדקסים מרחביים יעילים יותר

## שלבי השטיחה

### שלב 1: הכנה

1. **פתח MongoDB Compass**
2. **נווט ל-`GIS` database**
3. **לחץ על "Open MongoDB shell"**

### שלב 2: שטיחת נתוני Seismic Hazard Zones

הדבק את הסקריפט הבא:

```javascript
// Function to flatten seismic hazard zone data
function flattenSeismicHazardZones() {
    print("🔄 Starting to flatten seismic hazard zone data...");
    
    const collection = db.getCollection('seismic-hazard-zone');
    const documents = collection.find({}).toArray();
    
    let flattenedCount = 0;
    
    documents.forEach(doc => {
        if (doc.type === 'FeatureCollection' && doc.features && doc.features.length > 0) {
            // Process each feature in the collection
            doc.features.forEach((feature, index) => {
                if (feature.type === 'Feature' && 
                    feature.geometry && 
                    feature.geometry.type === 'Polygon' &&
                    feature.properties && 
                    feature.properties.Hazard !== undefined) {
                    
                    // Create flattened document
                    const flattenedDoc = {
                        _id: new ObjectId(),
                        name: doc.name || `Seismic Hazard Zone ${index + 1}`,
                        geometry: feature.geometry,
                        hazard: feature.properties.Hazard,
                        description: feature.properties.Description || null,
                        createdAt: new Date(),
                        originalDocId: doc._id
                    };
                    
                    // Insert flattened document
                    collection.insertOne(flattenedDoc);
                    flattenedCount++;
                    
                    print(`✅ Flattened seismic hazard zone: ${feature.properties.Hazard}`);
                }
            });
            
            // Remove original nested document
            collection.deleteOne({ _id: doc._id });
            print(`🗑️ Removed original nested document: ${doc._id}`);
        }
    });
    
    print(`🎉 Flattened ${flattenedCount} seismic hazard zones`);
}

// Run the function
flattenSeismicHazardZones();
```

### שלב 3: שטיחת נתוני Cresta Zones

הדבק את הסקריפט הבא:

```javascript
// Function to flatten Cresta zones data
function flattenCrestaZones() {
    print("🔄 Starting to flatten Cresta zones data...");
    
    const collection = db.getCollection('cresta-zones');
    const documents = collection.find({}).toArray();
    
    let flattenedCount = 0;
    
    documents.forEach(doc => {
        if (doc.type === 'FeatureCollection' && doc.features && doc.features.length > 0) {
            // Process each feature in the collection
            doc.features.forEach((feature, index) => {
                if (feature.type === 'Feature' && 
                    feature.geometry && 
                    feature.geometry.type === 'Polygon' &&
                    feature.properties && 
                    feature.properties.CRESTA_ID1) {
                    
                    // Create flattened document
                    const flattenedDoc = {
                        _id: new ObjectId(),
                        name: doc.name || `Cresta Zone ${index + 1}`,
                        geometry: feature.geometry,
                        crestaId: feature.properties.CRESTA_ID1,
                        crestaName: feature.properties.CRESTA_NAME || null,
                        country: feature.properties.COUNTRY || null,
                        createdAt: new Date(),
                        originalDocId: doc._id
                    };
                    
                    // Insert flattened document
                    collection.insertOne(flattenedDoc);
                    flattenedCount++;
                    
                    print(`✅ Flattened Cresta zone: ${feature.properties.CRESTA_ID1}`);
                }
            });
            
            // Remove original nested document
            collection.deleteOne({ _id: doc._id });
            print(`🗑️ Removed original nested document: ${doc._id}`);
        }
    });
    
    print(`🎉 Flattened ${flattenedCount} Cresta zones`);
}

// Run the function
flattenCrestaZones();
```

### שלב 4: יצירת אינדקסים מרחביים

הדבק את הסקריפט הבא:

```javascript
// Function to create spatial indexes for flattened data
function createSpatialIndexes() {
    print("🔄 Creating spatial indexes for flattened data...");
    
    // Create index for seismic hazard zones
    try {
        db.getCollection('seismic-hazard-zone').createIndex(
            { "geometry": "2dsphere" },
            { name: "geometry_2dsphere" }
        );
        print("✅ Created spatial index for seismic-hazard-zone");
    } catch (error) {
        print(`⚠️ Error creating spatial index for seismic-hazard-zone: ${error.message}`);
    }
    
    // Create index for Cresta zones
    try {
        db.getCollection('cresta-zones').createIndex(
            { "geometry": "2dsphere" },
            { name: "geometry_2dsphere" }
        );
        print("✅ Created spatial index for cresta-zones");
    } catch (error) {
        print(`⚠️ Error creating spatial index for cresta-zones: ${error.message}`);
    }
}

// Run the function
createSpatialIndexes();
```

### שלב 5: הוספת נתוני דוגמה לאכזיב

הדבק את הסקריפט הבא:

```javascript
// Function to add sample data for Achziv area
function addAchzivSampleData() {
    print("🔄 Adding sample data for Achziv area...");
    
    // Achziv coordinates (approximate)
    const achzivX = 35.1; // longitude
    const achzivY = 33.0; // latitude
    
    // Create a small polygon around Achziv
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
    const seismicCollection = db.getCollection('seismic-hazard-zone');
    const seismicDoc = {
        _id: new ObjectId(),
        name: "Achziv Seismic Hazard Zone",
        geometry: achzivPolygon,
        hazard: 0.175, // PNG25 value for Achziv
        description: "Seismic hazard zone for Achziv area",
        createdAt: new Date()
    };
    
    seismicCollection.insertOne(seismicDoc);
    print("✅ Added seismic hazard zone for Achziv");
    
    // Add Cresta zone for Achziv
    const crestaCollection = db.getCollection('cresta-zones');
    const crestaDoc = {
        _id: new ObjectId(),
        name: "Achziv Cresta Zone",
        geometry: achzivPolygon,
        crestaId: "ISR_Z (ISR_22) Northern",
        crestaName: "Northern Israel",
        country: "Israel",
        createdAt: new Date()
    };
    
    crestaCollection.insertOne(crestaDoc);
    print("✅ Added Cresta zone for Achziv");
}

// Run the function
addAchzivSampleData();
```

## בדיקת התוצאות

### בדיקה מהירה

הדבק את הסקריפט הבא לבדיקת התוצאות:

```javascript
// Test coordinates for Achziv
const testCoordinates = { x: 35.1, y: 33.0 };

// Test seismic hazard zone
const seismicResult = db.getCollection('seismic-hazard-zone').findOne({
    geometry: {
        $geoIntersects: {
            $geometry: {
                type: "Point",
                coordinates: [testCoordinates.x, testCoordinates.y]
            }
        }
    }
});

if (seismicResult) {
    print(`✅ Found seismic hazard zone: ${seismicResult.hazard}`);
} else {
    print("❌ No seismic hazard zone found");
}

// Test Cresta zone
const crestaResult = db.getCollection('cresta-zones').findOne({
    geometry: {
        $geoIntersects: {
            $geometry: {
                type: "Point",
                coordinates: [testCoordinates.x, testCoordinates.y]
            }
        }
    }
});

if (crestaResult) {
    print(`✅ Found Cresta zone: ${crestaResult.crestaId}`);
} else {
    print("❌ No Cresta zone found");
}
```

## סקריפטים מוכנים

### סקריפט מלא לשטיחה

השתמש בסקריפט המלא מ-`scripts/flatten-gis-data.js`:

1. **פתח את הקובץ** `scripts/flatten-gis-data.js`
2. **העתק את כל התוכן**
3. **הדבק ב-MongoDB Compass shell**
4. **לחץ Enter**

### סקריפט לבדיקה

השתמש בסקריפט הבדיקה מ-`scripts/test-flattened-gis-data.js`:

1. **פתח את הקובץ** `scripts/test-flattened-gis-data.js`
2. **העתק את כל התוכן**
3. **הדבק ב-MongoDB Compass shell**
4. **לחץ Enter**

## תוצאות צפויות

לאחר השטיחה, אתה אמור לראות:

1. **מסמכים שטוחים** במקום מבנה מורכב
2. **אינדקסים מרחביים** על שדה `geometry`
3. **נתוני דוגמה לאכזיב** עם הערכים הנכונים
4. **ביצועים משופרים** בשאילתות מרחביות

## פתרון בעיות

### שגיאה: "ObjectId is not defined"
```javascript
// הוסף את השורה הזו בתחילת הסקריפט
const ObjectId = require('mongodb').ObjectId;
```

### שגיאה: "Collection not found"
- ודא שאתה נמצא ב-`GIS` database
- ודא שהקולקשנים קיימים

### שגיאה: "Index already exists"
- זה בסדר, האינדקס כבר קיים
- הסקריפט ימשיך לעבוד

## סיכום

השטיחה תהפוך את נתוני ה-GIS לפשוטים יותר ויעילים יותר. השירות המעודכן יוכל לעבוד עם שני המבנים (ישן וחדש) כדי להבטיח תאימות לאחור.

**לאחר השטיחה, כפתורי הסינכרון יעבדו בצורה מושלמת!** 🎯


