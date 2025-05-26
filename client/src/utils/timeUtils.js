/**
 * Format seconds into MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export const formatTime = (seconds) => {
  if (seconds === undefined || seconds === null) return '00:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

/**
 * Format time for display with different formats based on remaining time
 * @param {Object} timeData - Object containing time information
 * @returns {string} Formatted time string with appropriate label
 */
export const getFormattedTimeDisplay = (timeData) => {
  const { timeRemaining, isInByoYomi, byoYomiPeriodsLeft, byoYomiTimeLeft } = timeData;
  
  if (isInByoYomi) {
    return {
      label: `BYO-YOMI (${byoYomiPeriodsLeft})`,
      value: formatTime(byoYomiTimeLeft),
      isWarning: byoYomiTimeLeft < 10,
      isDanger: byoYomiTimeLeft < 5
    };
  } else {
    return {
      label: 'MAIN TIME',
      value: formatTime(timeRemaining),
      isWarning: timeRemaining < 60,
      isDanger: timeRemaining < 30
    };
  }
};

/**
 * Get a descriptive string of the time control settings
 * @param {Object} timeControl - Time control settings
 * @returns {string} Descriptive time control string
 */
export const getTimeControlDescription = (timeControl) => {
  if (!timeControl) return 'No time limit';
  
  const mainTime = timeControl.timeControl || 0;
  const byoYomiPeriods = timeControl.byoYomiPeriods || 0;
  const byoYomiTime = timeControl.byoYomiTime || 0;
  
  if (mainTime > 0 && byoYomiPeriods > 0) {
    return `${mainTime} min + ${byoYomiPeriods}×${byoYomiTime}s`;
  } else if (mainTime > 0) {
    return `${mainTime} min`;
  } else {
    return 'No time limit';
  }
}; 