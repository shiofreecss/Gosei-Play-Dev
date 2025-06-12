import React from 'react';
import { Player } from '../types/go';

interface SpectatorCountProps {
  spectators: Player[];
  currentPlayer: Player | null;
  isDarkMode?: boolean;
  isTablet?: boolean;
}

const SpectatorCount: React.FC<SpectatorCountProps> = ({ spectators, currentPlayer, isDarkMode, isTablet }) => {
  const spectatorCount = spectators?.length || 0;
  
  if (spectatorCount === 0) {
    return null;
  }

  return (
    <div className={`flex items-center justify-between text-xs ${isTablet ? 'text-base' : ''}`}>
      <span className={`${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'} ${isTablet ? 'text-base' : ''}`}>Watching</span>
      <div className="flex items-center gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${isTablet ? 'h-4 w-4' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <span className={`${isDarkMode ? 'text-white' : 'text-neutral-900'} font-medium`}>
          {spectatorCount}
        </span>
      </div>
    </div>
  );
};

export default SpectatorCount; 