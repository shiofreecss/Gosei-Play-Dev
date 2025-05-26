import React from 'react';

const TimeoutAlert = ({ timeoutInfo }) => {
  if (!timeoutInfo) {
    return null;
  }

  const { color, winner, message, details, isInByoYomi } = timeoutInfo;

  const getTimeoutIcon = () => {
    return isInByoYomi ? '⏱️' : '⌛';
  };

  const getTimeoutClasses = () => {
    return `timeout-alert ${color} ${isInByoYomi ? 'byoyomi-timeout' : 'main-timeout'}`;
  };

  return (
    <div className={getTimeoutClasses()}>
      <div className="timeout-header">
        <span className="timeout-icon">{getTimeoutIcon()}</span>
        <h3 className="timeout-title">Time Expired</h3>
      </div>
      
      <div className="timeout-content">
        <p className="timeout-message">{message}</p>
        <p className="timeout-details">{details}</p>
      </div>
      
      <div className="timeout-result">
        <span className="winner-label">Winner:</span>
        <span className={`winner-color ${winner}`}>{winner.toUpperCase()}</span>
      </div>
    </div>
  );
};

export default TimeoutAlert; 