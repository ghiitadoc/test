import React, { useState, useEffect } from 'react';
import { 
    Button, TextField, Box, Grid, CircularProgress, Alert, Dialog, DialogActions, DialogContent, DialogTitle,
    FormControl, InputLabel, Select, MenuItem 
} from '@mui/material';
// For datetime pickers, if native ones are not sufficient, consider MUI X Date Pickers
// import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'; // Requires setup with LocalizationProvider
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

const AvailableSlotForm = ({ open, onClose, onSubmit, cabins, loading, error }) => {
  const [formData, setFormData] = useState({
    cabin_id: '', // Store as cabin_id
    start_time: '', // ISO string format
    end_time: '',   // ISO string format
    price: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({ cabin_id: '', start_time: '', end_time: '', price: '' });
      setFieldErrors({});
    }
  }, [open]);

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
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: undefined }));
    }
     if (fieldErrors.general) {
        setFieldErrors(prev => ({...prev, general: undefined }));
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // Basic validation for dates
    if (new Date(formData.start_time) >= new Date(formData.end_time)) {
        setFieldErrors(prev => ({...prev, end_time: "End time must be after start time."}));
        return;
    }
    // API expects cabin, not cabin_id for this serializer (AvailableSlotCreateSerializer)
    // So we pass formData.cabin_id as 'cabin'
    onSubmit({
        cabin: formData.cabin_id, // Ensure backend serializer expects 'cabin' as PK
        start_time: formData.start_time,
        end_time: formData.end_time,
        price: formData.price
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add New Available Slot</DialogTitle>
      <DialogContent>
        {/* <LocalizationProvider dateAdapter={AdapterDateFns}> Needed for MUI X Pickers */}
        {fieldErrors.general && <Alert severity="error" sx={{ mb: 2 }}>{fieldErrors.general}</Alert>}
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <FormControl fullWidth margin="normal" required error={!!fieldErrors.cabin_id || !!fieldErrors.cabin}>
            <InputLabel id="cabin-select-label">Cabin</InputLabel>
            <Select
              labelId="cabin-select-label"
              id="cabin_id"
              name="cabin_id" // state uses cabin_id
              value={formData.cabin_id}
              label="Cabin"
              onChange={handleChange}
            >
              {cabins.map(cabin => (
                <MenuItem key={cabin.id} value={cabin.id}>{cabin.name}</MenuItem>
              ))}
            </Select>
            {(fieldErrors.cabin_id || fieldErrors.cabin) && <Alert severity="error" sx={{mt:1}}>{fieldErrors.cabin_id || fieldErrors.cabin}</Alert>}
          </FormControl>
          <TextField
            margin="normal"
            required
            fullWidth
            id="start_time"
            label="Start Time"
            name="start_time"
            type="datetime-local" // Native datetime picker
            value={formData.start_time}
            onChange={handleChange}
            error={!!fieldErrors.start_time}
            helperText={fieldErrors.start_time}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="end_time"
            label="End Time"
            name="end_time"
            type="datetime-local" // Native datetime picker
            value={formData.end_time}
            onChange={handleChange}
            error={!!fieldErrors.end_time}
            helperText={fieldErrors.end_time}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="price"
            label="Price"
            name="price"
            type="number"
            InputProps={{ inputProps: { min: 0, step: "0.01" } }}
            value={formData.price}
            onChange={handleChange}
            error={!!fieldErrors.price}
            helperText={fieldErrors.price}
          />
        </Box>
        {/* </LocalizationProvider> */}
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Adding...' : 'Add Slot'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AvailableSlotForm;
