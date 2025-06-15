import React from 'react';
import { GameState, Player } from '../../types/go';
import PlayerAvatar from '../PlayerAvatar';
import TimeControl from '../TimeControl';
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

  return (
    <div className="w-full bg-white rounded-lg shadow-lg border border-neutral-200 p-3 mb-4">
      {/* Players Row */}
      <div className="flex items-center justify-between mb-3">
        {/* Black Player */}
        <div className={`flex items-center gap-3 flex-1 p-2 rounded-lg transition-all duration-200 ${
          currentTurn === 'black' ? 'bg-neutral-100 ring-2 ring-blue-500' : 'bg-neutral-50'
        }`}>
          <PlayerAvatar 
            username={blackPlayer?.username || 'Waiting...'} 
            size={isMobile ? 48 : 56}
          />
          <div className="flex-1 min-w-0 text-center">
            <div className="mb-1">
              <span className={`font-semibold text-neutral-900 truncate ${isMobile ? 'text-sm' : 'text-base'}`}>
                {blackPlayer?.username || 'Waiting...'}
                {blackPlayer && currentPlayer && blackPlayer.id === currentPlayer.id && ' (You)'}
              </span>
            </div>
            <div className={`text-neutral-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              Captured: {capturedStones?.white || 0}
            </div>
          </div>
        </div>

        {/* VS Divider */}
        <div className="mx-2 text-neutral-400 font-bold">VS</div>

        {/* White Player */}
        <div className={`flex items-center gap-3 flex-1 p-2 rounded-lg transition-all duration-200 ${
          currentTurn === 'white' ? 'bg-neutral-100 ring-2 ring-blue-500' : 'bg-neutral-50'
        }`}>
          <PlayerAvatar 
            username={whitePlayer?.username || 'Waiting...'} 
            size={isMobile ? 48 : 56}
          />
          <div className="flex-1 min-w-0 text-center">
            <div className="mb-1">
              <span className={`font-semibold text-neutral-900 truncate ${isMobile ? 'text-sm' : 'text-base'}`}>
                {whitePlayer?.username || 'Waiting...'}
                {whitePlayer && currentPlayer && whitePlayer.id === currentPlayer.id && ' (You)'}
              </span>
            </div>
            <div className={`text-neutral-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              Captured: {capturedStones?.black || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Timer Section */}
      {gameState.timeControl && (gameState.timeControl.timeControl >= 0 || gameState.gameType === 'blitz' || (gameState.timePerMove && gameState.timePerMove > 0)) && (
        <div className="border-t border-neutral-200 pt-3">
          <TimeControl
            timeControl={gameState.timeControl.timeControl}
            timePerMove={gameState.timePerMove || gameState.timeControl.timePerMove || 0}
            byoYomiPeriods={gameState.timeControl.byoYomiPeriods || 0}
            byoYomiTime={gameState.timeControl.byoYomiTime || 30}
            fischerTime={gameState.timeControl.fischerTime || 0}
            currentTurn={currentTurn}
            isPlaying={status === 'playing'}
            blackTimeRemaining={blackPlayer?.timeRemaining}
            whiteTimeRemaining={whitePlayer?.timeRemaining}
            blackByoYomiPeriodsLeft={blackPlayer?.byoYomiPeriodsLeft}
            whiteByoYomiPeriodsLeft={whitePlayer?.byoYomiPeriodsLeft}
            blackByoYomiTimeLeft={blackPlayer?.byoYomiTimeLeft}
            whiteByoYomiTimeLeft={whitePlayer?.byoYomiTimeLeft}
            blackIsInByoYomi={blackPlayer?.isInByoYomi}
            whiteIsInByoYomi={whitePlayer?.isInByoYomi}
            onTimeout={(color) => {
              console.log(`Player ${color} has timed out`);
            }}
          />
        </div>
      )}


    </div>
  );
};

export default MobilePlayerPanel; 