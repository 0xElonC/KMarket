import React from 'react';
import { Settings, Maximize2 } from 'lucide-react';
import { NeuButton } from '../NeuButton';

interface ChartToolbarProps {
  activeSymbol: {
    symbol: string;
    name: string;
    change: string;
  };
  lastClose: number;
  isForex: boolean;
  betAmount: number;
  onBetAmountChange: (amount: number) => void;
  activeTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  labels: {
    betAmount: string;
  };
}

const ChartToolbar = React.memo(function ChartToolbar({
  activeSymbol,
  lastClose,
  isForex,
  betAmount,
  onBetAmountChange,
  activeTimeframe,
  onTimeframeChange,
  labels
}: ChartToolbarProps) {
  const quoteLabel = isForex ? 'USD' : 'USDT';

  return (
    <div className="flex items-center gap-3 p-4 border-b border-white/5 bg-[#121721]">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">{activeSymbol.symbol[0]}</div>
          <div>
            <h2 className="font-bold text-lg text-gray-200 leading-none">{activeSymbol.symbol}/{quoteLabel}</h2>
            <span className="text-xs text-gray-500">{activeSymbol.name}</span>
          </div>
        </div>
        <div className="h-8 w-px bg-white/10"></div>
        <div className="flex flex-col">
          <span className="text-2xl font-digital font-bold text-success">${lastClose.toFixed(isForex ? 4 : 2)}</span>
          <span className={`text-xs font-bold flex items-center gap-1 ${activeSymbol.change.startsWith('+') ? 'text-success' : 'text-danger'}`}>
            <span className="material-symbols-outlined text-xs font-bold">trending_up</span>
            {activeSymbol.change} (24h)
          </span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="pointer-events-auto neu-out pl-4 pr-1 py-1.5 rounded-full flex items-center gap-2 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] bg-[#121721]/90 backdrop-blur-md">
          <div className="flex flex-col mr-2">
            <span className="text-[9px] text-gray-500 uppercase font-bold tracking-wider leading-none mb-1 ml-[10px]">{labels.betAmount}</span>
            <div className="flex items-center gap-1 ml-[3px]">
              <span className="text-cyan-400 font-mono text-lg font-bold -mt-[2px]">$</span>
              <input
                className="bg-transparent border-0 border-b border-cyan-400/30 text-white font-mono text-lg font-bold focus:outline-none focus:border-cyan-400 w-16 pb-0 transition-colors ml-[5px]"
                type="number"
                value={betAmount}
                onChange={(e) => onBetAmountChange(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="h-6 w-px bg-white/10 mx-1"></div>
          <div className="flex gap-1.5">
            <button
              className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-[10px] font-mono text-gray-300 border border-white/5 transition-colors font-bold"
              onClick={() => onBetAmountChange(10)}
            >
              10
            </button>
            <button
              className="px-3 py-1 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-[10px] font-mono text-cyan-400 border border-cyan-500/20 transition-colors font-bold shadow-[0_0_10px_rgba(34,211,238,0.1)]"
              onClick={() => onBetAmountChange(50)}
            >
              50
            </button>
            <button
              className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-[10px] font-mono text-gray-300 border border-white/5 transition-colors font-bold"
              onClick={() => onBetAmountChange(100)}
            >
              100
            </button>
          </div>
          <div className="h-6 w-px bg-white/10 mx-1"></div>
          <button className="size-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg hover:shadow-cyan-500/40 transition-all hover:scale-105 group/btn">
            <span className="material-symbols-outlined text-lg group-hover/btn:rotate-12 transition-transform">bolt</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex bg-[#161f2d] rounded-lg p-1">
          {['1H', '4H', '1D'].map(tf => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${activeTimeframe === tf ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {tf}
            </button>
          ))}
        </div>
        <NeuButton className="size-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-white">
          <Settings size={16} />
        </NeuButton>
        <NeuButton className="size-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-white">
          <Maximize2 size={16} />
        </NeuButton>
      </div>
    </div>
  );
});

export { ChartToolbar };
