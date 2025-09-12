import React from 'react';
import { Container, Paper, Typography, Box, Link } from '@mui/material';

const PrivacyPolicy: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4, pb: 2, borderBottom: '2px solid #882DD7' }}>
          <Box
            component="img"
            src="/assets/logo.svg"
            alt="שוקו ביטוח"
            sx={{
              width: 60,
              height: 60,
              mb: 2
            }}
          />
          <Typography variant="h4" sx={{ color: '#333', mb: 1 }}>
            מדיניות המידע והפרטיות
          </Typography>
          <Typography variant="h6" color="text.secondary">
            שוקו ביטוח - מערכת ניהול קבלנים
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ color: '#882DD7', mb: 2, mt: 4 }}>
            1. מבוא
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: '#555', lineHeight: 1.8 }}>
            שוקו ביטוח מתחייבת להגן על פרטיות המשתמשים במערכת ניהול הקבלנים. מדיניות זו מסבירה כיצד אנו אוספים, משתמשים ומגנים על המידע שלכם.
          </Typography>

          <Typography variant="h5" sx={{ color: '#882DD7', mb: 2, mt: 4 }}>
            2. איסוף מידע
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: '#555', lineHeight: 1.8 }}>
            אנו אוספים מידע אישי ועסקי הנדרש לניהול הקבלנים והפרויקטים, כולל:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <Typography component="li" variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>
              פרטי קשר (שם, אימייל, טלפון)
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>
              מידע עסקי (שם החברה, מספר רישום, כתובת)
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>
              מידע על פרויקטים ופעילות עסקית
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>
              מידע טכני (כתובת IP, דפדפן, מערכת הפעלה)
            </Typography>
          </Box>

          <Typography variant="h5" sx={{ color: '#882DD7', mb: 2, mt: 4 }}>
            3. שימוש במידע
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: '#555', lineHeight: 1.8 }}>
            המידע נאסף ונשמר למטרות הבאות:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <Typography component="li" variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>
              ניהול וטיפול בקבלנים ופרויקטים
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>
              תקשורת עם לקוחות
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>
              שיפור השירותים
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>
              עמידה בדרישות חוקיות
            </Typography>
          </Box>

          <Typography variant="h5" sx={{ color: '#882DD7', mb: 2, mt: 4 }}>
            4. הגנת מידע
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: '#555', lineHeight: 1.8 }}>
            אנו נוקטים באמצעי אבטחה מתקדמים להגנה על המידע:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <Typography component="li" variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>
              הצפנת מידע רגיש
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>
              גישה מוגבלת למידע
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>
              גיבויים קבועים
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>
              מעקב אחר גישה למידע
            </Typography>
          </Box>

          <Typography variant="h5" sx={{ color: '#882DD7', mb: 2, mt: 4 }}>
            5. שיתוף מידע
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: '#555', lineHeight: 1.8 }}>
            אנו לא משתפים מידע אישי עם צדדים שלישיים, למעט במקרים הבאים:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <Typography component="li" variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>
              בהסכמה מפורשת מהמשתמש
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>
              לצורך עמידה בדרישות חוקיות
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>
              להגנה על זכויות החברה
            </Typography>
          </Box>

          <Typography variant="h5" sx={{ color: '#882DD7', mb: 2, mt: 4 }}>
            6. זכויות המשתמש
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: '#555', lineHeight: 1.8 }}>
            למשתמשים יש זכות:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <Typography component="li" variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>
              לבקש גישה למידע האישי
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>
              לתקן מידע שגוי
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>
              למחוק מידע אישי
            </Typography>
            <Typography component="li" variant="body1" sx={{ color: '#555', lineHeight: 1.8, mb: 1 }}>
              להתנגד לעיבוד המידע
            </Typography>
          </Box>

          <Typography variant="h5" sx={{ color: '#882DD7', mb: 2, mt: 4 }}>
            7. עוגיות (Cookies)
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: '#555', lineHeight: 1.8 }}>
            המערכת משתמשת בעוגיות לשיפור חוויית המשתמש ולפונקציונליות המערכת.
          </Typography>

          <Typography variant="h5" sx={{ color: '#882DD7', mb: 2, mt: 4 }}>
            8. שינויים במדיניות
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: '#555', lineHeight: 1.8 }}>
            אנו שומרים לעצמנו את הזכות לעדכן מדיניות זו מעת לעת. שינויים ייכנסו לתוקף מייד עם פרסומם.
          </Typography>

          <Typography variant="h5" sx={{ color: '#882DD7', mb: 2, mt: 4 }}>
            9. קשר
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: '#555', lineHeight: 1.8 }}>
            לשאלות או הבהרות בנוגע למדיניות הפרטיות, אנא צרו קשר עם הצוות שלנו.
          </Typography>
        </Box>

        <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #ddd', textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            © 2024 שוקו ביטוח. כל הזכויות שמורות.
          </Typography>
          <Box>
            <Link 
              href="/termsOfUse" 
              sx={{ 
                color: '#882DD7', 
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
                mr: 2
              }}
            >
              תנאי השירות
            </Link>
            <Link 
              href="/" 
              sx={{ 
                color: '#882DD7', 
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              חזרה למערכת
            </Link>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default PrivacyPolicy;
