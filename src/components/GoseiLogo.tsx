import React from 'react';
import { useAppTheme } from '../context/AppThemeContext';

interface GoseiLogoProps {
  size?: number;
  className?: string;
}

const GoseiLogo: React.FC<GoseiLogoProps> = ({ size = 40, className = '' }) => {
  const { isDarkMode } = useAppTheme();
  
  // Create a stone effect that adapts to theme - black in light mode, white in dark mode
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Base stone circle */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          background: isDarkMode 
            ? 'radial-gradient(circle at 35% 35%, #ffffff 0%, #f0f0f0 60%, #e0e0e0 100%)'
            : 'radial-gradient(circle at 30% 30%, #4a4a4a 0%, #2a2a2a 30%, #1a1a1a 60%, #0a0a0a 85%, #000000 100%)',
          boxShadow: isDarkMode
            ? `
              0 2px 4px rgba(0, 0, 0, 0.1),
              0 4px 8px rgba(0, 0, 0, 0.1),
              inset 0 -2px 4px rgba(0, 0, 0, 0.05),
              inset 0 2px 4px rgba(255, 255, 255, 0.8)
            `
            : `
              0 2px 6px rgba(0, 0, 0, 0.3),
              0 4px 12px rgba(0, 0, 0, 0.2),
              inset 0 -3px 6px rgba(0, 0, 0, 0.4),
              inset 0 2px 6px rgba(255, 255, 255, 0.15),
              inset 0 1px 2px rgba(255, 255, 255, 0.3)
            `,
          border: isDarkMode 
            ? '1px solid rgba(0, 0, 0, 0.1)'
            : '1px solid rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Highlight effect */}
        <div 
          className="absolute"
          style={{
            top: '15%',
            left: '15%',
            width: '40%',
            height: '40%',
            background: isDarkMode
              ? 'radial-gradient(circle at center, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 100%)'
              : 'radial-gradient(ellipse 60% 40% at center, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)',
            borderRadius: '50%',
            transform: 'rotate(-45deg)'
          }}
        />
      </div>
    </div>
  );
};

export default GoseiLogo; 