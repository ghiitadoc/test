import React from 'react';
import { 
    List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Paper, Typography, Box, Chip 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

// Helper to format date/time
const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateTimeString).toLocaleString(undefined, options);
};

const AvailableSlotsList = ({ slots, onDelete }) => {
  if (!slots || slots.length === 0) {
    return <Typography sx={{ textAlign: 'center', mt: 3 }}>No available slots found.</Typography>;
  }

  return (
    <Paper elevation={2} sx={{ mt: 2 }}>
      <List>
        {slots.map((slot) => (
          <ListItem key={slot.id} divider>
            <ListItemText 
              primary={slot.cabin_name || `Cabin ID: ${slot.cabin}`} // cabin_name is from BookingSerializer
              secondary={
                <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                  <Typography component="span" variant="body2" color="text.primary">
                    From: {formatDateTime(slot.start_time)}
                  </Typography>
                  <br />
                  <Typography component="span" variant="body2" color="text.primary">
                    To: {formatDateTime(slot.end_time)}
                  </Typography>
                  <br />
                  <Chip label={`Price: $${slot.price}`} size="small" sx={{ mt: 0.5 }} />
                </Box>
              }
            />
            <ListItemSecondaryAction>
              <IconButton edge="end" aria-label="delete" onClick={() => onDelete(slot)}>
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default AvailableSlotsList;
