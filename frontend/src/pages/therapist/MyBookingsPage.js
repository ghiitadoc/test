import React, { useState, useEffect, useCallback } from 'react';
import { 
    Typography, Paper, Box, Grid, CircularProgress, Alert, List, ListItem, ListItemText, Button, 
    Tabs, Tab, Snackbar, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import { getMyBookings, cancelBooking } from '../../services/therapistService';

// Helper to format date/time
const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateTimeString).toLocaleString(undefined, options);
};

const getStatusChipColor = (status) => {
    switch (status) {
        case 'booked': return 'primary';
        case 'available': return 'success'; // Should not appear often for "my bookings" unless logic changes
        case 'cancelled': return 'error';
        default: return 'default';
    }
};

const MyBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: '', // 'booked', 'cancelled'
    period: '', // 'upcoming', 'past'
  });
  const [tabValue, setTabValue] = useState(0); // 0 for All, 1 for Upcoming, 2 for Past
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedBookingToCancel, setSelectedBookingToCancel] = useState(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    const activeFilters = { ...filters };
    if (tabValue === 1) activeFilters.period = 'upcoming';
    if (tabValue === 2) activeFilters.period = 'past';
    if (activeFilters.period === 'all' || tabValue === 0) delete activeFilters.period; // No period filter for "all"

    const result = await getMyBookings(activeFilters);
    setLoading(false);
    if (result.success) {
      setBookings(result.data);
    } else {
      setError(result.error?.detail || 'Failed to fetch your bookings.');
      setBookings([]);
    }
  }, [filters, tabValue]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    // Reset period filter, as tabs handle it now
    setFilters(prev => ({ ...prev, period: '' })); 
  };
  
  const handleStatusFilterChange = (newStatus) => {
    setFilters(prev => ({ ...prev, status: newStatus }));
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
    setLoading(true); // Or a specific cancelling state
    const result = await cancelBooking(selectedBookingToCancel.id);
    setLoading(false);
    handleCloseCancelDialog();
    if (result.success) {
      setSnackbar({ open: true, message: 'Booking cancelled successfully!', severity: 'success' });
      fetchBookings(); // Refresh the list
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
        My Bookings
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="booking period tabs">
          <Tab label="All Bookings" />
          <Tab label="Upcoming" />
          <Tab label="Past" />
        </Tabs>
      </Box>
      
      {/* Simple status filter buttons for now, can be a Select */}
      <Box sx={{ mb: 2 }}>
          <Button onClick={() => handleStatusFilterChange('')} variant={filters.status === '' ? "contained" : "outlined"} sx={{mr:1}}>All Statuses</Button>
          <Button onClick={() => handleStatusFilterChange('booked')} variant={filters.status === 'booked' ? "contained" : "outlined"} sx={{mr:1}}>Booked</Button>
          <Button onClick={() => handleStatusFilterChange('cancelled')} variant={filters.status === 'cancelled' ? "contained" : "outlined"}>Cancelled</Button>
      </Box>

      {loading && <CircularProgress sx={{ display: 'block', margin: 'auto', my: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {!loading && !error && bookings.length === 0 && (
        <Typography sx={{ textAlign: 'center', mt: 3 }}>You have no bookings that match your criteria.</Typography>
      )}

      <List>
        {bookings.map(booking => (
          <ListItem key={booking.id} divider sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ flexGrow: 1 }}>
              <ListItemText 
                primary={`${booking.cabin_name || `Cabin ID: ${booking.cabin}`}`}
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.primary">
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
                {booking.status === 'booked' && new Date(booking.start_time) > new Date() && ( // Only show cancel for upcoming booked
                <Button 
                    size="small" 
                    variant="outlined" 
                    color="error"
                    onClick={() => handleOpenCancelDialog(booking)}
                    disabled={loading}
                >
                    Cancel Booking
                </Button>
                )}
            </Box>
          </ListItem>
        ))}
      </List>

      {/* Confirmation Dialog for Cancellation */}
      <Dialog
        open={cancelDialogOpen}
        onClose={handleCloseCancelDialog}
      >
        <DialogTitle>Confirm Cancellation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel your booking for {selectedBookingToCancel?.cabin_name} from {formatDateTime(selectedBookingToCancel?.start_time)} to {formatDateTime(selectedBookingToCancel?.end_time)}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancelDialog} disabled={loading}>Back</Button>
          <Button onClick={handleConfirmCancelBooking} color="error" autoFocus disabled={loading}>
            Confirm Cancel
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

export default MyBookingsPage;
