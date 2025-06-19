import React, { useState } from 'react';
import { GameState, Player } from '../../types/go';
import useDeviceDetect from '../../hooks/useDeviceDetect';
import { useAppTheme } from '../../context/AppThemeContext';
import SoundSettings from '../SoundSettings';
import BoardThemeButton from '../BoardThemeButton';
import BoardCoordinateButton from '../BoardCoordinateButton';

interface MobileGameToolsProps {
  gameState: GameState;
  currentPlayer?: Player;
  onPassTurn?: () => void;
  onRequestUndo?: () => void;
  onResign?: () => void;
  onLeaveGame?: () => void;
  onCopyGameLink?: () => void;
  onConfirmScore?: () => void;
  onCancelScoring?: () => void;
  onForceScoring?: () => void;
  autoSaveEnabled?: boolean;
  onToggleAutoSave?: () => void;
  onSaveNow?: () => void;
  showCoordinates?: boolean;
  onToggleCoordinates?: (show: boolean) => void;
}

const MobileGameTools: React.FC<MobileGameToolsProps> = ({
  gameState,
  currentPlayer,
  onPassTurn,
  onRequestUndo,
  onResign,
  onLeaveGame,
  onCopyGameLink,
  onConfirmScore,
  onCancelScoring,
  onForceScoring,
  autoSaveEnabled,
  onToggleAutoSave,
  onSaveNow,
  showCoordinates,
  onToggleCoordinates
}) => {
  const { isMobile, isTablet } = useDeviceDetect();
  const { isDarkMode } = useAppTheme();
  const { currentTurn, status, history, undoRequest, board } = gameState;
  
  // State for confirmation modals
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  
  // Don't render on desktop
  if (!isMobile && !isTablet) {
    return null;
  }
  
  // Check if it's the current player's turn
  const isPlayerTurn = currentPlayer?.color === currentTurn;
  const isSpectator = currentPlayer?.isSpectator === true;
  
  // Check if this is an AI game
  const isAIGame = gameState.players.some(player => player.isAI);
  const isHumanPlayer = currentPlayer && !currentPlayer.isAI;

  // Helper functions from GameInfo
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

  // Count total moves excluding passes
  const isPassMove = (move: any): boolean => {
    return typeof move === 'object' && 'pass' in move;
  };
  
  const totalStones = history.filter(move => !isPassMove(move)).length;

  // Check for recent passes
  const lastMove = history.length > 0 ? history[history.length - 1] : null;
  const lastMoveWasPass = lastMove && isPassMove(lastMove);
  
  // Check if force scoring should be available
  const shouldShowForceScoring = isAIGame && 
    !isSpectator && 
    status === 'playing' && 
    currentPlayer?.color !== currentTurn && // It's AI's turn
    lastMoveWasPass && // Last move was a pass
    history.length > 0 && 
    (history[history.length - 1] as any).color === currentPlayer?.color; // Last pass was by human player

  const handleResignClick = () => {
    setShowResignConfirm(true);
  };

  const handleConfirmResign = () => {
    setShowResignConfirm(false);
    onResign?.();
  };

  const handleLeaveClick = () => {
    setShowLeaveConfirm(true);
  };

  const handleConfirmLeave = () => {
    setShowLeaveConfirm(false);
    onLeaveGame?.();
  };

  return (
    <>
      <div className="w-full bg-white rounded-lg shadow-lg border border-neutral-200 p-3 mt-4">
        {/* Game Status */}
        {status === 'playing' && (
          <div className="mb-4 text-center">
            <div className="text-sm text-neutral-600 mb-2">Game in Progress</div>
            <div className="text-xs text-neutral-500">
              Move {history.length} • {isPlayerTurn ? "Your turn" : "Opponent's turn"}
            </div>
          </div>
        )}

        {status === 'scoring' && (
          <div className="mb-4 text-center">
            <div className="text-sm text-orange-600 mb-2 font-medium">Scoring Phase</div>
            <div className="text-xs text-neutral-500">
              {isSpectator ? "Players are scoring the game" : "Mark dead stones and confirm score"}
            </div>
          </div>
        )}

        {/* Primary Actions Row */}
        {status === 'playing' && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              onClick={onPassTurn}
              disabled={!isPlayerTurn || isSpectator}
              className={`flex items-center justify-center gap-2 ${
                isMobile ? 'py-3' : 'py-4'
              } bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm hover:shadow-md`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              Pass
            </button>
            
            <button
              onClick={onRequestUndo}
              disabled={history.length === 0 || !!undoRequest || (isPlayerTurn && !isAIGame) || isSpectator || (isAIGame && !isHumanPlayer) || (isAIGame && history.length < 2) || (isAIGame && gameState.aiUndoUsed)}
              className={`flex items-center justify-center gap-2 ${
                isMobile ? 'py-3' : 'py-4'
              } ${!!undoRequest 
                ? (isDarkMode 
                  ? 'bg-yellow-900/30 hover:bg-yellow-900/40 text-yellow-300 border border-yellow-700' 
                  : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border border-yellow-300') 
                : (isDarkMode
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-600 hover:border-neutral-500'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:border-slate-300')
              } rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm hover:shadow-md`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {!!undoRequest ? 'Pending...' : (isAIGame ? 'Undo (1x)' : 'Undo')}
            </button>
          </div>
        )}

        {/* Force Scoring Button - Only show in AI games when AI is unresponsive after human pass */}
        {shouldShowForceScoring && (
          <div className="mb-3">
            <button
              onClick={onForceScoring}
              className={`w-full flex items-center justify-center gap-2 ${
                isMobile ? 'py-3' : 'py-4'
              } ${
                isDarkMode
                  ? 'bg-orange-900/30 hover:bg-orange-900/40 text-orange-300 border border-orange-700 hover:border-orange-600'
                  : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 hover:border-orange-300'
              } rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Force Scoring (AI Unresponsive)
            </button>
          </div>
        )}

        {/* Scoring Actions */}
        {status === 'scoring' && !isSpectator && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              onClick={onConfirmScore}
              className={`flex items-center justify-center gap-2 ${
                isMobile ? 'py-3' : 'py-4'
              } bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm hover:shadow-md`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Confirm Score
            </button>
            
            <button
              onClick={onCancelScoring}
              className={`flex items-center justify-center gap-2 ${
                isMobile ? 'py-3' : 'py-4'
              } bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm hover:shadow-md`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Resume Game
            </button>
          </div>
        )}

        {/* Secondary Actions Row */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button
            onClick={onCopyGameLink}
            className={`flex items-center justify-center gap-2 ${
              isMobile ? 'py-3' : 'py-4'
            } bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Share
          </button>
          
          <button
            onClick={handleResignClick}
            disabled={status !== 'playing' || isSpectator}
            className={`flex items-center justify-center gap-2 ${
              isMobile ? 'py-3' : 'py-4'
            } bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-sm hover:shadow-md`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Resign
          </button>
        </div>

        {/* Leave Game Button */}
        <button
          onClick={handleLeaveClick}
          className={`w-full flex items-center justify-center gap-2 ${
            isMobile ? 'py-3' : 'py-4'
          } bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {isSpectator ? 'Stop Watching' : 'Leave Game'}
        </button>

        {/* Game Stats and Settings */}
        <div className={`grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-neutral-200`}>
          {/* Settings (Tools) - moved to left column */}
          <div className={`p-3 rounded-md ${
            isDarkMode ? 'bg-neutral-800/80' : 'bg-neutral-50'
          }`}>
            <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold mb-2 ${
              isDarkMode ? 'text-white' : 'text-neutral-800'
            }`}>
              Settings
            </h3>
            <div className={`space-y-2`}>
              {/* Stone Sound Setting */}
              <div className={`flex items-center justify-between ${isMobile ? 'text-xs' : 'text-sm'}`}>
                <span className={`${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>Stone Sound</span>
                <SoundSettings />
              </div>
              
              {/* Auto Save Setting */}
              <div className={`flex items-center justify-between ${isMobile ? 'text-xs' : 'text-sm'}`}>
                <span className={`${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>Auto Save</span>
                <button
                  onClick={onToggleAutoSave}
                  className={`px-2 py-0.5 rounded text-xs ${
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
                <div className={`flex items-center justify-between ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <span className={`${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>Manual Save</span>
                  <button
                    onClick={onSaveNow}
                    className={`bg-blue-600 text-white px-2 py-0.5 rounded text-xs hover:bg-blue-700`}
                  >
                    Save Now
                  </button>
                </div>
              )}
              
              {/* Board Theme Setting */}
              <div className={`flex items-center justify-between ${isMobile ? 'text-xs' : 'text-sm'}`}>
                <span className={`${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>Board Theme</span>
                <BoardThemeButton />
              </div>
              
              {/* Board Coordinates Setting */}
              {onToggleCoordinates && (
                <div className={`flex items-center justify-between ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <span className={`${isDarkMode ? 'text-neutral-300' : 'text-neutral-600'}`}>Coords</span>
                  <BoardCoordinateButton 
                    showCoordinates={showCoordinates || false} 
                    onToggle={onToggleCoordinates} 
                  />
                </div>
              )}
            </div>
          </div>

          {/* Game Stats - moved to right column */}
          <div className={`p-3 bg-neutral-50 rounded-md`}>
            <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold mb-2 text-neutral-800`}>
              Game Stats
            </h3>
            <div className={`grid grid-cols-1 gap-1 ${isMobile ? 'text-xs' : 'text-sm'} text-neutral-600`}>
              <div>Moves: {totalStones}</div>
              <div>Board: {board.size}×{board.size}</div>
              <div>Komi: {gameState.komi}</div>
              <div>Scoring: {getScoringRuleName()}</div>
              <div>Type: {getGameTypeDescription()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      {showResignConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Resign Game</h3>
            <p className="text-neutral-600 mb-6">Are you sure you want to resign? This will count as a loss.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResignConfirm(false)}
                className="flex-1 py-2 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResign}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              >
                Resign
              </button>
            </div>
          </div>
        </div>
      )}

      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">
              {isSpectator ? 'Stop Watching' : 'Leave Game'}
            </h3>
            <p className="text-neutral-600 mb-6">
              {isSpectator 
                ? 'Are you sure you want to stop watching this game?' 
                : 'Are you sure you want to leave? You can rejoin using the game link.'
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-2 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLeave}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              >
                {isSpectator ? 'Stop Watching' : 'Leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileGameTools; 