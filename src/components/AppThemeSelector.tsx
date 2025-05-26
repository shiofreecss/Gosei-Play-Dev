import React from 'react';
import { useAppTheme } from '../context/AppThemeContext';

const AppThemeSelector: React.FC = () => {
  const { currentTheme, setTheme, availableThemes } = useAppTheme();

  return (
    <div className="app-theme-selector">
      <div className="theme-selector-container">
        <label htmlFor="app-theme-select" className="theme-label">
          App Style:
        </label>
        <select
          id="app-theme-select"
          value={currentTheme}
          onChange={(e) => setTheme(e.target.value as any)}
          className="theme-select"
          aria-label="Select app theme"
        >
          {availableThemes.map((theme) => (
            <option key={theme.id} value={theme.id} title={theme.description}>
              {theme.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default AppThemeSelector; 