import React from 'react';
import { Outlet } from 'react-router-dom';
import { Container, Box, Paper } from '@mui/material';

const AuthLayout = () => {
  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            padding: 4, 
            width: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center' 
          }}
        >
          <Outlet /> {/* Nested routes (LoginPage, RegisterPage) will render here */}
        </Paper>
      </Box>
    </Container>
  );
};

export default AuthLayout;
