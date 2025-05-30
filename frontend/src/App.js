import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, createTheme } from '@mui/material';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TherapistDashboardPage from './pages/TherapistDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import UnauthorizedPage from './pages/UnauthorizedPage'; 
import TherapistProfilePage from './pages/TherapistProfilePage'; 
import ViewAvailableSlotsPage from './pages/therapist/ViewAvailableSlotsPage'; 
import MyBookingsPage from './pages/therapist/MyBookingsPage'; 
// Admin Pages
import CabinManagementPage from './pages/admin/CabinManagementPage';
import SlotManagementPage from './pages/admin/SlotManagementPage';
import ViewAllBookingsPage from './pages/admin/ViewAllBookingsPage';

// Components
import ProtectedRoute, { PublicRoute } from './components/ProtectedRoute';

// Store
import { useAuthStore } from './store/authStore';

// Create a simple theme for now
const theme = createTheme({
  palette: {
    primary: {
      main: '#556cd6',
    },
    secondary: {
      main: '#19857b',
    },
    background: {
      default: '#f4f6f8',
    },
  },
});

function App() {
  // Attempt to rehydrate or initialize auth state when app loads.
  // Zustand's persist middleware handles this, but an explicit check or action can be added.
  // useEffect(() => {
  //   useAuthStore.getState().hydrate(); // if manual hydration was needed
  // }, []);

  const { isAuthenticated, user } = useAuthStore();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Normalize CSS and apply background color */}
      <Router>
        <Routes>
          {/* Public Routes with AuthLayout (e.g. Login, Register) */}
          <Route element={<AuthLayout />}>
            <Route element={<PublicRoute />}> {/* Redirect if already logged in */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>
            {/* Use the imported UnauthorizedPage component */}
            <Route path="/unauthorized" element={<UnauthorizedPage />} /> 
          </Route>

          {/* Protected Routes with MainLayout */}
          <Route element={<MainLayout />}>
            <Route element={<ProtectedRoute allowedRoles={['therapist']} />}>
              <Route path="/therapist/dashboard" element={<TherapistDashboardPage />} />
              <Route path="/therapist/profile" element={<TherapistProfilePage />} />
              <Route path="/therapist/slots/available" element={<ViewAvailableSlotsPage />} />
              <Route path="/therapist/bookings/mine" element={<MyBookingsPage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/cabins" element={<CabinManagementPage />} />
              <Route path="/admin/slots" element={<SlotManagementPage />} />
              <Route path="/admin/bookings/all" element={<ViewAllBookingsPage />} />
            </Route>
          </Route>
          
          {/* Fallback / Redirects */}
          <Route 
            path="/" 
            element={
              isAuthenticated 
                ? (user?.is_admin ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/therapist/dashboard" replace />)
                : <Navigate to="/login" replace />
            } 
          />
          
          {/* Catch-all for undefined routes (optional) */}
          <Route path="*" element={<Navigate to="/" replace />} /> 
          {/* Or a dedicated NotFoundPage: <Route path="*" element={<NotFoundPage />} /> */}

        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
