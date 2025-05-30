import React, { useState, useEffect, useCallback } from 'react';
import { 
    Typography, Paper, Box, Grid, CircularProgress, Alert, List, ListItem, ListItemText, Button, 
    TextField, MenuItem, Select, InputLabel, FormControl, Chip, Snackbar, Dialog, DialogActions, 
    DialogContent, DialogContentText, DialogTitle 
} from '@mui/material';
import { getAllBookings, adminCancelBooking, getAllCabins, getAllTherapists } from '../../services/adminService';

// Helper to format date/time
const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateTimeString).toLocaleString(undefined, options);
};

const getStatusChipColor = (status) => {
    switch (status) {
        case 'booked': return 'primary';
        case 'available': return 'success';
        case 'cancelled': return 'error';
        default: return 'default';
    }
};

const ViewAllBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [cabins, setCabins] = useState([]);
  const [therapists, setTherapists] = useState([]); // For therapist filter
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false); // For cancel action
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    cabin_id: '',
    therapist_id: '',
    date: '',
    status: '',
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedBookingToCancel, setSelectedBookingToCancel] = useState(null);


  const fetchFormData = useCallback(async () => {
    // Fetch cabins and therapists for filter dropdowns
    const cabinResult = await getAllCabins();
    if (cabinResult.success) setCabins(cabinResult.data);
    else console.error("Failed to fetch cabins for filter");

    const therapistResult = await getAllTherapists(); // Assumes this endpoint exists
    if (therapistResult.success) setTherapists(therapistResult.data);
    else console.error("Failed to fetch therapists for filter");
  }, []);
  
  const fetchBookingsList = useCallback(async () => {
    setLoading(true);
    setError('');
    const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '')
    );
    const result = await getAllBookings(activeFilters);
    setLoading(false);
    if (result.success) {
      setBookings(result.data);
    } else {
      setError(result.error?.detail || 'Failed to fetch bookings.');
      setBookings([]);
    }
  }, [filters]);

  useEffect(() => {
    fetchFormData();
    fetchBookingsList();
  }, [fetchFormData, fetchBookingsList]);

  const handleFilterChange = (event) => {
    setFilters(prev => ({ ...prev, [event.target.name]: event.target.value }));
  };
  
  const handleOpenCancelDialog = (booking) => {
    setSelectedBookingToCancel(booking);
    setCancelDialogOpen(true);
  };

  const handleCloseCancelDialog = () => {
    setCancelDialogOpen(false);
    setSelectedBookingToCancel(null);
  };

  const handleConfirmCancelBooking = async () => {
    if (!selectedBookingToCancel) return;
    setActionLoading(true);
    const result = await adminCancelBooking(selectedBookingToCancel.id);
    setActionLoading(false);
    handleCloseCancelDialog();
    if (result.success) {
      setSnackbar({ open: true, message: 'Booking cancelled successfully by admin!', severity: 'success' });
      fetchBookingsList(); // Refresh the list
    } else {
      setSnackbar({ open: true, message: result.error?.detail || 'Failed to cancel booking.', severity: 'error' });
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        All Bookings
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel id="cabin-filter-all-label">Cabin</InputLabel>
            <Select labelId="cabin-filter-all-label" name="cabin_id" value={filters.cabin_id} label="Cabin" onChange={handleFilterChange}>
              <MenuItem value=""><em>All Cabins</em></MenuItem>
              {cabins.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel id="therapist-filter-label">Therapist</InputLabel>
            <Select labelId="therapist-filter-label" name="therapist_id" value={filters.therapist_id} label="Therapist" onChange={handleFilterChange}>
              <MenuItem value=""><em>All Therapists</em></MenuItem>
              {therapists.map(t => <MenuItem key={t.id} value={t.id}>{t.username} ({t.first_name} {t.last_name})</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField fullWidth name="date" label="Date" type="date" value={filters.date} onChange={handleFilterChange} InputLabelProps={{ shrink: true }} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select labelId="status-filter-label" name="status" value={filters.status} label="Status" onChange={handleFilterChange}>
              <MenuItem value=""><em>All Statuses</em></MenuItem>
              <MenuItem value="available">Available</MenuItem>
              <MenuItem value="booked">Booked</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {loading && <CircularProgress sx={{ display: 'block', margin: 'auto', my: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {!loading && !error && bookings.length === 0 && (
        <Typography sx={{ textAlign: 'center', mt: 3 }}>No bookings match your criteria.</Typography>
      )}

      <List>
        {bookings.map(booking => (
          <ListItem key={booking.id} divider sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ flexGrow: 1, maxWidth: 'calc(100% - 150px)' }}> {/* Adjust maxWidth if needed */}
              <ListItemText 
                primary={`${booking.cabin_name || `Cabin ID: ${booking.cabin}`}`}
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.primary">
                      Therapist: {booking.therapist_username || 'N/A (Available)'}
                    </Typography><br/>
                    <Typography component="span" variant="body2" color="text.secondary">
                      {formatDateTime(booking.start_time)} - {formatDateTime(booking.end_time)}
                    </Typography>
                    <br />
                    Price: ${booking.price}
                  </>
                }
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: { xs: 1, sm: 0 } }}>
                <Chip label={booking.status} color={getStatusChipColor(booking.status)} size="small" />
                {booking.status === 'booked' && (
                <Button 
                    size="small" 
                    variant="outlined" 
                    color="warning"
                    onClick={() => handleOpenCancelDialog(booking)}
                    disabled={actionLoading}
                >
                    Cancel Booking
                </Button>
                )}
            </Box>
          </ListItem>
        ))}
      </List>
      
      <Dialog open={cancelDialogOpen} onClose={handleCloseCancelDialog}>
        <DialogTitle>Confirm Admin Cancellation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel this booking? 
            (Cabin: {selectedBookingToCancel?.cabin_name}, Therapist: {selectedBookingToCancel?.therapist_username || 'N/A'}, 
            Time: {formatDateTime(selectedBookingToCancel?.start_time)}). This action will mark the booking as 'cancelled'.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancelDialog} disabled={actionLoading}>Back</Button>
          <Button onClick={handleConfirmCancelBooking} color="error" autoFocus disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={20}/> : 'Confirm Cancellation'}
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

export default ViewAllBookingsPage;
