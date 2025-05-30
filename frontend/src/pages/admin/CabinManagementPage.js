import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Paper, Box, Button, CircularProgress, Alert, Snackbar, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { getAllCabins, createCabin, updateCabin, deleteCabin } from '../../services/adminService';
import CabinList from '../../components/admin/CabinList';
import CabinForm from '../../components/admin/CabinForm';

const CabinManagementPage = () => {
  const [cabins, setCabins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCabin, setEditingCabin] = useState(null); // null for new, object for editing
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [cabinToDelete, setCabinToDelete] = useState(null);

  const fetchCabins = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await getAllCabins();
    setLoading(false);
    if (result.success) {
      setCabins(result.data);
    } else {
      setError(result.error?.detail || 'Failed to fetch cabins.');
      setCabins([]);
    }
  }, []);

  useEffect(() => {
    fetchCabins();
  }, [fetchCabins]);

  const handleAddNew = () => {
    setEditingCabin(null);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleEdit = (cabin) => {
    setEditingCabin(cabin);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (cabin) => {
    setCabinToDelete(cabin);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!cabinToDelete) return;
    setFormLoading(true); // Use formLoading for dialog actions
    const result = await deleteCabin(cabinToDelete.id);
    setFormLoading(false);
    setDeleteConfirmOpen(false);
    if (result.success) {
      setSnackbar({ open: true, message: 'Cabin deleted successfully!', severity: 'success' });
      fetchCabins(); // Refresh list
    } else {
      setSnackbar({ open: true, message: result.error?.detail || 'Failed to delete cabin.', severity: 'error' });
    }
    setCabinToDelete(null);
  };

  const handleFormSubmit = async (formData) => {
    setFormLoading(true);
    setFormError(null);
    let result;
    if (editingCabin) {
      result = await updateCabin(editingCabin.id, formData);
    } else {
      result = await createCabin(formData);
    }
    setFormLoading(false);

    if (result.success) {
      setIsFormOpen(false);
      setSnackbar({ open: true, message: `Cabin ${editingCabin ? 'updated' : 'created'} successfully!`, severity: 'success' });
      fetchCabins(); // Refresh list
    } else {
      setFormError(result.error || `Failed to ${editingCabin ? 'update' : 'create'} cabin.`);
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
          Manage Cabins
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddNew}>
          Add New Cabin
        </Button>
      </Box>

      {loading && <CircularProgress sx={{ display: 'block', margin: 'auto', my: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {!loading && !error && (
        <CabinList cabins={cabins} onEdit={handleEdit} onDelete={handleDeleteRequest} />
      )}

      <CabinForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingCabin}
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
            Are you sure you want to delete the cabin "{cabinToDelete?.name}"? This action cannot be undone.
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

export default CabinManagementPage;
