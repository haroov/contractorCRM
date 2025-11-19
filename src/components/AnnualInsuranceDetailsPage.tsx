import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { AnnualInsurance } from '../types/annualInsurance';
import { annualInsurancesAPI } from '../services/api';
import CoverageIncreaseDialog from './CoverageIncreaseDialog';
import AnnualInsuranceForm from './AnnualInsuranceForm';

export default function AnnualInsuranceDetailsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const annualInsuranceId = searchParams.get('id');
  const contractorId = searchParams.get('contractorId');

  const [annualInsurance, setAnnualInsurance] = useState<AnnualInsurance | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [increaseDialogOpen, setIncreaseDialogOpen] = useState(false);

  useEffect(() => {
    if (annualInsuranceId) {
      loadAnnualInsurance();
    }
  }, [annualInsuranceId]);

  const loadAnnualInsurance = async () => {
    if (!annualInsuranceId) return;

    try {
      setLoading(true);
      const data = await annualInsurancesAPI.getById(annualInsuranceId);
      setAnnualInsurance(data);

      if (data.projectIds && data.projectIds.length > 0) {
        const projectsData = await annualInsurancesAPI.getProjects(annualInsuranceId);
        setProjects(projectsData);
      }
    } catch (error) {
      console.error('Error loading annual insurance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIncreaseCoverage = async (amount: number, premium: number, reason?: string) => {
    if (!annualInsuranceId) return;

    try {
      await annualInsurancesAPI.increaseCoverage(annualInsuranceId, amount, premium, reason);
      await loadAnnualInsurance();
    } catch (error) {
      console.error('Error increasing coverage:', error);
      alert('שגיאה בהגדלת כיסוי');
    }
  };

  const handleSave = async () => {
    await loadAnnualInsurance();
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>טוען...</Typography>
      </Box>
    );
  }

  if (!annualInsurance) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">פוליסה פתוחה לא נמצאה</Alert>
      </Box>
    );
  }

  const coveragePercentage = annualInsurance.coverageAmount > 0
    ? (annualInsurance.usedCoverage / annualInsurance.coverageAmount) * 100
    : 0;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          variant="outlined"
        >
          חזרה
        </Button>
        <Typography variant="h5" sx={{ flex: 1 }}>
          פרטי פוליסה פתוחה
        </Typography>
        <Button
          startIcon={<EditIcon />}
          onClick={() => setEditDialogOpen(true)}
          variant="contained"
          sx={{ backgroundColor: '#6b47c1', '&:hover': { backgroundColor: '#5a3aa1' } }}
        >
          עריכה
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          מידע כללי
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              מספר פוליסה
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              {annualInsurance.policyNumber}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              חברת ביטוח
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              {annualInsurance.insurer}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              תאריך התחלה
            </Typography>
            <Typography variant="body1">
              {annualInsurance.startDate ? new Date(annualInsurance.startDate).toLocaleDateString('he-IL') : ''}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              תאריך סיום
            </Typography>
            <Typography variant="body1">
              {annualInsurance.endDate ? new Date(annualInsurance.endDate).toLocaleDateString('he-IL') : ''}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          כיסוי ביטוח
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">
              כיסוי כולל: {annualInsurance.coverageAmount.toLocaleString('he-IL')} ₪
            </Typography>
            <Typography variant="body2">
              כיסוי נותר: {annualInsurance.remainingCoverage.toLocaleString('he-IL')} ₪
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={coveragePercentage}
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: '#e0e0e0',
              '& .MuiLinearProgress-bar': {
                backgroundColor: coveragePercentage > 80 ? '#f44336' : coveragePercentage > 50 ? '#ff9800' : '#4caf50'
              }
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            כיסוי בשימוש: {annualInsurance.usedCoverage.toLocaleString('he-IL')} ₪ ({coveragePercentage.toFixed(1)}%)
          </Typography>
        </Box>
        <Button
          startIcon={<AddIcon />}
          onClick={() => setIncreaseDialogOpen(true)}
          variant="outlined"
          sx={{ mt: 1 }}
        >
          הגדלת כיסוי
        </Button>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          פרויקטים ({projects.length})
        </Typography>
        {projects.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>שם פרויקט</TableCell>
                  <TableCell>ערך (₪)</TableCell>
                  <TableCell>תאריך התחלה</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {projects.map((project) => (
                  <TableRow
                    key={project._id || project.id}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => {
                      navigate(`/project-details?projectId=${project._id || project.id}&mode=view`);
                    }}
                  >
                    <TableCell>{project.projectName || 'ללא שם'}</TableCell>
                    <TableCell>
                      {(project.valueNis || project.value || 0).toLocaleString('he-IL')} ₪
                    </TableCell>
                    <TableCell>
                      {project.startDate ? new Date(project.startDate).toLocaleDateString('he-IL') : ''}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="text.secondary">
            אין פרויקטים בפוליסה זו
          </Typography>
        )}
      </Paper>

      {annualInsurance.coverageIncreases && annualInsurance.coverageIncreases.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            היסטוריית הגדלות כיסוי
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>תאריך</TableCell>
                  <TableCell>סכום הגדלה</TableCell>
                  <TableCell>פרמיה</TableCell>
                  <TableCell>סיבה</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {annualInsurance.coverageIncreases.map((increase, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {increase.date ? new Date(increase.date).toLocaleDateString('he-IL') : ''}
                    </TableCell>
                    <TableCell>{increase.amount.toLocaleString('he-IL')} ₪</TableCell>
                    <TableCell>{increase.premium.toLocaleString('he-IL')} ₪</TableCell>
                    <TableCell>{increase.reason || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <AnnualInsuranceForm
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleSave}
        contractorId={contractorId || annualInsurance.contractorId}
        annualInsurance={annualInsurance}
      />

      <CoverageIncreaseDialog
        open={increaseDialogOpen}
        onClose={() => setIncreaseDialogOpen(false)}
        onConfirm={handleIncreaseCoverage}
        annualInsurance={annualInsurance}
      />
    </Box>
  );
}



