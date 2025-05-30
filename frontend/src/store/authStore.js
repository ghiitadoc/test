import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Attempt to get initial state from localStorage
const getInitialState = () => {
  try {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    const storedRefreshToken = localStorage.getItem('refreshToken'); // For JWT refresh

    if (storedUser && storedToken) {
      return {
        user: JSON.parse(storedUser),
        token: storedToken,
        refreshToken: storedRefreshToken,
        isAuthenticated: true,
      };
    }
  } catch (error) {
    console.error("Error parsing localStorage for auth state:", error);
    // Fallback to default if localStorage is corrupt or inaccessible
  }
  return {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
  };
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      ...getInitialState(), // Initialize state from localStorage or defaults

      login: (userData, accessToken, refreshTokenVal) => {
        set({
          user: userData,
          token: accessToken,
          refreshToken: refreshTokenVal,
          isAuthenticated: true,
        });
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', accessToken);
        if (refreshTokenVal) {
            localStorage.setItem('refreshToken', refreshTokenVal);
        } else {
            localStorage.removeItem('refreshToken');
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        // Optionally, redirect to login page or clear other app state
        // window.location.href = '/login'; // Could be one way to force redirect
      },

      setUser: (userData) => {
        set({ user: userData });
        if (userData) {
          localStorage.setItem('user', JSON.stringify(userData));
        } else {
          localStorage.removeItem('user'); // if userData is null, remove from storage
        }
      },
      
      setToken: (accessToken, refreshTokenVal) => {
        set({ token: accessToken, refreshToken: refreshTokenVal });
        localStorage.setItem('token', accessToken);
        if (refreshTokenVal) {
            localStorage.setItem('refreshToken', refreshTokenVal);
        } else {
            localStorage.removeItem('refreshToken');
        }
      },

      // Example: Hydrate store on app initialization if not using persist middleware's auto-hydration
      // (persist middleware handles this, but good to know)
      // hydrate: () => {
      //   try {
      //     const storedUser = localStorage.getItem('user');
      //     const storedToken = localStorage.getItem('token');
      //     const storedRefreshToken = localStorage.getItem('refreshToken');
      //     if (storedUser && storedToken) {
      //       set({ 
      //         user: JSON.parse(storedUser), 
      //         token: storedToken, 
      //         refreshToken: storedRefreshToken,
      //         isAuthenticated: true 
      //       });
      //     }
      //   } catch (e) {
      //     console.error("Hydration error:", e);
      //   }
      // }
    }),
    {
      name: 'auth-storage', // unique name for localStorage key
      storage: createJSONStorage(() => localStorage), // use localStorage
      // Only persist parts of the store if needed, by default persists all
      // partialize: (state) => ({ token: state.token, user: state.user, refreshToken: state.refreshToken, isAuthenticated: state.isAuthenticated }),
      // onRehydrateStorage: () => (state) => {
      //   // Optional: perform actions upon rehydration
      //   if (state) state.isAuthenticated = !!state.token;
      // },
    }
  )
);

// Call hydrate on app initialization if not relying on persist's automatic rehydration,
// or if specific logic is needed post-hydration.
// However, with `persist` middleware, this should be largely automatic.
// useAuthStore.getState().hydrate(); // Example if manual hydration trigger is desired.

// Export a hook to use the store easily
// export const useAuth = useAuthStore; // Alternative export
