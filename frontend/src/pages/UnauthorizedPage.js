import React from 'react';
import { Typography, Paper, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

const UnauthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <Box 
      display="flex" 
      flexDirection="column" 
      alignItems="center" 
      justifyContent="center" 
      minHeight="60vh" // Takes significant portion of viewport height
    >
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center', maxWidth: '400px' }}>
        <ReportProblemIcon sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom>
          Unauthorized Access
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Sorry, you do not have the necessary permissions to access this page.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/')}>
          Go to Homepage
        </Button>
      </Paper>
    </Box>
  );
};

export default UnauthorizedPage;
