import apiClient from './api';
import { useAuthStore } from '../store/authStore';

// Profile Management
export const getTherapistProfile = async () => {
  try {
    const response = await apiClient.get('/therapist/profile/');
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Get therapist profile error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || { detail: error.message } };
  }
};

export const updateTherapistProfile = async (profileData) => {
  try {
    const response = await apiClient.put('/therapist/profile/', profileData);
    if (response.data) {
      // Update user in auth store
      const authStore = useAuthStore.getState();
      const updatedUser = { ...authStore.user, ...response.data };
      authStore.setUser(updatedUser); // Assumes setUser updates localStorage too
      return { success: true, data: response.data };
    }
    return { success: false, error: 'Invalid server response' };
  } catch (error) {
    console.error('Update therapist profile error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || { detail: error.message } };
  }
};

// Available Slots
export const getAvailableSlots = async (filters = {}) => {
  try {
    const response = await apiClient.get('/therapist/slots/available/', { params: filters });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Get available slots error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || { detail: error.message } };
  }
};

// Book a Slot
export const bookSlot = async (slotId) => {
  try {
    const response = await apiClient.post(`/therapist/slots/${slotId}/book/`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Book slot error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || { detail: error.message } };
  }
};

// My Bookings
export const getMyBookings = async (filters = {}) => {
  try {
    const response = await apiClient.get('/therapist/bookings/mine/', { params: filters });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Get my bookings error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || { detail: error.message } };
  }
};

// Cancel Booking
export const cancelBooking = async (bookingId) => {
  try {
    const response = await apiClient.post(`/therapist/bookings/${bookingId}/cancel/`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Cancel booking error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || { detail: error.message } };
  }
};
