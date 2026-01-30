import React from 'react';

interface AssetListItemProps {
  symbol: string;
  name: string;
  change: string;
  active: boolean;
  onClick: () => void;
}

export const AssetListItem: React.FC<AssetListItemProps> = ({ symbol, name, change, active, onClick }) => (
    <div 
        onClick={onClick}
        className={`p-3 rounded-xl flex items-center justify-between cursor-pointer border border-transparent transition-all ${active ? 'neu-in border-primary/20 bg-primary/5' : 'hover:bg-gray-800/50'}`}
    >
        <div className="flex items-center gap-3">
            <div className="size-8 rounded-full neu-out flex items-center justify-center text-xs font-bold text-gray-400">{symbol[0]}</div>
            <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-200">{symbol}/USD</span>
                <span className="text-[10px] text-gray-500">{name}</span>
            </div>
        </div>
        <span className={`text-xs font-bold ${change.startsWith('+') ? 'text-success drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]' : 'text-danger'}`}>{change}</span>
    </div>
);