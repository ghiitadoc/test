import axios from 'axios';
import { useAuthStore } from '../store/authStore'; // Ensure this path is correct

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Add token to headers
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle token refresh and errors
// Basic structure for token refresh. A full implementation requires:
// 1. Backend endpoint to refresh token (e.g., /api/auth/token/refresh/)
// 2. Secure storage for refresh token (localStorage is okay for this example, but HttpOnly cookies are better)
// 3. Logic to detect token expiry (usually via 401 error)
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const { logout } = useAuthStore.getState(); // Get logout action

    if (error.response) {
      // Handle 401 Unauthorized specifically for token expiry
      if (error.response.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise(function(resolve, reject) {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return apiClient(originalRequest);
          }).catch(err => {
            return Promise.reject(err);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;
        
        const currentRefreshToken = localStorage.getItem('refreshToken'); // Assuming refresh token is stored

        if (currentRefreshToken) {
            try {
                // Note: Django Simple JWT expects refresh token in the body for /api/auth/token/refresh/
                const refreshResponse = await axios.post(`${API_BASE_URL}auth/token/refresh/`, {
                    refresh: currentRefreshToken,
                });
                
                const newAccessToken = refreshResponse.data.access;
                if (newAccessToken) {
                    useAuthStore.getState().setToken(newAccessToken, currentRefreshToken); // Update store
                    apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                    originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
                    processQueue(null, newAccessToken);
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                console.error('Token refresh error:', refreshError);
                processQueue(refreshError, null);
                logout(); // Logout if refresh fails
                // Potentially redirect to login: window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        } else {
            console.log('No refresh token available, logging out.');
            logout();
            // Potentially redirect to login: window.location.href = '/login';
            isRefreshing = false; // Reset flag even if no refresh token
            return Promise.reject(error);
        }
      } else if (error.response.status === 401) {
        // If it's a 401 and already retried, or some other 401, logout.
        console.log('Persistent 401 error, logging out.');
        logout();
        // Potentially redirect to login: window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
