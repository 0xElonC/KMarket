import React from 'react';
import { BetCell } from '../../types';

// 单元格样式
const cellStyles: Record<string, string> = {
  default: 'bet-cell-base',
  selected: 'bet-cell-base bet-cell-selected',
  win: 'bet-cell-base bet-cell-win pulse-gold',
  fail: 'bet-cell-base bet-cell-fail',
  dissolved: 'bet-cell-base bet-cell-dissolved'
};

const labelColors: Record<string, string> = {
  default: 'text-gray-600 group-hover:text-gray-400',
  selected: 'text-blue-400',
  win: 'text-yellow-500',
  fail: 'text-red-400 opacity-80',
  dissolved: 'text-gray-600'
};

const oddsColors: Record<string, string> = {
  default: 'text-gray-500 text-glow-hover',
  selected: 'text-white font-bold drop-shadow-md',
  win: 'text-white font-bold drop-shadow-md',
  fail: 'text-red-300',
  dissolved: 'text-gray-500'
};

interface BettingCellsLayerProps {
  cells: BetCell[];
  gridRows: number;
  totalCols: number;
  gridWidthPx?: number;
  rowHeightPx?: number;
  scrollOffsetPx?: number;
  scrollOffsetPercent?: number;
  lockLineX?: number;
  lockLinePercent?: number;
  defaultBetAmount: number;
  onBet?: (cellId: string, amount: number) => void;
}

export function BettingCellsLayer({
  cells,
  gridRows,
  totalCols,
  gridWidthPx,
  rowHeightPx,
  scrollOffsetPx = 0,
  scrollOffsetPercent = 0,
  lockLineX = 0,
  lockLinePercent = 0,
  defaultBetAmount,
  onBet
}: BettingCellsLayerProps) {
  const usePx = (gridWidthPx ?? 0) > 0;
  const gridWidthPercent = 100 / totalCols;
  const cellHeightPercent = 100 / gridRows;

  return (
    <div className="absolute inset-0 z-10">
      {cells.map((cell) => {
        // 单元格位置：从左边缘开始（覆盖整个区域）
        const left = usePx
          ? cell.col * (gridWidthPx ?? 0)
          : cell.col * gridWidthPercent;
        const top = usePx && (rowHeightPx ?? 0) > 0
          ? cell.row * (rowHeightPx ?? 0)
          : cell.row * cellHeightPercent;
        const cellLeftInView = usePx
          ? (left as number) - scrollOffsetPx
          : (left as number) - scrollOffsetPercent;
        const isLocked = usePx ? cellLeftInView <= lockLineX : cellLeftInView <= lockLinePercent;
        const effectiveStatus = cell.status;
        const shouldHideInfo = isLocked && cell.status === 'default';
        // 所有进入开奖区域的格子都应该置灰（除了已经判定为win/fail的）
        const shouldGray = isLocked && (cell.status === 'default' || cell.status === 'selected');

        return (
          <div
            key={cell.id}
            className={`${cellStyles[effectiveStatus]} group ${shouldGray ? 'opacity-50 pointer-events-none' : 'cursor-pointer'} absolute`}
            style={{
              left: usePx ? left : `${left}%`,
              top: usePx && (rowHeightPx ?? 0) > 0 ? top : `${top}%`,
              width: usePx ? (gridWidthPx ?? 0) : `${gridWidthPercent}%`,
              height: usePx && (rowHeightPx ?? 0) > 0 ? (rowHeightPx ?? 0) : `${cellHeightPercent}%`
            }}
            onDoubleClick={() => {
              if (cell.status === 'dissolved' || isLocked) return;
              onBet?.(cell.id, defaultBetAmount);
            }}
          >
            {cell.status === 'win' && (
              <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-[8px] font-extrabold px-1 rounded-full shadow-lg z-30 animate-bounce">+USDC</div>
            )}
            {!shouldHideInfo && (
              <>
                <span className={`text-[9px] font-bold uppercase ${labelColors[effectiveStatus]}`}>
                  {cell.status === 'selected' ? 'Active' : cell.status === 'win' ? 'Win!' : cell.status === 'fail' ? 'Missed' : cell.label}
                </span>
                <span className={`text-[10px] font-mono mt-1 ${oddsColors[effectiveStatus]}`}>{cell.odds.toFixed(1)}x</span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
