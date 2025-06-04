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
        // Navigate to new game
        navigate(`/game/${data.gameId}`);
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

  // Don't render if there's no game state or if game isn't finished
  if (!gameState || gameState.status !== 'finished') {
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

  // Render play again confirmation dialog
  if (showPlayAgainDialog && playAgainRequestReceived) {
    return (
      <div className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        
        {/* Modal */}
        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden w-[90%] max-w-md transition-all duration-300 transform ${visible ? 'scale-100' : 'scale-95'}`}>
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
    <div className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose}></div>
      
      {/* Modal */}
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden w-[90%] max-w-md transition-all duration-300 transform ${visible ? 'scale-100' : 'scale-95'}`}>
        {/* Header */}
        <div className="bg-indigo-600 dark:bg-indigo-800 text-white py-4 px-6">
          <h2 className="text-xl font-bold text-center">Game Complete!</h2>
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
            <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded-md text-center">
              Waiting for opponent's response...
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
        </div>
      </div>
    </div>
  );
};

export default GameCompleteModal; 