import apiClient from './api';
import { useAuthStore } from '../store/authStore';

export const loginUser = async (credentials) => {
  try {
    const response = await apiClient.post('/auth/login/', credentials);
    if (response.data && response.data.access) {
      const { access, refresh, user_id, username, is_therapist, is_admin } = response.data;
      // Fetch full user details - or ensure login endpoint returns them
      // For now, assume login response has enough, or we fetch separately
      // const userDetailsResponse = await apiClient.get(`/users/${user_id}/`); // Example
      // For simplicity, we construct user object from login response
      const userData = { id: user_id, username, is_therapist, is_admin, email: '' /* get email if available */ };
      
      useAuthStore.getState().login(userData, access, refresh);
      return { success: true, user: userData };
    }
    return { success: false, error: 'Invalid login response' };
  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || { detail: error.message } };
  }
};

export const registerTherapist = async (therapistData) => {
  try {
    const response = await apiClient.post('/auth/register/therapist/', therapistData);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Registration error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || { detail: error.message } };
  }
};

export const logoutUser = () => {
  // Backend logout is typically handled by invalidating token or session.
  // For JWT, frontend logout mainly clears local storage and state.
  // If backend has a /logout endpoint to blacklist token (for some JWT setups), call it here.
  // Example: await apiClient.post('/auth/logout/');
  useAuthStore.getState().logout();
};
