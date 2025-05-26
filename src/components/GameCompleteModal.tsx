import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

interface GameCompleteModalProps {
  onClose?: () => void;
  onPlayAgain?: () => void;
}

const GameCompleteModal: React.FC<GameCompleteModalProps> = ({ onClose, onPlayAgain }) => {
  const { gameState, currentPlayer, resetGame } = useGame();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  // Animation effect
  useEffect(() => {
    // Short delay to trigger entrance animation
    const timer = setTimeout(() => {
      setVisible(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);

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
    resetGame();
    onPlayAgain?.();
    navigate('/');
  };
  
  const handleReturnHome = () => {
    navigate('/');
  };

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
                    ? 'You win - opponent ran out of time!' 
                    : 'You lose - time expired!'
                ) : score ? (
                  playerWon 
                  ? `You win by ${pointDifference} points` 
                    : `You lose by ${pointDifference} points`
                ) : (
                  playerWon ? 'You win!' : 'You lose!'
                )}
              </div>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleReturnHome}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
            >
              Return Home
            </button>
            <button
              onClick={handlePlayAgain}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              Play Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameCompleteModal; 