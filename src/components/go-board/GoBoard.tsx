import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Board, Position, Stone, StoneColor, Territory, GameState } from '../../types/go';
import { isHandicapPoint } from '../../utils/handicapUtils';
import { playStoneSound } from '../../utils/soundUtils';
import { useBoardTheme } from '../../context/BoardThemeContext';
import { useGame } from '../../context/GameContext';
import useDeviceDetect from '../../hooks/useDeviceDetect';
import './GoBoard.css';

export type BoardTheme = 'default' | 'dark-wood-3d' | 'light-wood-3d' | 'universe';

interface GoBoardProps {
  board: Board;
  currentTurn: StoneColor;
  onPlaceStone: (position: Position) => void;
  isPlayerTurn: boolean;
  lastMove?: Position;
  isScoring?: boolean;
  deadStones?: Position[];
  onToggleDeadStone?: (position: Position) => void;
  territory?: Territory[];
  showTerritory?: boolean;
  isHandicapPlacement?: boolean;
  // Review mode props
  isReviewing?: boolean;
  reviewStones?: Stone[];
  // Mobile controls positioning
  showMobileControls?: boolean;
  onPreviewPositionChange?: (position: Position | null) => void;
  previewPosition?: Position | null;
  // Coordinate display
  showCoordinates?: boolean;
}

// Theme configurations for different board styles
const BOARD_THEMES = {
  'default': {
    boardColor: '#e6c588',
    lineColor: '#333',
    hoshiColor: '#333',
    borderWidth: 2,
    stoneEffects: {
      black: 'brightness(1.1) drop-shadow(0 1px 1px rgba(0,0,0,0.4))',
      white: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))'
    },
    coordsColor: '#333',
    stoneGradient: false,
    woodTexture: null
  },
  'dark-wood-3d': {
    boardColor: '#6b4423',
    lineColor: '#222',
    hoshiColor: '#222',
    borderWidth: 2,
    stoneEffects: {
      black: 'brightness(1.1) drop-shadow(0 2px 3px rgba(0,0,0,0.6))',
      white: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))'
    },
    coordsColor: '#ddd',
    stoneGradient: true,
    woodTexture: 'darkwood' as const
  },
  'light-wood-3d': {
    boardColor: '#d9b383',
    lineColor: '#333',
    hoshiColor: '#333',
    borderWidth: 2,
    stoneEffects: {
      black: 'brightness(1.1) drop-shadow(0 2px 3px rgba(0,0,0,0.6))',
      white: 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))'
    },
    coordsColor: '#333',
    stoneGradient: true,
    woodTexture: 'lightwood' as const
  },
  'universe': {
    boardColor: '#1a1a2e',
    lineColor: '#4d4d8f',
    hoshiColor: '#7f7fc4',
    borderWidth: 2,
    stoneEffects: {
      black: 'brightness(0.8) drop-shadow(0 0 5px rgba(0,0,0,0.8))',
      white: 'brightness(1.2) drop-shadow(0 0 8px rgba(255,255,255,0.5))'
    },
    coordsColor: '#7f7fc4',
    stoneGradient: false,
    woodTexture: null
  }
};

// Define wood texture types
type WoodTexture = 'lightwood' | 'darkwood';

// Wood texture patterns
const WOOD_TEXTURES: Record<WoodTexture, string> = {
  lightwood: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='noise' x='0%25' y='0%25' width='100%25' height='100%25'%3E%3CfeTurbulence baseFrequency='0.02 0.05' seed='2' type='fractalNoise' numOctaves='3' result='noise'/%3E%3CfeDisplacementMap in='SourceGraphic' in2='noise' scale='5' xChannelSelector='R' yChannelSelector='G'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' fill='%23d9b383'/%3E%3C/svg%3E")`,
  darkwood: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='noise' x='0%25' y='0%25' width='100%25' height='100%25'%3E%3CfeTurbulence baseFrequency='0.02 0.05' seed='2' type='fractalNoise' numOctaves='3' result='noise'/%3E%3CfeDisplacementMap in='SourceGraphic' in2='noise' scale='5' xChannelSelector='R' yChannelSelector='G'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' fill='%236b4423'/%3E%3C/svg%3E")`
};

const GoBoard: React.FC<GoBoardProps> = ({
  board,
  currentTurn,
  onPlaceStone,
  isPlayerTurn,
  lastMove,
  isScoring = false,
  deadStones = [],
  onToggleDeadStone,
  territory = [],
  showTerritory = false,
  isHandicapPlacement = false,
  isReviewing = false,
  reviewStones = [],
  showMobileControls = false,
  onPreviewPositionChange,
  previewPosition: externalPreviewPosition,
  showCoordinates = true,
}) => {
  const [hoverPosition, setHoverPosition] = useState<Position | null>(null);
  const [internalPreviewPosition, setInternalPreviewPosition] = useState<Position | null>(null);
  const [cellSize, setCellSize] = useState(32);
  const { currentTheme } = useBoardTheme();
  const { gameState } = useGame();
  const { isMobile, isTablet } = useDeviceDetect();

  // Use external preview position if provided, otherwise use internal
  const previewPosition = externalPreviewPosition || internalPreviewPosition;

  // Map the board theme to our theme config
  const theme: BoardTheme = currentTheme === 'wood-3d' ? 'dark-wood-3d' : 
                           currentTheme === 'light-wood-3d' ? 'light-wood-3d' :
                           currentTheme === 'universe' ? 'universe' : 'default';
  
  // Get the theme configuration
  const themeConfig = BOARD_THEMES[theme] || BOARD_THEMES.default;

  // Add effect to adjust cell size based on screen width and board size
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const minDimension = Math.min(width, height);
      
      // Calculate optimal cell size to fill the full container width
      // Use 99% of screen width on mobile, 97% on tablet, 95% on desktop
      const widthPercentage = isMobile ? 0.99 : isTablet ? 0.97 : 0.95;
      const maxBoardSize = Math.min(width * widthPercentage, height * 0.95);
      let baseCellSize = Math.floor(maxBoardSize / (board.size + 1)); // +1 for minimal padding
      
      // Ensure minimum cell size for playability
      if (minDimension <= 360) {
        baseCellSize = Math.max(baseCellSize, 13);
      } else if (minDimension <= 480) {
        baseCellSize = Math.max(baseCellSize, 15);
      } else if (minDimension <= 768) {
        baseCellSize = Math.max(baseCellSize, 20);
      } else if (minDimension <= 1024) {
        baseCellSize = Math.max(baseCellSize, 28);
      } else if (minDimension <= 1366) {
        baseCellSize = Math.max(baseCellSize, 32);
      } else {
        baseCellSize = Math.max(baseCellSize, 36);
      }
      
      let adjustedCellSize = baseCellSize;
      if (board.size === 9) {
        adjustedCellSize = baseCellSize * 1.6;
      } else if (board.size === 13) {
        adjustedCellSize = baseCellSize * 1.3;
      } else if (board.size === 15) {
        adjustedCellSize = baseCellSize * 1.2;
      } else if (board.size === 21) {
        adjustedCellSize = baseCellSize * 0.9;
      }
      
      setCellSize(adjustedCellSize);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [board.size, isMobile, isTablet]);

  const boardSize = (board.size - 1) * cellSize;
  const boardPadding = showCoordinates ? cellSize * 0.8 : cellSize * 0.3; // Reduce padding when coordinates are hidden

  // Calculate positions for star points (hoshi)
  const getHoshiPoints = useCallback((boardSize: number) => {
    if (boardSize === 21) return [3, 10, 17];
    if (boardSize === 19) return [3, 9, 15];
    if (boardSize === 15) return [3, 7, 11];
    if (boardSize === 13) return [3, 6, 9];
    if (boardSize === 9) return [2, 4, 6];
    return [];
  }, []);
  
  const hoshiPoints = useMemo(() => getHoshiPoints(board.size), [getHoshiPoints, board.size]);

  // Use reviewStones if in review mode, otherwise use board.stones
  const stonesToDisplay = isReviewing && reviewStones && reviewStones.length > 0 ? reviewStones : board.stones;

  // Helper to get stone at position
  const getStoneAtPosition = (x: number, y: number): Stone | undefined => {
    return stonesToDisplay.find(
      (stone) => stone.position.x === x && stone.position.y === y
    );
  };

  // Check if position is valid for placement
  const isValidPlacement = (x: number, y: number): boolean => {
    return !getStoneAtPosition(x, y);
  };

  // Check if a stone is marked as dead during scoring
  const isDeadStone = (x: number, y: number): boolean => {
    return deadStones.some(stone => stone.x === x && stone.y === y);
  };

  // Check if a position is part of a territory and get its owner
  const getTerritoryOwner = (x: number, y: number): StoneColor | null => {
    if (!showTerritory) return null;
    const territoryPoint = territory.find(t => t.position.x === x && t.position.y === y);
    return territoryPoint?.owner || null;
  };

  // Check if a position is valid for handicap stone placement
  const isValidHandicapPoint = (x: number, y: number): boolean => {
    if (!isHandicapPlacement) return false;
    return isHandicapPoint({ x, y }, board.size) && !getStoneAtPosition(x, y);
  };

  // Handle click on board intersection
  const handleCellClick = useCallback((x: number, y: number) => {
    if (isReviewing) return;
    
    if (isScoring) {
      const stone = getStoneAtPosition(x, y);
      if (stone && onToggleDeadStone) {
        onToggleDeadStone({ x, y });
      }
    } else if ((isMobile || isTablet) && isPlayerTurn && isValidPlacement(x, y)) {
      // Set preview position for mobile and tablet
      if (onPreviewPositionChange) {
        onPreviewPositionChange({ x, y });
      } else {
        setInternalPreviewPosition({ x, y });
      }
    } else if (!isMobile && !isTablet && isPlayerTurn && isValidPlacement(x, y)) {
      playStoneSound();
      onPlaceStone({ x, y });
    }
  }, [isReviewing, isScoring, isMobile, isTablet, isPlayerTurn, onToggleDeadStone, onPlaceStone, getStoneAtPosition, isValidPlacement, onPreviewPositionChange]);

  // Handle mouse over board intersection
  const handleMouseOver = (x: number, y: number) => {
    if (!isReviewing && !isScoring && isPlayerTurn && isValidPlacement(x, y)) {
      setHoverPosition({ x, y });
    }
  };

  // Handle mouse leave from board
  const handleMouseLeave = () => {
    setHoverPosition(null);
  };

  // Handle mouse leave from entire board container
  const handleBoardMouseLeave = () => {
    setHoverPosition(null);
  };

  // Handle place button click (mobile only)
  const handlePlaceStone = () => {
    if (previewPosition && isPlayerTurn && isValidPlacement(previewPosition.x, previewPosition.y)) {
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
      playStoneSound();
      onPlaceStone(previewPosition);
      if (onPreviewPositionChange) {
        onPreviewPositionChange(null);
      } else {
        setInternalPreviewPosition(null);
      }
    }
  };

  // Handle touch events for mobile and tablet
  const handleTouchStart = (e: React.TouchEvent, x: number, y: number) => {
    e.preventDefault();
    if (!isReviewing && isPlayerTurn && isValidPlacement(x, y) && !isScoring) {
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      if (onPreviewPositionChange) {
        onPreviewPositionChange({ x, y });
      } else {
        setInternalPreviewPosition({ x, y });
      }
    }
  };

  // Clear preview when user touches outside the board
  const handleContainerTouchStart = (e: React.TouchEvent) => {
    if ((isMobile || isTablet) && previewPosition) {
      const target = e.target as HTMLElement;
      if (!target.closest('.go-board') && !target.closest('.mobile-stone-controls')) {
        if (onPreviewPositionChange) {
          onPreviewPositionChange(null);
        } else {
          setInternalPreviewPosition(null);
        }
      }
    }
  };

  // Render coordinate labels
  const renderCoordinates = useCallback(() => {
    const coords = [];
    
    // Function to convert column index to Go coordinate letter (skip I)
    const getColumnLetter = (index: number): string => {
      if (index < 8) {
        return String.fromCharCode(65 + index); // A-H
      } else {
        return String.fromCharCode(65 + index + 1); // J-Z (skipping I)
      }
    };
    
    // Column labels (A, B, C, D, E, F, G, H, J, K, L, ...)
    for (let x = 0; x < board.size; x++) {
      const letter = getColumnLetter(x);
      coords.push(
        <text
          key={`col-${x}`}
          x={x * cellSize}
          y={-boardPadding * 0.9}
          textAnchor="middle"
          fill={themeConfig.coordsColor}
          fontSize={cellSize * 0.35}
          fontWeight="bold"
        >
          {letter}
        </text>
      );
      
      // Bottom coordinates
      coords.push(
        <text
          key={`col-bottom-${x}`}
          x={x * cellSize}
          y={boardSize + boardPadding * 0.9 + cellSize * 0.1}
          textAnchor="middle"
          fill={themeConfig.coordsColor}
          fontSize={cellSize * 0.35}
          fontWeight="bold"
        >
          {letter}
        </text>
      );
    }
    
    // Row labels (1, 2, 3, ...)
    for (let y = 0; y < board.size; y++) {
      const number = board.size - y;
      coords.push(
        <text
          key={`row-${y}`}
          x={-boardPadding * 0.9}
          y={y * cellSize + cellSize * 0.12}
          textAnchor="middle"
          fill={themeConfig.coordsColor}
          fontSize={cellSize * 0.35}
          fontWeight="bold"
        >
          {number}
        </text>
      );
      
      // Right coordinates
      coords.push(
        <text
          key={`row-right-${y}`}
          x={boardSize + boardPadding * 0.9}
          y={y * cellSize + cellSize * 0.12}
          textAnchor="middle"
          fill={themeConfig.coordsColor}
          fontSize={cellSize * 0.35}
          fontWeight="bold"
        >
          {number}
        </text>
      );
    }
    
    return coords;
  }, [board.size, cellSize, boardSize, boardPadding, themeConfig.coordsColor]);

  // Render board grid lines
  const renderGrid = useCallback(() => {
    const lines = [];
    // Make grid lines 40% thinner on mobile and tablet (60% of original width)
    const gridLineWidth = (isMobile || isTablet) ? themeConfig.borderWidth * 0.6 : themeConfig.borderWidth;
    
    // Vertical lines
    for (let x = 0; x < board.size; x++) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x * cellSize}
          y1={0}
          x2={x * cellSize}
          y2={boardSize}
          stroke={themeConfig.lineColor}
          strokeWidth={gridLineWidth}
        />
      );
    }
    
    // Horizontal lines
    for (let y = 0; y < board.size; y++) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y * cellSize}
          x2={boardSize}
          y2={y * cellSize}
          stroke={themeConfig.lineColor}
          strokeWidth={gridLineWidth}
        />
      );
    }
    
    return lines;
  }, [board.size, cellSize, boardSize, themeConfig.lineColor, themeConfig.borderWidth, isMobile, isTablet]);

  // Render star points (hoshi)
  const renderHoshiPoints = useCallback(() => {
    const points: React.ReactElement[] = [];
    
    // Get the standard star point positions for the board size
    const starPoints: Array<[number, number]> = [];
    
    if (board.size === 9) {
      starPoints.push([2, 2], [2, 6], [4, 4], [6, 2], [6, 6]);
    } else if (board.size === 13) {
      starPoints.push([3, 3], [3, 9], [6, 6], [9, 3], [9, 9]);
    } else if (board.size === 15) {
      starPoints.push([3, 3], [3, 11], [7, 7], [11, 3], [11, 11]);
    } else if (board.size === 19) {
      starPoints.push(
        [3, 3], [3, 9], [3, 15],
        [9, 3], [9, 9], [9, 15],
        [15, 3], [15, 9], [15, 15]
      );
    } else if (board.size === 21) {
      starPoints.push(
        [3, 3], [3, 10], [3, 17],
        [10, 3], [10, 10], [10, 17],
        [17, 3], [17, 10], [17, 17]
      );
    }

    starPoints.forEach(([x, y], index) => {
      points.push(
        <circle
          key={`hoshi-${x}-${y}`}
          cx={x * cellSize}
          cy={y * cellSize}
          r={cellSize * 0.12}
          fill={themeConfig.hoshiColor}
        />
      );
    });
    
    return points;
  }, [board.size, cellSize, themeConfig.hoshiColor]);

  // Render stones
  const renderStones = useCallback(() => {
    const stones = stonesToDisplay;
    const stoneRadius = cellSize <= 15 ? cellSize * 0.48 : cellSize * 0.45;
    
    return stones.map((stone) => {
      const isLatestMove = lastMove && stone.position.x === lastMove.x && stone.position.y === lastMove.y;
      const isDead = !isReviewing && isDeadStone(stone.position.x, stone.position.y);
      
      return (
        <g key={`${stone.position.x}-${stone.position.y}`} className="stone">
          {/* Stone shadow */}
          <circle
            cx={stone.position.x * cellSize}
            cy={stone.position.y * cellSize + 1.5}
            r={stoneRadius}
            fill="rgba(0,0,0,0.15)"
            style={{ filter: 'blur(1px)' }}
          />
          
          {/* 3D gradient effect for 3D themes */}
          {themeConfig.stoneGradient && (
            <defs>
              <radialGradient 
                id={`stoneGradient-${stone.color}-${stone.position.x}-${stone.position.y}`} 
                cx="0.4" cy="0.4" r="0.7" fx="0.4" fy="0.4"
              >
                {stone.color === 'black' ? (
                  <>
                    <stop offset="0%" stopColor="#555" />
                    <stop offset="70%" stopColor="#222" />
                    <stop offset="100%" stopColor="#000" />
                  </>
                ) : (
                  <>
                    <stop offset="0%" stopColor="#fff" />
                    <stop offset="70%" stopColor="#f3f3f3" />
                    <stop offset="100%" stopColor="#ddd" />
                  </>
                )}
              </radialGradient>
            </defs>
          )}
          
          {/* Actual stone */}
          <circle
            cx={stone.position.x * cellSize}
            cy={stone.position.y * cellSize}
            r={stoneRadius}
            fill={themeConfig.stoneGradient ? 
              `url(#stoneGradient-${stone.color}-${stone.position.x}-${stone.position.y})` : 
              (stone.color || 'black')}
            stroke={stone.color === 'black' ? '#222' : '#888'}
            strokeWidth={0.8}
            style={{ 
              filter: stone.color === 'black' 
                ? themeConfig.stoneEffects.black
                : themeConfig.stoneEffects.white,
              opacity: isDead ? 0.3 : 1
            }}
          />
          
          {/* Last move indicator */}
          {isLatestMove && !isReviewing && (
            <circle
              cx={stone.position.x * cellSize}
              cy={stone.position.y * cellSize}
              r={stoneRadius * 0.35}
              fill="none"
              stroke={stone.color === 'black' ? 'white' : 'black'}
              strokeWidth={2}
              opacity={0.8}
            />
          )}
        </g>
      );
    });
  }, [isReviewing, reviewStones, stonesToDisplay, cellSize, lastMove, isDeadStone, themeConfig]);

  // Render interactive cell overlays
  const renderCellOverlays = useCallback(() => {
    const overlays: React.ReactElement[] = [];
    
    for (let y = 0; y < board.size; y++) {
      for (let x = 0; x < board.size; x++) {
        const isHovered = !isMobile && !isTablet && hoverPosition && hoverPosition.x === x && hoverPosition.y === y;
        const isPreview = (isMobile || isTablet) && previewPosition && previewPosition.x === x && previewPosition.y === y;
        const territoryOwner = getTerritoryOwner(x, y);
        const isValidHandicap = isValidHandicapPoint(x, y);
        const hasStone = getStoneAtPosition(x, y);
        
        overlays.push(
          <rect
            key={`overlay-${x}-${y}`}
            x={(x * cellSize) - (cellSize / 2)}
            y={(y * cellSize) - (cellSize / 2)}
            width={cellSize}
            height={cellSize}
            fill="transparent"
            className="stone-overlay"
            onClick={() => handleCellClick(x, y)}
            onMouseEnter={() => !isMobile && !isTablet && handleMouseOver(x, y)}
            onMouseMove={() => !isMobile && !isTablet && handleMouseOver(x, y)}
            onMouseLeave={!isMobile && !isTablet ? handleMouseLeave : undefined}
            onTouchStart={(e) => (isMobile || isTablet) && handleTouchStart(e, x, y)}
            style={{ cursor: isPlayerTurn && isValidPlacement(x, y) ? 'pointer' : 'default' }}
          />
        );
        
        // Territory markers
        if (showTerritory && territoryOwner && !hasStone) {
          overlays.push(
            <circle
              key={`territory-${x}-${y}`}
              cx={x * cellSize}
              cy={y * cellSize}
              r={cellSize * 0.15}
              fill={territoryOwner === 'black' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)'}
              stroke={territoryOwner === 'black' ? 'black' : 'gray'}
              strokeWidth={1}
            />
          );
        }
        
        // Hover indicator - transparent stone preview
        if (isHovered && !hasStone && !isScoring) {
          const stoneRadius = cellSize <= 15 ? cellSize * 0.48 : cellSize * 0.45;
          
          overlays.push(
            <g key={`hover-${x}-${y}`} className="hover-stone-preview">
              {/* Stone shadow for hover */}
              <circle
                cx={x * cellSize}
                cy={y * cellSize + 1.5}
                r={stoneRadius}
                fill="rgba(0,0,0,0.15)"
                style={{ filter: 'blur(1px)' }}
              />
              
              {/* 3D gradient effect for hover stone if theme supports it */}
              {themeConfig.stoneGradient && (
                <defs>
                  <radialGradient 
                    id={`hoverGradient-${currentTurn}-${x}-${y}`} 
                    cx="0.4" cy="0.4" r="0.7" fx="0.4" fy="0.4"
                  >
                    {currentTurn === 'black' ? (
                      <>
                        <stop offset="0%" stopColor="#555" stopOpacity="0.6" />
                        <stop offset="70%" stopColor="#222" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#000" stopOpacity="0.6" />
                      </>
                    ) : (
                      <>
                        <stop offset="0%" stopColor="#fff" stopOpacity="0.8" />
                        <stop offset="70%" stopColor="#f3f3f3" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#ddd" stopOpacity="0.8" />
                      </>
                    )}
                  </radialGradient>
                </defs>
              )}
              
              {/* Hover stone */}
              <circle
                cx={x * cellSize}
                cy={y * cellSize}
                r={stoneRadius}
                fill={themeConfig.stoneGradient ? 
                  `url(#hoverGradient-${currentTurn}-${x}-${y})` : 
                  (currentTurn === 'black' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.85)')}
                stroke={currentTurn === 'black' ? 'rgba(0,0,0,0.8)' : 'rgba(100,100,100,0.9)'}
                strokeWidth={1.5}
                style={{
                  filter: currentTurn === 'black' 
                    ? themeConfig.stoneEffects.black
                    : themeConfig.stoneEffects.white,
                  opacity: 0.8
                }}
              />
            </g>
          );
        }
        
        // Preview indicator
        if (isPreview && !hasStone && !isScoring) {
          overlays.push(
            <circle
              key={`preview-${x}-${y}`}
              cx={x * cellSize}
              cy={y * cellSize}
              r={cellSize * 0.45}
              fill={currentTurn === 'black' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)'}
              stroke={currentTurn === 'black' ? 'black' : 'gray'}
              strokeWidth={2}
            />
          );
        }
        
        // Handicap point indicator
        if (isValidHandicap && !hasStone) {
          overlays.push(
            <circle
              key={`handicap-${x}-${y}`}
              cx={x * cellSize}
              cy={y * cellSize}
              r={cellSize * 0.3}
              fill="transparent"
              stroke="#4B5563"
              strokeWidth={2}
              strokeDasharray="4,2"
              opacity={0.6}
              className="handicap-indicator"
            />
          );
        }
      }
    }
    
    return overlays;
  }, [board.size, cellSize, isMobile, isTablet, hoverPosition, previewPosition, showTerritory, getTerritoryOwner, 
      isValidHandicapPoint, getStoneAtPosition, handleCellClick, handleMouseOver, handleMouseLeave, 
      handleTouchStart, isPlayerTurn, isValidPlacement, isScoring, currentTurn]);

  return (
    <div 
      className="go-board-container-enhanced relative max-w-full overflow-auto"
      onTouchStart={handleContainerTouchStart}
      onMouseLeave={handleBoardMouseLeave}
    >
      <div className={`go-board-wrapper ${isReviewing ? 'review-mode' : ''}`}>
        <svg
          className="go-board-svg"
          width={boardSize + boardPadding * 4}
          height={boardSize + boardPadding * 4}
          viewBox={`${-boardPadding * 2} ${-boardPadding * 2} ${boardSize + boardPadding * 4} ${boardSize + boardPadding * 4}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ 
            backgroundColor: themeConfig.boardColor,
            backgroundImage: themeConfig.woodTexture ? WOOD_TEXTURES[themeConfig.woodTexture] : 'none',
            borderRadius: '8px',
            boxShadow: theme === 'universe' 
              ? '0 3px 8px rgba(0,0,0,0.5), inset 0 0 20px rgba(100,100,255,0.2)'
              : '0 3px 8px rgba(0,0,0,0.2), inset 0 -3px 6px rgba(0,0,0,0.1)'
          }}
        >
          {/* Background rectangle with wood texture */}
          {themeConfig.woodTexture && (
            <rect
              x={-boardPadding * 2}
              y={-boardPadding * 2}
              width={boardSize + boardPadding * 4}
              height={boardSize + boardPadding * 4}
              fill={`url(#wood-texture-${themeConfig.woodTexture})`}
              rx="8"
              ry="8"
            />
          )}
          
          {/* Wood texture definitions */}
          <defs>
            <pattern id="wood-texture-lightwood" patternUnits="userSpaceOnUse" width="200" height="200">
              <rect width="200" height="200" fill="#d9b383" />
              <filter id="wood-grain-light">
                <feTurbulence type="fractalNoise" baseFrequency="0.02 0.05" numOctaves="3" seed="2" />
                <feDisplacementMap in="SourceGraphic" scale="5" />
              </filter>
              <rect width="200" height="200" filter="url(#wood-grain-light)" fill="#d9b383" opacity="0.8" />
            </pattern>
            
            <pattern id="wood-texture-darkwood" patternUnits="userSpaceOnUse" width="200" height="200">
              <rect width="200" height="200" fill="#6b4423" />
              <filter id="wood-grain-dark">
                <feTurbulence type="fractalNoise" baseFrequency="0.02 0.05" numOctaves="3" seed="3" />
                <feDisplacementMap in="SourceGraphic" scale="5" />
              </filter>
              <rect width="200" height="200" filter="url(#wood-grain-dark)" fill="#6b4423" opacity="0.8" />
            </pattern>
          </defs>
          
          {/* Coordinates - render behind the grid and stones */}
          {showCoordinates && cellSize > 14 && <g>{renderCoordinates()}</g>}
          
          {/* Board grid */}
          <g>{renderGrid()}</g>
          
          {/* Star points */}
          <g>{renderHoshiPoints()}</g>
          
          {/* Active stones */}
          <g>{renderStones()}</g>
          
          {/* Interactive overlays */}
          <g>{renderCellOverlays()}</g>
        </svg>
      </div>

      {/* Scoring mode indicator */}
      {isScoring && (
        <div className="absolute top-0 left-0 bg-neutral-800/90 text-white px-4 py-2 rounded-br-lg text-sm font-medium shadow-md border border-neutral-700">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
            <span>Scoring Mode: Click stones to mark as dead</span>
          </div>
        </div>
      )}

      {isHandicapPlacement && (
        <div className="absolute top-0 left-0 bg-neutral-800/90 text-white px-3 py-1 rounded-br-lg text-sm font-medium">
          Handicap Mode: Place stones on highlighted points
        </div>
      )}
    </div>
  );
};

export default React.memo(GoBoard);