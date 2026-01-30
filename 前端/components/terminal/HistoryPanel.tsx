import React from 'react';
import { History } from 'lucide-react';

type HistoryTone = 'win' | 'loss' | 'live';

interface HistoryItem {
  id: string;
  symbol: string;
  entry: string;
  rangeKey: string;
  odds: string;
  payout: string;
  tone: HistoryTone;
}

interface HistoryPanelProps {
  items: HistoryItem[];
  rangeLabels: Record<string, string>;
  labels: {
    title: string;
    window: string;
    entry: string;
    win: string;
    loss: string;
    live: string;
  };
}

export function HistoryPanel({ items, rangeLabels, labels }: HistoryPanelProps) {
  return (
    <aside className="w-64 flex-col gap-4 hidden lg:flex shrink-0 h-full min-h-0 ml-4 mb-4 pt-4">
      <div className="flex items-center justify-between px-4 py-1">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <History size={14} className="text-gray-400" />
          {labels.title}
        </h3>
        <span className="text-[10px] text-gray-600 font-mono">{labels.window}</span>
      </div>
      <div className="flex-1 min-h-0 neu-in rounded-xl p-4 overflow-y-auto space-y-3 custom-scrollbar">
        {items.map((item) => {
          const isWin = item.tone === 'win';
          const isLive = item.tone === 'live';
          const statusLabel = isWin ? labels.win : isLive ? labels.live : labels.loss;
          const statusDotClass = isWin
            ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]'
            : isLive
              ? 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]'
              : 'bg-red-500 opacity-50';
          const statusTextClass = isWin ? 'text-green-500' : isLive ? 'text-blue-400' : 'text-red-500/70';
          const payoutClass = isWin ? 'text-green-400' : isLive ? 'text-blue-300' : 'text-red-400';

          return (
            <div
              key={item.id}
              className={`p-3 rounded-lg border ${item.tone === 'win' ? 'border-green-500/10' : 'border-white/5'} bg-[#121721] hover:bg-white/5 transition-colors cursor-pointer relative overflow-hidden group`}
            >
              {item.tone === 'win' && (
                <div className="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              )}
              <div className="flex justify-between items-center mb-2 relative z-10">
                <span className="text-[10px] font-bold text-gray-400">{item.symbol}</span>
                <div className="flex items-center gap-1">
                  <span className={`size-1.5 rounded-full ${statusDotClass}`}></span>
                  <span className={`text-[9px] font-bold tracking-wider ${statusTextClass}`}>
                    {statusLabel}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-end relative z-10">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-gray-500 font-mono">{labels.entry}: {item.entry}</span>
                  <span className={`text-xs font-mono ${item.tone === 'win' ? 'text-gray-200' : 'text-gray-400'}`}>
                    {rangeLabels[item.rangeKey] ?? item.rangeKey} <span className="text-gray-600 text-[10px]">@</span> {item.odds}
                  </span>
                </div>
                <span className={`text-xs font-mono font-bold ${payoutClass}`}>
                  {item.payout}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
