import React from 'react';

export function PredictionHeader({
  gridColsLeft,
  gridColsRight,
  totalCols,
  timeIntervals
}: {
  gridColsLeft: number;
  gridColsRight: number;
  totalCols: number;
  timeIntervals: string[];
}) {
  return (
    <div className="h-[50px] border-b border-white/5 shrink-0 flex">
      <div className="flex items-center px-4" style={{ width: `${(gridColsLeft / totalCols) * 100}%` }}>
        <span className="text-[10px] font-bold text-gray-500 font-mono">PRICE CHART</span>
      </div>
      <div className="flex border-l border-white/5" style={{ width: `${(gridColsRight / totalCols) * 100}%` }}>
        {timeIntervals.map((interval, i) => (
          <div key={interval} className={`flex-1 flex items-center justify-center text-[10px] font-bold text-gray-500 font-mono ${i > 0 ? 'border-l border-white/5' : ''}`}>
            {interval}
          </div>
        ))}
      </div>
    </div>
  );
}
