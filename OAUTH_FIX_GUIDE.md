# 🚨 Google OAuth 400 Error Fix Guide

## הבעיה הנוכחית
- **Error 400: invalid_request** עם `redirect_uri=/auth/google/callback`
- ה-redirect URI לא תואם למה שמוגדר ב-Google Cloud Console

## 🔧 פתרון מיידי

### שלב 1: עדכון Google Cloud Console (חובה!)

1. **לך ל:** https://console.cloud.google.com/
2. **בחר פרויקט:** `contractor-crm` או `choco-insurance`
3. **לך ל:** APIs & Services → Credentials
4. **לחץ על OAuth 2.0 Client ID** שלך

#### עדכן את השדות הבאים:

**Authorized JavaScript origins:**
```
https://dash.chocoinsurance.com
https://contractor-crm-api.onrender.com
```

**Authorized redirect URIs:**
```
https://contractor-crm-api.onrender.com/auth/google/callback
https://dash.chocoinsurance.com/auth/google/callback
```

5. **לחץ "Save"**

### שלב 2: עדכון OAuth Consent Screen

1. **לך ל:** APIs & Services → OAuth consent screen
2. **עדכן את השדות הבאים:**

**App information:**
- **App name:** `שוקו ביטוח - מערכת ניהול קבלנים`
- **User support email:** `hello@chocoinsurance.com`

**App domain:**
- **Application home page:** `https://dash.chocoinsurance.com`
- **Application privacy policy link:** `https://dash.chocoinsurance.com/privacy`
- **Application terms of service link:** `https://dash.chocoinsurance.com/terms`

**Authorized domains:**
```
chocoinsurance.com
contractor-crm-api.onrender.com
```

3. **לחץ "Save"**

### שלב 3: עדכון Render Environment Variables

1. **לך ל:** https://dashboard.render.com
2. **בחר:** `contractorCRM-api`
3. **לך ל:** Environment
4. **וודא שיש את ה-variables הבאים:**

```
GOOGLE_CLIENT_ID = [YOUR_GOOGLE_CLIENT_ID]
GOOGLE_CLIENT_SECRET = [YOUR_GOOGLE_CLIENT_SECRET]
GOOGLE_CALLBACK_URL = https://contractor-crm-api.onrender.com/auth/google/callback
```

5. **לחץ "Save Changes"**
6. **המתן ל-redeploy** (3-7 דקות)

### שלב 4: בדיקה

1. **המתן 5-10 דקות** לאחר כל העדכונים
2. **לך ל:** https://dash.chocoinsurance.com
3. **לחץ "התחבר עם Google"**
4. **אמור לעבוד** ללא שגיאות

## 🔍 אם עדיין יש בעיות

### בדוק את ה-logs ב-Render:
1. **לך ל:** https://dashboard.render.com
2. **בחר:** `contractorCRM-api` → Logs
3. **חפש הודעות עם:** `🔐 Google OAuth` או `🔐 Passport Google Strategy`

### בדוק את ה-console ב-browser:
1. **פתח Developer Tools** (F12)
2. **לך ל-Console tab**
3. **חפש שגיאות** הקשורות ל-OAuth

## ⚠️ הערות חשובות

- **HTTPS חובה** - כל ה-URLs חייבים להיות עם HTTPS
- **Domains מוכרים** - רק domains שבבעלותך
- **המתן** - שינויים ב-Google Cloud Console לוקחים 5-10 דקות
- **Redeploy** - שינויים ב-Render לוקחים 3-7 דקות

## 📞 אם עדיין לא עובד

1. **בדוק את ה-logs** ב-Render
2. **וודא שה-environment variables** עודכנו
3. **בדוק שה-Google Cloud Console** עודכן נכון
4. **המתן עוד 10 דקות** ונסה שוב

---

**הבעיה העיקרית היא שה-redirect URI לא תואם למה שמוגדר ב-Google Cloud Console!**
