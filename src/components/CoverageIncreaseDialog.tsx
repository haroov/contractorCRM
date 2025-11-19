import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert
} from '@mui/material';
import { AnnualInsurance } from '../types/annualInsurance';

interface CoverageIncreaseDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (amount: number, premium: number, reason?: string) => void;
  annualInsurance: AnnualInsurance | null;
}

export default function CoverageIncreaseDialog({
  open,
  onClose,
  onConfirm,
  annualInsurance
}: CoverageIncreaseDialogProps) {
  const [amount, setAmount] = useState<string>('');
  const [premium, setPremium] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const handleConfirm = () => {
    const amountNum = parseFloat(amount.replace(/[^\d.]/g, '')) || 0;
    const premiumNum = parseFloat(premium.replace(/[^\d.]/g, '')) || 0;
    
    if (amountNum <= 0) {
      alert('סכום הגדלה חייב להיות גדול מ-0');
      return;
    }

    onConfirm(amountNum, premiumNum, reason);
    setAmount('');
    setPremium('');
    setReason('');
    onClose();
  };

  const handleClose = () => {
    setAmount('');
    setPremium('');
    setReason('');
    onClose();
  };

  const newCoverage = annualInsurance 
    ? annualInsurance.coverageAmount + (parseFloat(amount.replace(/[^\d.]/g, '')) || 0)
    : 0;

  const newRemaining = annualInsurance
    ? annualInsurance.remainingCoverage + (parseFloat(amount.replace(/[^\d.]/g, '')) || 0)
    : 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>הגדלת כיסוי (דלתא)</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {annualInsurance && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                כיסוי נוכחי: {annualInsurance.coverageAmount.toLocaleString('he-IL')} ₪
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                כיסוי נותר: {annualInsurance.remainingCoverage.toLocaleString('he-IL')} ₪
              </Typography>
            </Box>
          )}

          <TextField
            label="סכום הגדלה (₪)"
            value={amount}
            onChange={(e) => {
              const numericValue = e.target.value.replace(/[^\d]/g, '');
              setAmount(numericValue);
            }}
            fullWidth
            required
            type="text"
            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
          />

          <TextField
            label="פרמיה (₪)"
            value={premium}
            onChange={(e) => {
              const numericValue = e.target.value.replace(/[^\d]/g, '');
              setPremium(numericValue);
            }}
            fullWidth
            type="text"
            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
          />

          <TextField
            label="סיבה (אופציונלי)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            multiline
            rows={3}
          />

          {amount && (
            <Alert severity="info">
              <Typography variant="body2">
                כיסוי חדש: {newCoverage.toLocaleString('he-IL')} ₪
              </Typography>
              <Typography variant="body2">
                כיסוי נותר חדש: {newRemaining.toLocaleString('he-IL')} ₪
              </Typography>
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} variant="outlined">
          ביטול
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          sx={{ backgroundColor: '#6b47c1', '&:hover': { backgroundColor: '#5a3aa1' } }}
          disabled={!amount || parseFloat(amount.replace(/[^\d.]/g, '')) <= 0}
        >
          אישור
        </Button>
      </DialogActions>
    </Dialog>
  );
}



