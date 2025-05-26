import React, { useState } from 'react';
import GoBoard from './GoBoard';
import { Board, Position } from '../../types/go';

const BoardSizeDemo: React.FC = () => {
  const [selectedSize, setSelectedSize] = useState<number>(19);
  
  // Create empty boards for each size
  const boards: Record<number, Board> = {
    19: {
      size: 19,
      stones: [],
    },
    13: {
      size: 13,
      stones: [],
    },
    9: {
      size: 9,
      stones: [],
    }
  };

  // Function that would be called when placing stones (does nothing in demo)
  const handlePlaceStone = () => {};

  const containerStyle = {
    padding: '1rem'
  };

  const titleStyle = {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
    textAlign: 'center' as const
  };

  const buttonContainerStyle = {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    marginBottom: '1.5rem'
  };

  const buttonStyle = (isSelected: boolean) => ({
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    backgroundColor: isSelected ? '#6366f1' : '#e5e7eb',
    color: isSelected ? 'white' : 'black'
  });

  const boardContainerStyle = {
    maxWidth: '36rem',
    margin: '0 auto'
  };

  const descriptionContainerStyle = {
    marginTop: '1.5rem',
    maxWidth: '36rem',
    margin: '1.5rem auto 0'
  };

  const descriptionTitleStyle = {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '0.5rem'
  };

  const paragraphStyle = {
    marginBottom: '0.5rem'
  };

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>Go Board Size Comparison</h2>
      
      <div style={buttonContainerStyle}>
        <button 
          style={buttonStyle(selectedSize === 19)}
          onClick={() => setSelectedSize(19)}
        >
          19×19
        </button>
        <button 
          style={buttonStyle(selectedSize === 13)}
          onClick={() => setSelectedSize(13)}
        >
          13×13
        </button>
        <button 
          style={buttonStyle(selectedSize === 9)}
          onClick={() => setSelectedSize(9)}
        >
          9×9
        </button>
      </div>
      
      <div style={boardContainerStyle}>
        <GoBoard 
          board={boards[selectedSize]} 
          currentTurn="black" 
          onPlaceStone={handlePlaceStone}
          isPlayerTurn={true}
        />
      </div>
      
      <div style={descriptionContainerStyle}>
        <h3 style={descriptionTitleStyle}>About this board size</h3>
        {selectedSize === 19 && (
          <div>
            <p style={paragraphStyle}>
              <strong>19×19 is the standard size</strong> used in professional tournaments and official games. 
            </p>
            <p style={paragraphStyle}>
              With 361 intersections, it offers the most complex gameplay and strategic depth. Games typically 
              last 200-300 moves and can take 1-3 hours to complete.
            </p>
            <p style={paragraphStyle}>
              This board size features 9 star points (hoshi) that serve as visual guides and traditional 
              placement points for handicap stones.
            </p>
          </div>
        )}
        
        {selectedSize === 13 && (
          <div>
            <p style={paragraphStyle}>
              <strong>13×13 is a medium-sized board</strong> that provides a good balance between complexity
              and game length.
            </p>
            <p style={paragraphStyle}>
              With 169 intersections, it's excellent for intermediate players or when you want a meaningful 
              game but don't have time for a full 19×19 match.
            </p>
            <p style={paragraphStyle}>
              This board size features 5 star points and can still demonstrate most of the strategic concepts
              present in the full-sized game.
            </p>
          </div>
        )}
        
        {selectedSize === 9 && (
          <div>
            <p style={paragraphStyle}>
              <strong>9×9 is a small board</strong> perfect for beginners and quick games.
            </p>
            <p style={paragraphStyle}>
              With only 81 intersections, games are fast-paced and typically last 20-30 minutes. The smaller
              size makes it easier to understand the entire board position and practice tactical patterns.
            </p>
            <p style={paragraphStyle}>
              This board size features 5 star points and is excellent for teaching the basic rules and concepts
              of Go before moving to larger boards.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardSizeDemo; 