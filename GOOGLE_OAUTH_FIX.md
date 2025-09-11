# Google OAuth 2.0 Policy Compliance Fix

## הבעיה הנוכחית
- **Error 400: invalid_request** - האפליקציה לא עומדת במדיניות OAuth 2.0 של Google
- **Access blocked: Authorization Error** - Google חוסם את הגישה

## הפתרון - עדכון Google Cloud Console

### 1. גישה ל-Google Cloud Console
1. לך ל: https://console.cloud.google.com/
2. בחר את הפרויקט: `contractor-crm` או `choco-insurance`
3. לך ל: **APIs & Services** → **Credentials**

### 2. עדכון OAuth 2.0 Client ID
1. לחץ על ה-OAuth 2.0 Client ID: `230216937198-4e1gs2k1lepumm2ea3n949u897vnda2m.apps.googleusercontent.com`
2. עדכן את השדות הבאים:

#### **Authorized JavaScript origins:**
```
https://dash.chocoinsurance.com
https://contractor-crm-api.onrender.com
```

#### **Authorized redirect URIs:**
```
https://contractor-crm-api.onrender.com/auth/google/callback
https://dash.chocoinsurance.com/auth/google/callback
```

### 3. עדכון OAuth consent screen
1. לך ל: **APIs & Services** → **OAuth consent screen**
2. עדכן את השדות הבאים:

#### **App information:**
- **App name:** `שוקו ביטוח - מערכת ניהול קבלנים`
- **User support email:** `hello@chocoinsurance.com`
- **App logo:** העלה את הלוגו מ-`src/assets/logo.svg`

#### **App domain:**
- **Application home page:** `https://dash.chocoinsurance.com`
- **Application privacy policy link:** `https://dash.chocoinsurance.com/privacy`
- **Application terms of service link:** `https://dash.chocoinsurance.com/terms`

#### **Authorized domains:**
```
chocoinsurance.com
contractor-crm-api.onrender.com
```

#### **Developer contact information:**
- **Email addresses:** `hello@chocoinsurance.com`

### 4. עדכון Scopes
1. לך ל: **APIs & Services** → **OAuth consent screen** → **Scopes**
2. וודא שיש רק את ה-scopes הבאים:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`

### 5. עדכון Publishing status
1. לך ל: **APIs & Services** → **OAuth consent screen**
2. אם האפליקציה ב-**Testing** mode:
   - הוסף את המיילים הבאים ל-**Test users:**
     - `liav@chocoinsurance.com`
     - `hello@chocoinsurance.com`
3. אם האפליקציה ב-**Production** mode:
   - וודא שכל השדות מולאו נכון
   - שלח לאישור Google (אם נדרש)

### 6. עדכון Environment Variables ב-Render
1. לך ל: https://dashboard.render.com
2. בחר את השירות: `contractorCRM-api`
3. לך ל: **Environment**
4. עדכן את ה-variable:
   ```
   GOOGLE_CALLBACK_URL = https://contractor-crm-api.onrender.com/auth/google/callback
   ```
5. שמור והמתן ל-redeploy (3-7 דקות)

### 7. בדיקה
1. לך ל: https://dash.chocoinsurance.com
2. לחץ על "התחבר עם Google"
3. אמור לעבוד ללא שגיאות

## הערות חשובות
- **HTTPS חובה** - כל ה-URLs חייבים להיות עם HTTPS
- **Domains מוכרים** - רק domains שבבעלותך או שיש לך הרשאה להשתמש בהם
- **Scopes מינימליים** - רק מה שצריך, לא יותר
- **Consent screen מלא** - כל השדות חייבים להיות מולאים

## אם עדיין יש בעיות
1. בדוק את ה-logs ב-Render
2. בדוק את ה-console ב-browser
3. וודא שה-environment variables עודכנו
4. המתן 5-10 דקות לאחר העדכונים
