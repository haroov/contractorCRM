# 🐳 Contractor CRM - Docker Setup

## מה זה Docker?

Docker הוא כלי שמאפשר להריץ אפליקציות בסביבה מבודדת (container) עם כל התלויות שלהן. זה עוזר להבטיח שהאפליקציה תעבוד באותה צורה בכל סביבה.

## 🚀 איך להריץ עם Docker

### אפשרות 1: Docker Compose (מומלץ)

```bash
# הרצת האפליקציה עם MongoDB
npm run docker:compose:up

# צפייה בלוגים
npm run docker:compose:logs

# עצירת האפליקציה
npm run docker:compose:down

# הפעלה מחדש
npm run docker:compose:restart
```

### אפשרות 2: Docker בלבד

```bash
# בניית Image
npm run docker:build

# הרצת Container
npm run docker:run
```

## 🌐 גישה לאפליקציה

לאחר ההרצה, האפליקציה תהיה זמינה ב:

- **Frontend (React)**: http://localhost:5173
- **Backend (API)**: http://localhost:3001
- **MongoDB**: localhost:27017

## 📁 מבנה הקבצים

```
contractor-crm/
├── Dockerfile              # הגדרות Docker
├── docker-compose.yml      # הגדרות Services
├── .dockerignore           # קבצים שלא ייכללו ב-Docker
├── scripts/
│   └── init-mongo.js      # סקריפט אתחול MongoDB
└── DOCKER_README.md        # קובץ זה
```

## 🔧 הגדרות סביבה

האפליקציה משתמשת במשתני סביבה הבאים:

- `NODE_ENV`: סביבת הרצה (development/production)
- `USE_MEMORY_SERVER`: האם להשתמש ב-MongoDB Memory Server
- `MONGODB_URI`: כתובת חיבור ל-MongoDB
- `PORT`: פורט השרת

## 🐛 פתרון בעיות

### בעיה: פורט כבר בשימוש
```bash
# בדיקת פורטים בשימוש
lsof -i :3001
lsof -i :5173

# עצירת תהליכים
pkill -f "node.*index.js"
```

### בעיה: MongoDB לא מתחבר
```bash
# בדיקת סטטוס MongoDB
docker-compose ps mongodb

# צפייה בלוגים
docker-compose logs mongodb
```

### בעיה: האפליקציה לא נבנית
```bash
# ניקוי Docker cache
docker system prune -a

# בנייה מחדש
docker-compose build --no-cache
```

## 📊 ניטור וניהול

```bash
# צפייה ב-Containers פעילים
docker ps

# צפייה ב-Images
docker images

# צפייה ב-Volumes
docker volume ls

# צפייה ב-Networks
docker network ls
```

## 🧹 ניקוי

```bash
# עצירת וניקוי הכל
docker-compose down -v

# מחיקת Images לא בשימוש
docker image prune -a

# מחיקת Volumes לא בשימוש
docker volume prune

# ניקוי כללי
docker system prune -a
```

## 🎯 יתרונות Docker

1. **עקביות**: האפליקציה עובדת באותה צורה בכל סביבה
2. **בידוד**: כל service רץ בנפרד
3. **קלות העברה**: קל להעביר בין שרתים
4. **ניהול תלויות**: כל התלויות כלולות ב-Image
5. **Scalability**: קל להריץ מספר instances

## 📚 משאבים נוספים

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MongoDB Docker Image](https://hub.docker.com/_/mongo)
