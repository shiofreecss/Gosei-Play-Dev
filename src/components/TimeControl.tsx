import React, { useEffect, useState, useRef } from 'react';
import { StoneColor } from '../types/go';
import { useAppTheme } from '../context/AppThemeContext';
import useDeviceDetect from '../hooks/useDeviceDetect';

interface TimeControlProps {
  timeControl: number; // Main time in minutes
  timePerMove?: number; // Time per move in seconds
  byoYomiPeriods?: number; // Number of byo-yomi periods
  byoYomiTime?: number; // Time per byo-yomi period in seconds
  fischerTime?: number; // Fischer increment in seconds
  currentTurn: StoneColor;
  onTimeout: (color: StoneColor) => void;
  isPlaying: boolean;
  // Add actual player time remaining
  blackTimeRemaining?: number; // Actual black time remaining in seconds
  whiteTimeRemaining?: number; // Actual white time remaining in seconds
  // Add byo-yomi state for both players
  blackByoYomiPeriodsLeft?: number;
  whiteByoYomiPeriodsLeft?: number;
  blackByoYomiTimeLeft?: number;
  whiteByoYomiTimeLeft?: number;
  blackIsInByoYomi?: boolean;
  whiteIsInByoYomi?: boolean;
}

interface TimeState {
  mainTime: number; // Main time remaining in seconds
  byoYomiPeriodsLeft: number;
  byoYomiTimeLeft: number;
  isByoYomi: boolean;
  timePerMoveLeft?: number; // Time remaining for current move (if timePerMove is enabled)
}

const TimeControl: React.FC<TimeControlProps> = ({
  timeControl,
  timePerMove = 0,
  byoYomiPeriods = 0, // Default to 0 periods (no byo-yomi)
  byoYomiTime = 30, // Default 30 seconds per period
  fischerTime = 0,
  currentTurn,
  onTimeout,
  isPlaying,
  blackTimeRemaining,
  whiteTimeRemaining,
  blackByoYomiPeriodsLeft,
  whiteByoYomiPeriodsLeft,
  blackByoYomiTimeLeft,
  whiteByoYomiTimeLeft,
  blackIsInByoYomi,
  whiteIsInByoYomi
}) => {
  // Add AppTheme context
  const { currentTheme } = useAppTheme();
  
  // Add device detection for responsive sizing
  const { isMobile, isTablet } = useDeviceDetect();
  
  // Track the last turn change for time per move calculation
  const lastTurnChangeRef = useRef<number>(Date.now());
  
  // Initialize time states for both players
  const [blackTime, setBlackTime] = useState<TimeState>(() => {
    // Use blackTimeRemaining if provided, otherwise use full timeControl
    const initialTime = blackTimeRemaining !== undefined ? blackTimeRemaining : timeControl * 60;
    
    // Use server-provided byo-yomi state if available
    const isInByoYomi = blackIsInByoYomi || (initialTime <= 0 && byoYomiPeriods > 0);
    
    return {
      // If we're in byo-yomi, mainTime is 0, otherwise use the initialTime
      mainTime: isInByoYomi ? 0 : initialTime,
      byoYomiPeriodsLeft: blackByoYomiPeriodsLeft !== undefined ? blackByoYomiPeriodsLeft : byoYomiPeriods,
      byoYomiTimeLeft: blackByoYomiTimeLeft !== undefined ? blackByoYomiTimeLeft : byoYomiTime,
      isByoYomi: isInByoYomi,
      timePerMoveLeft: timePerMove > 0 ? timePerMove : undefined
    };
  });

  const [whiteTime, setWhiteTime] = useState<TimeState>(() => {
    // Use whiteTimeRemaining if provided, otherwise use full timeControl
    const initialTime = whiteTimeRemaining !== undefined ? whiteTimeRemaining : timeControl * 60;
    
    // Use server-provided byo-yomi state if available
    const isInByoYomi = whiteIsInByoYomi || (initialTime <= 0 && byoYomiPeriods > 0);
    
    return {
      // If we're in byo-yomi, mainTime is 0, otherwise use the initialTime
      mainTime: isInByoYomi ? 0 : initialTime,
      byoYomiPeriodsLeft: whiteByoYomiPeriodsLeft !== undefined ? whiteByoYomiPeriodsLeft : byoYomiPeriods,
      byoYomiTimeLeft: whiteByoYomiTimeLeft !== undefined ? whiteByoYomiTimeLeft : byoYomiTime,
      isByoYomi: isInByoYomi,
      timePerMoveLeft: timePerMove > 0 ? timePerMove : undefined
    };
  });
  
  // Use refs to track the last update time to handle timer drift
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const timerIdRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const initializedRef = useRef<boolean>(false);

  // Initialize audio elements
  useEffect(() => {
    audioRef.current = new Audio('/sounds/time-warning.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  // Update times when props change (e.g., when rejoining)
  useEffect(() => {
    if (blackTimeRemaining !== undefined) {
      const isInByoYomi = blackIsInByoYomi || (blackTimeRemaining <= 0 && byoYomiPeriods > 0);
      setBlackTime({
        mainTime: isInByoYomi ? 0 : blackTimeRemaining,
        byoYomiPeriodsLeft: blackByoYomiPeriodsLeft !== undefined ? blackByoYomiPeriodsLeft : byoYomiPeriods,
        byoYomiTimeLeft: blackByoYomiTimeLeft !== undefined ? blackByoYomiTimeLeft : byoYomiTime,
        isByoYomi: isInByoYomi,
        timePerMoveLeft: timePerMove > 0 ? timePerMove : undefined
      });
      console.log(`Syncing black time with server: ${blackTimeRemaining} seconds remaining, byo-yomi: ${isInByoYomi}`);
      
      // Add detailed logging for byo-yomi updates
      if (isInByoYomi) {
        console.log(`Black byo-yomi details: ${blackByoYomiTimeLeft}s left in current period, ${blackByoYomiPeriodsLeft} periods remaining`);
      }
    }
    
    if (whiteTimeRemaining !== undefined) {
      const isInByoYomi = whiteIsInByoYomi || (whiteTimeRemaining <= 0 && byoYomiPeriods > 0);
      setWhiteTime({
        mainTime: isInByoYomi ? 0 : whiteTimeRemaining,
        byoYomiPeriodsLeft: whiteByoYomiPeriodsLeft !== undefined ? whiteByoYomiPeriodsLeft : byoYomiPeriods,
        byoYomiTimeLeft: whiteByoYomiTimeLeft !== undefined ? whiteByoYomiTimeLeft : byoYomiTime,
        isByoYomi: isInByoYomi,
        timePerMoveLeft: timePerMove > 0 ? timePerMove : undefined
      });
      console.log(`Syncing white time with server: ${whiteTimeRemaining} seconds remaining, byo-yomi: ${isInByoYomi}`);
      
      // Add detailed logging for byo-yomi updates
      if (isInByoYomi) {
        console.log(`White byo-yomi details: ${whiteByoYomiTimeLeft}s left in current period, ${whiteByoYomiPeriodsLeft} periods remaining`);
      }
    }
    
    // Mark as initialized after first sync
    initializedRef.current = true;
  }, [blackTimeRemaining, whiteTimeRemaining, blackByoYomiPeriodsLeft, whiteByoYomiPeriodsLeft, 
      blackByoYomiTimeLeft, whiteByoYomiTimeLeft, blackIsInByoYomi, whiteIsInByoYomi, 
      byoYomiPeriods, byoYomiTime, timePerMove]);

  // Reset last update time reference when syncing with server times
  useEffect(() => {
    if (isPlaying && initializedRef.current) {
      lastUpdateTimeRef.current = Date.now();
      console.log('Reset timer reference after server sync');
    }
  }, [isPlaying, blackTimeRemaining, whiteTimeRemaining]);

  // Reset the time per move when the turn changes
  useEffect(() => {
    if (timePerMove > 0) {
      setBlackTime(prev => ({
        ...prev,
        timePerMoveLeft: currentTurn === 'black' ? timePerMove : prev.timePerMoveLeft
      }));
      
      setWhiteTime(prev => ({
        ...prev,
        timePerMoveLeft: currentTurn === 'white' ? timePerMove : prev.timePerMoveLeft
      }));
      
      // Reset the lastTurnChangeRef when the turn changes
      lastTurnChangeRef.current = Date.now();
    }
  }, [currentTurn, timePerMove]);

  // Play time warning sound
  const playTimeWarning = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignore playback errors
      });
    }
  };

  useEffect(() => {
    // Clean up previous timer
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }

    if (isPlaying && initializedRef.current) {
      // Reset the last update time
      lastUpdateTimeRef.current = Date.now();
      
      timerIdRef.current = setInterval(() => {
        const now = Date.now();
        const elapsedMs = now - lastUpdateTimeRef.current;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        
        // Only update if at least 1 second has passed
        if (elapsedSeconds > 0) {
          lastUpdateTimeRef.current = now - (elapsedMs % 1000); // Account for remainder
          
          const currentTimeState = currentTurn === 'black' ? blackTime : whiteTime;
          const setTimeState = currentTurn === 'black' ? setBlackTime : setWhiteTime;

          setTimeState(prev => {
            let newState = { ...prev };

            // Handle time per move if it's set
            if (timePerMove > 0 && prev.timePerMoveLeft !== undefined) {
              newState.timePerMoveLeft = Math.max(0, prev.timePerMoveLeft - elapsedSeconds);
              
              // Play warning sound at specific thresholds for time per move
              if (
                (newState.timePerMoveLeft <= 10 && prev.timePerMoveLeft > 10) || // 10 seconds
                (newState.timePerMoveLeft <= 5 && prev.timePerMoveLeft > 5)     // 5 seconds
              ) {
                playTimeWarning();
              }
              
              // If time per move runs out, trigger the timeout
              if (newState.timePerMoveLeft === 0) {
                onTimeout(currentTurn);
                return newState;
              }
            }

            // Handle main time
            if (prev.mainTime > 0) {
              newState.mainTime = Math.max(0, prev.mainTime - elapsedSeconds);
              
              // Play warning sound at specific thresholds
              if (
                (newState.mainTime <= 60 && prev.mainTime > 60) || // 1 minute
                (newState.mainTime <= 30 && prev.mainTime > 30) || // 30 seconds
                (newState.mainTime <= 10 && prev.mainTime > 10)    // 10 seconds
              ) {
                playTimeWarning();
              }

              // If main time runs out, switch to byo-yomi if available
              if (newState.mainTime === 0 && byoYomiPeriods > 0) {
                newState.isByoYomi = true;
                newState.byoYomiPeriodsLeft = byoYomiPeriods;
                newState.byoYomiTimeLeft = byoYomiTime;
                playTimeWarning(); // Signal byo-yomi start
              } else if (newState.mainTime === 0 && byoYomiPeriods === 0) {
                // If no byo-yomi periods, timeout
                onTimeout(currentTurn);
              }
            }
            // Handle byo-yomi time
            else if (prev.isByoYomi && byoYomiPeriods > 0) {
              newState.byoYomiTimeLeft = Math.max(0, prev.byoYomiTimeLeft - elapsedSeconds);
              
              // Play warning sound in byo-yomi
              if (
                (newState.byoYomiTimeLeft <= 10 && prev.byoYomiTimeLeft > 10) || // 10 seconds
                (newState.byoYomiTimeLeft <= 5 && prev.byoYomiTimeLeft > 5)     // 5 seconds
              ) {
                playTimeWarning();
              }

              // If byo-yomi period runs out
              if (newState.byoYomiTimeLeft === 0) {
                if (newState.byoYomiPeriodsLeft > 1) {
                  newState.byoYomiPeriodsLeft = prev.byoYomiPeriodsLeft - 1;
                  newState.byoYomiTimeLeft = byoYomiTime;
                  playTimeWarning(); // Signal new period
                } else {
                  // No periods left, time's up
                  newState.byoYomiPeriodsLeft = 0;
                  onTimeout(currentTurn);
                }
              }
            }
            // Time's up
            else if (!prev.isByoYomi || (prev.isByoYomi && prev.byoYomiPeriodsLeft === 0)) {
              onTimeout(currentTurn);
            }

            return newState;
          });
        }
      }, 100); // Update more frequently to reduce drift
    }

    return () => {
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
    };
  }, [isPlaying, currentTurn, blackTime, whiteTime, byoYomiTime, byoYomiPeriods, onTimeout, timePerMove]);

  // Handle Fischer increment on move change
  useEffect(() => {
    if (fischerTime > 0) {
      const prevTurn = currentTurn === 'black' ? 'white' : 'black';
      const setTimeState = prevTurn === 'black' ? setBlackTime : setWhiteTime;

      setTimeState(prev => ({
        ...prev,
        mainTime: prev.mainTime + fischerTime
      }));
    }
  }, [currentTurn, fischerTime]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeDisplay = (timeState: TimeState): string => {
    // If time per move is active and less than main time, show it instead
    if (timePerMove > 0 && timeState.timePerMoveLeft !== undefined && 
        (timeState.timePerMoveLeft < timeState.mainTime || timeState.mainTime <= 0)) {
      return `${formatTime(timeState.timePerMoveLeft)} ⏱️`;
    }
    
    if (timeState.mainTime > 0) {
      return formatTime(timeState.mainTime);
    } else if (timeState.isByoYomi && byoYomiPeriods > 0) {
      return `BY ${timeState.byoYomiPeriodsLeft}×${formatTime(timeState.byoYomiTimeLeft)}`;
    }
    return '0:00';
  };

  const getTimeStyle = (timeState: TimeState, isActive: boolean) => {
    // Use Tailwind classes for responsive font sizing
    let textSizeClass = 'text-lg sm:text-xl md:text-2xl lg:text-3xl';
    let fontWeightClass = isActive ? 'font-bold' : 'font-semibold';
    let colorClass = '';
    
    // Adjust size based on device
    if (isMobile) {
      textSizeClass = 'text-base sm:text-lg';
    } else if (isTablet) {
      textSizeClass = 'text-xl md:text-2xl';
    }
    
    // Check time per move first if it's active
    if (timePerMove > 0 && timeState.timePerMoveLeft !== undefined && timeState.timePerMoveLeft <= 10) {
      colorClass = 'text-red-600';
    }
    // Critical time warning (red)
    else if (
      (timeState.mainTime > 0 && timeState.mainTime <= 30) ||
      (timeState.isByoYomi && timeState.byoYomiTimeLeft <= 10)
    ) {
      colorClass = 'text-red-600';
    }
    // Low time warning (orange)
    else if (
      (timeState.mainTime > 0 && timeState.mainTime <= 60) ||
      (timeState.isByoYomi && timeState.byoYomiTimeLeft <= 20)
    ) {
      colorClass = 'text-orange-500';
    }
    // Normal color
    else {
      colorClass = isActive ? 'text-gray-200' : 'text-gray-400';
    }
    
    return `${textSizeClass} ${fontWeightClass} ${colorClass} font-mono`;
  };

  const clockCardStyle = (isActive: boolean) => {
    const colors = {
      background: isActive ? '#1a1a2e' : '#0f0f1a',
      border: isActive ? '#4a4a82' : 'transparent',
    };
    
    // Responsive padding based on device
    const padding = isMobile ? '0.5rem' : isTablet ? '0.625rem' : '0.75rem';
    
    return {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      padding,
      backgroundColor: colors.background,
      borderRadius: '0.375rem',
      flex: 1,
      border: `3px solid ${colors.border}`,
      position: 'relative' as const,
      overflow: 'hidden' as const,
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      minHeight: isMobile ? '80px' : isTablet ? '100px' : '120px'
    };
  };

  // Time pressure indicator animation
  const getTimePressureStyle = (timeState: TimeState) => {
    if (
      (timePerMove > 0 && timeState.timePerMoveLeft !== undefined && timeState.timePerMoveLeft <= 10) ||
      (timeState.mainTime > 0 && timeState.mainTime <= 30) ||
      (timeState.isByoYomi && timeState.byoYomiTimeLeft <= 10)
    ) {
      return {
        animation: 'pulse 1s ease-in-out infinite',
        background: 'linear-gradient(45deg, rgba(220, 38, 38, 0.2) 0%, transparent 100%)'
      };
    }
    return {};
  };

  return (
    <div className={`flex mt-4 ${isMobile ? 'gap-1' : isTablet ? 'gap-2' : 'gap-4'}`}>
      <div style={clockCardStyle(currentTurn === 'black')}>
        <div className="absolute inset-0" style={getTimePressureStyle(blackTime)} />
        <div className={`rounded-full bg-black border-2 border-gray-600 ${
          isMobile ? 'w-3 h-3 mb-1' : isTablet ? 'w-4 h-4 mb-1' : 'w-5 h-5 mb-2'
        }`}></div>
        <div className={getTimeStyle(blackTime, currentTurn === 'black')}>
          {getTimeDisplay(blackTime)}
        </div>
        {blackTime.isByoYomi && byoYomiPeriods > 0 && (
          <div className={`text-gray-400 mt-1 font-mono text-center ${
            isMobile ? 'text-xs leading-tight' : isTablet ? 'text-sm' : 'text-sm'
          }`}>
            {blackTime.byoYomiPeriodsLeft} periods left
          </div>
        )}
      </div>
      
      <div style={clockCardStyle(currentTurn === 'white')}>
        <div className="absolute inset-0" style={getTimePressureStyle(whiteTime)} />
        <div className={`rounded-full bg-white border-2 border-gray-300 ${
          isMobile ? 'w-3 h-3 mb-1' : isTablet ? 'w-4 h-4 mb-1' : 'w-5 h-5 mb-2'
        }`}></div>
        <div className={getTimeStyle(whiteTime, currentTurn === 'white')}>
          {getTimeDisplay(whiteTime)}
        </div>
        {whiteTime.isByoYomi && byoYomiPeriods > 0 && (
          <div className={`text-gray-400 mt-1 font-mono text-center ${
            isMobile ? 'text-xs leading-tight' : isTablet ? 'text-sm' : 'text-sm'
          }`}>
            {whiteTime.byoYomiPeriodsLeft} periods left
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeControl; 