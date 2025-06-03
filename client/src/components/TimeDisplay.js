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
  
  const [lastServerUpdate, setLastServerUpdate] = useState(Date.now());
  const [serverTimestamp, setServerTimestamp] = useState(Date.now());
  const [lastMoveTime, setLastMoveTime] = useState(Date.now());
  const [justMoved, setJustMoved] = useState(false);
  const prevByoYomiTimeRef = useRef(byoYomiTimeLeft);
  
  // Listen for server time updates with timestamps
  useEffect(() => {
    if (!socket) return;
    
    const handleTimeUpdate = (data) => {
      if (data.color === color) {
        const now = Date.now();
        
        // Update client state with server values
        setClientTime({
          timeRemaining: data.timeRemaining,
          isInByoYomi: data.isInByoYomi,
          byoYomiPeriodsLeft: data.byoYomiPeriodsLeft,
          byoYomiTimeLeft: data.byoYomiTimeLeft
        });
        
        // Store server synchronization data
        if (data.serverTimestamp) {
          setServerTimestamp(data.serverTimestamp);
          setLastServerUpdate(now);
        }
        
        if (data.lastMoveTime) {
          setLastMoveTime(data.lastMoveTime);
        }
      }
    };
    
    socket.on('timeUpdate', handleTimeUpdate);
    
    return () => {
      socket.off('timeUpdate', handleTimeUpdate);
    };
  }, [socket, color]);
  
  // Update the client-side timer with server synchronization
  useEffect(() => {
    let timer;
    
    // Only run the timer for the current player
    if (isCurrentPlayer) {
      timer = setInterval(() => {
        const now = Date.now();
        
        // Calculate drift between client and server
        const timeSinceServerUpdate = now - lastServerUpdate;
        const serverNow = serverTimestamp + timeSinceServerUpdate;
        
        // Calculate elapsed time since last move using server time
        const elapsedTime = Math.floor((serverNow - lastMoveTime) / 1000);
        
        setClientTime(prevTime => {
          // Use server-synchronized time calculation
          if (prevTime.isInByoYomi) {
            // In byo-yomi, count down from server values
            const serverByoYomiTime = Math.max(0, byoYomiTimeLeft - elapsedTime);
            
            return {
              ...prevTime,
              byoYomiTimeLeft: serverByoYomiTime
            };
          } else {
            // In main time, count down from server values
            const serverMainTime = Math.max(0, timeRemaining - elapsedTime);
            
            return {
              ...prevTime,
              timeRemaining: serverMainTime
            };
          }
        });
        
        // Send timer tick to server less frequently to reduce network load
        if (Math.floor(now / 2000) !== Math.floor((now - 1000) / 2000)) {
          if (socket && gameId) {
            socket.emit('timerTick', { gameId });
          }
        }
      }, 200); // Update more frequently for smoother display
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isCurrentPlayer, socket, gameId, lastServerUpdate, serverTimestamp, lastMoveTime, timeRemaining, byoYomiTimeLeft]);
  
  // Check for byoyomi time reset (when server sends new values)
  useEffect(() => {
    // Enhanced reset detection with multiple scenarios
    let resetDetected = false;
    
    // Scenario 1: Time increased significantly (normal reset)
    if (byoYomiTimeLeft > prevByoYomiTimeRef.current + 5) {
      resetDetected = true;
      console.log(`🎯 BYO-YOMI RESET DETECTED (significant increase) for ${color}: ${prevByoYomiTimeRef.current}s → ${byoYomiTimeLeft}s`);
    }
    // Scenario 2: Time reset to full period time from lower value  
    else if (byoYomiTimeLeft >= 25 && prevByoYomiTimeRef.current < 25) {
      resetDetected = true;
      console.log(`🎯 BYO-YOMI RESET DETECTED (full reset) for ${color}: ${prevByoYomiTimeRef.current}s → ${byoYomiTimeLeft}s`);
    }
    // Scenario 3: Any significant upward change
    else if (byoYomiTimeLeft > prevByoYomiTimeRef.current + 2) {
      resetDetected = true;
      console.log(`🎯 BYO-YOMI RESET DETECTED (upward change) for ${color}: ${prevByoYomiTimeRef.current}s → ${byoYomiTimeLeft}s`);
    }
    
    if (resetDetected) {
      setJustMoved(true);
      
      // Clear the justMoved flag after animation completes
      const timeout = setTimeout(() => {
        setJustMoved(false);
      }, 1000);
      
      // Update the ref for the next comparison
      prevByoYomiTimeRef.current = byoYomiTimeLeft;
      
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
  }, [timeRemaining, isInByoYomi, byoYomiPeriodsLeft, byoYomiTimeLeft, color]);
  
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