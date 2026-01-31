import { useEffect, useState, useRef, useCallback } from 'react';
import { BetCell, BetType } from '../types';
import { BackendTick } from './useBetTicks';
import { CANDLES_PER_GRID } from '../utils/chartConfig';

interface UseBettingGridOptions {
  visibleRows: number;
  visibleCols: number;
  updateCount: number;
  newColumn?: BackendTick[] | null;
  maxColumns?: number; // 最大保留列数，防止内存泄漏
}

// 将后端 Tick 转换为前端 BetCell
const mapTickToCell = (
  tick: BackendTick,
  rowIndex: number,
  colIndex: number,
  halfVisible: number
): BetCell => {
  const betType: BetType = rowIndex < halfVisible ? 'high' : 'low';
  const status = tick.status === 'settled' ? 'dissolved' : 'default';

  return {
    id: `${rowIndex}-${colIndex}`,
    row: rowIndex,
    col: colIndex,
    label: tick.priceRange.label,
    odds: parseFloat(tick.odds),
    status,
    betType,
    tickId: tick.tickId,
    expiryTime: tick.expiryTime,
    basisPrice: parseFloat(tick.basisPrice),
    priceRange: tick.priceRange,
  };
};

export function useBettingGrid({
  visibleRows,
  visibleCols = 9,
  updateCount = 0,
  newColumn = null,
  maxColumns = 20, // 默认最多保留 20 列
}: UseBettingGridOptions) {
  const [bettingCells, setBettingCells] = useState<BetCell[]>([]);
  const knownExpiryTimesRef = useRef<Set<number>>(new Set());
  const nextColRef = useRef<number>(-1);

  // 清理旧列，保留最近的 maxColumns 列
  const cleanupOldCells = useCallback((cells: BetCell[], currentCol: number): BetCell[] => {
    const minCol = currentCol - maxColumns;
    if (minCol <= 0) return cells;

    // 过滤掉太旧的列（但保留有活跃投注的格子）
    return cells.filter(cell =>
      cell.col > minCol || cell.status === 'selected'
    );
  }, [maxColumns]);

  useEffect(() => {
    if (!newColumn || newColumn.length === 0) return;

    const expiryTime = newColumn[0]?.expiryTime;
    if (!expiryTime || knownExpiryTimesRef.current.has(expiryTime)) return;

    knownExpiryTimesRef.current.add(expiryTime);

    // 清理过期的 expiryTime 记录（保留最近 maxColumns 个）
    if (knownExpiryTimesRef.current.size > maxColumns) {
      const times = Array.from(knownExpiryTimesRef.current).sort((a, b) => a - b);
      const toRemove = times.slice(0, times.length - maxColumns);
      toRemove.forEach(t => knownExpiryTimesRef.current.delete(t));
    }

    const scrolledCols = updateCount / CANDLES_PER_GRID;
    const viewportRightEdge = scrolledCols + visibleCols;

    let colIndex: number;
    if (nextColRef.current < 0) {
      colIndex = Math.ceil(viewportRightEdge);
    } else {
      colIndex = Math.max(nextColRef.current, Math.ceil(viewportRightEdge));
    }
    nextColRef.current = colIndex + 1;

    const halfVisible = Math.floor(visibleRows / 2);
    const newCells = newColumn.map((tick, rowIndex) =>
      mapTickToCell(tick, rowIndex, colIndex, halfVisible)
    );

    setBettingCells(prev => {
      const updated = [...prev, ...newCells];
      return cleanupOldCells(updated, colIndex);
    });
  }, [newColumn, visibleRows, visibleCols, updateCount, cleanupOldCells]);

  return { bettingCells, setBettingCells };
}
