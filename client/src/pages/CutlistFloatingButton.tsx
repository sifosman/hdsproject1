import React from 'react';
import { Button, Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

interface FloatingButtonProps {
  onClick: () => void;
  color?: 'primary' | 'secondary' | 'success' | 'error';
}

const FloatingActionButton: React.FC<FloatingButtonProps> = ({ onClick, color = 'secondary' }) => {
  return (
    <Box sx={{ 
      position: 'fixed', 
      bottom: 24, 
      right: 24, 
      zIndex: 1000,
      display: { xs: 'block', sm: 'none' }
    }}>
      <Button
        variant="contained"
        color={color}
        sx={{ 
          borderRadius: '50%', 
          minWidth: 0, 
          width: 64, 
          height: 64,
          boxShadow: 3 
        }}
        onClick={onClick}
      >
        <AddIcon fontSize="large" />
      </Button>
    </Box>
  );
};

export default FloatingActionButton;
