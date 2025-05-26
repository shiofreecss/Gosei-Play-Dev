import React, { useState, useRef, useEffect } from 'react';
import { useBoardTheme, BoardTheme } from '../context/BoardThemeContext';
import { useAppTheme } from '../context/AppThemeContext';

const BoardThemeButton: React.FC = () => {
  const { currentTheme, setTheme, availableThemes } = useBoardTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Format theme name for display
  const formatThemeName = (theme: BoardTheme) => {
    return theme.charAt(0).toUpperCase() + theme.slice(1).replace('-', ' ');
  };

  // Custom styles for the dropdown
  const dropdownStyle = {
    position: 'absolute' as const,
    bottom: '100%',
    right: 0,
    marginBottom: '5px',
    zIndex: 9999,
    maxHeight: '80vh',
    overflowY: 'auto' as const,
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
  };

  return (
    <div className="relative board-theme-selector" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 bg-white rounded-md shadow border border-neutral-200 hover:border-primary-300 transition-colors board-theme-button"
      >
        <div className="flex items-center gap-2">
          <div 
            className={`w-6 h-6 aspect-square flex-shrink-0 rounded border border-neutral-400 board-theme-${currentTheme}`}
            style={{ position: 'relative' }}
          >
            {/* Preview stones */}
            <div 
              className={`stone stone-black absolute`}
              style={{ width: '35%', height: '35%', top: '25%', left: '25%' }} 
            />
            <div 
              className={`stone stone-white absolute`}
              style={{ width: '35%', height: '35%', top: '45%', left: '45%' }} 
            />
          </div>
          <span className="text-sm font-medium">Board Theme</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 15 12 9 18 15"></polyline>
        </svg>
      </button>

      {isOpen && (
        <div 
          className="board-theme-dropdown bg-white rounded-lg shadow-lg border border-neutral-200" 
          style={dropdownStyle}
        >
          <div className="p-2">
            <div className="text-sm font-medium text-neutral-700 px-3 py-2">
              Select Theme
            </div>
            {availableThemes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => {
                  setTheme(theme.id);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-3 w-full px-3 py-2 text-left rounded-md transition-colors board-theme-option ${
                  currentTheme === theme.id
                    ? 'bg-primary-50 text-primary-800 selected'
                    : 'hover:bg-neutral-100'
                }`}
              >
                <div 
                  className={`w-8 h-8 aspect-square flex-shrink-0 rounded border border-neutral-400 board-theme-${theme.id}`}
                  style={{ position: 'relative' }}
                >
                  {/* Preview stones */}
                  <div 
                    className={`stone stone-black absolute`}
                    style={{ width: '35%', height: '35%', top: '25%', left: '25%' }} 
                  />
                  <div 
                    className={`stone stone-white absolute`}
                    style={{ width: '35%', height: '35%', top: '45%', left: '45%' }} 
                  />
                </div>
                <div>
                  <div className="font-medium">{formatThemeName(theme.id)}</div>
                  <div className="text-xs text-neutral-500 board-theme-option-description">{theme.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardThemeButton; 