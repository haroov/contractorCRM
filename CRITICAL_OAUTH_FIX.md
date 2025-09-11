# 🚨 CRITICAL: OAuth redirect_uri Fix

## הבעיה המדויקת
- **השרת שולח:** `redirect_uri=/auth/google/callback` (relative path)
- **Google מצפה:** `redirect_uri=https://contractorcrm-api.onrender.com/auth/google/callback` (absolute URL)
- **תוצאה:** Error 400: invalid_request

## 🔧 פתרון מיידי

### שלב 1: עדכון Render Environment Variables (חובה!)

1. **לך ל:** https://dashboard.render.com
2. **בחר:** `choco-api` → Environment
3. **וודא שיש את ה-variable:**
   ```
   GOOGLE_CALLBACK_URL = https://contractorcrm-api.onrender.com/auth/google/callback
   ```
4. **אם אין** - הוסף אותו
5. **לחץ "Save Changes"**
6. **המתן ל-redeploy** (3-7 דקות)

### שלב 2: בדיקת Logs

1. **לך ל:** https://dashboard.render.com
2. **בחר:** `choco-api` → Logs
3. **חפש הודעות:**
   ```
   🔐 Using redirect_uri: https://contractorcrm-api.onrender.com/auth/google/callback
   🔐 Passport callbackURL: https://contractorcrm-api.onrender.com/auth/google/callback
   ```

### שלב 3: בדיקה

1. **המתן 10 דקות** לאחר העדכון
2. **לך ל:** https://dash.chocoinsurance.com
3. **לחץ "התחבר עם Google"**
4. **אמור לעבוד** ללא שגיאות

## 🔍 אם עדיין לא עובד

### בדוק את ה-logs:
אם אתה רואה:
```
🔐 Using redirect_uri: /auth/google/callback
```
זה אומר שה-environment variable לא מוגדר!

### פתרון:
1. **וודא** שה-`GOOGLE_CALLBACK_URL` מוגדר ב-Render
2. **המתן** ל-redeploy
3. **בדוק שוב** את ה-logs

## ⚠️ הערות חשובות

- **הבעיה היא** שה-environment variable לא מוגדר ב-Render
- **הקוד משתמש** ב-fallback שהוא relative path
- **Google דורש** absolute URL
- **הפתרון** הוא להגדיר את ה-environment variable

---

**הבעיה העיקרית: `GOOGLE_CALLBACK_URL` לא מוגדר ב-Render Environment Variables!**
