import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { AppBar, Toolbar, Typography, Button, Container, Box, CssBaseline, Drawer, List, ListItem, ListItemButton, ListItemText, ListItemIcon } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import VpnKeyIcon from '@mui/icons-material/VpnKey'; 
import AppRegistrationIcon from '@mui/icons-material/AppRegistration'; 
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import BookOnlineIcon from '@mui/icons-material/BookOnline';
// Admin icons (can add more specific ones if needed)
import HolidayVillageIcon from '@mui/icons-material/HolidayVillage';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import ListAltIcon from '@mui/icons-material/ListAlt';


const drawerWidth = 240;

const MainLayout = () => {
  const { logout, isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const commonNavItems = [
    // { text: 'Home', icon: <HomeIcon />, path: '/' }, // Example
  ];

  const therapistNavItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/therapist/dashboard' },
    { text: 'My Profile', icon: <AccountCircleIcon />, path: '/therapist/profile' },
    { text: 'Available Slots', icon: <EventAvailableIcon />, path: '/therapist/slots/available' },
    { text: 'My Bookings', icon: <BookOnlineIcon />, path: '/therapist/bookings/mine' },
  ];

  const adminNavItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin/dashboard' },
    { text: 'Manage Cabins', icon: <HolidayVillageIcon />, path: '/admin/cabins' }, 
    { text: 'Manage Slots', icon: <EditCalendarIcon />, path: '/admin/slots' },
    { text: 'All Bookings', icon: <ListAltIcon />, path: '/admin/bookings/all' },
  ];
  
  const unauthenticatedNavItems = [
    { text: 'Login', icon: <VpnKeyIcon />, path: '/login' },
    { text: 'Register', icon: <AppRegistrationIcon />, path: '/register' },
  ];

  let navItems = [...commonNavItems];
  if (isAuthenticated) {
    if (user?.is_admin) {
      navItems = [...navItems, ...adminNavItems];
    } else if (user?.is_therapist) {
      navItems = [...navItems, ...therapistNavItems];
    }
  } else {
    navItems = [...navItems, ...unauthenticatedNavItems];
  }


  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Therapy Booking
          </Typography>
          {isAuthenticated && (
            <Button color="inherit" onClick={handleLogout} startIcon={<ExitToAppIcon />}>
              Logout
            </Button>
          )}
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar /> {/* For spacing under AppBar */}
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {navItems.map((item) => (
              <ListItem key={item.text} disablePadding onClick={() => navigate(item.path)}>
                <ListItemButton>
                  <ListItemIcon>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}
      >
        <Toolbar /> {/* For spacing under AppBar */}
        <Container maxWidth="lg"> {/* or false to disable maxWidth */}
          <Outlet /> {/* Nested routes will render here */}
        </Container>
      </Box>
    </Box>
  );
};

export default MainLayout;
