import React from 'react';
import { Typography, Paper, Box } from '@mui/material';
import { useAuthStore } from '../store/authStore';

const AdminDashboardPage = () => {
  const { user } = useAuthStore();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6">
          Welcome, {user?.first_name || user?.username || 'Admin'}!
        </Typography>
        <Typography variant="body1">
          This is the admin control panel. More features will be added soon.
        </Typography>
        {/* Placeholder for future content */}
      </Paper>
    </Box>
  );
};

export default AdminDashboardPage;
