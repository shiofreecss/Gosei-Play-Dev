import React, { useEffect, useState } from 'react';

interface NotificationProps {
  message: string;
  type: 'info' | 'warning' | 'error';
  duration?: number;
  onClose?: () => void;
}

const Notification: React.FC<NotificationProps> = ({
  message,
  type = 'info',
  duration = 2000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          setIsVisible(false);
          onClose?.();
        }, 300); // Match the transition duration
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getStyles = () => {
    const baseStyles = 'fixed top-4 right-4 w-96 max-w-[calc(100vw-2rem)] shadow-lg rounded-lg border backdrop-blur-md transition-all duration-300 ease-in-out z-50 transform';
    const exitStyles = isExiting ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0';
    
    switch (type) {
      case 'warning':
        return `${baseStyles} ${exitStyles} bg-amber-900/10 border-amber-200/20 dark:border-amber-500/20`;
      case 'error':
        return `${baseStyles} ${exitStyles} bg-red-900/10 border-red-200/20 dark:border-red-500/20`;
      default:
        return `${baseStyles} ${exitStyles} bg-primary-900/10 border-primary-200/20 dark:border-primary-500/20`;
    }
  };

  const getIconStyles = () => {
    switch (type) {
      case 'warning':
        return 'text-amber-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-primary-500';
    }
  };

  const getTextStyles = () => {
    switch (type) {
      case 'warning':
        return 'text-amber-100';
      case 'error':
        return 'text-red-100';
      default:
        return 'text-primary-100';
    }
  };

  if (!isVisible) return null;

  return (
    <div className={getStyles()}>
      <div className="flex items-start gap-3 p-4">
        <div className={`flex-shrink-0 ${getIconStyles()}`}>
          {type === 'warning' && (
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          {type === 'error' && (
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {type === 'info' && (
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="flex-1">
          <p className={`text-sm font-medium ${getTextStyles()}`}>{message}</p>
        </div>
        <button
          onClick={() => {
            setIsExiting(true);
            setTimeout(() => {
              setIsVisible(false);
              onClose?.();
            }, 300);
          }}
          className={`flex-shrink-0 ${getTextStyles()} hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${type === 'info' ? 'primary' : type === 'warning' ? 'amber' : 'red'}-500`}
        >
          <span className="sr-only">Close</span>
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Notification; 