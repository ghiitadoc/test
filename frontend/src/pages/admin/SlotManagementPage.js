import React, { useState, useEffect, useCallback } from 'react';
import { 
    Typography, Paper, Box, Button, CircularProgress, Alert, Snackbar, Dialog, DialogActions, 
    DialogContent, DialogContentText, DialogTitle, Grid, TextField, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { 
    getAdminAvailableSlots, createAvailableSlot, deleteAvailableSlot, getAllCabins 
} from '../../services/adminService'; // Assuming getAllCabins is also in adminService or a shared service
import AvailableSlotsList from '../../components/admin/AvailableSlotsList';
import AvailableSlotForm from '../../components/admin/AvailableSlotForm';

const SlotManagementPage = () => {
  const [slots, setSlots] = useState([]);
  const [cabins, setCabins] = useState([]); // For cabin filter and form dropdown
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState(null);
  const [filters, setFilters] = useState({
    cabin_id: '',
    date: '', // For filtering by a specific date
  });

  const fetchAllCabins = useCallback(async () => {
    // No specific loading state for this, as it's for the filter dropdown
    const result = await getAllCabins();
    if (result.success) {
      setCabins(result.data);
    } else {
      console.error("Failed to fetch cabins for filter:", result.error);
      // setError('Could not load cabin list for filters.'); // Optional: show error for this
    }
  }, []);


  const fetchSlots = useCallback(async () => {
    setLoading(true);
    setError('');
    const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '')
    );
    const result = await getAdminAvailableSlots(activeFilters);
    setLoading(false);
    if (result.success) {
      setSlots(result.data);
    } else {
      setError(result.error?.detail || 'Failed to fetch available slots.');
      setSlots([]);
    }
  }, [filters]);

  useEffect(() => {
    fetchAllCabins();
    fetchSlots();
  }, [fetchAllCabins, fetchSlots]);

  const handleFilterChange = (event) => {
    setFilters(prev => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleAddNewSlot = () => {
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (slot) => {
    setSlotToDelete(slot);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!slotToDelete) return;
    setFormLoading(true);
    const result = await deleteAvailableSlot(slotToDelete.id);
    setFormLoading(false);
    setDeleteConfirmOpen(false);
    if (result.success) {
      setSnackbar({ open: true, message: 'Available slot deleted successfully!', severity: 'success' });
      fetchSlots(); // Refresh list
    } else {
      setSnackbar({ open: true, message: result.error?.detail || 'Failed to delete slot.', severity: 'error' });
    }
    setSlotToDelete(null);
  };

  const handleFormSubmit = async (formData) => {
    setFormLoading(true);
    setFormError(null);
    const result = await createAvailableSlot(formData);
    setFormLoading(false);

    if (result.success) {
      setIsFormOpen(false);
      setSnackbar({ open: true, message: 'Available slot created successfully!', severity: 'success' });
      fetchSlots(); // Refresh list
    } else {
      setFormError(result.error || 'Failed to create available slot.');
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" gutterBottom>
          Manage Available Slots
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddNewSlot}>
          Add New Slot
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="cabin-filter-label-slots">Cabin</InputLabel>
            <Select
              labelId="cabin-filter-label-slots"
              id="cabin_id_filter" // Unique ID for filter select
              name="cabin_id"
              value={filters.cabin_id}
              label="Cabin"
              onChange={handleFilterChange}
            >
              <MenuItem value=""><em>All Cabins</em></MenuItem>
              {cabins.map(cabin => (
                <MenuItem key={cabin.id} value={cabin.id}>{cabin.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            id="date_filter"
            name="date"
            label="Date"
            type="date"
            value={filters.date}
            onChange={handleFilterChange}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      </Grid>

      {loading && <CircularProgress sx={{ display: 'block', margin: 'auto', my: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {!loading && !error && (
        <AvailableSlotsList slots={slots} onDelete={handleDeleteRequest} />
      )}

      <AvailableSlotForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        cabins={cabins} // Pass cabins for the dropdown
        loading={formLoading}
        error={formError}
      />

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this available slot? 
            (Cabin: {slotToDelete?.cabin_name || slotToDelete?.cabin}, Start: {slotToDelete?.start_time})
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={formLoading}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus disabled={formLoading}>
             {formLoading ? <CircularProgress size={20}/> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default SlotManagementPage;
