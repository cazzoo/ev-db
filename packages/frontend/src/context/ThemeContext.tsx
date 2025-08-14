import { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { useAuth } from './AuthContext';
import { updateUserPreferences } from '../services/api';

interface ThemeContextType {
  theme: string;
  setTheme: (theme: string) => Promise<void>;
  availableThemes: { value: string; label: string }[];
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: async () => {},
  availableThemes: [],
});

const availableThemes = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'cupcake', label: 'Cupcake' },
  { value: 'bumblebee', label: 'Bumblebee' },
  { value: 'emerald', label: 'Emerald' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'synthwave', label: 'Synthwave' },
  { value: 'retro', label: 'Retro' },
  { value: 'cyberpunk', label: 'Cyberpunk' },
  { value: 'valentine', label: 'Valentine' },
  { value: 'halloween', label: 'Halloween' },
  { value: 'garden', label: 'Garden' },
  { value: 'forest', label: 'Forest' },
  { value: 'aqua', label: 'Aqua' },
  { value: 'lofi', label: 'Lo-Fi' },
  { value: 'pastel', label: 'Pastel' },
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'wireframe', label: 'Wireframe' },
  { value: 'black', label: 'Black' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'dracula', label: 'Dracula' },
  { value: 'autumn', label: 'Autumn' },
  { value: 'business', label: 'Business' },
  { value: 'night', label: 'Night' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'winter', label: 'Winter' },
  { value: 'dim', label: 'Dim' },
  { value: 'nord', label: 'Nord' },
  { value: 'sunset', label: 'Sunset' }
];

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated, updateUser } = useAuth();
  const [theme, setThemeState] = useState<string>('light');

  // Apply theme to document
  const applyTheme = (newTheme: string) => {
    document.documentElement.setAttribute('data-theme', newTheme);
    setThemeState(newTheme);
  };

  // Load theme when user changes or on initial load
  useEffect(() => {
    if (isAuthenticated && user?.theme) {
      // User is logged in and has a theme preference
      applyTheme(user.theme);
    } else if (!isAuthenticated) {
      // User is not logged in, use localStorage or default
      const savedTheme = localStorage.getItem('theme') || 'light';
      applyTheme(savedTheme);
    } else {
      // User is logged in but has no theme preference, use default
      applyTheme('light');
    }
  }, [user, isAuthenticated]);

  const setTheme = async (newTheme: string) => {
    try {
      applyTheme(newTheme);

      if (isAuthenticated) {
        // Save to backend for authenticated users
        await updateUserPreferences({ theme: newTheme });
        updateUser({ theme: newTheme });
      } else {
        // Save to localStorage for non-authenticated users
        localStorage.setItem('theme', newTheme);
      }
    } catch (error) {
      console.error('Failed to update theme:', error);
      // Revert theme on error
      const previousTheme = isAuthenticated && user?.theme ? user.theme : localStorage.getItem('theme') || 'light';
      applyTheme(previousTheme);
      throw error;
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, availableThemes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
