import React, { useState, useEffect } from 'react';
import { GameState, Player, GameMove, Position, StoneColor, Stone, GameType } from '../../types/go';
import TimeControl from '../TimeControl';
import SoundSettings from '../SoundSettings';
import PlayerAvatar from '../PlayerAvatar';
import BoardThemeButton from '../BoardThemeButton';
import BoardCoordinateButton from '../BoardCoordinateButton';
import useDeviceDetect from '../../hooks/useDeviceDetect';
import ConfirmationModal from '../ConfirmationModal';
import SpectatorList from '../SpectatorList';
import { useAppTheme } from '../../context/AppThemeContext';

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
  showCoordinates?: boolean;
  onToggleCoordinates?: (show: boolean) => void;
  onReviewBoardChange?: (stones: Stone[], moveIndex: number, isReviewing: boolean) => void;
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
  onCancelScoring,
  showCoordinates = true,
  onToggleCoordinates,
  onReviewBoardChange
}) => {
  const { isMobile, isTablet, isDesktop } = useDeviceDetect();
  const { isDarkMode } = useAppTheme();
  const { players, currentTurn, status, capturedStones, history, score, deadStones, undoRequest, board } = gameState;
  
  // State for confirmation modals
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  
  // Spectator review state
  const [moveIndex, setMoveIndex] = useState<number>(gameState.history.length);
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  
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
  
  // Check if current user is a spectator
  const isSpectator = currentPlayer?.isSpectator === true;
  
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

  // Spectator review functions
  const calculateBoardState = (moveIndex: number): Stone[] => {
    // If moveIndex is 0, show empty board or only handicap stones
    if (moveIndex === 0) {
      if (gameState.gameType === 'handicap' && gameState.handicap > 0) {
        // For handicap games, show only the handicap stones at move 0
        const handicapStones = gameState.board.stones.filter(stone => {
          return !gameState.history.some(move => {
            if (isPassMove(move)) return false;
            let pos: Position;
            if ((move as any).position) {
              pos = (move as any).position;
            } else if (typeof move === 'object' && 'x' in move && 'y' in move) {
              pos = move as Position;
            } else {
              return false;
            }
            return pos.x === stone.position.x && pos.y === stone.position.y;
          });
        });
        return handicapStones;
      } else {
        // For regular games, show empty board at move 0
        return [];
      }
    }

    let stones: Stone[] = [];
    let currentTurn: StoneColor = 'black';
    
    // Add handicap stones if it's a handicap game
    if (gameState.gameType === 'handicap' && gameState.handicap > 0) {
      const handicapStones = gameState.board.stones.filter(stone => {
        return !gameState.history.some(move => {
          if (isPassMove(move)) return false;
          let pos: Position;
          if ((move as any).position) {
            pos = (move as any).position;
          } else if (typeof move === 'object' && 'x' in move && 'y' in move) {
            pos = move as Position;
          } else {
            return false;
          }
          return pos.x === stone.position.x && pos.y === stone.position.y;
        });
      });
      stones = [...handicapStones];
      currentTurn = 'white'; // White plays first in handicap games
    }
    
    // Add moves up to the specified moveIndex
    for (let i = 0; i < moveIndex && i < gameState.history.length; i++) {
      const move = gameState.history[i];
      if (!isPassMove(move)) {
        let pos: Position;
        if ((move as any).position) {
          pos = (move as any).position;
        } else if (typeof move === 'object' && 'x' in move && 'y' in move) {
          pos = move as Position;
        } else {
          continue;
        }
        if (typeof pos.x !== 'number' || typeof pos.y !== 'number') continue;
        stones.push({ position: pos, color: currentTurn });
        // No capture logic for simplicity (can be added if needed)
      }
      currentTurn = currentTurn === 'black' ? 'white' : 'black';
    }
    return stones;
  };

  // Update board state when move index changes - only for spectators
  useEffect(() => {
    if (onReviewBoardChange && isSpectator) {
      if (moveIndex === gameState.history.length) {
        onReviewBoardChange(gameState.board.stones, moveIndex, false);
        setIsReviewing(false);
      } else {
        onReviewBoardChange(calculateBoardState(moveIndex), moveIndex, true);
        setIsReviewing(true);
      }
    }
    // eslint-disable-next-line
  }, [moveIndex, gameState.history.length, onReviewBoardChange, isSpectator]);

  const goToStart = () => setMoveIndex(0);
  const goToPrev = () => setMoveIndex(idx => Math.max(0, idx - 1));
  const goToNext = () => setMoveIndex(idx => Math.min(gameState.history.length, idx + 1));
  const goToEnd = () => setMoveIndex(gameState.history.length);

  return (
    <div className={`game-info bg-white text-neutral-900 p-3 sm:p-4 rounded-lg shadow-lg border border-neutral-200 ${
      isTablet 
        ? 'w-[600px] mx-auto'
        : isMobile
          ? 'w-full'
          : 'w-[400px] xl:w-[500px]'
    }`}>
      <h2 className="flex items-center justify-between text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-neutral-800">
        <div className="flex items-center gap-2">
          Game Info
          <span className={`text-xs ${isTablet ? 'text-base' : 'sm:text-sm'} bg-neutral-100 px-2 py-1 rounded text-neutral-600`}>
            {getGameTypeName()}
          </span>
        </div>
      </h2>
      
      {/* Players Section - Side by Side */}
      <div className={`grid grid-cols-2 gap-2 ${isTablet ? 'gap-6' : 'sm:gap-4'} mb-3 sm:mb-4`}>
        {/* Black Player */}
        <div className={`player-card p-2 ${isTablet ? 'p-6' : 'sm:p-5'} rounded-lg transition-all duration-200 ${
          currentTurn === 'black' ? 'bg-neutral-100 ring-2 ring-blue-500' : 'bg-neutral-50'
        }`}>
          <div className="flex flex-col items-center">
            {/* Player Avatar */}
            <PlayerAvatar 
              username={blackPlayer?.username || 'Waiting...'} 
              size={isTablet ? 80 : 64}
            />
            <div className="text-center mt-2 sm:mt-4">
              <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 mb-1 sm:mb-2">
                <span className={`font-semibold text-neutral-900 ${isTablet ? 'text-xl' : 'text-sm sm:text-lg'} truncate max-w-[90px] sm:max-w-full`}>
                  {blackPlayer?.username || 'Waiting for opponent'}
                  {blackPlayer && currentPlayer && blackPlayer.id === currentPlayer.id && ' (me)'}
                </span>
              </div>
              <div className={`${isTablet ? 'text-base' : 'text-xs sm:text-base'} text-neutral-700 mt-0.5 sm:mt-1.5 font-medium bg-neutral-200 px-2 sm:px-3 py-0.5 sm:py-1 rounded-md`}>
                Captured: {capturedStones?.white || 0}
              </div>
            </div>
          </div>
        </div>
        
        {/* White Player */}
        <div className={`player-card p-2 ${isTablet ? 'p-6' : 'sm:p-5'} rounded-lg transition-all duration-200 ${
          currentTurn === 'white' ? 'bg-neutral-100 ring-2 ring-blue-500' : 'bg-neutral-50'
        }`}>
          <div className="flex flex-col items-center">
            {/* Player Avatar */}
            <PlayerAvatar 
              username={whitePlayer?.username || 'Waiting...'} 
              size={isTablet ? 80 : 64}
            />
            <div className="text-center mt-2 sm:mt-4">
              <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 mb-1 sm:mb-2">
                <span className={`font-semibold text-neutral-900 ${isTablet ? 'text-xl' : 'text-sm sm:text-lg'} truncate max-w-[90px] sm:max-w-full`}>
                  {whitePlayer?.username || 'Waiting for opponent'}
                  {whitePlayer && currentPlayer && whitePlayer.id === currentPlayer.id && ' (me)'}
                </span>
              </div>
              <div className={`${isTablet ? 'text-base' : 'text-xs sm:text-base'} text-neutral-700 mt-0.5 sm:mt-1.5 font-medium bg-neutral-200 px-2 sm:px-3 py-0.5 sm:py-1 rounded-md`}>
                Captured: {capturedStones?.black || 0}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Timer component */}
      {gameState.timeControl && (gameState.timeControl.timeControl >= 0 || gameState.gameType === 'blitz' || (gameState.timePerMove && gameState.timePerMove > 0)) && (
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
              // Server will handle timeout and emit playerTimeout event with proper W+T or B+T result
              // Do not call onResign() here as that would incorrectly set W+R or B+R
            }}
          />
        </div>
      )}

      {/* Current Turn Indicator */}
      <div className={`text-center p-2.5 mb-4 rounded-lg bg-neutral-50 border border-neutral-200 ${
        isTablet ? 'text-lg p-4' : ''
      }`}>
        {status === 'playing' ? (
          <div className="flex items-center justify-center gap-2.5">
            <div className={`w-3.5 h-3.5 rounded-full ${
              currentTurn === 'black' 
                ? 'bg-black border-2 border-neutral-400' 
                : 'bg-white border-2 border-neutral-400 shadow-lg'
            }`}></div>
            <span className="text-neutral-900 text-base font-medium">
              {isPlayerTurn ? "Your turn" : "Opponent's turn"}
            </span>
          </div>
        ) : (
          <span className="text-neutral-900 text-base font-medium">
            {status === 'waiting' ? 'Waiting for opponent' : status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        )}
      </div>

      {/* Undo Request Status */}
      {undoRequest && (
        <div className={`text-center p-2 mb-4 rounded-lg ${
          isDarkMode 
            ? 'bg-yellow-900/20 border border-yellow-800/50' 
            : 'bg-yellow-50 border border-yellow-200'
        } ${isTablet ? 'text-base p-3' : 'text-sm'}`}>
          <div className="flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${
              isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className={`font-medium ${
              isDarkMode ? 'text-yellow-300' : 'text-yellow-700'
            }`}>
              {undoRequest.requestedBy === currentPlayer?.id 
                ? 'Waiting for opponent to respond to undo request...' 
                : 'Opponent has requested to undo moves'}
            </span>
          </div>
        </div>
      )}

      {/* Game Control Buttons */}
      <div className={`space-y-2 ${isTablet ? 'space-y-4' : 'sm:space-y-3'} mb-3 sm:mb-4`}>
        {/* Primary Game Controls */}
        <div className={`grid grid-cols-2 gap-2 ${isTablet ? 'gap-4' : 'sm:gap-3'}`}>
          <button
            onClick={onPassTurn}
            disabled={status !== 'playing' || !isPlayerTurn || isSpectator}
            className={`flex items-center justify-center gap-1 ${
              isTablet 
                ? 'text-base gap-3 px-6 py-4' 
                : 'sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5'
            } bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-xs sm:text-sm font-medium shadow-sm hover:shadow-md`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 ${isTablet ? 'h-4 w-4' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
            Pass
          </button>
          
          <button
            onClick={onRequestUndo}
            disabled={status !== 'playing' || history.length === 0 || !!undoRequest || isPlayerTurn || isSpectator}
            className={`flex items-center justify-center gap-2 ${
              isTablet 
                ? 'text-base gap-4 px-6 py-4' 
                : 'sm:gap-2 px-4 py-2.5'
            } ${!!undoRequest 
              ? (isDarkMode 
                ? 'bg-yellow-900/30 hover:bg-yellow-900/40 text-yellow-300 border border-yellow-700' 
                : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border border-yellow-300') 
              : (isDarkMode
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-600 hover:border-neutral-500'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:border-slate-300')
            } rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isTablet ? 'h-5 w-5' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {!!undoRequest ? 'Undo Pending...' : 'Undo'}
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
            } bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isTablet ? 'h-5 w-5' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copied ? 'Copied!' : 'Share'}
          </button>
          
          <button
            onClick={handleResignClick}
            disabled={status !== 'playing' || isSpectator}
            className={`flex items-center justify-center gap-2 ${
              isTablet 
                ? 'text-base gap-4 px-6 py-4' 
                : 'sm:gap-2 px-4 py-2.5'
            } bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md`}
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
            } bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isTablet ? 'h-5 w-5' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {isSpectator ? 'Stop Watching' : 'Leave Game'}
          </button>
        </div>
      </div>

      {/* Game Stats and Settings */}
      <div className={`grid grid-cols-2 gap-2 ${isTablet ? 'gap-4' : 'sm:gap-3'} mt-3 sm:mt-4`}>
        <div className={`p-2 ${isTablet ? 'p-4' : 'sm:p-3'} bg-neutral-50 rounded-md`}>
          <h3 className={`${isTablet ? 'text-lg' : 'text-sm sm:text-base'} font-semibold mb-1 sm:mb-2 text-neutral-800`}>
            Game Stats
          </h3>
          <div className={`grid grid-cols-1 gap-0.5 ${isTablet ? 'gap-2 text-base' : 'sm:gap-1 text-xs'} text-neutral-600`}>
            <div>Moves: {totalStones}</div>
            <div>Board: {board.size}×{board.size}</div>
            <div>Komi: {gameState.komi}</div>
            <div>Scoring: {getScoringRuleName()}</div>
            <div>Type: {getGameTypeDescription()}</div>
          </div>
        </div>

        {/* Settings */}
        <div className={`p-2 ${isTablet ? 'p-4' : 'sm:p-3'} rounded-md ${
          isDarkMode ? 'bg-neutral-800/80' : 'bg-neutral-50'
        }`}>
          <h3 className={`${isTablet ? 'text-lg' : 'text-sm sm:text-base'} font-semibold mb-1 sm:mb-2 ${
            isDarkMode ? 'text-white' : 'text-neutral-800'
          }`}>
            Settings
          </h3>
          <div className={`space-y-1 ${isTablet ? 'space-y-2' : 'sm:space-y-2'}`}>
            {/* Stone Sound Setting */}
            <div className={`flex items-center justify-between text-xs ${isTablet ? 'text-base' : ''}`}>
              <span className={`${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'} ${isTablet ? 'text-base' : ''}`}>Stone Sound</span>
              <SoundSettings />
            </div>
            
            {/* Auto Save Setting */}
            <div className={`flex items-center justify-between text-xs ${isTablet ? 'text-base' : ''}`}>
              <span className={`${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'} ${isTablet ? 'text-base' : ''}`}>Auto Save</span>
              <button
                onClick={onToggleAutoSave}
                className={`px-1.5 ${isTablet ? 'px-2' : ''} py-0.5 ${isTablet ? 'py-1' : ''} rounded text-xs ${
                  autoSaveEnabled 
                    ? 'bg-green-600 text-white' 
                    : 'bg-neutral-400 text-neutral-700'
                }`}
              >
                {autoSaveEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            
            {/* Manual Save Button - only show when auto-save is off */}
            {!autoSaveEnabled && (
              <div className={`flex items-center justify-between text-xs ${isTablet ? 'text-base' : ''}`}>
                <span className={`${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'} ${isTablet ? 'text-base' : ''}`}>Manual Save</span>
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
              <span className={`${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'} ${isTablet ? 'text-base' : ''}`}>Board Theme</span>
              <BoardThemeButton />
            </div>
            
            {/* Board Coordinates Setting */}
            {onToggleCoordinates && (
              <div className={`flex items-center justify-between text-xs ${isTablet ? 'text-base' : ''}`}>
                <span className={`${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'} ${isTablet ? 'text-base' : ''}`}>Coords</span>
                <BoardCoordinateButton 
                  showCoordinates={showCoordinates} 
                  onToggle={onToggleCoordinates} 
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Spectator Review Panel - Only show for spectators when game is not finished */}
      {isSpectator && gameState.history.length > 0 && status !== 'finished' && (
        <div className="mt-3 sm:mt-4">
          <div className={`p-3 rounded-lg border ${
            isDarkMode 
              ? 'bg-neutral-800/80 border-neutral-700' 
              : 'bg-neutral-50 border-neutral-200'
          }`}>
            <div className={`font-semibold mb-2 ${
              isDarkMode ? 'text-neutral-200' : 'text-neutral-800'
            }`}>
              Review Game
            </div>
            <div className="flex flex-wrap gap-1 mb-2 justify-center">
              <button 
                className={`btn btn-xs px-2 py-1 text-xs ${
                  isDarkMode 
                    ? 'bg-neutral-700 hover:bg-neutral-600 text-neutral-200 border-neutral-600' 
                    : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-300'
                }`}
                onClick={goToStart} 
                disabled={moveIndex === 0} 
                title="To Start"
              >
                |&lt;&lt;
              </button>
              <button 
                className={`btn btn-xs px-2 py-1 text-xs ${
                  isDarkMode 
                    ? 'bg-neutral-700 hover:bg-neutral-600 text-neutral-200 border-neutral-600' 
                    : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-300'
                }`}
                onClick={goToPrev} 
                disabled={moveIndex === 0} 
                title="Prev"
              >
                &lt;
              </button>
              <span className={`px-2 py-1 text-xs font-medium ${
                isDarkMode ? 'text-neutral-300' : 'text-neutral-600'
              }`}>
                {moveIndex} / {gameState.history.length}
              </span>
              <button 
                className={`btn btn-xs px-2 py-1 text-xs ${
                  isDarkMode 
                    ? 'bg-neutral-700 hover:bg-neutral-600 text-neutral-200 border-neutral-600' 
                    : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-300'
                }`}
                onClick={goToNext} 
                disabled={moveIndex === gameState.history.length} 
                title="Next"
              >
                &gt;
              </button>
              <button 
                className={`btn btn-xs px-2 py-1 text-xs ${
                  isDarkMode 
                    ? 'bg-neutral-700 hover:bg-neutral-600 text-neutral-200 border-neutral-600' 
                    : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-300'
                }`}
                onClick={goToEnd} 
                disabled={moveIndex === gameState.history.length} 
                title="To End"
              >
                &gt;&gt;|
              </button>
            </div>
            {isReviewing && (
              <div className="text-center">
                <button 
                  className={`btn btn-xs px-3 py-1 text-xs ${
                    isDarkMode 
                      ? 'bg-blue-700 hover:bg-blue-600 text-white border-blue-600' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                  }`}
                  onClick={goToEnd}
                >
                  Go to Live
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Spectator Count */}
      {gameState.spectators && gameState.spectators.length > 0 && (
        <div className="mt-3 sm:mt-4">
          <SpectatorList 
            spectators={gameState.spectators} 
            currentPlayer={currentPlayer || null} 
          />
        </div>
      )}

      {/* Scoring Panel - Show only in scoring or finished state */}
      {(status === 'scoring' || status === 'finished') && (
        <div className={`p-4 rounded-lg mt-4 border ${isTablet ? 'text-base' : 'text-sm'} ${
          isDarkMode 
            ? 'bg-neutral-800/80 border-neutral-700' 
            : 'bg-neutral-50 border-neutral-200'
        }`}>
          <h3 className={`${isTablet ? 'text-base' : 'text-sm sm:text-base'} font-semibold mb-3 ${
            isDarkMode ? 'text-white' : 'text-neutral-800'
          }`}>
            Score Breakdown
          </h3>
          
          {score ? (
            <div className={`grid grid-cols-3 gap-2 ${isTablet ? 'text-base' : 'text-sm'}`}>
              <div className="text-center"></div>
              <div className="text-center font-semibold">Black</div>
              <div className="text-center font-semibold">White</div>
              
              {/* Territory */}
              <div className={isDarkMode ? 'text-neutral-300' : 'text-neutral-600'}>Territory</div>
              <div className={`text-center ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>{score.blackTerritory?.toFixed(1) || '0.0'}</div>
              <div className={`text-center ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>{score.whiteTerritory?.toFixed(1) || '0.0'}</div>
              
              {/* Prisoners (stones captured during play) */}
              {(gameState.scoringRule === 'japanese' || gameState.scoringRule === 'aga' || gameState.scoringRule === 'ing') && (
                <>
                  <div className={isDarkMode ? 'text-neutral-300' : 'text-neutral-600'}>Prisoners</div>
                  <div className={`text-center ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>{capturedStones.black.toFixed(1)}</div>
                  <div className={`text-center ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>{capturedStones.white.toFixed(1)}</div>
                </>
              )}
              
              {/* Dead Stones (marked during scoring) */}
              <div className={isDarkMode ? 'text-neutral-300' : 'text-neutral-600'}>Dead Stones</div>
              <div className={`text-center ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>{deadStonesByColor.black.toFixed(1)}</div>
              <div className={`text-center ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>{deadStonesByColor.white.toFixed(1)}</div>
              
              {/* Komi */}
              <div className={isDarkMode ? 'text-neutral-300' : 'text-neutral-600'}>Komi</div>
              <div className={`text-center ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>0.0</div>
              <div className={`text-center ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>{score.komi?.toFixed(1) || gameState.komi.toFixed(1)}</div>
              
              {/* Total */}
              <div className={`font-semibold ${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>Total</div>
              <div className={`text-center font-bold text-base ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>{((score.blackTerritory ?? 0) - capturedStones.black - deadStonesByColor.black).toFixed(1)}</div>
              <div className={`text-center font-bold text-base ${isDarkMode ? 'text-white' : 'text-neutral-900'}`}>{((score.whiteTerritory ?? 0) - capturedStones.white - deadStonesByColor.white + (score.komi || gameState.komi)).toFixed(1)}</div>
            </div>
          ) : (
            <div className={`text-center p-3 ${isTablet ? 'text-base' : 'text-sm'} ${
              isDarkMode ? 'text-white' : 'text-neutral-900'
            }`}>
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
                    ? 'bg-white text-black border border-neutral-300'
                    : 'bg-neutral-400 text-white'
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
          
          {/* Score Confirmation Status */}
          {status === 'scoring' && gameState.scoreConfirmation && (
            <div className={`mt-4 p-3 rounded-md border ${
              isDarkMode ? 'bg-neutral-700/50 border-neutral-600' : 'bg-blue-50 border-blue-200'
            }`}>
              <h4 className={`text-sm font-medium mb-2 ${
                isDarkMode ? 'text-white' : 'text-neutral-800'
              }`}>
                Score Confirmation Status
              </h4>
              <div className="flex items-center justify-between space-x-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    gameState.scoreConfirmation.black 
                      ? 'bg-green-500' 
                      : 'bg-neutral-400'
                  }`}></div>
                  <span className={`text-sm ${
                    isDarkMode ? 'text-neutral-300' : 'text-neutral-600'
                  }`}>
                    Black {gameState.scoreConfirmation.black ? 'Confirmed' : 'Pending'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    gameState.scoreConfirmation.white 
                      ? 'bg-green-500' 
                      : 'bg-neutral-400'
                  }`}></div>
                  <span className={`text-sm ${
                    isDarkMode ? 'text-neutral-300' : 'text-neutral-600'
                  }`}>
                    White {gameState.scoreConfirmation.white ? 'Confirmed' : 'Pending'}
                  </span>
                </div>
              </div>
              {gameState.scoreConfirmation.black && gameState.scoreConfirmation.white && (
                <div className={`mt-2 text-center text-sm font-medium ${
                  isDarkMode ? 'text-green-400' : 'text-green-600'
                }`}>
                  Both players confirmed - Game will finish!
                </div>
              )}
            </div>
          )}

          {/* Scoring actions */}
          {status === 'scoring' && !isSpectator && (
            <div className={`mt-4 grid grid-cols-2 gap-3 ${isTablet ? 'gap-4' : 'gap-3'}`}>
              <button
                onClick={onConfirmScore}
                disabled={currentPlayer && gameState.scoreConfirmation?.[currentPlayer.color as 'black' | 'white']}
                className={`flex items-center justify-center gap-2 ${
                  isTablet 
                    ? 'text-base gap-4 px-6 py-4' 
                    : 'sm:gap-2 px-4 py-2.5'
                } ${
                  currentPlayer && gameState.scoreConfirmation?.[currentPlayer.color as 'black' | 'white']
                    ? 'bg-green-800 text-green-200 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                } rounded-md transition-colors text-sm font-medium`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isTablet ? 'h-5 w-5' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {currentPlayer && gameState.scoreConfirmation?.[currentPlayer.color as 'black' | 'white'] ? 'Confirmed' : 'Confirm Score'}
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

          {/* Spectator message during scoring */}
          {status === 'scoring' && isSpectator && (
            <div className={`mt-4 p-3 rounded-md text-center ${
              isDarkMode 
                ? 'bg-blue-900/20 border border-blue-800/50 text-blue-300' 
                : 'bg-blue-50 border border-blue-200 text-blue-700'
            }`}>
              <p className="text-sm font-medium">
                Players are scoring the game. You can only watch.
              </p>
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