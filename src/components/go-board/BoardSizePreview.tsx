import React from 'react';

interface BoardSizePreviewProps {
  size: number;
  className?: string;
}

const BoardSizePreview: React.FC<BoardSizePreviewProps> = ({ size, className = '' }) => {
  // Generate grid lines
  const gridLines = [];
  for (let i = 0; i < size; i++) {
    // Horizontal lines
    gridLines.push(
      <line
        key={`h${i}`}
        x1="0"
        y1={`${(100 / (size - 1)) * i}%`}
        x2="100%"
        y2={`${(100 / (size - 1)) * i}%`}
        stroke="rgba(0, 0, 0, 0.3)"
        strokeWidth="0.5"
      />
    );
    // Vertical lines
    gridLines.push(
      <line
        key={`v${i}`}
        x1={`${(100 / (size - 1)) * i}%`}
        y1="0"
        x2={`${(100 / (size - 1)) * i}%`}
        y2="100%"
        stroke="rgba(0, 0, 0, 0.3)"
        strokeWidth="0.5"
      />
    );
  }

  // Generate star points (hoshi)
  const starPoints: React.ReactElement[] = [];
  const getStarPoints = (size: number): [number, number][] => {
    if (size === 9) return [[2, 2], [2, 6], [4, 4], [6, 2], [6, 6]];
    if (size === 13) return [[3, 3], [3, 9], [6, 6], [9, 3], [9, 9]];
    if (size === 15) return [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]];
    if (size === 19) return [[3, 3], [3, 9], [3, 15], [9, 3], [9, 9], [9, 15], [15, 3], [15, 9], [15, 15]];
    if (size === 21) return [[3, 3], [3, 10], [3, 17], [10, 3], [10, 10], [10, 17], [17, 3], [17, 10], [17, 17]];
    return [];
  };

  getStarPoints(size).forEach(([x, y]) => {
    starPoints.push(
      <circle
        key={`star${x}${y}`}
        cx={`${(100 / (size - 1)) * x}%`}
        cy={`${(100 / (size - 1)) * y}%`}
        r="3%"
        fill="rgba(0, 0, 0, 0.7)"
      />
    );
  });

  return (
    <div className={`relative aspect-square bg-amber-100 ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full board-preview-svg"
        style={{ padding: '5%' }}
      >
        {gridLines}
        {starPoints}
      </svg>
    </div>
  );
};

export default BoardSizePreview; 