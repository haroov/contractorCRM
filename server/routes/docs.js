const express = require('express');
const router = express.Router();

// Google Docs API endpoint
router.get('/google-docs/:docId', async (req, res) => {
  try {
    const { docId } = req.params;
    
    // For now, return a placeholder response
    // In the future, this could integrate with Google Docs API
    res.json({
      success: true,
      content: {
        title: 'תנאי השירות והודעות הקשורות בביטוח',
        lastUpdated: '11 ביולי, 2023',
        sections: [
          {
            title: 'מבוא',
            content: 'ברוכים הבאים לשוקו ביטוח. מסמך זה מגדיר את תנאי השירות והודעות הקשורות בביטוח עבור מערכת ניהול הקבלנים שלנו.'
          },
          {
            title: 'תנאי השירות',
            content: 'השימוש במערכת ניהול הקבלנים של שוקו ביטוח כפוף לתנאים המפורטים להלן. על ידי השימוש במערכת, אתם מסכימים לתנאים אלו.'
          },
          {
            title: 'הודעות הקשורות בביטוח',
            content: 'המערכת מיועדת לניהול מידע על קבלנים, פרויקטים ואנשי קשר הקשורים לביטוח. כל המידע הנשמר במערכת מוגן בהתאם לתקנות הביטוח הישראליות.'
          }
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching Google Docs content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch document content'
    });
  }
});

// Get terms of use content
router.get('/terms-of-use', async (req, res) => {
  try {
    // For now, return the exact content from Google Docs
    // In the future, this could fetch from Google Docs API
    const termsContent = {
      title: 'תנאי השירות והודעות הקשורות בביטוח',
      subtitle: 'שוקו ביטוח - מערכת ניהול קבלנים',
      lastUpdated: '11 ביולי, 2023',
      googleDocsUrl: 'https://docs.google.com/document/d/1U6rqzofesQdFfU3G1Lj6i1mHF0QDePFHy48iXuwoAWQ/edit?tab=t.0#heading=h.wefuos204y1t',
      sections: [
        {
          title: 'מבוא',
          content: 'ברוכים הבאים לשוקו ביטוח. מסמך זה מגדיר את תנאי השירות והודעות הקשורות בביטוח עבור מערכת ניהול הקבלנים שלנו.'
        },
        {
          title: 'תנאי השירות',
          content: 'השימוש במערכת ניהול הקבלנים של שוקו ביטוח כפוף לתנאים המפורטים להלן. על ידי השימוש במערכת, אתם מסכימים לתנאים אלו.'
        },
        {
          title: 'הודעות הקשורות בביטוח',
          content: 'המערכת מיועדת לניהול מידע על קבלנים, פרויקטים ואנשי קשר הקשורים לביטוח. כל המידע הנשמר במערכת מוגן בהתאם לתקנות הביטוח הישראליות.'
        },
        {
          title: 'הגנת מידע ופרטיות',
          content: 'אנו מתחייבים להגן על המידע האישי והעסקי שלכם בהתאם לחוק הגנת הפרטיות ולמדיניות הפרטיות שלנו.'
        },
        {
          title: 'אחריות וביטוח',
          content: 'השימוש במערכת הוא על אחריותכם הבלעדית. אנו לא נושאים באחריות לנזקים שעלולים להיגרם כתוצאה מהשימוש במערכת, למעט במקרים המכוסים בפוליסת הביטוח שלנו.'
        },
        {
          title: 'שינויים בתנאים',
          content: 'אנו שומרים לעצמנו את הזכות לשנות תנאים אלו מעת לעת. שינויים ייכנסו לתוקף מייד עם פרסומם במערכת.'
        },
        {
          title: 'קשר ותמיכה',
          content: 'לשאלות או הבהרות בנוגע לתנאים אלו או לשירותי הביטוח שלנו, אנא צרו קשר עם הצוות שלנו.'
        }
      ]
    };

    res.json({
      success: true,
      content: termsContent
    });
  } catch (error) {
    console.error('Error fetching terms of use:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch terms of use'
    });
  }
});

// Get privacy policy content
router.get('/privacy-policy', async (req, res) => {
  try {
    const privacyContent = {
      title: 'מדיניות המידע והפרטיות',
      subtitle: 'שוקו ביטוח - מערכת ניהול קבלנים',
      lastUpdated: '11 ביולי, 2023',
      sections: [
        {
          title: 'מבוא',
          content: 'שוקו ביטוח מתחייבת להגן על פרטיות המשתמשים במערכת ניהול הקבלנים. מדיניות זו מסבירה כיצד אנו אוספים, משתמשים ומגנים על המידע שלכם.'
        },
        {
          title: 'איסוף מידע',
          content: 'אנו אוספים מידע אישי ועסקי הנדרש לניהול הקבלנים והפרויקטים, כולל פרטי קשר, מידע עסקי, מידע על פרויקטים ופעילות עסקית, ומידע טכני.'
        },
        {
          title: 'שימוש במידע',
          content: 'המידע נאסף ונשמר למטרות ניהול וטיפול בקבלנים ופרויקטים, תקשורת עם לקוחות, שיפור השירותים ועמידה בדרישות חוקיות.'
        },
        {
          title: 'הגנת מידע',
          content: 'אנו נוקטים באמצעי אבטחה מתקדמים להגנה על המידע: הצפנת מידע רגיש, גישה מוגבלת למידע, גיבויים קבועים ומעקב אחר גישה למידע.'
        },
        {
          title: 'שיתוף מידע',
          content: 'אנו לא משתפים מידע אישי עם צדדים שלישיים, למעט בהסכמה מפורשת מהמשתמש, לצורך עמידה בדרישות חוקיות או להגנה על זכויות החברה.'
        },
        {
          title: 'זכויות המשתמש',
          content: 'למשתמשים יש זכות לבקש גישה למידע האישי, לתקן מידע שגוי, למחוק מידע אישי ולהתנגד לעיבוד המידע.'
        },
        {
          title: 'עוגיות (Cookies)',
          content: 'המערכת משתמשת בעוגיות לשיפור חוויית המשתמש ולפונקציונליות המערכת.'
        },
        {
          title: 'שינויים במדיניות',
          content: 'אנו שומרים לעצמנו את הזכות לעדכן מדיניות זו מעת לעת. שינויים ייכנסו לתוקף מייד עם פרסומם.'
        },
        {
          title: 'קשר',
          content: 'לשאלות או הבהרות בנוגע למדיניות הפרטיות, אנא צרו קשר עם הצוות שלנו.'
        }
      ]
    };

    res.json({
      success: true,
      content: privacyContent
    });
  } catch (error) {
    console.error('Error fetching privacy policy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch privacy policy'
    });
  }
});

module.exports = router;
