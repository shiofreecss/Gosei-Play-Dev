import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the available app themes
export type AppTheme = 'modern';

// Theme context interface
interface AppThemeContextType {
  currentTheme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  availableThemes: { id: AppTheme; name: string; description: string }[];
}

// Create the context with default values
const AppThemeContext = createContext<AppThemeContextType>({
  currentTheme: 'modern',
  setTheme: () => {},
  availableThemes: [
    { id: 'modern', name: 'Modern', description: 'Clean modern interface with light colors' },
  ],
});

// Provider component
export const AppThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize theme to modern only
  const [currentTheme] = useState<AppTheme>('modern');

  // Available themes definition - only modern
  const availableThemes = [
    { id: 'modern' as AppTheme, name: 'Modern', description: 'Clean modern interface with light colors' },
  ];

  // Update theme and save to localStorage
  const setTheme = (theme: AppTheme) => {
    // Since we only have modern theme, this is now a no-op
    localStorage.setItem('gosei-app-theme', theme);
    document.body.classList.remove('theme-traditional', 'theme-minimalist');
    document.body.classList.add('theme-modern');
  };

  // Apply modern theme class on initial load
  useEffect(() => {
    document.body.classList.remove('theme-traditional', 'theme-minimalist');
    document.body.classList.add('theme-modern');
  }, []);

  return (
    <AppThemeContext.Provider
      value={{
        currentTheme,
        setTheme,
        availableThemes,
      }}
    >
      {children}
    </AppThemeContext.Provider>
  );
};

// Custom hook for using the theme context
export const useAppTheme = () => useContext(AppThemeContext); 