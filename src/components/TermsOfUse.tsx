import React, { useState, useEffect } from 'react';
import { Container, Paper, Typography, Box, Link, CircularProgress, Alert } from '@mui/material';

interface TermsContent {
  title: string;
  subtitle: string;
  lastUpdated: string;
  googleDocsUrl: string;
  content: string;
}

const TermsOfUse: React.FC = () => {
  const [content, setContent] = useState<TermsContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch('/api/google-docs/terms-of-use-html');
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
      <Paper elevation={3} sx={{ p: 0 }}>
        <Box
          dangerouslySetInnerHTML={{ __html: content.content }}
        />
      </Paper>
    </Container>
  );
};

export default TermsOfUse;
