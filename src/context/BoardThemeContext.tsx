import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the available board themes
export type BoardTheme = 'default' | 'wood-3d' | 'light-wood-3d' | 'universe';

// Theme context interface
interface BoardThemeContextType {
  currentTheme: BoardTheme;
  setTheme: (theme: BoardTheme) => void;
  availableThemes: { id: BoardTheme; name: string; description: string }[];
}

// Create the context with default values
const BoardThemeContext = createContext<BoardThemeContextType>({
  currentTheme: 'default',
  setTheme: () => {},
  availableThemes: [
    { id: 'default', name: 'Default Board', description: 'Standard wooden go board with flat stones' },
    { id: 'wood-3d', name: 'Dark Wood 3D', description: 'Realistic dark wooden board with 3D stones' },
    { id: 'light-wood-3d', name: 'Light Wood 3D', description: 'Realistic light wooden board with 3D stones' },
    { id: 'universe', name: 'Universe', description: 'Cosmic board with black holes and white holes' },
  ],
});

// Provider component
export const BoardThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize theme from localStorage or use default
  const [currentTheme, setCurrentTheme] = useState<BoardTheme>(() => {
    const savedTheme = localStorage.getItem('gosei-board-theme');
    return (savedTheme as BoardTheme) || 'default';
  });

  // Available themes definition
  const availableThemes = [
    { id: 'default' as BoardTheme, name: 'Default Board', description: 'Standard wooden go board with flat stones' },
    { id: 'wood-3d' as BoardTheme, name: 'Dark Wood 3D', description: 'Realistic dark wooden board with 3D stones' },
    { id: 'light-wood-3d' as BoardTheme, name: 'Light Wood 3D', description: 'Realistic light wooden board with 3D stones' },
    { id: 'universe' as BoardTheme, name: 'Universe', description: 'Cosmic board with black holes and white holes' },
  ];

  // Update theme and save to localStorage
  const setTheme = (theme: BoardTheme) => {
    setCurrentTheme(theme);
    localStorage.setItem('gosei-board-theme', theme);
  };

  return (
    <BoardThemeContext.Provider
      value={{
        currentTheme,
        setTheme,
        availableThemes,
      }}
    >
      {children}
    </BoardThemeContext.Provider>
  );
};

// Custom hook for using the theme context
export const useBoardTheme = () => useContext(BoardThemeContext); 