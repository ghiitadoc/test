import React from 'react';
import { Typography, Paper, Box } from '@mui/material';
import { useAuthStore } from '../store/authStore';

const TherapistDashboardPage = () => {
  const { user } = useAuthStore();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Therapist Dashboard
      </Typography>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6">
          Welcome, {user?.first_name || user?.username || 'Therapist'}!
        </Typography>
        <Typography variant="body1">
          This is your dashboard. More features will be added soon.
        </Typography>
        {/* Placeholder for future content */}
      </Paper>
    </Box>
  );
};

export default TherapistDashboardPage;
