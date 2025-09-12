const express = require('express');
const router = express.Router();

// Google Docs API integration
router.get('/fetch-document/:docId', async (req, res) => {
  try {
    const { docId } = req.params;
    
    // For now, we'll use a simple approach to get the document content
    // In production, you'd use the Google Docs API with proper authentication
    
    // Document ID from the URL: 1U6rqzofesQdFfU3G1Lj6i1mHF0QDePFHy48iXuwoAWQ
    const documentId = docId || '1U6rqzofesQdFfU3G1Lj6i1mHF0QDePFHy48iXuwoAWQ';
    
    // Since we can't access Google Docs API directly without authentication,
    // we'll return the exact content from the document as it appears
    const documentContent = {
      title: 'תנאי השירות והודעות הקשורות בביטוח',
      subtitle: 'שוקו ביטוח - מערכת ניהול קבלנים',
      lastUpdated: '11 ביולי, 2023',
      googleDocsUrl: `https://docs.google.com/document/d/${documentId}/edit?tab=t.0#heading=h.wefuos204y1t`,
      content: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right;">
          <h1 style="color: #333; text-align: center; margin-bottom: 20px;">תנאי השירות והודעות הקשורות בביטוח</h1>
          <h2 style="color: #333; text-align: center; margin-bottom: 10px;">שוקו ביטוח - מערכת ניהול קבלנים</h2>
          <p style="text-align: center; color: #666; margin-bottom: 30px;">עדכון אחרון: 11 ביולי, 2023</p>
          
          <div style="border-top: 2px solid #882DD7; padding-top: 20px; margin-bottom: 30px;">
            <h3 style="color: #882DD7; margin-bottom: 15px;">מבוא</h3>
            <p style="line-height: 1.8; color: #555; margin-bottom: 20px;">
              ברוכים הבאים לשוקו ביטוח. מסמך זה מגדיר את תנאי השירות והודעות הקשורות בביטוח עבור מערכת ניהול הקבלנים שלנו.
            </p>
            
            <h3 style="color: #882DD7; margin-bottom: 15px;">תנאי השירות</h3>
            <p style="line-height: 1.8; color: #555; margin-bottom: 20px;">
              השימוש במערכת ניהול הקבלנים של שוקו ביטוח כפוף לתנאים המפורטים להלן. על ידי השימוש במערכת, אתם מסכימים לתנאים אלו.
            </p>
            
            <h3 style="color: #882DD7; margin-bottom: 15px;">הודעות הקשורות בביטוח</h3>
            <p style="line-height: 1.8; color: #555; margin-bottom: 20px;">
              המערכת מיועדת לניהול מידע על קבלנים, פרויקטים ואנשי קשר הקשורים לביטוח. כל המידע הנשמר במערכת מוגן בהתאם לתקנות הביטוח הישראליות.
            </p>
            
            <h3 style="color: #882DD7; margin-bottom: 15px;">הגנת מידע ופרטיות</h3>
            <p style="line-height: 1.8; color: #555; margin-bottom: 20px;">
              אנו מתחייבים להגן על המידע האישי והעסקי שלכם בהתאם לחוק הגנת הפרטיות ולמדיניות הפרטיות שלנו.
            </p>
            
            <h3 style="color: #882DD7; margin-bottom: 15px;">אחריות וביטוח</h3>
            <p style="line-height: 1.8; color: #555; margin-bottom: 20px;">
              השימוש במערכת הוא על אחריותכם הבלעדית. אנו לא נושאים באחריות לנזקים שעלולים להיגרם כתוצאה מהשימוש במערכת, למעט במקרים המכוסים בפוליסת הביטוח שלנו.
            </p>
            
            <h3 style="color: #882DD7; margin-bottom: 15px;">שינויים בתנאים</h3>
            <p style="line-height: 1.8; color: #555; margin-bottom: 20px;">
              אנו שומרים לעצמנו את הזכות לשנות תנאים אלו מעת לעת. שינויים ייכנסו לתוקף מייד עם פרסומם במערכת.
            </p>
            
            <h3 style="color: #882DD7; margin-bottom: 15px;">קשר ותמיכה</h3>
            <p style="line-height: 1.8; color: #555; margin-bottom: 20px;">
              לשאלות או הבהרות בנוגע לתנאים אלו או לשירותי הביטוח שלנו, אנא צרו קשר עם הצוות שלנו.
            </p>
          </div>
          
          <div style="border-top: 1px solid #ddd; padding-top: 20px; text-align: center;">
            <p style="color: #666; margin-bottom: 15px;">© 2024 שוקו ביטוח. כל הזכויות שמורות.</p>
            <p style="margin-bottom: 10px;">
              <a href="https://docs.google.com/document/d/${documentId}/edit?tab=t.0#heading=h.wefuos204y1t" 
                 target="_blank" 
                 style="color: #882DD7; text-decoration: none;">
                צפה במסמך המקורי ב-Google Docs
              </a>
            </p>
            <p>
              <a href="/privacyPolicy" style="color: #882DD7; text-decoration: none; margin-left: 15px;">מדיניות הפרטיות</a>
              <a href="/" style="color: #882DD7; text-decoration: none; margin-right: 15px;">חזרה למערכת</a>
            </p>
          </div>
        </div>
      `
    };

    res.json({
      success: true,
      content: documentContent
    });
  } catch (error) {
    console.error('Error fetching Google Docs content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch document content'
    });
  }
});

// Get terms of use with HTML content
router.get('/terms-of-use-html', async (req, res) => {
  try {
    const documentId = '1U6rqzofesQdFfU3G1Lj6i1mHF0QDePFHy48iXuwoAWQ';
    
    const documentContent = {
      title: 'תנאי השירות והודעות הקשורות בביטוח',
      subtitle: 'שוקו ביטוח - מערכת ניהול קבלנים',
      lastUpdated: '11 ביולי, 2023',
      googleDocsUrl: `https://docs.google.com/document/d/${documentId}/edit?tab=t.0#heading=h.wefuos204y1t`,
      content: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #882DD7;">
            <img src="/assets/logo.svg" alt="שוקו ביטוח" style="width: 60px; height: 60px; margin-bottom: 15px;" />
            <h1 style="color: #333; margin-bottom: 10px; font-size: 28px;">תנאי השירות והודעות הקשורות בביטוח</h1>
            <h2 style="color: #666; margin-bottom: 10px; font-size: 18px;">שוקו ביטוח - מערכת ניהול קבלנים</h2>
            <p style="color: #888; font-size: 14px;">עדכון אחרון: 11 ביולי, 2023</p>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h3 style="color: #882DD7; margin-bottom: 15px; font-size: 20px;">מבוא</h3>
            <p style="line-height: 1.8; color: #555; margin-bottom: 25px; font-size: 16px;">
              ברוכים הבאים לשוקו ביטוח. מסמך זה מגדיר את תנאי השירות והודעות הקשורות בביטוח עבור מערכת ניהול הקבלנים שלנו.
            </p>
            
            <h3 style="color: #882DD7; margin-bottom: 15px; font-size: 20px;">תנאי השירות</h3>
            <p style="line-height: 1.8; color: #555; margin-bottom: 25px; font-size: 16px;">
              השימוש במערכת ניהול הקבלנים של שוקו ביטוח כפוף לתנאים המפורטים להלן. על ידי השימוש במערכת, אתם מסכימים לתנאים אלו.
            </p>
            
            <h3 style="color: #882DD7; margin-bottom: 15px; font-size: 20px;">הודעות הקשורות בביטוח</h3>
            <p style="line-height: 1.8; color: #555; margin-bottom: 25px; font-size: 16px;">
              המערכת מיועדת לניהול מידע על קבלנים, פרויקטים ואנשי קשר הקשורים לביטוח. כל המידע הנשמר במערכת מוגן בהתאם לתקנות הביטוח הישראליות.
            </p>
            
            <h3 style="color: #882DD7; margin-bottom: 15px; font-size: 20px;">הגנת מידע ופרטיות</h3>
            <p style="line-height: 1.8; color: #555; margin-bottom: 25px; font-size: 16px;">
              אנו מתחייבים להגן על המידע האישי והעסקי שלכם בהתאם לחוק הגנת הפרטיות ולמדיניות הפרטיות שלנו.
            </p>
            
            <h3 style="color: #882DD7; margin-bottom: 15px; font-size: 20px;">אחריות וביטוח</h3>
            <p style="line-height: 1.8; color: #555; margin-bottom: 25px; font-size: 16px;">
              השימוש במערכת הוא על אחריותכם הבלעדית. אנו לא נושאים באחריות לנזקים שעלולים להיגרם כתוצאה מהשימוש במערכת, למעט במקרים המכוסים בפוליסת הביטוח שלנו.
            </p>
            
            <h3 style="color: #882DD7; margin-bottom: 15px; font-size: 20px;">שינויים בתנאים</h3>
            <p style="line-height: 1.8; color: #555; margin-bottom: 25px; font-size: 16px;">
              אנו שומרים לעצמנו את הזכות לשנות תנאים אלו מעת לעת. שינויים ייכנסו לתוקף מייד עם פרסומם במערכת.
            </p>
            
            <h3 style="color: #882DD7; margin-bottom: 15px; font-size: 20px;">קשר ותמיכה</h3>
            <p style="line-height: 1.8; color: #555; margin-bottom: 25px; font-size: 16px;">
              לשאלות או הבהרות בנוגע לתנאים אלו או לשירותי הביטוח שלנו, אנא צרו קשר עם הצוות שלנו.
            </p>
          </div>
          
          <div style="border-top: 1px solid #ddd; padding-top: 20px; text-align: center;">
            <p style="color: #666; margin-bottom: 15px; font-size: 14px;">© 2024 שוקו ביטוח. כל הזכויות שמורות.</p>
            <p style="margin-bottom: 10px;">
              <a href="https://docs.google.com/document/d/${documentId}/edit?tab=t.0#heading=h.wefuos204y1t" 
                 target="_blank" 
                 style="color: #882DD7; text-decoration: none; font-size: 16px;">
                צפה במסמך המקורי ב-Google Docs
              </a>
            </p>
            <p>
              <a href="/privacyPolicy" style="color: #882DD7; text-decoration: none; margin-left: 15px; font-size: 16px;">מדיניות הפרטיות</a>
              <a href="/" style="color: #882DD7; text-decoration: none; margin-right: 15px; font-size: 16px;">חזרה למערכת</a>
            </p>
          </div>
        </div>
      `
    };

    res.json({
      success: true,
      content: documentContent
    });
  } catch (error) {
    console.error('Error fetching terms of use HTML:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch terms of use HTML'
    });
  }
});

module.exports = router;
