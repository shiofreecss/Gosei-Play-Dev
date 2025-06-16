import React from 'react';
import { GameState, Player } from '../../types/go';
import PlayerAvatar from '../PlayerAvatar';
import useDeviceDetect from '../../hooks/useDeviceDetect';

interface MobilePlayerPanelProps {
  gameState: GameState;
  currentPlayer?: Player;
}

const MobilePlayerPanel: React.FC<MobilePlayerPanelProps> = ({
  gameState,
  currentPlayer
}) => {
  const { isMobile, isTablet } = useDeviceDetect();
  const { players, currentTurn, capturedStones, status } = gameState;
  
  // Find black and white players
  const blackPlayer = players.find(player => player.color === 'black');
  const whitePlayer = players.find(player => player.color === 'white');
  
  // Don't render on desktop
  if (!isMobile && !isTablet) {
    return null;
  }

  // Helper function to format time
  const formatTime = (seconds: number | undefined): string => {
    if (seconds === undefined || seconds < 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get time display for a player
  const getTimeDisplay = (player: Player | undefined): { time: string; label: string; isWarning: boolean } => {
    if (!player) return { time: '--:--', label: 'Main Time', isWarning: false };
    
    if (player.isInByoYomi && player.byoYomiPeriodsLeft && player.byoYomiTimeLeft !== undefined) {
      // Player is in byo-yomi
      return {
        time: formatTime(player.byoYomiTimeLeft),
        label: `Byo-Yomi (${player.byoYomiPeriodsLeft})`,
        isWarning: player.byoYomiTimeLeft <= 10
      };
    } else {
      // Player is in main time
      return {
        time: formatTime(player.timeRemaining),
        label: 'Main Time',
        isWarning: (player.timeRemaining || 0) <= 30
      };
    }
  };

  // Check if we should show timer info
  const showTimer = gameState.timeControl && (gameState.timeControl.timeControl >= 0 || gameState.gameType === 'blitz' || (gameState.timePerMove && gameState.timePerMove > 0));

  const blackTimeDisplay = getTimeDisplay(blackPlayer);
  const whiteTimeDisplay = getTimeDisplay(whitePlayer);

  return (
    <div className="w-full bg-white rounded-lg shadow-lg border border-neutral-200 p-3 mb-4">
      {/* Players Row */}
      <div className="flex items-center justify-between">
        {/* Black Player */}
        <div className={`flex items-center flex-1 min-w-0 p-2 rounded-lg transition-all duration-200 ${
          currentTurn === 'black' ? 'bg-neutral-100 ring-2 ring-blue-500' : 'bg-neutral-50'
        }`}>
          <div className="flex flex-col items-center mr-3">
            <PlayerAvatar 
              username={blackPlayer?.username || 'Waiting...'} 
              size={isMobile ? 48 : 56}
            />
                         <div className="text-4xl mt-1 text-black">
               <span className="dark:hidden">●</span>
               <span className="hidden dark:inline" style={{ textShadow: '0 0 0 1px white, 1px 1px 0 white, -1px -1px 0 white, 1px -1px 0 white, -1px 1px 0 white' }}>●</span>
             </div>
          </div>
          <div className="flex-1 min-w-0 text-center">
            <div className={`mb-1 font-semibold text-neutral-900 truncate ${isMobile ? 'text-sm' : 'text-base'}`}>
              {blackPlayer?.username || 'Waiting...'}
              {blackPlayer && currentPlayer && blackPlayer.id === currentPlayer.id && ' (You)'}
            </div>
            <div className={`text-neutral-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              Captured: {capturedStones?.white || 0}
            </div>
            {showTimer && (
              <>
                <div className={`font-mono font-bold ${isMobile ? 'text-2xl' : 'text-3xl'} ${
                  blackTimeDisplay.isWarning ? 'text-red-600' : 'text-orange-600'
                }`}>
                  {blackTimeDisplay.time}
                </div>
                <div className={`text-neutral-500 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {blackTimeDisplay.label}
                </div>
              </>
            )}
          </div>
        </div>

        {/* VS Divider */}
        <div className="mx-2 text-neutral-400 font-bold">VS</div>

        {/* White Player */}
        <div className={`flex items-center flex-1 min-w-0 p-2 rounded-lg transition-all duration-200 ${
          currentTurn === 'white' ? 'bg-neutral-100 ring-2 ring-blue-500' : 'bg-neutral-50'
        }`}>
          <div className="flex flex-col items-center mr-3">
            <PlayerAvatar 
              username={whitePlayer?.username || 'Waiting...'} 
              size={isMobile ? 48 : 56}
            />
                         <div className="text-4xl mt-1 text-white dark:text-gray-100" style={{ textShadow: '1px 1px 1px rgba(0,0,0,0.8), -1px -1px 1px rgba(0,0,0,0.8), 1px -1px 1px rgba(0,0,0,0.8), -1px 1px 1px rgba(0,0,0,0.8)' }}>●</div>
          </div>
          <div className="flex-1 min-w-0 text-center">
            <div className={`mb-1 font-semibold text-neutral-900 truncate ${isMobile ? 'text-sm' : 'text-base'}`}>
              {whitePlayer?.username || 'Waiting...'}
              {whitePlayer && currentPlayer && whitePlayer.id === currentPlayer.id && ' (You)'}
            </div>
            <div className={`text-neutral-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              Captured: {capturedStones?.black || 0}
            </div>
            {showTimer && (
              <>
                <div className={`font-mono font-bold ${isMobile ? 'text-2xl' : 'text-3xl'} ${
                  whiteTimeDisplay.isWarning ? 'text-red-600' : 'text-orange-600'
                }`}>
                  {whiteTimeDisplay.time}
                </div>
                <div className={`text-neutral-500 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {whiteTimeDisplay.label}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobilePlayerPanel; 