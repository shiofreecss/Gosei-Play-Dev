import React from 'react';

interface GoseiLogoProps {
  size?: number;
  className?: string;
}

const GoseiLogo: React.FC<GoseiLogoProps> = ({ size = 40, className = '' }) => {
  // Create a white stone effect with subtle gradients and shadows
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Base white stone circle */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle at 35% 35%, #ffffff 0%, #f0f0f0 60%, #e0e0e0 100%)',
          boxShadow: `
            0 2px 4px rgba(0, 0, 0, 0.1),
            0 4px 8px rgba(0, 0, 0, 0.1),
            inset 0 -2px 4px rgba(0, 0, 0, 0.05),
            inset 0 2px 4px rgba(255, 255, 255, 0.8)
          `,
          border: '1px solid rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Highlight effect */}
        <div 
          className="absolute"
          style={{
            top: '15%',
            left: '15%',
            width: '40%',
            height: '40%',
            background: 'radial-gradient(circle at center, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 100%)',
            borderRadius: '50%',
            transform: 'rotate(-45deg)'
          }}
        />
      </div>
    </div>
  );
};

export default GoseiLogo; 