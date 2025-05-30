import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Paper, Box, Button, CircularProgress, Alert, Grid, Divider } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useAuthStore } from '../store/authStore';
import { getTherapistProfile, updateTherapistProfile } from '../services/therapistService';
import ProfileForm from '../components/therapist/ProfileForm'; // Assuming ProfileForm is in components/therapist/

const ProfileDisplay = ({ user, onEdit }) => (
  <Box>
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}><Typography variant="subtitle1"><strong>Username:</strong> {user?.username}</Typography></Grid>
      <Grid item xs={12} sm={6}><Typography variant="subtitle1"><strong>Email:</strong> {user?.email}</Typography></Grid>
      <Grid item xs={12} sm={6}><Typography variant="subtitle1"><strong>First Name:</strong> {user?.first_name}</Typography></Grid>
      <Grid item xs={12} sm={6}><Typography variant="subtitle1"><strong>Last Name:</strong> {user?.last_name}</Typography></Grid>
      <Grid item xs={12} sm={6}><Typography variant="subtitle1"><strong>Phone:</strong> {user?.phone_number}</Typography></Grid>
    </Grid>
    <Button
      variant="contained"
      startIcon={<EditIcon />}
      onClick={onEdit}
      sx={{ mt: 3 }}
    >
      Edit Profile
    </Button>
  </Box>
);

const TherapistProfilePage = () => {
  const { user: authUser, setUser } = useAuthStore(); // Get setUser to update store after API success
  const [profileData, setProfileData] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(''); // For fetching errors
  const [formError, setFormError] = useState(null); // For form submission errors
  const [successMessage, setSuccessMessage] = useState('');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await getTherapistProfile();
    setLoading(false);
    if (result.success) {
      setProfileData(result.data);
      // Optionally update authStore user if it's out of sync, though profile data might be more detailed
      // setUser(result.data); // Be cautious if this overwrites essential authUser fields not present in profile GET
    } else {
      setError(result.error?.detail || 'Failed to fetch profile.');
    }
  }, []);

  useEffect(() => {
    // Initial fetch or if authUser changes (e.g. after a token refresh that also updated user info)
    if (authUser) { // Only fetch if user is theoretically logged in
        fetchProfile();
    }
  }, [authUser, fetchProfile]);

  const handleEdit = () => {
    setIsEditMode(true);
    setSuccessMessage(''); // Clear previous success messages
    setFormError(null); // Clear previous form errors
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
  };

  const handleSubmitProfile = async (formData) => {
    setLoading(true);
    setFormError(null);
    setSuccessMessage('');

    const result = await updateTherapistProfile(formData);
    setLoading(false);

    if (result.success) {
      setProfileData(result.data); // Update local display data
      // The service already updates the authStore.setUser
      setIsEditMode(false);
      setSuccessMessage('Profile updated successfully!');
    } else {
      setFormError(result.error || 'Failed to update profile.');
    }
  };

  if (loading && !isEditMode && !profileData) { // Initial loading state
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }
  
  // Use authUser as a fallback if profileData fetch failed but user is in store
  const displayData = profileData || authUser;

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        My Profile
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

      {!displayData && !loading && <Typography>Could not load profile data.</Typography>}
      
      {displayData && (
        isEditMode ? (
          <ProfileForm
            initialData={displayData}
            onSubmit={handleSubmitProfile}
            onCancel={handleCancelEdit}
            loading={loading}
            error={formError}
          />
        ) : (
          <ProfileDisplay user={displayData} onEdit={handleEdit} />
        )
      )}
    </Paper>
  );
};

export default TherapistProfilePage;
