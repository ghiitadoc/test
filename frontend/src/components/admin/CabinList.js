import React from 'react';
import { 
    List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Paper, Typography, Box, Chip 
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const CabinList = ({ cabins, onEdit, onDelete }) => {
  if (!cabins || cabins.length === 0) {
    return <Typography sx={{ textAlign: 'center', mt: 3 }}>No cabins found.</Typography>;
  }

  return (
    <Paper elevation={2} sx={{ mt: 2 }}>
      <List>
        {cabins.map((cabin) => (
          <ListItem key={cabin.id} divider>
            <ListItemText 
              primary={cabin.name}
              secondary={
                <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                  <Typography component="span" variant="body2" color="text.secondary">
                    {cabin.description || 'No description'}
                  </Typography>
                  <br />
                  <Chip label={`Capacity: ${cabin.capacity}`} size="small" sx={{ mt: 0.5 }} />
                </Box>
              }
            />
            <ListItemSecondaryAction>
              <IconButton edge="end" aria-label="edit" onClick={() => onEdit(cabin)} sx={{mr: 0.5}}>
                <EditIcon />
              </IconButton>
              <IconButton edge="end" aria-label="delete" onClick={() => onDelete(cabin)}>
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default CabinList;
