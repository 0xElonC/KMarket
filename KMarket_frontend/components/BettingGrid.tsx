import React from 'react';
import { BetCell, BetCellStatus } from '../types';
import { HudStrip } from './HudStrip';

interface BettingGridProps {
  cells: BetCell[];
  timeIntervals?: string[];
  selectedCellId?: string | null;
  onCellClick?: (cell: BetCell) => void;
  onBet?: (cellId: string, amount: number) => void;
}

// 单元格样式映射 (包含K项目风格状态)
const cellStyles: Record<BetCellStatus, string> = {
  default: 'bet-cell-base',
  selected: 'bet-cell-base bet-cell-selected',
  win: 'bet-cell-base bet-cell-win pulse-gold',
  fail: 'bet-cell-base bet-cell-fail',
  dissolved: 'bet-cell-base bet-cell-dissolved',
  // K项目风格状态
  idle: 'bet-cell-base',
  active: 'bet-cell-base bet-cell-selected',
  won: 'bet-cell-base bet-cell-win pulse-gold',
  lost: 'bet-cell-base bet-cell-fail'
};

// 标签颜色映射
const labelColors: Record<BetCellStatus, string> = {
  default: 'text-gray-600 group-hover:text-gray-400',
  selected: 'text-blue-400',
  win: 'text-yellow-500',
  fail: 'text-red-400 opacity-80',
  dissolved: 'text-gray-600',
  // K项目风格状态
  idle: 'text-gray-600 group-hover:text-gray-400',
  active: 'text-blue-400',
  won: 'text-yellow-500',
  lost: 'text-red-400 opacity-80'
};

// 赔率颜色映射
const oddsColors: Record<BetCellStatus, string> = {
  default: 'text-gray-500 text-glow-hover',
  selected: 'text-white font-bold drop-shadow-md',
  win: 'text-white font-bold drop-shadow-md',
  fail: 'text-red-300',
  dissolved: 'text-gray-500',
  // K项目风格状态
  idle: 'text-gray-500 text-glow-hover',
  active: 'text-white font-bold drop-shadow-md',
  won: 'text-white font-bold drop-shadow-md',
  lost: 'text-red-300'
};

export function BettingGrid({
  cells,
  timeIntervals = ['+10m', '+30m', '+1h'],
  selectedCellId,
  onCellClick,
  onBet
}: BettingGridProps) {
  const selectedCell = cells.find(c => c.id === selectedCellId);

  return (
    <div className="relative flex-shrink-0 w-full h-full border-l border-white/5 bg-[#121721]/30 backdrop-blur-sm z-40">
      <div className="w-full h-full flex flex-col">
        {/* 时间间隔头部 */}
        <div className="flex w-full h-[50px] border-b border-white/5 shrink-0">
          {timeIntervals.map((interval, i) => (
            <div
              key={interval}
              className={`flex-1 flex items-center justify-center text-[10px] font-bold text-gray-500 font-mono tracking-wide ${i > 0 ? 'border-l border-white/5' : ''}`}
            >
              {interval}
            </div>
          ))}
        </div>

        {/* 投注网格 */}
        <div className="flex-1 grid grid-cols-3 grid-rows-5 gap-0">
          {cells.map((cell) => (
            <div
              key={cell.id}
              className={`${cellStyles[cell.status]} group cursor-pointer relative`}
              onClick={() => onCellClick?.(cell)}
            >
              {/* WIN徽章 */}
              {cell.status === 'win' && (
                <div className="absolute -top-3 -right-3 bg-yellow-500 text-black text-[10px] font-extrabold px-1.5 rounded-full shadow-lg z-30 animate-bounce flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[10px]">monetization_on</span>
                  +USDC
                </div>
              )}

              {/* 标签 */}
              <span className={`text-[9px] font-bold uppercase tracking-wider ${labelColors[cell.status]}`}>
                {cell.status === 'selected' ? 'Active' : cell.status === 'win' ? 'WIN' : cell.status === 'fail' ? 'Missed' : cell.label}
              </span>

              {/* 赔率 */}
              <span className={`text-[10px] font-mono font-medium mt-1 ${oddsColors[cell.status]}`}>
                {cell.odds.toFixed(1)}x
              </span>

              {/* HUD浮层 - 仅选中时显示 */}
              {cell.id === selectedCellId && (
                <HudStrip
                  odds={cell.odds}
                  onBet={(amount) => onBet?.(cell.id, amount)}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
