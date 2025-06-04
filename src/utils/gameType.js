/**
 * Game Type utility functions for Gosei Play
 * Handles validation and configuration for different game types, especially Blitz games
 */

/**
 * Validates blitz game settings to ensure they meet requirements
 * @param {Object} settings - Game settings object
 * @returns {Object} Validation result with valid boolean and optional error message
 */
function validateBlitzSettings(settings) {
  if (settings.gameType !== 'blitz') {
    return { valid: true };
  }

  // Check if byo-yomi is enabled (not allowed in blitz games)
  if (settings.byoYomiPeriods > 0) {
    return {
      valid: false,
      error: 'Byo-yomi is not allowed in Blitz games'
    };
  }

  // Check minimum time per move for blitz games
  if (settings.timePerMove < 5) {
    return {
      valid: false,
      error: 'Blitz games require at least 5 seconds per move'
    };
  }

  return { valid: true };
}

/**
 * Updates time control settings for blitz games
 * Automatically configures proper blitz settings and disables incompatible features
 * @param {Object} settings - Game settings object (modified in place)
 */
function updateBlitzTimeControls(settings) {
  if (settings.gameType === 'blitz') {
    // Disable byo-yomi for Blitz games
    settings.byoYomiEnabled = false;
    settings.byoYomiPeriods = 0;
    settings.byoYomiTime = 0;
    
    // Ensure proper Blitz configuration
    settings.mainTime = 0;
    
    // Ensure minimum time per move
    if (settings.timePerMove < 5) {
      settings.timePerMove = 5;
    }
  }
}

/**
 * Gets game type configuration based on type
 * @param {string} gameType - The game type
 * @returns {Object} Configuration object for the game type
 */
function getGameTypeConfig(gameType) {
  const configs = {
    even: {
      name: 'Even Game',
      description: 'Traditional Go with equal starting positions',
      allowsByo: true,
      requiresTimePerMove: false,
      defaultMainTime: true
    },
    handicap: {
      name: 'Handicap Game',
      description: 'Game with handicap stones for skill differences',
      allowsByo: true,
      requiresTimePerMove: false,
      defaultMainTime: true
    },
    teaching: {
      name: 'Teaching Game',
      description: 'Educational game with extended time',
      allowsByo: true,
      requiresTimePerMove: false,
      defaultMainTime: true,
      timeMultiplier: 2
    },
    blitz: {
      name: 'Blitz Game',
      description: 'Fast-paced game with time per move limit',
      allowsByo: false,
      requiresTimePerMove: true,
      defaultMainTime: false,
      minTimePerMove: 5
    }
  };

  return configs[gameType] || configs.even;
}

/**
 * Checks if a game type allows byo-yomi
 * @param {string} gameType - The game type to check
 * @returns {boolean} True if byo-yomi is allowed
 */
function allowsByoYomi(gameType) {
  const config = getGameTypeConfig(gameType);
  return config.allowsByo;
}

/**
 * Gets recommended time per move for blitz games based on skill level
 * @param {string} skillLevel - beginner, intermediate, advanced
 * @returns {number} Recommended seconds per move
 */
function getRecommendedBlitzTime(skillLevel = 'intermediate') {
  const recommendations = {
    beginner: 15,
    intermediate: 10,
    advanced: 5
  };
  
  return recommendations[skillLevel] || recommendations.intermediate;
}

/**
 * Validates all game settings for consistency
 * @param {Object} settings - Complete game settings
 * @returns {Object} Validation result with any errors
 */
function validateGameSettings(settings) {
  const errors = [];
  
  // Validate blitz-specific settings
  const blitzValidation = validateBlitzSettings(settings);
  if (!blitzValidation.valid) {
    errors.push(blitzValidation.error);
  }
  
  // Check for incompatible combinations
  if (settings.gameType === 'blitz' && settings.mainTime > 0) {
    errors.push('Blitz games should have main time set to 0');
  }
  
  if (settings.gameType !== 'blitz' && settings.timePerMove > 0) {
    errors.push('Time per move should only be used for Blitz games');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

module.exports = {
  validateBlitzSettings,
  updateBlitzTimeControls,
  getGameTypeConfig,
  allowsByoYomi,
  getRecommendedBlitzTime,
  validateGameSettings
}; 