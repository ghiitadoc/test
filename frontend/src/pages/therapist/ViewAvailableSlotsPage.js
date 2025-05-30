import React, { useState, useEffect, useCallback } from 'react';
import { 
    Typography, Paper, Box, Grid, CircularProgress, Alert, List, ListItem, ListItemText, Button, 
    TextField, MenuItem, Select, InputLabel, FormControl, Card, CardContent, CardActions, Snackbar
} from '@mui/material';
import { getAvailableSlots, bookSlot } from '../../services/therapistService';
import { getCabins } from '../../services/cabinService'; // Assuming a cabinService exists for fetching cabins

// Helper to format date/time
const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateTimeString).toLocaleString(undefined, options);
};

const ViewAvailableSlotsPage = () => {
  const [slots, setSlots] = useState([]);
  const [cabins, setCabins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    cabin_id: '',
    start_date: '',
    end_date: '',
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    setError('');
    const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '')
    );
    const result = await getAvailableSlots(activeFilters);
    setLoading(false);
    if (result.success) {
      setSlots(result.data);
    } else {
      setError(result.error?.detail || 'Failed to fetch available slots.');
      setSlots([]); // Clear slots on error
    }
  }, [filters]);

  const fetchCabinsForFilter = useCallback(async () => {
    // In a real app, admin might manage cabins, so a general cabin service could exist
    // For now, using a placeholder or assuming therapistService can fetch them if needed by API
    const result = await getCabins(); // Assumes getCabins fetches {id, name}
    if (result.success) {
      setCabins(result.data);
    } else {
      console.error("Failed to fetch cabins for filter:", result.error);
    }
  }, []);


  useEffect(() => {
    fetchSlots();
    fetchCabinsForFilter();
  }, [fetchSlots, fetchCabinsForFilter]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  // const handleApplyFilters = () => { // Or fetch on every change
  //   fetchSlots();
  // };

  const handleBookSlot = async (slotId) => {
    setLoading(true); // Can use a specific loading state for booking a single slot
    const result = await bookSlot(slotId);
    setLoading(false);
    if (result.success) {
      setSnackbar({ open: true, message: 'Slot booked successfully!', severity: 'success' });
      fetchSlots(); // Refresh the list
    } else {
      setSnackbar({ open: true, message: result.error?.detail || 'Failed to book slot.', severity: 'error' });
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Available Cabin Slots
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel id="cabin-filter-label">Cabin</InputLabel>
            <Select
              labelId="cabin-filter-label"
              id="cabin_id"
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
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            id="start_date"
            name="start_date"
            label="Available From"
            type="date"
            value={filters.start_date}
            onChange={handleFilterChange}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            id="end_date"
            name="end_date"
            label="Available Until"
            type="date"
            value={filters.end_date}
            onChange={handleFilterChange}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        {/* <Grid item xs={12} sm={2} display="flex" alignItems="center">
            <Button variant="contained" onClick={handleApplyFilters} fullWidth>Filter</Button>
        </Grid> */}
      </Grid>

      {loading && <CircularProgress sx={{ display: 'block', margin: 'auto', my: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {!loading && !error && slots.length === 0 && (
        <Typography sx={{ textAlign: 'center', mt: 3 }}>No available slots match your criteria.</Typography>
      )}

      <Grid container spacing={2}>
        {slots.map(slot => (
          <Grid item xs={12} sm={6} md={4} key={slot.id}>
            <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" component="div">
                  {slot.cabin_name || `Cabin ID: ${slot.cabin}`} 
                </Typography>
                <Typography color="text.secondary">
                  {/* Cabin description could be added if available in slot data or fetched */}
                </Typography>
                <Typography variant="body2">
                  <strong>From:</strong> {formatDateTime(slot.start_time)}
                </Typography>
                <Typography variant="body2">
                  <strong>To:</strong> {formatDateTime(slot.end_time)}
                </Typography>
                <Typography variant="body1" sx={{ mt: 1, fontWeight: 'bold' }}>
                  Price: ${slot.price}
                </Typography>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  variant="contained" 
                  onClick={() => handleBookSlot(slot.id)}
                  disabled={loading} // Disable while any global loading is true, or use specific per-card loading
                >
                  Book Now
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

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

export default ViewAvailableSlotsPage;
