/**
 * Time Control utility functions for Gosei Play
 * Handles time control validation, game type detection, and automatic configuration
 */

/**
 * Gets recommended time based on board size
 * @param {number} boardSize - Size of the board
 * @returns {number} Recommended time in minutes
 */
function getRecommendedTimeForBoardSize(boardSize) {
  const timeMap = {
    9: 10,   // 10 minutes for 9x9
    13: 20,  // 20 minutes for 13x13
    15: 30,  // 30 minutes for 15x15
    19: 45,  // 45 minutes for 19x19
    21: 60   // 60 minutes for 21x21
  };
  
  return timeMap[boardSize] || 30; // Default to 30 minutes
}

/**
 * Validates time per move settings
 * @param {Object} settings - Settings object containing gameType and timePerMove
 * @returns {Object} Validation result
 */
function validateTimePerMove(settings) {
  const { gameType, timePerMove } = settings;
  
  // Validate Blitz game settings
  if (gameType === 'blitz') {
    if (timePerMove < 5) {
      return {
        valid: false,
        error: 'Blitz games require at least 5 seconds per move'
      };
    }
  }
  
  // Validate standard game settings (even, handicap, teaching)
  if (['even', 'handicap', 'teaching'].includes(gameType)) {
    if (timePerMove !== 0) {
      return {
        valid: false,
        error: 'Time per move must be disabled (0) for standard games'
      };
    }
  }
  
  return { valid: true };
}

/**
 * Detects game type based on time per move setting
 * @param {number} timePerMove - Time per move in seconds
 * @returns {string} Detected game type
 */
function detectGameTypeFromTime(timePerMove) {
  if (timePerMove >= 5) {
    return 'blitz';
  }
  if (timePerMove === 0) {
    return 'even';
  }
  // Fallback
  return 'even';
}

/**
 * Updates time controls based on settings
 * Automatically configures time controls based on game type and other settings
 * @param {Object} settings - Game settings object (modified in place)
 */
function updateTimeControls(settings) {
  const { timePerMove, boardSize } = settings;
  
  if (timePerMove > 0) {
    // Configure for Blitz game
    settings.gameType = 'blitz';
    settings.mainTime = 0;
    settings.byoYomiEnabled = false;
    settings.byoYomiPeriods = 0;
    settings.byoYomiTime = 0;
    
    // Ensure minimum time per move (auto-adjust if too low)
    if (settings.timePerMove < 5) {
      settings.timePerMove = 5;
    }
  } else if (timePerMove === 0) {
    // Configure for standard game
    if (!settings.gameType || settings.gameType === 'blitz') {
      settings.gameType = 'even';
    }
    
    // Set main time based on board size if not already set appropriately
    const recommendedTime = getRecommendedTimeForBoardSize(boardSize);
    if (!settings.mainTime || settings.mainTime === 0) {
      settings.mainTime = recommendedTime;
    }
    
    // Enable byo-yomi by default for standard games
    settings.byoYomiEnabled = true;
    if (!settings.byoYomiPeriods) {
      settings.byoYomiPeriods = 5; // Default to 5 periods
      settings.byoYomiTime = 30;    // Default to 30 seconds per period
    }
  }
}

/**
 * Validates complete time control configuration
 * @param {Object} settings - Complete game settings
 * @returns {Object} Validation result
 */
function validateTimeControlConfiguration(settings) {
  const errors = [];
  
  // Validate time per move first
  const timePerMoveValidation = validateTimePerMove(settings);
  if (!timePerMoveValidation.valid) {
    errors.push(timePerMoveValidation.error);
  }
  
  // Check for consistency between game type and time settings
  if (settings.gameType === 'blitz') {
    if (settings.mainTime > 0) {
      errors.push('Blitz games should have main time set to 0');
    }
    if (settings.byoYomiPeriods > 0) {
      errors.push('Blitz games cannot use byo-yomi periods');
    }
  }
  
  if (['even', 'handicap', 'teaching'].includes(settings.gameType)) {
    if (settings.timePerMove > 0) {
      errors.push('Standard games should not use time per move (should be 0)');
    }
    if (settings.mainTime === 0) {
      errors.push('Standard games require main time to be set');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Gets default time control settings for a game type
 * @param {string} gameType - The game type
 * @param {number} boardSize - Board size for recommendations
 * @returns {Object} Default time control settings
 */
function getDefaultTimeControls(gameType, boardSize = 19) {
  const baseTime = getRecommendedTimeForBoardSize(boardSize);
  
  switch (gameType) {
    case 'blitz':
      return {
        mainTime: 0,
        timePerMove: 10,
        byoYomiEnabled: false,
        byoYomiPeriods: 0,
        byoYomiTime: 0,
        fischerTime: 0
      };
      
    case 'teaching':
      return {
        mainTime: baseTime * 2, // Double time for teaching games
        timePerMove: 0,
        byoYomiEnabled: true,
        byoYomiPeriods: 5,
        byoYomiTime: 30,
        fischerTime: 0
      };
      
    case 'handicap':
    case 'even':
    default:
      return {
        mainTime: baseTime,
        timePerMove: 0,
        byoYomiEnabled: true,
        byoYomiPeriods: 5,
        byoYomiTime: 30,
        fischerTime: 0
      };
  }
}

/**
 * Formats time display for different time control types
 * @param {Object} timeControls - Time control settings
 * @returns {string} Formatted time display string
 */
function formatTimeControlDisplay(timeControls) {
  const { gameType, mainTime, timePerMove, byoYomiPeriods, byoYomiTime, fischerTime } = timeControls;
  
  if (gameType === 'blitz') {
    let display = `${timePerMove}s per move`;
    if (fischerTime > 0) {
      display += ` + ${fischerTime}s increment`;
    }
    return display;
  }
  
  let display = `${mainTime}min main time`;
  
  if (byoYomiPeriods > 0) {
    display += `, ${byoYomiPeriods}×${byoYomiTime}s byo-yomi`;
  }
  
  if (fischerTime > 0) {
    display += `, +${fischerTime}s increment`;
  }
  
  return display;
}

module.exports = {
  getRecommendedTimeForBoardSize,
  validateTimePerMove,
  detectGameTypeFromTime,
  updateTimeControls,
  validateTimeControlConfiguration,
  getDefaultTimeControls,
  formatTimeControlDisplay
}; 