import React from 'react';
import BoardSizePreview from './BoardSizePreview';

interface BoardSizeComparisonProps {
  onSizeSelect: (size: number) => void;
}

const BoardSizeComparison: React.FC<BoardSizeComparisonProps> = ({ onSizeSelect }) => {
  const boardSizes = [
    { size: 9, name: '9×9', description: 'Quick games (~20-30 min)', category: 'Beginner friendly' },
    { size: 13, name: '13×13', description: 'Medium length (~45-60 min)', category: 'Intermediate' },
    { size: 15, name: '15×15', description: 'Traditional Korean size (~60-90 min)', category: 'Traditional' },
    { size: 19, name: '19×19', description: 'Full length (~90-120 min)', category: 'Tournament standard' },
    { size: 21, name: '21×21', description: 'Extended play (~120-150 min)', category: 'Extended' }
  ];

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Board Size Comparison</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {boardSizes.map(({ size, name, description, category }) => (
          <div 
            key={size} 
            className="bg-neutral-50 rounded-lg p-4 border border-neutral-200 cursor-pointer hover:border-primary-500 hover:shadow-md transition-all duration-200"
            onClick={() => onSizeSelect(size)}
          >
            <div className="flex items-start gap-4">
              <BoardSizePreview size={size} className="w-24 h-24 rounded-lg shadow-sm" />
              <div>
                <div className="text-xs text-primary-600 font-medium mb-1">{category}</div>
                <h3 className="text-lg font-bold mb-1">{name}</h3>
                <p className="text-sm text-neutral-600">{description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
        <h3 className="text-lg font-semibold mb-2">About Board Sizes</h3>
        <p className="text-neutral-600 text-sm">
          Go board sizes affect gameplay complexity and duration. Smaller boards are perfect for learning and quick games,
          while larger boards offer more strategic depth and are used in professional play. The 19×19 board is the standard
          tournament size, offering the richest strategic possibilities.
        </p>
      </div>
    </div>
  );
};

export default BoardSizeComparison; 