# 🚀 שיעבוד: הגדרת Environment Variables ב-Vercel

## 📋 הבעיה הנוכחית:
- ✅ השרת של Render עובד מושלם
- ❌ הפרונטאנד ב-Vercel לא מתחבר לשרת Render
- ❌ הפרונטאנד מנסה להתחבר ל-localhost במקום לשרת הענן

## 🎯 הפתרון:
צריך להוסיף Environment Variables ב-Vercel כדי שהפרונטאנד ידע להתחבר לשרת Render.

---

## 📝 שלב 1: כניסה ל-Vercel Dashboard

1. **לך ל:** `https://vercel.com/dashboard`
2. **התחבר לחשבון שלך**
3. **בחר את הפרויקט:** `contractor-crm`

---

## 📝 שלב 2: כניסה ל-Environment Variables

1. **לחץ על:** `Settings` (בתפריט העליון)
2. **לחץ על:** `Environment Variables` (בתפריט הצדדי)

---

## 📝 שלב 3: הוספת Environment Variables

### 🔧 Environment Variable #1:
- **Name:** `VITE_API_BASE_URL`
- **Value:** `https://contractorcrm-api.onrender.com/api`
- **Environment:** `Production` ✅
- **לחץ על:** `Save`

### 🔧 Environment Variable #2:
- **Name:** `VITE_AUTH_BASE_URL`
- **Value:** `https://contractorcrm-api.onrender.com`
- **Environment:** `Production` ✅
- **לחץ על:** `Save`

---

## 📝 שלב 4: Redeploy

1. **לך ל:** `Deployments` (בתפריט העליון)
2. **לחץ על:** `Redeploy` (ליד הדיפלוי האחרון)
3. **לחץ על:** `Redeploy` (באישור)
4. **חכה שהדיפלוי יסתיים** (2-3 דקות)

---

## 📝 שלב 5: בדיקה

1. **לך ל:** `https://contractor-crm.vercel.app`
2. **התחבר עם Google**
3. **בדוק שהקבלנים נטענים**
4. **לחץ על "עריכת קבלן"**
5. **בדוק שהחלון החדש נפתח ללא בעיות**

---

## ✅ מה אמור לקרות אחרי השיעבוד:

- ✅ הפרונטאנד יתחבר לשרת Render
- ✅ הקבלנים יטענו מהמונגו אטלס
- ✅ עריכת קבלן תעבוד ללא בעיות
- ✅ אין יותר שגיאות CORS
- ✅ אין יותר שגיאות "שגיאה בעדכון הסטטוס מרשם החברות"

---

## 🆘 אם משהו לא עובד:

1. **בדוק שהשרת של Render עובד:**
   - לך ל: `https://contractorcrm-api.onrender.com/api/health`
   - אמור לראות: `{"status":"OK","message":"Contractor CRM API is running"}`

2. **בדוק את הלוגים של Vercel:**
   - לך ל: `Deployments` → `View Function Logs`

3. **בדוק את הלוגים של Render:**
   - לך ל: `https://dashboard.render.com` → `contractorCRM-api` → `Logs`

---

## 📞 תמיכה:

אם אתה נתקע, תמיד אפשר לחזור אליי עם:
- צילום מסך של הבעיה
- הודעות שגיאה מהקונסול
- מה קרה בכל שלב

**בהצלחה! 🎉**
