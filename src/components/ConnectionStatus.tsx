import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { SOCKET_URL } from '../config';
import { useAppTheme } from '../context/AppThemeContext';

const ConnectionStatus: React.FC = () => {
  const { error } = useGame();
  const { currentTheme } = useAppTheme();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [lastChecked, setLastChecked] = useState<string>('');

  // Check socket server connection
  const checkConnection = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Try to connect to the socket server endpoint
      await fetch(SOCKET_URL, { 
        signal: controller.signal,
        mode: 'no-cors' // This will prevent CORS errors but won't give us status
      });
      
      clearTimeout(timeoutId);
      setIsConnected(true);
    } catch (err) {
      console.error('Socket server connection check failed:', err);
      setIsConnected(false);
    }
    
    setLastChecked(new Date().toLocaleTimeString());
  };

  useEffect(() => {
    checkConnection();
    
    // Check connection every 30 seconds
    const intervalId = setInterval(checkConnection, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Don't render anything if we're still checking or if error is null
  if (isConnected === null && !error) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 p-3 bg-white shadow-md rounded-lg text-sm connection-status-panel z-50">
      <div className="flex items-center">
        <div 
          className={`w-3 h-3 rounded-full mr-2 ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} 
        />
        <span className="text-gray-700 connection-status-text">
          Server: {isConnected ? 'Connected' : 'Disconnected'}
        </span>
        <button 
          onClick={checkConnection}
          className="ml-2 text-primary-600 hover:text-primary-800 connection-status-refresh"
        >
          Refresh
        </button>
      </div>
      {error && (
        <div className="mt-1 text-red-600 max-w-xs connection-status-error">{error}</div>
      )}
      <div className="mt-1 text-gray-500 text-xs connection-status-timestamp">
        Last checked: {lastChecked}
      </div>
    </div>
  );
};

export default ConnectionStatus;
