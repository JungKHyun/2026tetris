
import React from 'react';

interface BlockProps {
  color: string;
  ghost?: boolean;
}

const Block: React.FC<BlockProps> = ({ color, ghost = false }) => {
  if (color === 'empty') return (
    <div className="w-full h-full bg-[#0a0a0a] border-[0.5px] border-[#1a1a1a] box-border" />
  );

  if (ghost) {
    return (
      <div 
        className="w-full h-full border-[2px] border-dashed opacity-40 box-border"
        style={{ borderColor: color }}
      />
    );
  }

  return (
    <div 
      className="w-full h-full border-t-[4px] border-l-[4px] border-r-[4px] border-b-[4px] box-border relative"
      style={{ 
        backgroundColor: color,
        borderTopColor: 'rgba(255,255,255,0.9)',
        borderLeftColor: 'rgba(255,255,255,0.6)',
        borderRightColor: 'rgba(0,0,0,0.5)',
        borderBottomColor: 'rgba(0,0,0,0.8)',
      }}
    >
      {/* 내부 광택 효과 */}
      <div className="absolute inset-0 border border-black/30 pointer-events-none" />
    </div>
  );
};

export default React.memo(Block);
