import React, { useEffect, useState } from 'react';
import TimeDisplay from './TimeDisplay';
import '../styles/TimeDisplay.css';
import '../styles/GameTimer.css';
import { getTimeControlDescription } from '../utils/timeUtils';

const GameTimer = ({ gameState, socket }) => {
  const [playerTimes, setPlayerTimes] = useState({
    black: { timeRemaining: 0, isInByoYomi: false, byoYomiPeriodsLeft: 0, byoYomiTimeLeft: 0, justReset: false },
    white: { timeRemaining: 0, isInByoYomi: false, byoYomiPeriodsLeft: 0, byoYomiTimeLeft: 0, justReset: false }
  });
  
  const [lastMove, setLastMove] = useState(null);
  const [lastReset, setLastReset] = useState(null);

  // Initialize time values from game state
  useEffect(() => {
    if (gameState && gameState.players && gameState.players.length > 0) {
      const blackPlayer = gameState.players.find(p => p.color === 'black');
      const whitePlayer = gameState.players.find(p => p.color === 'white');
      
      const newPlayerTimes = {
        black: blackPlayer ? {
          timeRemaining: blackPlayer.timeRemaining || 0,
          isInByoYomi: blackPlayer.isInByoYomi || false,
          byoYomiPeriodsLeft: blackPlayer.byoYomiPeriodsLeft || 0,
          byoYomiTimeLeft: blackPlayer.byoYomiTimeLeft || 0
        } : playerTimes.black,
        
        white: whitePlayer ? {
          timeRemaining: whitePlayer.timeRemaining || 0,
          isInByoYomi: whitePlayer.isInByoYomi || false,
          byoYomiPeriodsLeft: whitePlayer.byoYomiPeriodsLeft || 0,
          byoYomiTimeLeft: whitePlayer.byoYomiTimeLeft || 0
        } : playerTimes.white
      };
      
      setPlayerTimes(newPlayerTimes);
    }
  }, [gameState]);

  // Track when a move is made to update the time display immediately
  useEffect(() => {
    if (gameState && gameState.lastMove) {
      const currentMove = JSON.stringify(gameState.lastMove);
      if (currentMove !== lastMove) {
        setLastMove(currentMove);
        
        // If a move was just made, force an immediate update of the player's time
        if (gameState.lastMoveColor) {
          const player = gameState.players.find(p => p.color === gameState.lastMoveColor);
          if (player && player.isInByoYomi) {
            // Update the time immediately for the player who just moved
            setPlayerTimes(prev => ({
              ...prev,
              [gameState.lastMoveColor]: {
                ...prev[gameState.lastMoveColor],
                byoYomiTimeLeft: gameState.timeControl.byoYomiTime // Use the full time from time control settings
              }
            }));
          }
        }
      }
    }
  }, [gameState?.lastMove, gameState?.lastMoveColor, lastMove, gameState?.timeControl]);

  // Listen for time updates from the server
  useEffect(() => {
    if (!socket) return;
    
    const handleTimeUpdate = (data) => {
      const { color, timeRemaining, isInByoYomi, byoYomiPeriodsLeft, byoYomiTimeLeft } = data;
      
      setPlayerTimes(prev => ({
        ...prev,
        [color]: {
          timeRemaining: timeRemaining !== undefined ? timeRemaining : prev[color].timeRemaining,
          isInByoYomi: isInByoYomi !== undefined ? isInByoYomi : prev[color].isInByoYomi,
          byoYomiPeriodsLeft: byoYomiPeriodsLeft !== undefined ? byoYomiPeriodsLeft : prev[color].byoYomiPeriodsLeft,
          byoYomiTimeLeft: byoYomiTimeLeft !== undefined ? byoYomiTimeLeft : prev[color].byoYomiTimeLeft
        }
      }));
    };
    
    const handleByoYomiStarted = (data) => {
      const { color, periodsLeft, timePerPeriod } = data;
      
      setPlayerTimes(prev => ({
        ...prev,
        [color]: {
          ...prev[color],
          isInByoYomi: true,
          byoYomiPeriodsLeft: periodsLeft,
          byoYomiTimeLeft: timePerPeriod
        }
      }));
    };
    
    const handleByoYomiPeriodUsed = (data) => {
      const { color, periodsLeft } = data;
      
      setPlayerTimes(prev => ({
        ...prev,
        [color]: {
          ...prev[color],
          byoYomiPeriodsLeft: periodsLeft,
          byoYomiTimeLeft: gameState?.timeControl?.byoYomiTime || 30
        }
      }));
    };
    
    const handleMoveMade = (data) => {
      const { color } = data;
      if (color) {
        // Find the player who just moved
        const movingPlayer = gameState?.players?.find(p => p.color === color);
        if (movingPlayer && movingPlayer.isInByoYomi) {
          // Update their byoyomi time immediately
          setPlayerTimes(prev => ({
            ...prev,
            [color]: {
              ...prev[color],
              byoYomiTimeLeft: gameState?.timeControl?.byoYomiTime || 30
            }
          }));
        }
      }
    };
    
    const handleByoYomiReset = (data) => {
      const { color, byoYomiTimeLeft, byoYomiPeriodsLeft } = data;
      const resetKey = `${color}-${Date.now()}`;
      
      if (resetKey !== lastReset) {
        setLastReset(resetKey);
        console.log(`🔄 BYO-YOMI RESET for ${color}: ${byoYomiTimeLeft} seconds, ${byoYomiPeriodsLeft} periods left`);
        
        // Update the time display immediately with the reset values and visual flag
        setPlayerTimes(prev => ({
          ...prev,
          [color]: {
            ...prev[color],
            byoYomiTimeLeft: byoYomiTimeLeft,
            byoYomiPeriodsLeft: byoYomiPeriodsLeft,
            isInByoYomi: true,
            justReset: true // Flag for visual feedback
          }
        }));
        
        // Clear the reset flag after animation
        setTimeout(() => {
          setPlayerTimes(prev => ({
            ...prev,
            [color]: {
              ...prev[color],
              justReset: false
            }
          }));
        }, 1500);
      }
    };
    
    // Subscribe to events
    socket.on('timeUpdate', handleTimeUpdate);
    socket.on('byoYomiStarted', handleByoYomiStarted);
    socket.on('byoYomiPeriodUsed', handleByoYomiPeriodUsed);
    socket.on('moveMade', handleMoveMade);
    socket.on('byoYomiReset', handleByoYomiReset);
    
    // Cleanup
    return () => {
      socket.off('timeUpdate', handleTimeUpdate);
      socket.off('byoYomiStarted', handleByoYomiStarted);
      socket.off('byoYomiPeriodUsed', handleByoYomiPeriodUsed);
      socket.off('moveMade', handleMoveMade);
      socket.off('byoYomiReset', handleByoYomiReset);
    };
  }, [socket, gameState, lastReset]);

  if (!gameState || !gameState.timeControl) {
    return null;
  }

  return (
    <div className="game-timer">
      <div className="time-control-info">
        <span className="time-control-label">Time Control:</span>
        <span className="time-control-value">{getTimeControlDescription(gameState.timeControl)}</span>
      </div>
      
      <div className="player-timers">
        <TimeDisplay
          timeRemaining={playerTimes.black.timeRemaining}
          isCurrentPlayer={gameState.currentTurn === 'black'}
          color="black"
          isInByoYomi={playerTimes.black.isInByoYomi}
          byoYomiPeriodsLeft={playerTimes.black.byoYomiPeriodsLeft}
          byoYomiTimeLeft={playerTimes.black.byoYomiTimeLeft}
          justReset={playerTimes.black.justReset}
          socket={socket}
          gameId={gameState.id}
        />
        
        <TimeDisplay
          timeRemaining={playerTimes.white.timeRemaining}
          isCurrentPlayer={gameState.currentTurn === 'white'}
          color="white"
          isInByoYomi={playerTimes.white.isInByoYomi}
          byoYomiPeriodsLeft={playerTimes.white.byoYomiPeriodsLeft}
          byoYomiTimeLeft={playerTimes.white.byoYomiTimeLeft}
          justReset={playerTimes.white.justReset}
          socket={socket}
          gameId={gameState.id}
        />
      </div>
    </div>
  );
};

export default GameTimer; 