import React, { useMemo } from 'react';

interface PlayerAvatarProps {
  username: string;
  size?: number;
}

const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ username, size = 32 }) => {
  // Generate a deterministic color based on username
  const backgroundColor = useMemo(() => {
    const colors = [
      'rgb(0, 77, 77)',  // Dark teal
      'rgb(77, 0, 77)',  // Dark purple
      'rgb(77, 51, 0)',  // Dark brown
      'rgb(0, 51, 77)',  // Dark blue
      'rgb(51, 77, 0)',  // Dark olive
    ];
    
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, [username]);

  // Generate pixel pattern based on username
  const pattern = useMemo(() => {
    const grid = Array(5).fill(0).map(() => Array(5).fill(false));
    let hash = 0;
    
    // Generate hash from username
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Fill left half of the pattern
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 3; j++) {
        grid[i][j] = ((hash >> (i * 3 + j)) & 1) === 1;
      }
    }

    // Mirror the pattern for the right half
    for (let i = 0; i < 5; i++) {
      grid[i][3] = grid[i][1];
      grid[i][4] = grid[i][0];
    }

    return grid;
  }, [username]);

  const pixelSize = size / 5;

  return (
    <div 
      className="rounded-lg overflow-hidden"
      style={{ 
        width: size, 
        height: size,
        backgroundColor: backgroundColor,
        display: 'grid',
        gridTemplateColumns: `repeat(5, ${pixelSize}px)`,
      }}
    >
      {pattern.flat().map((isPixelFilled, index) => (
        <div
          key={index}
          style={{
            width: pixelSize,
            height: pixelSize,
            backgroundColor: isPixelFilled ? 'rgba(255, 255, 255, 0.7)' : 'transparent'
          }}
        />
      ))}
    </div>
  );
};

export default PlayerAvatar; 