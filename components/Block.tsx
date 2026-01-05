
import React from 'react';

interface BlockProps {
  color: string;
  ghost?: boolean;
}

const Block: React.FC<BlockProps> = ({ color, ghost = false }) => {
  if (color === 'empty') return <div className="w-full h-full bg-black/20 border border-white/5 rounded-sm" />;

  return (
    <div 
      className={`w-full h-full rounded-sm border ${ghost ? 'opacity-30 border-dashed' : 'border-black/20 shadow-inner'}`}
      style={{ 
        backgroundColor: color,
        boxShadow: ghost ? 'none' : `inset 0 0 8px rgba(0,0,0,0.3), 0 0 10px ${color}88`
      }}
    />
  );
};

export default React.memo(Block);
