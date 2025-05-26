import React, { useState } from 'react';
import { GameState, Player, GameMove, Position, StoneColor, Stone, GameType } from '../../types/go';
import TimeControl from '../TimeControl';
import SoundSettings from '../SoundSettings';
import PlayerAvatar from '../PlayerAvatar';
import BoardThemeButton from '../BoardThemeButton';
import useDeviceDetect from '../../hooks/useDeviceDetect';
import ConfirmationModal from '../ConfirmationModal';

// Helper function to check if a move is a pass
function isPassMove(move: GameMove): move is { pass: true, color: StoneColor } {
  return (move as any).pass === true;
}

// Format time remaining in MM:SS format
function formatTime(seconds: number | undefined): string {
  if (seconds === undefined || seconds === null) return '--:--';
  if (seconds < 0) return '00:00';
  
  const mins = Math.floor(Math.abs(seconds) / 60);
  const secs = Math.floor(Math.abs(seconds) % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

interface GameInfoProps {
  gameState: GameState;
  currentPlayer?: Player;
  onResign?: () => void;
  onRequestUndo?: () => void;
  onAcceptUndo?: () => void;
  onRejectUndo?: () => void;
  onPassTurn?: () => void;
  onLeaveGame?: () => void;
  onCopyGameLink?: () => void;
  copied?: boolean;
  autoSaveEnabled?: boolean;
  onToggleAutoSave?: () => void;
  onSaveNow?: () => void;
  onConfirmScore?: () => void;
  onCancelScoring?: () => void;
}

const GameInfo: React.FC<GameInfoProps> = ({ 
  gameState, 
  currentPlayer,
  onResign,
  onRequestUndo,
  onAcceptUndo,
  onRejectUndo,
  onPassTurn,
  onLeaveGame,
  onCopyGameLink,
  copied,
  autoSaveEnabled,
  onToggleAutoSave,
  onSaveNow,
  onConfirmScore,
  onCancelScoring
}) => {
  const { isMobile, isTablet, isDesktop } = useDeviceDetect();
  const { players, currentTurn, status, capturedStones, history, score, deadStones, undoRequest, board } = gameState;
  
  // State for confirmation modals
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  
  // Find black and white players
  const blackPlayer = players.find(player => player.color === 'black');
  const whitePlayer = players.find(player => player.color === 'white');
  
  // Count dead stones by color for display
  const deadStonesByColor = {
    black: 0,
    white: 0
  };
  
  if (deadStones && deadStones.length > 0 && board) {
    deadStones.forEach(pos => {
      const stone = board.stones.find((s: Stone) => s.position.x === pos.x && s.position.y === pos.y);
      if (stone) {
        if (stone.color === 'black') {
          deadStonesByColor.black++;
        } else {
          deadStonesByColor.white++;
        }
      }
    });
  }
  
  // Check if it's the current player's turn
  const isPlayerTurn = currentPlayer?.color === currentTurn;
  
  // Check for recent passes
  const lastMove = history.length > 0 ? history[history.length - 1] : null;
  const secondLastMove = history.length > 1 ? history[history.length - 2] : null;
  
  const lastMoveWasPass = lastMove && isPassMove(lastMove);
  const consecutivePasses = lastMoveWasPass && secondLastMove && isPassMove(secondLastMove);
  
  // Count total moves excluding passes
  const totalStones = history.filter(move => !isPassMove(move)).length;

  // Get scoring rule display name
  const getScoringRuleName = () => {
    switch (gameState.scoringRule) {
      case 'chinese': return 'Chinese';
      case 'japanese': return 'Japanese';
      case 'korean': return 'Korean';
      case 'aga': return 'AGA';
      case 'ing': return 'Ing';
      default: return 'Japanese';
    }
  };
  
  // Get game type display name
  const getGameTypeName = () => {
    switch (gameState.gameType) {
      case 'even': return 'Even Game';
      case 'handicap': return 'Handicap Game';
      case 'blitz': return 'Blitz Go';
      case 'teaching': 
      case 'rengo': 
        return 'Custom Game'; // Simplify teaching and rengo to just "Custom Game"
      default: return 'Standard Game';
    }
  };

  // Get game type icon based on type
  const getGameTypeIcon = () => {
    switch (gameState.gameType) {
      case 'handicap':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        );
      case 'blitz':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'teaching':
      case 'rengo':
        // Generic icon for custom games
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'even':
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  // Replace inline styles with classes for game type badge
  const getGameTypeBadgeStyle = (gameType: GameType) => {
    let badgeClass = "game-type-badge inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ml-2";
    
    switch (gameType) {
      case 'handicap':
        return `${badgeClass} bg-red-100 text-red-800`;
      case 'blitz':
        return `${badgeClass} bg-amber-100 text-amber-800`;
      case 'teaching':
        return `${badgeClass} bg-blue-100 text-blue-800`;
      case 'rengo':
        return `${badgeClass} bg-purple-100 text-purple-800`;
      case 'even':
      default:
        return `${badgeClass} bg-indigo-100 text-indigo-800`;
    }
  };
  
  // Now returns detailed info for different game types
  const getGameTypeDescription = () => {
    switch (gameState.gameType) {
      case 'handicap':
        const handicapStones = gameState.handicap || board.stones.filter(s => s.color === 'black').length;
        return `${handicapStones} handicap stones`;
      case 'blitz':
        return 'Fast-paced game';
      case 'teaching':
        return 'Teaching game';
      case 'rengo':
        return 'Team game';
      case 'even':
      default:
        return 'Standard rules';
    }
  };
  
  // Handle resignation with confirmation
  const handleResignClick = () => {
    setShowResignConfirm(true);
  };

  const handleConfirmResign = () => {
    setShowResignConfirm(false);
    if (onResign) onResign();
  };

  // Handle leave game with confirmation
  const handleLeaveClick = () => {
    setShowLeaveConfirm(true);
  };

  const handleConfirmLeave = () => {
    setShowLeaveConfirm(false);
    if (onLeaveGame) onLeaveGame();
  };

  return (
    <div className={`game-info bg-gray-900 text-white p-3 sm:p-4 rounded-lg shadow-lg border border-gray-800 ${
      isTablet 
        ? 'w-[600px] mx-auto'
        : isMobile
          ? 'w-full'
          : 'w-[400px] xl:w-[500px]'
    }`}>
      <h2 className="flex items-center justify-between text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-200">
        <div className="flex items-center gap-2">
          Game Info
          <span className={`text-xs ${isTablet ? 'text-base' : 'sm:text-sm'} bg-gray-700 px-2 py-1 rounded text-gray-300`}>
            {getGameTypeName()}
          </span>
        </div>
      </h2>
      
      {/* Players Section - Side by Side */}
      <div className={`grid grid-cols-2 gap-2 ${isTablet ? 'gap-6' : 'sm:gap-4'} mb-3 sm:mb-4`}>
        {/* Black Player */}
        <div className={`player-card p-2 ${isTablet ? 'p-6' : 'sm:p-5'} rounded-lg transition-all duration-200 ${
          currentTurn === 'black' ? 'bg-neutral-800 ring-2 ring-blue-500' : 'bg-neutral-800'
        }`}>
          <div className="flex flex-col items-center">
            {/* Player Avatar */}
            <PlayerAvatar 
              username={blackPlayer?.username || 'Waiting...'} 
              size={isTablet ? 80 : 64}
            />
            <div className="text-center mt-2 sm:mt-4">
              <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 mb-1 sm:mb-2">
                <span className={`font-semibold text-white ${isTablet ? 'text-xl' : 'text-sm sm:text-lg'} truncate max-w-[90px] sm:max-w-full`}>
                  {blackPlayer?.username || 'Waiting for opponent'}
                </span>
              </div>
              <div className={`${isTablet ? 'text-base' : 'text-xs sm:text-base'} text-white/90 mt-0.5 sm:mt-1.5 font-medium bg-neutral-700/50 px-2 sm:px-3 py-0.5 sm:py-1 rounded-md`}>
                Captured: {capturedStones?.white || 0}
              </div>
            </div>
          </div>
          <div className="mt-2 sm:mt-4">
            <div className={`${isTablet ? 'text-2xl p-3' : 'text-base sm:text-xl p-1 sm:p-2.5'} font-mono font-bold text-center rounded-md ${
              currentTurn === 'black' ? 'bg-blue-600 text-white' : 'bg-neutral-700 text-neutral-200'
            }`}>
              {blackPlayer ? formatTime(blackPlayer.timeRemaining) : '--:--'}
            </div>
          </div>
        </div>
        
        {/* White Player */}
        <div className={`player-card p-2 ${isTablet ? 'p-6' : 'sm:p-5'} rounded-lg transition-all duration-200 ${
          currentTurn === 'white' ? 'bg-neutral-800 ring-2 ring-blue-500' : 'bg-neutral-800'
        }`}>
          <div className="flex flex-col items-center">
            {/* Player Avatar */}
            <PlayerAvatar 
              username={whitePlayer?.username || 'Waiting...'} 
              size={isTablet ? 80 : 64}
            />
            <div className="text-center mt-2 sm:mt-4">
              <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 mb-1 sm:mb-2">
                <span className={`font-semibold text-white ${isTablet ? 'text-xl' : 'text-sm sm:text-lg'} truncate max-w-[90px] sm:max-w-full`}>
                  {whitePlayer?.username || 'Waiting for opponent'}
                </span>
              </div>
              <div className={`${isTablet ? 'text-base' : 'text-xs sm:text-base'} text-white/90 mt-0.5 sm:mt-1.5 font-medium bg-neutral-700/50 px-2 sm:px-3 py-0.5 sm:py-1 rounded-md`}>
                Captured: {capturedStones?.black || 0}
              </div>
            </div>
          </div>
          <div className="mt-2 sm:mt-4">
            <div className={`${isTablet ? 'text-2xl p-3' : 'text-base sm:text-xl p-1 sm:p-2.5'} font-mono font-bold text-center rounded-md ${
              currentTurn === 'white' ? 'bg-blue-600 text-white' : 'bg-neutral-700 text-neutral-200'
            }`}>
              {whitePlayer ? formatTime(whitePlayer.timeRemaining) : '--:--'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Timer component */}
      {gameState.timeControl && gameState.timeControl.timeControl > 0 && (
        <div className="mt-3 mb-4">
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
              // Handle timeout by forfeiting the game for the timed-out player
              if (onResign && currentPlayer?.color === color) {
                onResign();
              }
            }}
          />
        </div>
      )}

      {/* Current Turn Indicator */}
      <div className={`text-center p-2.5 mb-4 rounded-lg bg-neutral-800/80 border border-neutral-700 ${
        isTablet ? 'text-lg p-4' : ''
      }`}>
        {status === 'playing' ? (
          <div className="flex items-center justify-center gap-2.5">
            <div className={`w-3.5 h-3.5 rounded-full ${
              currentTurn === 'black' 
                ? 'bg-black border-2 border-neutral-700' 
                : 'bg-white border-2 border-neutral-300 shadow-lg'
            }`}></div>
            <span className="text-white text-base font-medium">
              {isPlayerTurn ? "Your turn" : "Opponent's turn"}
            </span>
          </div>
        ) : (
          <span className="text-white text-base font-medium">
            {status === 'waiting' ? 'Waiting for opponent' : status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        )}
      </div>

      {/* Game Control Buttons */}
      <div className={`space-y-2 ${isTablet ? 'space-y-4' : 'sm:space-y-3'} mb-3 sm:mb-4`}>
        {/* Primary Game Controls */}
        <div className={`grid grid-cols-2 gap-2 ${isTablet ? 'gap-4' : 'sm:gap-3'}`}>
          <button
            onClick={onPassTurn}
            disabled={status !== 'playing' || !isPlayerTurn}
            className={`flex items-center justify-center gap-1 ${
              isTablet 
                ? 'text-base gap-3 px-6 py-4' 
                : 'sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5'
            } bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm font-medium`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${isTablet ? 'h-4 w-4' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
            Pass
          </button>
          
          <button
            onClick={onRequestUndo}
            disabled={!isPlayerTurn || status !== 'playing'}
            className={`flex items-center justify-center gap-2 ${
              isTablet 
                ? 'text-base gap-4 px-6 py-4' 
                : 'sm:gap-2 px-4 py-2.5'
            } bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isTablet ? 'h-5 w-5' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Undo
          </button>
        </div>

        {/* Secondary Game Controls */}
        <div className={`grid grid-cols-2 gap-3 ${isTablet ? 'gap-4' : 'sm:gap-3'}`}>
          <button
            onClick={onCopyGameLink}
            className={`flex items-center justify-center gap-2 ${
              isTablet 
                ? 'text-base gap-4 px-6 py-4' 
                : 'sm:gap-2 px-4 py-2.5'
            } bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isTablet ? 'h-5 w-5' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copied ? 'Copied!' : 'Share'}
          </button>
          
          <button
            onClick={handleResignClick}
            disabled={status !== 'playing'}
            className={`flex items-center justify-center gap-2 ${
              isTablet 
                ? 'text-base gap-4 px-6 py-4' 
                : 'sm:gap-2 px-4 py-2.5'
            } bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isTablet ? 'h-5 w-5' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Resign
          </button>
        </div>
        
        {/* Leave Game Button */}
        <div className="w-full">
          <button
            onClick={handleLeaveClick}
            className={`w-full flex items-center justify-center gap-2 ${
              isTablet 
                ? 'text-base gap-4 px-6 py-4' 
                : 'sm:gap-2 px-4 py-2.5'
            } bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors text-sm font-medium`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isTablet ? 'h-5 w-5' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Leave Game
          </button>
        </div>
      </div>

      {/* Game Stats and Settings */}
      <div className={`grid grid-cols-2 gap-2 ${isTablet ? 'gap-4' : 'sm:gap-3'} mt-3 sm:mt-4`}>
        <div className={`p-2 ${isTablet ? 'p-4' : 'sm:p-3'} bg-gray-800/80 rounded-md`}>
          <h3 className={`${isTablet ? 'text-lg' : 'text-sm sm:text-base'} font-semibold mb-1 sm:mb-2 text-gray-200`}>
            Game Stats
          </h3>
          <div className={`grid grid-cols-1 gap-0.5 ${isTablet ? 'gap-2 text-base' : 'sm:gap-1 text-xs'} text-gray-300`}>
            <div>Moves: {totalStones}</div>
            <div>Board: {board.size}×{board.size}</div>
            <div>Komi: {gameState.komi}</div>
            <div>Scoring: {getScoringRuleName()}</div>
            <div>Type: {getGameTypeDescription()}</div>
          </div>
        </div>

        {/* Settings */}
        <div className={`p-2 ${isTablet ? 'p-4' : 'sm:p-3'} bg-gray-800/80 rounded-md`}>
          <h3 className={`${isTablet ? 'text-lg' : 'text-sm sm:text-base'} font-semibold mb-1 sm:mb-2 text-gray-200`}>
            Settings
          </h3>
          <div className={`space-y-1 ${isTablet ? 'space-y-2' : 'sm:space-y-2'}`}>
            {/* Stone Sound Setting */}
            <div className={`flex items-center justify-between text-xs ${isTablet ? 'text-base' : ''}`}>
              <span className={`text-gray-300 ${isTablet ? 'text-base' : ''}`}>Stone Sound</span>
              <SoundSettings />
            </div>
            
            {/* Auto Save Setting */}
            <div className={`flex items-center justify-between text-xs ${isTablet ? 'text-base' : ''}`}>
              <span className={`text-gray-300 ${isTablet ? 'text-base' : ''}`}>Auto Save</span>
              <button
                onClick={onToggleAutoSave}
                className={`px-1.5 ${isTablet ? 'px-2' : ''} py-0.5 ${isTablet ? 'py-1' : ''} rounded text-xs ${
                  autoSaveEnabled 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-600 text-gray-300'
                }`}
              >
                {autoSaveEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            
            {/* Manual Save Button - only show when auto-save is off */}
            {!autoSaveEnabled && (
              <div className={`flex items-center justify-between text-xs ${isTablet ? 'text-base' : ''}`}>
                <span className={`text-gray-300 ${isTablet ? 'text-base' : ''}`}>Manual Save</span>
                <button
                  onClick={onSaveNow}
                  className={`bg-blue-600 text-white ${isTablet ? 'px-2 py-1' : 'px-2 py-0.5'} rounded text-xs hover:bg-blue-700 ${isTablet ? '' : ''}`}
                >
                  Save Now
                </button>
              </div>
            )}
            
            {/* Board Theme Setting */}
            <div className={`flex items-center justify-between text-xs ${isTablet ? 'text-base' : ''}`}>
              <span className={`text-gray-300 ${isTablet ? 'text-base' : ''}`}>Board Theme</span>
              <BoardThemeButton />
            </div>
          </div>
        </div>
      </div>

      {/* Scoring Panel - Show only in scoring or finished state */}
      {(status === 'scoring' || status === 'finished') && (
        <div className={`p-4 bg-gray-800/90 rounded-lg mt-4 border border-gray-700 ${isTablet ? 'text-base' : 'text-sm'}`}>
          <h3 className={`${isTablet ? 'text-base' : 'text-sm sm:text-base'} font-semibold mb-3 text-gray-200`}>
            Score Breakdown
          </h3>
          
          {score ? (
            <div className={`grid grid-cols-3 gap-2 ${isTablet ? 'text-base' : 'text-sm'}`}>
              <div className="text-center"></div>
              <div className="text-center font-semibold">Black</div>
              <div className="text-center font-semibold">White</div>
              
              {/* Territory */}
              <div className="text-gray-300">Territory</div>
              <div className="text-center text-white">{score.blackTerritory?.toFixed(1) || '0.0'}</div>
              <div className="text-center text-white">{score.whiteTerritory?.toFixed(1) || '0.0'}</div>
              
              {/* Stones (for Chinese/Korean scoring) */}
              {(gameState.scoringRule === 'chinese' || gameState.scoringRule === 'korean' || gameState.scoringRule === 'aga' || gameState.scoringRule === 'ing') && (
                <>
                  <div className="text-gray-300">Stones</div>
                  <div className="text-center text-white">{score.blackStones?.toFixed(1) || '0.0'}</div>
                  <div className="text-center text-white">{score.whiteStones?.toFixed(1) || '0.0'}</div>
                </>
              )}
              
              {/* Captures (for Japanese scoring) */}
              {(gameState.scoringRule === 'japanese' || gameState.scoringRule === 'aga' || gameState.scoringRule === 'ing') && (
                <>
                  <div className="text-gray-300">Captures</div>
                  <div className="text-center text-white">{score.blackCaptures?.toFixed(1) || capturedStones.black.toFixed(1)}</div>
                  <div className="text-center text-white">{score.whiteCaptures?.toFixed(1) || capturedStones.white.toFixed(1)}</div>
                </>
              )}
              
              {/* Dead Stones */}
              {deadStonesByColor.black > 0 || deadStonesByColor.white > 0 ? (
                <>
                  <div className="text-gray-300">Dead Stones</div>
                  <div className="text-center text-white">{deadStonesByColor.black}</div>
                  <div className="text-center text-white">{deadStonesByColor.white}</div>
                </>
              ) : null}
              
              {/* Komi */}
              <div className="text-gray-300">Komi</div>
              <div className="text-center text-white">0.0</div>
              <div className="text-center text-white">{score.komi?.toFixed(1) || gameState.komi.toFixed(1)}</div>
              
              {/* Total */}
              <div className="text-gray-300 font-semibold">Total</div>
              <div className="text-center text-white font-bold text-base">{score.black.toFixed(1)}</div>
              <div className="text-center text-white font-bold text-base">{score.white.toFixed(1)}</div>
            </div>
          ) : (
            <div className={`text-center text-white p-3 ${isTablet ? 'text-base' : 'text-sm'}`}>
              <p>Calculating score...</p>
              <p className={`text-sm opacity-80 mt-2 ${isTablet ? 'text-base' : 'text-sm'}`}>Mark dead stones by clicking on them</p>
            </div>
          )}
          
          {/* Result display */}
          {status === 'finished' && score && (
            <div className={`mt-4 text-center ${isTablet ? 'text-base' : 'text-sm'}`}>
              <div className={`inline-block px-4 py-2 rounded-lg font-semibold ${
                gameState.winner === 'black' 
                  ? 'bg-black text-white'
                  : gameState.winner === 'white' 
                    ? 'bg-white text-black border border-gray-300'
                    : 'bg-gray-600 text-white'
              }`}>
                {gameState.winner === 'black' 
                  ? 'Black wins by ' + (score.black - score.white).toFixed(1) + ' points'
                  : gameState.winner === 'white' 
                    ? 'White wins by ' + (score.white - score.black).toFixed(1) + ' points'
                    : 'Game ended in a draw'
                }
              </div>
            </div>
          )}
          
          {/* Scoring actions */}
          {status === 'scoring' && (
            <div className={`mt-4 grid grid-cols-2 gap-3 ${isTablet ? 'gap-4' : 'gap-3'}`}>
              <button
                onClick={onConfirmScore}
                className={`flex items-center justify-center gap-2 ${
                  isTablet 
                    ? 'text-base gap-4 px-6 py-4' 
                    : 'sm:gap-2 px-4 py-2.5'
                } bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isTablet ? 'h-5 w-5' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Confirm Score
              </button>
              
              <button
                onClick={onCancelScoring}
                className={`flex items-center justify-center gap-2 ${
                  isTablet 
                    ? 'text-base gap-4 px-6 py-4' 
                    : 'sm:gap-2 px-4 py-2.5'
                } bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isTablet ? 'h-5 w-5' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Resume Game
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showResignConfirm}
        title="Resign Game"
        message="Are you sure you want to resign? This will count as a loss."
        confirmLabel="Resign"
        cancelLabel="Cancel"
        confirmButtonColor="bg-red-600 hover:bg-red-700"
        onConfirm={handleConfirmResign}
        onCancel={() => setShowResignConfirm(false)}
      />

      <ConfirmationModal
        isOpen={showLeaveConfirm}
        title="Leave Game"
        message="Are you sure you want to leave this game? Your opponent will be notified."
        confirmLabel="Leave"
        cancelLabel="Stay"
        confirmButtonColor="bg-red-600 hover:bg-red-700"
        onConfirm={handleConfirmLeave}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </div>
  );
};

export default GameInfo; 