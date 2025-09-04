# 🚨 דחוף: תיקון המערכת עכשיו!

## ⚡ הבעיה:
המערכת לא עובדת כי הפרונטאנד לא מתחבר לשרת Render.

## 🎯 הפתרון המהיר:

### שלב 1: הוסף Environment Variables ב-Vercel
1. **לך ל:** https://vercel.com/dashboard
2. **בחר:** contractor-crm
3. **לחץ:** Settings → Environment Variables
4. **הוסף:**

**Environment Variable 1:**
- Name: `VITE_API_BASE_URL`
- Value: `https://contractorcrm-api.onrender.com/api`
- Environment: Production ✅

**Environment Variable 2:**
- Name: `VITE_AUTH_BASE_URL`
- Value: `https://contractorcrm-api.onrender.com`
- Environment: Production ✅

### שלב 2: Redeploy
1. **לך ל:** Deployments
2. **לחץ:** Redeploy
3. **חכה 2-3 דקות**

### שלב 3: בדיקה
1. **לך ל:** https://contractor-crm.vercel.app
2. **התחבר עם Google**
3. **בדוק שהקבלנים נטענים**

## 🆘 אם זה לא עובד:

**שלח לי:**
- צילום מסך של Environment Variables ב-Vercel
- הודעות שגיאה מהקונסול
- מה קרה בכל שלב

## ✅ אחרי התיקון:
- ✅ הפרונטאנד יתחבר לשרת Render
- ✅ הקבלנים יטענו מהמונגו אטלס
- ✅ עריכת קבלן תעבוד
- ✅ אין יותר שגיאות CORS
