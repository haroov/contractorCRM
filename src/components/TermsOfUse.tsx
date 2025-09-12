import React from 'react';
import { Container, Paper, Typography, Box, Link } from '@mui/material';

const TermsOfUse: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4, pb: 2, borderBottom: '2px solid #882DD7' }}>
          <Box
            component="img"
            src="/src/assets/logo.svg"
            alt="שוקו ביטוח"
            sx={{
              width: 60,
              height: 60,
              mb: 2
            }}
          />
          <Typography variant="h4" sx={{ color: '#333', mb: 1 }}>
            תנאי השירות
          </Typography>
          <Typography variant="h5" sx={{ color: '#333', mb: 1 }}>
            והודעות הקשורות בביטוח
          </Typography>
          <Typography variant="h6" color="text.secondary">
            שוקו ביטוח - מערכת ניהול קבלנים
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            עדכון אחרון: 11 ביולי, 2023
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ color: '#882DD7', mb: 2, mt: 4 }}>
            מבוא
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: '#555', lineHeight: 1.8 }}>
            ברוכים הבאים לשוקו ביטוח. מסמך זה מגדיר את תנאי השירות והודעות הקשורות בביטוח עבור מערכת ניהול הקבלנים שלנו.
          </Typography>

          <Typography variant="h5" sx={{ color: '#882DD7', mb: 2, mt: 4 }}>
            תנאי השירות
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: '#555', lineHeight: 1.8 }}>
            השימוש במערכת ניהול הקבלנים של שוקו ביטוח כפוף לתנאים המפורטים להלן. על ידי השימוש במערכת, אתם מסכימים לתנאים אלו.
          </Typography>

          <Typography variant="h5" sx={{ color: '#882DD7', mb: 2, mt: 4 }}>
            הודעות הקשורות בביטוח
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: '#555', lineHeight: 1.8 }}>
            המערכת מיועדת לניהול מידע על קבלנים, פרויקטים ואנשי קשר הקשורים לביטוח. כל המידע הנשמר במערכת מוגן בהתאם לתקנות הביטוח הישראליות.
          </Typography>

          <Typography variant="h5" sx={{ color: '#882DD7', mb: 2, mt: 4 }}>
            הגנת מידע ופרטיות
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: '#555', lineHeight: 1.8 }}>
            אנו מתחייבים להגן על המידע האישי והעסקי שלכם בהתאם לחוק הגנת הפרטיות ולמדיניות הפרטיות שלנו.
          </Typography>

          <Typography variant="h5" sx={{ color: '#882DD7', mb: 2, mt: 4 }}>
            אחריות וביטוח
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: '#555', lineHeight: 1.8 }}>
            השימוש במערכת הוא על אחריותכם הבלעדית. אנו לא נושאים באחריות לנזקים שעלולים להיגרם כתוצאה מהשימוש במערכת, למעט במקרים המכוסים בפוליסת הביטוח שלנו.
          </Typography>

          <Typography variant="h5" sx={{ color: '#882DD7', mb: 2, mt: 4 }}>
            שינויים בתנאים
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: '#555', lineHeight: 1.8 }}>
            אנו שומרים לעצמנו את הזכות לשנות תנאים אלו מעת לעת. שינויים ייכנסו לתוקף מייד עם פרסומם במערכת.
          </Typography>

          <Typography variant="h5" sx={{ color: '#882DD7', mb: 2, mt: 4 }}>
            קשר ותמיכה
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: '#555', lineHeight: 1.8 }}>
            לשאלות או הבהרות בנוגע לתנאים אלו או לשירותי הביטוח שלנו, אנא צרו קשר עם הצוות שלנו.
          </Typography>
        </Box>

        <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #ddd', textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            © 2024 שוקו ביטוח. כל הזכויות שמורות.
          </Typography>
          <Box>
            <Link 
              href="/privacyPolicy" 
              sx={{ 
                color: '#882DD7', 
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
                mr: 2
              }}
            >
              מדיניות הפרטיות
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

export default TermsOfUse;
