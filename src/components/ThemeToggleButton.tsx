import React from 'react';
import { useAppTheme } from '../context/AppThemeContext';

const ThemeToggleButton: React.FC = () => {
  const { toggleTheme, isDarkMode } = useAppTheme();

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle-button"
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
    >
      <div className="theme-toggle-icon">
        {isDarkMode ? (
          // Sun icon for light mode (when in dark mode)
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        ) : (
          // Moon icon for dark mode (when in light mode)
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        )}
      </div>
    </button>
  );
};

export default ThemeToggleButton; 