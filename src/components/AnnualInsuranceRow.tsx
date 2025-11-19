import React, { useState } from 'react';
import {
  TableRow,
  TableCell,
  Box,
  Typography,
  LinearProgress,
  IconButton,
  Collapse,
  Chip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Insurance as InsuranceIcon
} from '@mui/icons-material';
import { AnnualInsurance } from '../types/annualInsurance';

interface AnnualInsuranceRowProps {
  annualInsurance: AnnualInsurance;
  onRowClick?: (annualInsurance: AnnualInsurance) => void;
  projects?: any[];
}

export default function AnnualInsuranceRow({
  annualInsurance,
  onRowClick,
  projects = []
}: AnnualInsuranceRowProps) {
  const [expanded, setExpanded] = useState(false);

  const coveragePercentage = annualInsurance.coverageAmount > 0
    ? (annualInsurance.usedCoverage / annualInsurance.coverageAmount) * 100
    : 0;

  const handleRowClick = () => {
    if (onRowClick) {
      onRowClick(annualInsurance);
    } else {
      setExpanded(!expanded);
    }
  };

  return (
    <>
      <TableRow
        sx={{
          backgroundColor: '#f0f0ff',
          '&:hover': { backgroundColor: '#e8e8ff', cursor: 'pointer' }
        }}
        onClick={handleRowClick}
      >
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InsuranceIcon sx={{ color: '#6b47c1' }} />
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              {annualInsurance.policyNumber || 'ללא מספר פוליסה'}
            </Typography>
          </Box>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{annualInsurance.insurer || 'ללא חברת ביטוח'}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {annualInsurance.coverageAmount.toLocaleString('he-IL')} ₪
          </Typography>
        </TableCell>
        <TableCell>
          <Box sx={{ minWidth: 100 }}>
            <LinearProgress
              variant="determinate"
              value={coveragePercentage}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: '#e0e0e0',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: coveragePercentage > 80 ? '#f44336' : coveragePercentage > 50 ? '#ff9800' : '#4caf50'
                }
              }}
            />
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
              {annualInsurance.remainingCoverage.toLocaleString('he-IL')} ₪ נותר
            </Typography>
          </Box>
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {annualInsurance.startDate ? new Date(annualInsurance.startDate).toLocaleDateString('he-IL') : ''}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {annualInsurance.endDate ? new Date(annualInsurance.endDate).toLocaleDateString('he-IL') : ''}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={`${annualInsurance.projectIds?.length || 0} פרויקטים`}
            size="small"
            sx={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}
          />
        </TableCell>
        <TableCell>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </TableCell>
      </TableRow>
      {expanded && projects && projects.length > 0 && (
        <TableRow>
          <TableCell colSpan={8} sx={{ py: 2, backgroundColor: '#fafafa' }}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                פרויקטים הכלולים:
              </Typography>
              {projects.map((project) => (
                <Box
                  key={project._id || project.id}
                  sx={{
                    p: 1,
                    mb: 1,
                    backgroundColor: 'white',
                    borderRadius: 1,
                    border: '1px solid #e0e0e0'
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {project.projectName || 'ללא שם'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ערך: {(project.valueNis || project.value || 0).toLocaleString('he-IL')} ₪
                  </Typography>
                </Box>
              ))}
            </Box>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}



