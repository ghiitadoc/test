import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if the user has one of the allowed roles
  // User roles could be simple booleans like user.is_admin, user.is_therapist
  // or an array of strings if roles are more complex.
  let hasRequiredRole = false;
  if (allowedRoles && allowedRoles.length > 0) {
    if (allowedRoles.includes('admin') && user?.is_admin) {
      hasRequiredRole = true;
    }
    if (allowedRoles.includes('therapist') && user?.is_therapist) {
      hasRequiredRole = true;
    }
    // Add more role checks if necessary
  } else {
    // If no specific roles are required, just being authenticated is enough
    hasRequiredRole = true; 
  }

  if (!hasRequiredRole) {
    // Redirect to an unauthorized page if the user doesn't have the required role
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  return <Outlet />; // Render the child route component
};

export default ProtectedRoute;

// General purpose PublicRoute (e.g., for login page, if logged in, redirect to dashboard)
export const PublicRoute = () => {
    const { isAuthenticated, user } = useAuthStore();
    const location = useLocation();

    if (isAuthenticated) {
        const dashboardPath = user?.is_admin ? '/admin/dashboard' : user?.is_therapist ? '/therapist/dashboard' : '/login';
        // Redirect to dashboard if already logged in, attempting to access public routes like /login
        // Prevent users from seeing login page if they are already logged in
        // Check `location.state?.from?.pathname` to avoid redirect loops if dashboard is also a public route somehow
        return <Navigate to={dashboardPath} replace />;
    }
    return <Outlet />;
};
