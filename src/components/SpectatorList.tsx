import React from 'react';
import { Player } from '../types/go';

interface SpectatorListProps {
  spectators: Player[];
  currentPlayer: Player | null;
}

const SpectatorList: React.FC<SpectatorListProps> = ({ spectators, currentPlayer }) => {
  const spectatorCount = spectators?.length || 0;
  
  if (spectatorCount === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-3">
      <div className="flex items-center justify-center gap-2 text-sm text-neutral-600">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <span className="font-medium">
          {spectatorCount} watching
        </span>
      </div>
    </div>
  );
};

export default SpectatorList; 