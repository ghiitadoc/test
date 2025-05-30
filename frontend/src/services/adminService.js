import apiClient from './api';

// Cabin Management
export const getAllCabins = async () => {
  try {
    const response = await apiClient.get('/admin/cabins/');
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Get all cabins error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || { detail: error.message } };
  }
};

export const createCabin = async (cabinData) => {
  try {
    const response = await apiClient.post('/admin/cabins/', cabinData);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Create cabin error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || { detail: error.message } };
  }
};

export const updateCabin = async (cabinId, cabinData) => {
  try {
    const response = await apiClient.put(`/admin/cabins/${cabinId}/`, cabinData);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Update cabin error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || { detail: error.message } };
  }
};

export const deleteCabin = async (cabinId) => {
  try {
    await apiClient.delete(`/admin/cabins/${cabinId}/`);
    return { success: true };
  } catch (error) {
    console.error('Delete cabin error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || { detail: error.message } };
  }
};

// Available Slot Management (by Admin)
export const getAdminAvailableSlots = async (filters = {}) => { // Renamed to avoid conflict if therapist has similar
  try {
    const response = await apiClient.get('/admin/slots/available/', { params: filters });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Get admin available slots error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || { detail: error.message } };
  }
};

export const createAvailableSlot = async (slotData) => {
  try {
    const response = await apiClient.post('/admin/slots/create/', slotData);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Create available slot error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || { detail: error.message } };
  }
};

export const deleteAvailableSlot = async (slotId) => {
  try {
    await apiClient.delete(`/admin/slots/${slotId}/delete/`);
    return { success: true };
  } catch (error) {
    console.error('Delete available slot error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || { detail: error.message } };
  }
};

// All Bookings Management (by Admin)
export const getAllBookings = async (filters = {}) => {
  try {
    const response = await apiClient.get('/admin/bookings/all/', { params: filters });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Get all bookings error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || { detail: error.message } };
  }
};

export const adminCancelBooking = async (bookingId) => {
  try {
    const response = await apiClient.post(`/admin/bookings/${bookingId}/cancel/`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Admin cancel booking error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || { detail: error.message } };
  }
};

// Utility to fetch all users (therapists) for filtering - if an endpoint exists
export const getAllTherapists = async () => {
    try {
        // This endpoint doesn't exist yet, would need to be created on the backend
        // e.g., /api/admin/therapists/ or similar, returning id and username/name
        const response = await apiClient.get('/admin/users/therapists/'); // Placeholder
        return { success: true, data: response.data };
    } catch (error) {
        console.error('Get all therapists error:', error.response?.data || error.message);
        return { success: false, error: error.response?.data || { detail: error.message } };
    }
};
