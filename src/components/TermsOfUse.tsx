import React from 'react';
import { Container, Paper, Typography, Box, Link } from '@mui/material';

const TermsOfUse: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4, pb: 2, borderBottom: '2px solid #882DD7' }}>
          <Box
            sx={{
              width: 60,
              height: 60,
              backgroundColor: '#882DD7',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: 24,
              mb: 2
            }}
          >
            C
          </Box>
          <Typography variant="h4" sx={{ color: '#333', mb: 1 }}>
            תנאי השירות
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
            ברוכים הבאים למערכת ניהול הקבלנים של שוקו ביטוח. השימוש במערכת זו כפוף לתנאים המפורטים להלן.
          </Typography>

          <Typography variant="h5" sx={{ color: '#882DD7', mb: 2, mt: 4 }}>
            2. קבלת התנאים
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: '#555', lineHeight: 1.8 }}>
            על ידי השימוש במערכת, אתם מסכימים לתנאים אלו. אם אינכם מסכימים לתנאים, אנא אל תשתמשו במערכת.
          </Typography>

          <Typography variant="h5" sx={{ color: '#882DD7', mb: 2, mt: 4 }}>
            3. שימוש במערכת
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: '#555', lineHeight: 1.8 }}>
            המערכת מיועדת לניהול מידע על קבלנים, פרויקטים ואנשי קשר. השימוש במערכת מותר רק למטרות עסקיות לגיטימיות.
          </Typography>

          <Typography variant="h5" sx={{ color: '#882DD7', mb: 2, mt: 4 }}>
            4. הגנת מידע
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: '#555', lineHeight: 1.8 }}>
            אנו מתחייבים להגן על המידע האישי והעסקי שלכם בהתאם למדיניות הפרטיות שלנו.
          </Typography>

          <Typography variant="h5" sx={{ color: '#882DD7', mb: 2, mt: 4 }}>
            5. אחריות
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: '#555', lineHeight: 1.8 }}>
            השימוש במערכת הוא על אחריותכם הבלעדית. אנו לא נושאים באחריות לנזקים שעלולים להיגרם כתוצאה מהשימוש במערכת.
          </Typography>

          <Typography variant="h5" sx={{ color: '#882DD7', mb: 2, mt: 4 }}>
            6. שינויים בתנאים
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: '#555', lineHeight: 1.8 }}>
            אנו שומרים לעצמנו את הזכות לשנות תנאים אלו מעת לעת. שינויים ייכנסו לתוקף מייד עם פרסומם.
          </Typography>

          <Typography variant="h5" sx={{ color: '#882DD7', mb: 2, mt: 4 }}>
            7. קשר
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: '#555', lineHeight: 1.8 }}>
            לשאלות או הבהרות בנוגע לתנאים אלו, אנא צרו קשר עם הצוות שלנו.
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
