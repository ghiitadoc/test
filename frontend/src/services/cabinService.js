import apiClient from './api';

// This service would typically be used by Admins to manage cabins,
// but therapists might need a list of cabins for filtering.
// The admin CRUD for cabins is `/api/admin/cabins/`
// Assuming the LIST endpoint is accessible by therapists if needed for filtering,
// or there's another endpoint for public/therapist cabin listing.
// If not, this list might need to be provided differently or hardcoded for therapists.

export const getCabins = async () => {
  try {
    // Attempt to use the admin endpoint for listing. This might require specific permissions.
    // If therapists cannot access this, an alternative endpoint or approach is needed.
    const response = await apiClient.get('/admin/cabins/'); 
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Get cabins error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || { detail: error.message } };
  }
};
