import React, { useEffect, useState, useRef } from 'react';
import { formatTime } from '../utils/timeUtils';

const TimeDisplay = ({ 
  timeRemaining, 
  isCurrentPlayer, 
  color, 
  isInByoYomi, 
  byoYomiPeriodsLeft, 
  byoYomiTimeLeft, 
  justReset,
  socket, 
  gameId 
}) => {
  const [clientTime, setClientTime] = useState({
    timeRemaining,
    isInByoYomi,
    byoYomiPeriodsLeft,
    byoYomiTimeLeft
  });
  
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [justMoved, setJustMoved] = useState(false);
  const prevByoYomiTimeRef = useRef(byoYomiTimeLeft);
  
  // Update the client-side timer every second
  useEffect(() => {
    let timer;
    
    // Only run the timer for the current player
    if (isCurrentPlayer) {
      timer = setInterval(() => {
        const now = Date.now();
        const elapsedTime = Math.floor((now - lastUpdateTime) / 1000);
        
        setClientTime(prevTime => {
          // Client-side time prediction
          if (prevTime.isInByoYomi) {
            // In byoyomi, count down byoyomi time
            const newByoYomiTime = Math.max(0, prevTime.byoYomiTimeLeft - elapsedTime);
            
            // If byoyomi period would expire, we'll let the server handle it
            // Just show 0 until next server update
            return {
              ...prevTime,
              byoYomiTimeLeft: newByoYomiTime
            };
          } else {
            // In main time, count down main time
            const newMainTime = Math.max(0, prevTime.timeRemaining - elapsedTime);
            return {
              ...prevTime,
              timeRemaining: newMainTime
            };
          }
        });
        
        setLastUpdateTime(now);
        
        // Send timer tick to server
        if (socket && gameId) {
          console.log(`⏱️ Sending timer tick for ${color} player (current: ${isCurrentPlayer})`);
          socket.emit('timerTick', { gameId });
        }
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isCurrentPlayer, socket, gameId]);
  
  // Check for byoyomi time reset (when server sends new values)
  useEffect(() => {
    // If byoyomi time has increased, it means there was a reset
    if (isInByoYomi && byoYomiTimeLeft > prevByoYomiTimeRef.current + 5) {
      setJustMoved(true);
      
      // Clear the justMoved flag after animation completes
      const timeout = setTimeout(() => {
        setJustMoved(false);
      }, 1000);
      
      return () => clearTimeout(timeout);
    }
    
    // Update the ref for the next comparison
    prevByoYomiTimeRef.current = byoYomiTimeLeft;
    
    // Update local state with new values from props
    setClientTime({
      timeRemaining,
      isInByoYomi,
      byoYomiPeriodsLeft,
      byoYomiTimeLeft
    });
    setLastUpdateTime(Date.now());
  }, [timeRemaining, isInByoYomi, byoYomiPeriodsLeft, byoYomiTimeLeft]);
  
  // Determine color styling
  const getTimeColor = () => {
    if (clientTime.isInByoYomi) {
      if (justReset || justMoved) return '#4caf50'; // Green when just reset
      return clientTime.byoYomiTimeLeft < 5 ? '#f44336' : '#ff9800'; // Red when < 5s, orange otherwise
    } else {
      return clientTime.timeRemaining < 30 ? '#f44336' : 'inherit';
    }
  };
  
  // Get appropriate display text
  const getTimeDisplay = () => {
    if (clientTime.isInByoYomi) {
      return (
        <div className="time-display">
          <div className="byoyomi-indicator">
            BY {clientTime.byoYomiPeriodsLeft}×{formatTime(clientTime.byoYomiTimeLeft)}
          </div>
          <div className="periods-left">{clientTime.byoYomiPeriodsLeft} periods left</div>
          <div 
            className={`time-value text-base sm:text-lg font-semibold font-mono ${justReset || justMoved ? 'reset-pulse' : ''}`} 
            style={{ color: getTimeColor() }}
          >
            {formatTime(clientTime.byoYomiTimeLeft)}
          </div>
        </div>
      );
    } else {
      return (
        <div className="time-display">
          <div className="time-label">Main Time</div>
          <div 
            className="time-value text-base sm:text-lg font-semibold text-gray-400 font-mono" 
            style={{ color: getTimeColor() }}
          >
            {formatTime(clientTime.timeRemaining)}
          </div>
        </div>
      );
    }
  };
  
  return (
    <div className={`player-time ${color} ${isCurrentPlayer ? 'active' : ''}`}>
      {getTimeDisplay()}
    </div>
  );
};

export default TimeDisplay; 