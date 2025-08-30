# Contractor CRM System

מערכת CRM לניהול קבלנים עם אינטגרציה לרשם החברות ופנקס הקבלנים של מדינת ישראל.

## 🚀 תכונות עיקריות

- **ניהול קבלנים**: הוספה, עריכה וצפייה בפרטי קבלנים
- **אינטגרציה עם ממשלת ישראל**: 
  - רשם החברות (`data.gov.il`)
  - פנקס הקבלנים הרשומים
- **אוטופלוס**: מילוי אוטומטי של פרטי חברה מנתונים ממשלתיים
- **וולידציה**: בדיקות תקינות לנתונים
- **ממשק משתמש מתקדם**: React + Material-UI

## 🛠️ טכנולוגיות

- **Frontend**: React 18 + TypeScript
- **UI Framework**: Material-UI (MUI)
- **Build Tool**: Vite
- **Routing**: React Router
- **State Management**: React Hooks

## 📋 דרישות מערכת

- Node.js 16+
- npm או yarn

## 🚀 התקנה והרצה

### 1. התקנת תלויות
```bash
npm install
```

### 2. הרצת הפרויקט
```bash
npm run dev
```

האפליקציה תיפתח בכתובת: `http://localhost:5173`

### 3. בנייה לפרודקשן
```bash
npm run build
```

## 📁 מבנה הפרויקט

```
src/
├── components/
│   ├── ContractorRepository.tsx    # רשימת הקבלנים
│   ├── ContractorDetailsPage.tsx   # עמוד פרטי קבלן
│   ├── ContractorTabs.tsx          # טאבים של פרטי קבלן
│   └── ...
├── types/
│   └── index.ts                    # הגדרות TypeScript
├── App.tsx                         # קומפוננט ראשי
└── main.tsx                        # נקודת כניסה
```

## 🔧 API Integration

### רשם החברות
- **URL**: `https://data.gov.il/api/3/action/datastore_search?resource_id=f004176c-b85f-4542-8901-7b3176f9a054&q={{company_id}}`
- **תפקיד**: הבאת פרטי חברה (שם, כתובת, טלפון, אימייל)

### פנקס הקבלנים
- **URL**: `https://data.gov.il/api/3/action/datastore_search?resource_id=4eb61bd6-18cf-4e7c-9f9c-e166dfa0a2d8&q={{company_id}}`
- **תפקיד**: הבאת פרטי קבלן (מספר קבלן, סיווגים, רישיונות)

## 📝 תכונות מתקדמות

### אוטופלוס חכם
- מילוי אוטומטי של פרטי חברה מנתונים ממשלתיים
- יצירת אתר אינטרנט אוטומטית מהדומיין של האימייל
- פורמט טלפון ישראלי אוטומטי

### וולידציה
- בדיקת מספר חברה (9 ספרות)
- סיווג חברה אוטומטי לפי מספר חברה
- בדיקת מילים לא הולמות בשמות חברה
- וולידציה של שמות באנגלית

### ממשק משתמש
- עיצוב RTL לעברית
- טאבים מאורגנים לפרטי חברה, סגמנטים, אנשי קשר ופרויקטים
- הודעות משוב למשתמש
- טופס דינמי עם שדות נדרשים

## 🤝 תרומה לפרויקט

1. Fork את הפרויקט
2. צור branch חדש (`git checkout -b feature/amazing-feature`)
3. Commit את השינויים (`git commit -m 'Add amazing feature'`)
4. Push ל-branch (`git push origin feature/amazing-feature`)
5. פתח Pull Request

## 📄 רישיון

פרויקט זה מוגן תחת רישיון MIT.

## 👨‍💻 מפתח

פותח עבור מערכת ניהול קבלנים מתקדמת עם אינטגרציה לנתונים ממשלתיים.

---

**הערה**: הפרויקט משתמש ב-APIs ציבוריים של ממשלת ישראל. יש לוודא עמידה בתנאי השימוש של ה-APIs.
