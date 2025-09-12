import React, { useState, useEffect } from 'react';
import { Container, Paper, Typography, Box, Link, CircularProgress, Alert } from '@mui/material';

interface TermsContent {
  title: string;
  subtitle: string;
  lastUpdated: string;
  googleDocsUrl: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
}

const TermsOfUse: React.FC = () => {
  const [content, setContent] = useState<TermsContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch('/api/docs/terms-of-use');
        const data = await response.json();
        
        if (data.success) {
          setContent(data.content);
        } else {
          setError('שגיאה בטעינת התוכן');
        }
      } catch (err) {
        setError('שגיאה בטעינת התוכן');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ mt: 2 }}>
            טוען תוכן...
          </Typography>
        </Paper>
      </Container>
    );
  }

  if (error || !content) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || 'שגיאה בטעינת התוכן'}
          </Alert>
          <Typography variant="body1">
            אנא נסה לרענן את הדף או פנה לתמיכה.
          </Typography>
        </Paper>
      </Container>
    );
  }

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
            {content.title}
          </Typography>
          <Typography variant="h6" color="text.secondary">
            {content.subtitle}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            עדכון אחרון: {content.lastUpdated}
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          {content.sections.map((section, index) => (
            <Box key={index}>
              <Typography variant="h5" sx={{ color: '#882DD7', mb: 2, mt: 4 }}>
                {section.title}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, color: '#555', lineHeight: 1.8 }}>
                {section.content}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #ddd', textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            © 2024 שוקו ביטוח. כל הזכויות שמורות.
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Link 
              href={content.googleDocsUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ 
                color: '#882DD7', 
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
                mr: 2
              }}
            >
              צפה במסמך המקורי ב-Google Docs
            </Link>
          </Box>
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
