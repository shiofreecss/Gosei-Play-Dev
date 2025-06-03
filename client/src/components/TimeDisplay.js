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
  // Client state now ONLY stores what server tells us - no local calculations
  const [displayTime, setDisplayTime] = useState({
    timeRemaining,
    isInByoYomi,
    byoYomiPeriodsLeft,
    byoYomiTimeLeft
  });
  
  const [justMoved, setJustMoved] = useState(false);
  const prevByoYomiTimeRef = useRef(byoYomiTimeLeft);
  
  // Listen for server time updates - ONLY source of time information
  useEffect(() => {
    if (!socket) return;
    
    const handleTimeUpdate = (data) => {
      if (data.color === color) {
        // CRITICAL: Use ONLY server-provided values, no client calculation
        setDisplayTime({
          timeRemaining: data.timeRemaining,
          isInByoYomi: data.isInByoYomi,
          byoYomiPeriodsLeft: data.byoYomiPeriodsLeft,
          byoYomiTimeLeft: data.byoYomiTimeLeft
        });
      }
    };
    
    socket.on('timeUpdate', handleTimeUpdate);
    
    return () => {
      socket.off('timeUpdate', handleTimeUpdate);
    };
  }, [socket, color]);
  
  // REMOVED: All client-side timer countdown logic - server is now the authority
  
  // Only keep the visual reset detection for animation
  useEffect(() => {
    let resetDetected = false;
    
    // Detect byo-yomi resets for visual feedback only
    if (byoYomiTimeLeft > prevByoYomiTimeRef.current + 5) {
      resetDetected = true;
      console.log(`🎯 BYO-YOMI RESET DETECTED for ${color}: ${prevByoYomiTimeRef.current}s → ${byoYomiTimeLeft}s`);
    } else if (byoYomiTimeLeft >= 25 && prevByoYomiTimeRef.current < 25) {
      resetDetected = true;
      console.log(`🎯 BYO-YOMI RESET DETECTED (full reset) for ${color}: ${prevByoYomiTimeRef.current}s → ${byoYomiTimeLeft}s`);
    } else if (byoYomiTimeLeft > prevByoYomiTimeRef.current + 2) {
      resetDetected = true;
      console.log(`🎯 BYO-YOMI RESET DETECTED (upward change) for ${color}: ${prevByoYomiTimeRef.current}s → ${byoYomiTimeLeft}s`);
    }
    
    if (resetDetected) {
      setJustMoved(true);
      const timeout = setTimeout(() => {
        setJustMoved(false);
      }, 1000);
      
      prevByoYomiTimeRef.current = byoYomiTimeLeft;
      return () => clearTimeout(timeout);
    }
    
    prevByoYomiTimeRef.current = byoYomiTimeLeft;
    
    // Update display with server-provided values
    setDisplayTime({
      timeRemaining,
      isInByoYomi,
      byoYomiPeriodsLeft,
      byoYomiTimeLeft
    });
  }, [timeRemaining, isInByoYomi, byoYomiPeriodsLeft, byoYomiTimeLeft, color]);
  
  // Determine color styling
  const getTimeColor = () => {
    if (displayTime.isInByoYomi) {
      if (justReset || justMoved) return '#4caf50'; // Green when just reset
      return displayTime.byoYomiTimeLeft < 5 ? '#f44336' : '#ff9800'; // Red when < 5s, orange otherwise
    } else {
      return displayTime.timeRemaining < 30 ? '#f44336' : 'inherit';
    }
  };
  
  // Get appropriate display text
  const getTimeDisplay = () => {
    if (displayTime.isInByoYomi) {
      return (
        <div className="time-display">
          <div className="byoyomi-indicator">
            BY {displayTime.byoYomiPeriodsLeft}×{formatTime(displayTime.byoYomiTimeLeft)}
          </div>
          <div className="periods-left">{displayTime.byoYomiPeriodsLeft} periods left</div>
          <div 
            className={`time-value text-base sm:text-lg font-semibold font-mono ${justReset || justMoved ? 'reset-pulse' : ''}`} 
            style={{ color: getTimeColor() }}
          >
            {formatTime(displayTime.byoYomiTimeLeft)}
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
            {formatTime(displayTime.timeRemaining)}
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