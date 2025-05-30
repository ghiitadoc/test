import React, { useState, useEffect } from 'react';
import { Button, TextField, Box, Grid, CircularProgress, Alert, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

const CabinForm = ({ open, onClose, onSubmit, initialData, loading, error }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    capacity: 1,
  });
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        capacity: initialData.capacity || 1,
      });
    } else {
      // Reset for "Add New"
      setFormData({ name: '', description: '', capacity: 1 });
    }
  }, [initialData, open]); // Reset form when dialog opens or initialData changes

  useEffect(() => {
    if (error) {
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
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: name === 'capacity' ? parseInt(value, 10) : value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: undefined }));
    }
    if (fieldErrors.general) {
        setFieldErrors(prev => ({ ...prev, general: undefined }));
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initialData ? 'Edit Cabin' : 'Add New Cabin'}</DialogTitle>
      <DialogContent>
        {fieldErrors.general && <Alert severity="error" sx={{ mb: 2 }}>{fieldErrors.general}</Alert>}
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="name"
            label="Cabin Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            error={!!fieldErrors.name}
            helperText={fieldErrors.name}
            autoFocus
          />
          <TextField
            margin="normal"
            fullWidth
            id="description"
            label="Description"
            name="description"
            multiline
            rows={3}
            value={formData.description}
            onChange={handleChange}
            error={!!fieldErrors.description}
            helperText={fieldErrors.description}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="capacity"
            label="Capacity"
            name="capacity"
            type="number"
            InputProps={{ inputProps: { min: 1 } }}
            value={formData.capacity}
            onChange={handleChange}
            error={!!fieldErrors.capacity}
            helperText={fieldErrors.capacity}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Cabin')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CabinForm;
