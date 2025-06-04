import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the available app themes
export type AppTheme = 'modern' | 'modern-light';

// Theme context interface
interface AppThemeContextType {
  currentTheme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  isDarkMode: boolean;
  availableThemes: { id: AppTheme; name: string; description: string }[];
}

// Create the context with default values
const AppThemeContext = createContext<AppThemeContextType>({
  currentTheme: 'modern',
  setTheme: () => {},
  toggleTheme: () => {},
  isDarkMode: true,
  availableThemes: [
    { id: 'modern', name: 'Dark Mode', description: 'Modern dark interface' },
    { id: 'modern-light', name: 'Light Mode', description: 'Modern light interface' },
  ],
});

// Provider component
export const AppThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize theme from localStorage or use dark mode as default
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(() => {
    try {
      const savedTheme = localStorage.getItem('gosei-app-theme');
      const theme = (savedTheme as AppTheme) || 'modern';
      
      // Apply theme class immediately to prevent light flash
      document.body.classList.remove('theme-modern', 'theme-modern-light', 'theme-traditional', 'theme-minimalist');
      document.body.classList.add(`theme-${theme}`);
      
      return theme;
    } catch (error) {
      console.error('Error loading theme from localStorage:', error);
      // Apply default dark theme immediately
      document.body.classList.remove('theme-modern', 'theme-modern-light', 'theme-traditional', 'theme-minimalist');
      document.body.classList.add('theme-modern');
      return 'modern';
    }
  });

  // Available themes definition
  const availableThemes = [
    { id: 'modern' as AppTheme, name: 'Dark Mode', description: 'Modern dark interface' },
    { id: 'modern-light' as AppTheme, name: 'Light Mode', description: 'Modern light interface' },
  ];

  // Computed property for dark mode
  const isDarkMode = currentTheme === 'modern';

  // Update theme and save to localStorage
  const setTheme = (theme: AppTheme) => {
    setCurrentTheme(theme);
    try {
      localStorage.setItem('gosei-app-theme', theme);
    } catch (error) {
      console.error('Error saving theme to localStorage:', error);
    }
    
    // Remove all theme classes and add the new one
    document.body.classList.remove('theme-modern', 'theme-modern-light', 'theme-traditional', 'theme-minimalist');
    document.body.classList.add(`theme-${theme}`);
  };

  // Toggle between dark and light mode
  const toggleTheme = () => {
    const newTheme = currentTheme === 'modern' ? 'modern-light' : 'modern';
    setTheme(newTheme);
  };

  // Apply theme class on initial load and when theme changes
  useEffect(() => {
    document.body.classList.remove('theme-modern', 'theme-modern-light', 'theme-traditional', 'theme-minimalist');
    document.body.classList.add(`theme-${currentTheme}`);
  }, [currentTheme]);

  return (
    <AppThemeContext.Provider
      value={{
        currentTheme,
        setTheme,
        toggleTheme,
        isDarkMode,
        availableThemes,
      }}
    >
      {children}
    </AppThemeContext.Provider>
  );
};

// Custom hook for using the theme context
export const useAppTheme = () => useContext(AppThemeContext); 