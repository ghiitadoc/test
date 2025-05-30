import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerTherapist } from '../services/authService';
import { Avatar, Button, TextField, Typography, Box, Link as MuiLink, Grid, Alert } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: '',
    phone_number: '',
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrors({});
    setSuccessMessage('');

    if (formData.password !== formData.password2) {
      setErrors({ password2: "Passwords do not match." });
      setLoading(false);
      return;
    }

    // Exclude password2 from data sent to API
    const { password2, ...apiData } = formData; 

    const result = await registerTherapist(apiData);
    setLoading(false);

    if (result.success) {
      setSuccessMessage('Registration successful! You can now login.');
      // Optionally redirect to login after a delay or clear form
      setTimeout(() => navigate('/login'), 2000);
    } else {
      if (result.error) {
        // Handle various error structures from Django REST Framework
        const newErrors = {};
        for (const key in result.error) {
          if (Array.isArray(result.error[key])) {
            newErrors[key] = result.error[key].join(' ');
          } else {
            newErrors[key] = result.error[key];
          }
        }
        // For non_field_errors or general detail message
        if (result.error.detail) {
            newErrors.general = result.error.detail;
        } else if (result.error.non_field_errors) {
            newErrors.general = result.error.non_field_errors.join(' ');
        }
        setErrors(newErrors);
      } else {
        setErrors({ general: 'An unknown error occurred.' });
      }
    }
  };

  return (
    <>
      <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
        <PersonAddIcon />
      </Avatar>
      <Typography component="h1" variant="h5">
        Therapist Registration
      </Typography>
      {successMessage && <Alert severity="success" sx={{ mt: 2, width: '100%' }}>{successMessage}</Alert>}
      {errors.general && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{errors.general}</Alert>}
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="username"
          label="Username"
          name="username"
          autoComplete="username"
          value={formData.username}
          onChange={handleChange}
          error={!!errors.username}
          helperText={errors.username}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="Email Address"
          name="email"
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          error={!!errors.email}
          helperText={errors.email}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label="Password"
          type="password"
          id="password"
          value={formData.password}
          onChange={handleChange}
          error={!!errors.password}
          helperText={errors.password}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          name="password2"
          label="Confirm Password"
          type="password"
          id="password2"
          value={formData.password2}
          onChange={handleChange}
          error={!!errors.password2}
          helperText={errors.password2}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="first_name"
          label="First Name"
          name="first_name"
          autoComplete="given-name"
          value={formData.first_name}
          onChange={handleChange}
          error={!!errors.first_name}
          helperText={errors.first_name}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="last_name"
          label="Last Name"
          name="last_name"
          autoComplete="family-name"
          value={formData.last_name}
          onChange={handleChange}
          error={!!errors.last_name}
          helperText={errors.last_name}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          id="phone_number"
          label="Phone Number"
          name="phone_number"
          autoComplete="tel"
          value={formData.phone_number}
          onChange={handleChange}
          error={!!errors.phone_number}
          helperText={errors.phone_number}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={loading}
        >
          {loading ? 'Registering...' : 'Register'}
        </Button>
        <Grid container justifyContent="flex-end">
          <Grid item>
            <MuiLink component="button" variant="body2" onClick={() => navigate('/login')}>
              Already have an account? Sign in
            </MuiLink>
          </Grid>
        </Grid>
      </Box>
    </>
  );
};

export default RegisterPage;
