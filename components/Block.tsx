
import React from 'react';

interface BlockProps {
  color: string;
  ghost?: boolean;
}

const Block: React.FC<BlockProps> = ({ color, ghost = false }) => {
  if (color === 'empty') return (
    <div className="w-full h-full bg-[#111111] border-[1px] border-[#222222] box-border opacity-80" />
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
        borderTopColor: 'rgba(255,255,255,0.85)',
        borderLeftColor: 'rgba(255,255,255,0.6)',
        borderRightColor: 'rgba(0,0,0,0.5)',
        borderBottomColor: 'rgba(0,0,0,0.8)',
      }}
    >
      {/* 고전 게임 특유의 안쪽 얇은 검은색 테두리 */}
      <div className="absolute inset-[1px] border border-black/20 pointer-events-none" />
    </div>
  );
};

export default React.memo(Block);
