import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

interface GameCompleteModalProps {
  onClose?: () => void;
  onPlayAgain?: () => void;
}

const GameCompleteModal: React.FC<GameCompleteModalProps> = ({ onClose, onPlayAgain }) => {
  const { gameState, currentPlayer, leaveGame } = useGame();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [showPlayAgainDialog, setShowPlayAgainDialog] = useState(false);
  const [playAgainRequestSent, setPlayAgainRequestSent] = useState(false);
  const [playAgainRequestReceived, setPlayAgainRequestReceived] = useState(false);
  const [requestFromPlayer, setRequestFromPlayer] = useState<string>('');
  const [waitingForNewGame, setWaitingForNewGame] = useState(false);

  // Animation effect
  useEffect(() => {
    // Short delay to trigger entrance animation
    const timer = setTimeout(() => {
      setVisible(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);

  // Listen for play again requests from opponent
  useEffect(() => {
    const socket = gameState?.socket;
    if (!socket) return;

    const handlePlayAgainRequest = (data: { fromPlayerId: string; fromUsername: string; gameId: string }) => {
      if (data.fromPlayerId !== currentPlayer?.id) {
        setPlayAgainRequestReceived(true);
        setRequestFromPlayer(data.fromUsername);
        setShowPlayAgainDialog(true);
      }
    };

    const handlePlayAgainResponse = (data: { accepted: boolean; fromPlayerId: string; gameId?: string; newGameState?: any }) => {
      if (data.accepted && data.gameId) {
        // Set waiting state and let GameContext handle the state update
        setWaitingForNewGame(true);
        setShowPlayAgainDialog(false);
        setPlayAgainRequestSent(false);
        
        // Navigate after a short delay to allow GameContext to update
        setTimeout(() => {
          navigate(`/game/${data.gameId}`);
        }, 500);
      } else {
        // Request was declined, go to home page
        handleReturnHome();
      }
    };

    socket.on('playAgainRequest', handlePlayAgainRequest);
    socket.on('playAgainResponse', handlePlayAgainResponse);

    return () => {
      socket.off('playAgainRequest', handlePlayAgainRequest);
      socket.off('playAgainResponse', handlePlayAgainResponse);
    };
  }, [gameState?.socket, currentPlayer, navigate]);

  // Watch for game state changes to detect when a new game starts
  useEffect(() => {
    if (gameState && waitingForNewGame) {
      // Check if this is a different game (new game ID) and it's ready to play
      if (gameState.status === 'playing' || gameState.status === 'waiting') {
        console.log('New game detected, closing modal and navigating');
        setWaitingForNewGame(false);
        handleClose();
      }
    }
  }, [gameState?.id, gameState?.status, waitingForNewGame]);

  // Don't render if there's no game state
  if (!gameState) {
    return null;
  }

  // Don't render if game isn't finished (unless we're waiting for new game)
  if (gameState.status !== 'finished' && !waitingForNewGame) {
    return null;
  }

  const score = gameState.score;
  const winner = gameState.winner;
  const result = gameState.result;
  const playerColor = currentPlayer?.color;
  
  // For timeout games, there might not be a score object
  const isTimeoutGame = result && (result.includes('+T'));
  const pointDifference = score ? Math.abs(score.black - score.white).toFixed(1) : '0';
  
  // Determine if the current player won
  const playerWon = playerColor === winner;
  const isDraw = winner === null;
  
  // Handle close and actions
  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300); // Wait for exit animation
  };
  
  const handlePlayAgain = () => {
    if (!gameState?.socket || !currentPlayer) return;
    
    // Send play again request to opponent
    const opponentPlayer = gameState.players.find(p => p.id !== currentPlayer.id);
    if (!opponentPlayer) return;

    gameState.socket.emit('playAgainRequest', {
      gameId: gameState.id,
      fromPlayerId: currentPlayer.id,
      fromUsername: currentPlayer.username,
      toPlayerId: opponentPlayer.id
    });

    setPlayAgainRequestSent(true);
  };
  
  const handleReturnHome = () => {
    // Clean up game state and navigate to home
    leaveGame();
    navigate('/');
  };

  const handlePlayAgainResponse = (accepted: boolean) => {
    if (!gameState?.socket || !currentPlayer) return;

    gameState.socket.emit('playAgainResponse', {
      gameId: gameState.id,
      fromPlayerId: currentPlayer.id,
      accepted: accepted
    });

    if (!accepted) {
      // If declined, go to home page
      setShowPlayAgainDialog(false);
      handleReturnHome();
    } else {
      // If accepted, wait for server to create new game
      setShowPlayAgainDialog(false);
    }
  };

  // If waiting for new game, always show the waiting modal regardless of game status
  if (waitingForNewGame) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'} pointer-events-none`}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"></div>
        
        {/* Modal */}
        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden w-[90%] max-w-md transition-all duration-300 transform ${visible ? 'scale-100' : 'scale-95'} pointer-events-auto relative z-10`}>
          {/* Header */}
          <div className="bg-green-600 dark:bg-green-800 text-white py-4 px-6">
            <h2 className="text-xl font-bold text-center">Starting New Game...</h2>
          </div>
          
          {/* Content */}
          <div className="p-6 text-center">
            <div className="mb-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Setting up your new game...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render play again confirmation dialog
  if (showPlayAgainDialog && playAgainRequestReceived) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'} pointer-events-none`}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"></div>
        
        {/* Modal */}
        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden w-[90%] max-w-md transition-all duration-300 transform ${visible ? 'scale-100' : 'scale-95'} pointer-events-auto relative z-10`}>
          {/* Header */}
          <div className="bg-blue-600 dark:bg-blue-800 text-white py-4 px-6">
            <h2 className="text-xl font-bold text-center">Play Again?</h2>
          </div>
          
          {/* Content */}
          <div className="p-6 text-center">
            <p className="mb-6 text-lg">
              <strong>{requestFromPlayer}</strong> wants to play another game with you.
            </p>
            
            {/* Action buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => handlePlayAgainResponse(false)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
              >
                No, Thanks
              </button>
              <button
                onClick={() => handlePlayAgainResponse(true)}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                Yes, Let's Play!
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'} pointer-events-none`}>
      {/* Backdrop - only blocks the center area where modal appears */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={handleClose}></div>
      
      {/* Modal */}
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden w-[90%] max-w-md transition-all duration-300 transform ${visible ? 'scale-100' : 'scale-95'} pointer-events-auto relative z-10`}>
        {/* Header */}
        <div className="bg-indigo-600 dark:bg-indigo-800 text-white py-4 px-6 relative">
          <h2 className="text-xl font-bold text-center">Game Complete!</h2>
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 p-2 hover:bg-indigo-700 rounded-full transition-colors"
            title="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Result Card */}
        <div className="p-6">
          <div className={`mx-auto mb-6 text-center p-5 rounded-lg shadow-md ${
            winner === 'black' ? 'bg-gray-900 text-white' : 
            winner === 'white' ? 'bg-white border border-gray-300 text-gray-900' : 
            'bg-gradient-to-r from-gray-700 to-gray-800 text-white'
          }`}>
            {/* Winner announcement */}
            <div className="text-lg font-bold mb-3">
              {isDraw ? "It's a Draw!" : winner === 'black' ? "Black Wins!" : "White Wins!"}
            </div>
            
            {/* Score display */}
            {score ? (
              <div className="flex justify-center items-center gap-4">
                <div>
                  <div className="text-xs opacity-80">Black</div>
                  <div className="text-2xl font-bold">{score.black.toFixed(1)}</div>
                </div>
                <div className="text-sm">vs</div>
                <div>
                  <div className="text-xs opacity-80">White</div>
                  <div className="text-2xl font-bold">{score.white.toFixed(1)}</div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center">
                <div className="text-xl font-semibold">
                  {result || 'Game Complete'}
                </div>
              </div>
            )}
            
            {/* Personal result message */}
            {playerColor && !isDraw && (
              <div className="mt-4 font-medium text-base">
                {isTimeoutGame ? (
                  playerWon 
                    ? 'You win!' 
                    : 'You lose!'
                ) : score ? (
                  playerWon 
                    ? `You win!` 
                    : `You lose!`
                ) : (
                  playerWon ? 'You win!' : 'You lose!'
                )}
              </div>
            )}
          </div>
          
          {/* Show status if play again request was sent */}
          {playAgainRequestSent && (
            <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md text-center">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>Waiting for opponent's response...</span>
              </div>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleReturnHome}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
            >
              Return Home
            </button>
            <button
              onClick={handlePlayAgain}
              disabled={playAgainRequestSent}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {playAgainRequestSent ? 'Request Sent' : 'Play Again'}
            </button>
          </div>
          
          {/* Helpful hint */}
          <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            You can still use game controls by closing this modal or clicking outside it
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameCompleteModal; 