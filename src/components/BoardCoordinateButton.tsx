import React, { useState, useRef, useEffect } from 'react';
import useDeviceDetect from '../hooks/useDeviceDetect';

interface BoardCoordinateButtonProps {
  showCoordinates: boolean;
  onToggle: (show: boolean) => void;
}

const BoardCoordinateButton: React.FC<BoardCoordinateButtonProps> = ({
  showCoordinates,
  onToggle
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isMobile, isTablet } = useDeviceDetect();
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggle = (show: boolean) => {
    onToggle(show);
    setIsOpen(false);
  };

  // Custom styles for the dropdown - position left on mobile/tablet, right on desktop
  const dropdownStyle = {
    position: 'absolute' as const,
    bottom: '100%',
    ...(isMobile || isTablet ? { left: 0 } : { right: 0 }),
    marginBottom: '5px',
    zIndex: 9999,
    maxHeight: '80vh',
    overflowY: 'auto' as const,
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
    minWidth: '280px', // Match the theme dropdown width
  };

  return (
    <div className="relative board-coordinate-selector" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 bg-white rounded-md shadow border border-neutral-200 hover:border-primary-300 transition-colors board-coordinate-button"
      >
        <div className="flex items-center gap-2">
          <div className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} aspect-square flex-shrink-0 rounded border border-neutral-400 bg-neutral-50 relative flex items-center justify-center`}>
            {/* Grid icon with coordinates preview */}
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width={isMobile ? "12" : "14"} 
              height={isMobile ? "12" : "14"} 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="text-neutral-600"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
              <line x1="15" y1="3" x2="15" y2="21"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="3" y1="15" x2="21" y2="15"/>
            </svg>
            {/* Coordinate indicators */}
            {showCoordinates && (
              <>
                <div className={`absolute -top-1 -left-0.5 ${isMobile ? 'text-[5px]' : 'text-[6px]'} font-bold text-neutral-500`}>A</div>
                <div className={`absolute -left-1 -top-0.5 ${isMobile ? 'text-[5px]' : 'text-[6px]'} font-bold text-neutral-500`}>1</div>
              </>
            )}
          </div>
          <span className={`${isMobile ? 'hidden' : 'text-sm'} font-medium`}>Coords</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width={isMobile ? "14" : "16"} height={isMobile ? "14" : "16"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 15 12 9 18 15"></polyline>
        </svg>
      </button>

      {isOpen && (
        <div 
          className="board-coordinate-dropdown bg-white rounded-lg shadow-lg border border-neutral-200" 
          style={dropdownStyle}
        >
          <div className="p-2">
            <div className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-neutral-700 px-3 py-2`}>
              Coordinate Display
            </div>
            <button
              onClick={() => handleToggle(true)}
              className={`flex items-center gap-3 w-full px-3 py-2 text-left rounded-md transition-colors board-coordinate-option ${
                showCoordinates
                  ? 'bg-primary-50 text-primary-800 selected'
                  : 'hover:bg-neutral-100'
              }`}
            >
                             <div className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} aspect-square flex-shrink-0 rounded border border-neutral-400 bg-neutral-50 relative flex items-center justify-center`}>
                 <svg 
                   xmlns="http://www.w3.org/2000/svg" 
                   width={isMobile ? "14" : "16"} 
                   height={isMobile ? "14" : "16"} 
                   viewBox="0 0 24 24" 
                   fill="none" 
                   stroke="currentColor" 
                   strokeWidth="2" 
                   strokeLinecap="round" 
                   strokeLinejoin="round"
                   className="text-neutral-600"
                 >
                   <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                   <line x1="9" y1="3" x2="9" y2="21"/>
                   <line x1="15" y1="3" x2="15" y2="21"/>
                   <line x1="3" y1="9" x2="21" y2="9"/>
                   <line x1="3" y1="15" x2="21" y2="15"/>
                 </svg>
                 <div className={`absolute -top-1 -left-1 ${isMobile ? 'text-[6px]' : 'text-[8px]'} font-bold text-primary-600`}>A</div>
                 <div className={`absolute -left-1.5 -top-1 ${isMobile ? 'text-[6px]' : 'text-[8px]'} font-bold text-primary-600`}>1</div>
               </div>
               <div>
                 <div className={`${isMobile ? 'text-sm' : 'text-base'} font-medium`}>Show Coordinates</div>
                 <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-neutral-500 board-coordinate-option-description`}>Display column letters and row numbers</div>
               </div>
            </button>
            <button
              onClick={() => handleToggle(false)}
              className={`flex items-center gap-3 w-full px-3 py-2 text-left rounded-md transition-colors board-coordinate-option ${
                !showCoordinates
                  ? 'bg-primary-50 text-primary-800 selected'
                  : 'hover:bg-neutral-100'
              }`}
            >
                             <div className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} aspect-square flex-shrink-0 rounded border border-neutral-400 bg-neutral-50 relative flex items-center justify-center`}>
                 <svg 
                   xmlns="http://www.w3.org/2000/svg" 
                   width={isMobile ? "14" : "16"} 
                   height={isMobile ? "14" : "16"} 
                   viewBox="0 0 24 24" 
                   fill="none" 
                   stroke="currentColor" 
                   strokeWidth="2" 
                   strokeLinecap="round" 
                   strokeLinejoin="round"
                   className="text-neutral-600"
                 >
                   <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                   <line x1="9" y1="3" x2="9" y2="21"/>
                   <line x1="15" y1="3" x2="15" y2="21"/>
                   <line x1="3" y1="9" x2="21" y2="9"/>
                   <line x1="3" y1="15" x2="21" y2="15"/>
                 </svg>
               </div>
               <div>
                 <div className={`${isMobile ? 'text-sm' : 'text-base'} font-medium`}>Hide Coordinates</div>
                 <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-neutral-500 board-coordinate-option-description`}>Clean board without labels</div>
               </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoardCoordinateButton; 