import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { loginUser } from '../services/authService';
import { Avatar, Button, TextField, Typography, Box, Link as MuiLink, Grid } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user: authUser } = useAuthStore(); // Get login from store, and user for redirect logic

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const result = await loginUser({ username, password });

    setLoading(false);
    if (result.success && result.user) {
      // Login action in authStore is already called by loginUser service
      // Determine redirect path based on user role
      const redirectPath = result.user.is_admin ? '/admin/dashboard' 
                         : result.user.is_therapist ? '/therapist/dashboard' 
                         : '/login'; // Fallback, though should not happen with role checks
      navigate(from || redirectPath, { replace: true });
    } else {
      setError(result.error?.detail || result.error?.non_field_errors?.join(' ') || 'Failed to login. Please check your credentials.');
    }
  };

  return (
    <>
      <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
        <LockOutlinedIcon />
      </Avatar>
      <Typography component="h1" variant="h5">
        Sign in
      </Typography>
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="username"
          label="Username"
          name="username"
          autoComplete="username"
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={!!error} // Show error state on field if general error exists
        />
        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label="Password"
          type="password"
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={!!error}
          helperText={error} // Display error message under password or a general message area
        />
        {/* Add a general error display area if preferred over helperText */}
        {/* {error && <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>} */}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={loading}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </Button>
        <Grid container>
          <Grid item xs>
            {/* <MuiLink href="#" variant="body2">
              Forgot password?
            </MuiLink> */}
          </Grid>
          <Grid item>
            <MuiLink component="button" variant="body2" onClick={() => navigate('/register')}>
              {"Don't have an account? Sign Up (Therapist)"}
            </MuiLink>
          </Grid>
        </Grid>
      </Box>
    </>
  );
};

export default LoginPage;
