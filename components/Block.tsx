
import React from 'react';

interface BlockProps {
  color: string;
  ghost?: boolean;
}

const Block: React.FC<BlockProps> = ({ color, ghost = false }) => {
  if (color === 'empty') return <div className="w-full h-full bg-[#111] border border-[#222] rounded-none" />;

  if (ghost) {
    return (
      <div 
        className="w-full h-full border-2 border-dashed opacity-50"
        style={{ borderColor: color }}
      />
    );
  }

  return (
    <div 
      className="w-full h-full border-[3px]"
      style={{ 
        backgroundColor: color,
        borderTopColor: 'rgba(255,255,255,0.8)',
        borderLeftColor: 'rgba(255,255,255,0.5)',
        borderRightColor: 'rgba(0,0,0,0.5)',
        borderBottomColor: 'rgba(0,0,0,0.8)',
      }}
    >
      <div className="w-full h-full border border-black/20" />
    </div>
  );
};

export default React.memo(Block);
