
import React from 'react';

interface BlockProps {
  color: string;
  ghost?: boolean;
}

const Block: React.FC<BlockProps> = ({ color, ghost = false }) => {
  if (color === 'empty') return <div className="w-full h-full bg-white/[0.03] border border-white/[0.05] rounded-sm" />;

  const baseStyle: React.CSSProperties = {
    backgroundColor: ghost ? 'transparent' : color,
    borderColor: ghost ? `${color}44` : 'rgba(255,255,255,0.2)',
    boxShadow: ghost 
      ? 'none' 
      : `inset 0 0 12px rgba(255,255,255,0.2), 0 0 15px ${color}33`,
  };

  return (
    <div 
      className={`w-full h-full rounded-sm border transition-all duration-200 ${ghost ? 'border-dashed opacity-40' : 'border-t-white/30 border-l-white/20'}`}
      style={baseStyle}
    >
      {!ghost && (
        <div className="w-full h-full bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
      )}
    </div>
  );
};

export default React.memo(Block);
