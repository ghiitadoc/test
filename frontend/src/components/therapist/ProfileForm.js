import React, { useState, useEffect } from 'react';
import { Button, TextField, Box, Grid, CircularProgress, Alert } from '@mui/material';

const ProfileForm = ({ initialData, onSubmit, onCancel, loading, error }) => {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    // username is not typically editable from here
  });
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        email: initialData.email || '',
        first_name: initialData.first_name || '',
        last_name: initialData.last_name || '',
        phone_number: initialData.phone_number || '',
      });
    }
  }, [initialData]);
  
  useEffect(() => {
    if (error) {
      // Assuming error is an object with field names as keys
      if (typeof error === 'object' && error !== null && !Array.isArray(error)) {
        setFieldErrors(error);
      } else if (typeof error === 'string') {
        setFieldErrors({ general: error });
      } else {
        setFieldErrors({ general: 'An unexpected error occurred.' });
      }
    } else {
      setFieldErrors({});
    }
  }, [error]);


  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
    // Clear specific field error on change
    if (fieldErrors[event.target.name]) {
      setFieldErrors(prev => ({...prev, [event.target.name]: undefined }));
    }
    if (fieldErrors.general) {
        setFieldErrors(prev => ({...prev, general: undefined }));
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(formData);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
      {fieldErrors.general && <Alert severity="error" sx={{ mb: 2 }}>{fieldErrors.general}</Alert>}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            id="first_name"
            label="First Name"
            name="first_name"
            autoComplete="given-name"
            value={formData.first_name}
            onChange={handleChange}
            error={!!fieldErrors.first_name}
            helperText={fieldErrors.first_name}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            id="last_name"
            label="Last Name"
            name="last_name"
            autoComplete="family-name"
            value={formData.last_name}
            onChange={handleChange}
            error={!!fieldErrors.last_name}
            helperText={fieldErrors.last_name}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            error={!!fieldErrors.email}
            helperText={fieldErrors.email}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            required
            fullWidth
            id="phone_number"
            label="Phone Number"
            name="phone_number"
            autoComplete="tel"
            value={formData.phone_number}
            onChange={handleChange}
            error={!!fieldErrors.phone_number}
            helperText={fieldErrors.phone_number}
          />
        </Grid>
      </Grid>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button onClick={onCancel} sx={{ mr: 1 }} disabled={loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>
    </Box>
  );
};

export default ProfileForm;
