import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert
} from '@mui/material';
import { AnnualInsurance } from '../types/annualInsurance';
import { annualInsurancesAPI } from '../services/api';

interface AnnualInsuranceFormProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  contractorId: string;
  annualInsurance?: AnnualInsurance | null;
}

export default function AnnualInsuranceForm({
  open,
  onClose,
  onSave,
  contractorId,
  annualInsurance
}: AnnualInsuranceFormProps) {
  const [formData, setFormData] = useState({
    policyNumber: '',
    insurer: '',
    coverageAmount: '',
    startDate: '',
    endDate: '',
    notes: ''
  });
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (annualInsurance) {
      setFormData({
        policyNumber: annualInsurance.policyNumber || '',
        insurer: annualInsurance.insurer || '',
        coverageAmount: annualInsurance.coverageAmount?.toString() || '',
        startDate: annualInsurance.startDate || '',
        endDate: annualInsurance.endDate || '',
        notes: annualInsurance.notes || ''
      });
    } else {
      setFormData({
        policyNumber: '',
        insurer: '',
        coverageAmount: '',
        startDate: '',
        endDate: '',
        notes: ''
      });
    }
    setError('');
  }, [annualInsurance, open]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSave = async () => {
    setError('');

    // Validation
    if (!formData.policyNumber.trim()) {
      setError('מספר פוליסה הוא שדה חובה');
      return;
    }

    if (!formData.insurer.trim()) {
      setError('חברת ביטוח היא שדה חובה');
      return;
    }

    const coverageAmount = parseFloat(formData.coverageAmount.replace(/[^\d.]/g, '')) || 0;
    if (coverageAmount <= 0) {
      setError('סכום כיסוי חייב להיות גדול מ-0');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setError('תאריכי התחלה וסיום הם שדות חובה');
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError('תאריך התחלה חייב להיות לפני תאריך סיום');
      return;
    }

    setSaving(true);

    try {
      const year = new Date(formData.startDate).getFullYear();
      const data = {
        contractorId,
        mainContractor: contractorId,
        policyNumber: formData.policyNumber.trim(),
        insurer: formData.insurer.trim(),
        coverageAmount,
        startDate: formData.startDate,
        endDate: formData.endDate,
        year,
        notes: formData.notes.trim()
      };

      if (annualInsurance?._id || annualInsurance?.id) {
        await annualInsurancesAPI.update(annualInsurance._id || annualInsurance.id || '', data);
      } else {
        await annualInsurancesAPI.create(data);
      }

      onSave();
      onClose();
    } catch (err: any) {
      console.error('Error saving annual insurance:', err);
      setError(err.message || 'שגיאה בשמירת פוליסה פתוחה');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      policyNumber: '',
      insurer: '',
      coverageAmount: '',
      startDate: '',
      endDate: '',
      notes: ''
    });
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {annualInsurance ? 'עריכת פוליסה פתוחה' : 'פוליסה פתוחה חדשה'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {error && (
            <Alert severity="error">{error}</Alert>
          )}

          <TextField
            label="מספר פוליסה"
            value={formData.policyNumber}
            onChange={(e) => handleChange('policyNumber', e.target.value)}
            fullWidth
            required
          />

          <TextField
            label="חברת ביטוח"
            value={formData.insurer}
            onChange={(e) => handleChange('insurer', e.target.value)}
            fullWidth
            required
          />

          <TextField
            label="סכום כיסוי (₪)"
            value={formData.coverageAmount}
            onChange={(e) => {
              const numericValue = e.target.value.replace(/[^\d]/g, '');
              handleChange('coverageAmount', numericValue);
            }}
            fullWidth
            required
            type="text"
            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="תאריך התחלה"
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="תאריך סיום"
              type="date"
              value={formData.endDate}
              onChange={(e) => handleChange('endDate', e.target.value)}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          <TextField
            label="הערות (אופציונלי)"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            fullWidth
            multiline
            rows={3}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} variant="outlined" disabled={saving}>
          ביטול
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          sx={{ backgroundColor: '#6b47c1', '&:hover': { backgroundColor: '#5a3aa1' } }}
          disabled={saving}
        >
          {saving ? 'שומר...' : 'שמור'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}



