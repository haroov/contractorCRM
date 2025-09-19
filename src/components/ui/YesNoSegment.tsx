import React from 'react';
import { ToggleButton, ToggleButtonGroup, Box } from '@mui/material';

export type YesNoSegmentProps = {
  value: boolean | null;
  onChange: (val: boolean) => void;
  size?: 'small' | 'medium';
  disabled?: boolean;
  yesLabel?: string;
  noLabel?: string;
  className?: string;
};

export const YesNoSegment: React.FC<YesNoSegmentProps> = ({
  value,
  onChange,
  size = 'medium',
  disabled = false,
  yesLabel = 'כן',
  noLabel = 'לא',
  className,
}) => {
  const handleChange = (
    event: React.MouseEvent<HTMLElement>,
    newValue: boolean | null,
  ) => {
    if (newValue !== null) {
      onChange(newValue);
    }
  };

  const buttonSize = size === 'small' ? 'small' : 'medium';
  const buttonHeight = size === 'small' ? 32 : 40;
  const fontSize = size === 'small' ? '0.75rem' : '0.875rem';

  return (
    <Box 
      className={className}
      sx={{ 
        display: 'inline-flex',
        justifyContent: 'flex-start',
        direction: 'rtl'
      }}
    >
      <ToggleButtonGroup
        value={value}
        exclusive
        onChange={handleChange}
        disabled={disabled}
        size={buttonSize}
        sx={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#f9fafb',
          '& .MuiToggleButtonGroup-grouped': {
            border: 'none',
            borderRadius: 0,
            minWidth: size === 'small' ? '50px' : '60px',
            height: buttonHeight,
            fontSize: fontSize,
            textTransform: 'none',
            fontWeight: 500,
            '&:not(:last-of-type)': {
              borderRight: '1px solid #e5e7eb',
            },
            '&:not(:first-of-type)': {
              borderLeft: '1px solid #e5e7eb',
            },
            '&.Mui-selected': {
              backgroundColor: '#6B46C1',
              color: 'white',
              '&:hover': {
                backgroundColor: '#5B21B6',
              },
            },
            '&:not(.Mui-selected)': {
              backgroundColor: 'transparent',
              color: '#6B7280',
              '&:hover': {
                backgroundColor: '#e5e7eb',
              },
            },
          },
        }}
      >
        <ToggleButton value={false} aria-label={noLabel}>
          {noLabel}
        </ToggleButton>
        <ToggleButton value={true} aria-label={yesLabel}>
          {yesLabel}
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};

export default YesNoSegment;
