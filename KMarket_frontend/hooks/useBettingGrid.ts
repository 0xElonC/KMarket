import { useEffect, useState, useRef } from 'react';
import { BetCell, BetType } from '../types';
import { BackendTick } from './useBetTicks';
import { CANDLES_PER_GRID } from '../utils/chartConfig';

interface UseBettingGridOptions {
  visibleRows: number;
  visibleCols: number;
  updateCount: number;
  newColumn?: BackendTick[] | null;
}

export function useBettingGrid({
  visibleRows,
  visibleCols = 9,
  updateCount = 0,
  newColumn = null,
}: UseBettingGridOptions) {
  const [bettingCells, setBettingCells] = useState<BetCell[]>([]);
  // 使用 expiryTime 去重 (后端每列有唯一的 expiryTime)
  const knownExpiryTimesRef = useRef<Set<number>>(new Set());
  // 递增的列索引，确保每次新增的列位置连续
  const nextColRef = useRef<number>(-1);

  useEffect(() => {
    if (!newColumn || newColumn.length === 0) return;

    // 使用 expiryTime 去重
    const expiryTime = newColumn[0]?.expiryTime;
    if (!expiryTime || knownExpiryTimesRef.current.has(expiryTime)) return;

    knownExpiryTimesRef.current.add(expiryTime);

    // 计算当前视口右边缘位置
    const scrolledCols = updateCount / CANDLES_PER_GRID;
    const viewportRightEdge = scrolledCols + visibleCols;

    // 新列位置：取 nextCol 和视口右边缘的较大值，确保在视口外且连续
    let colIndex: number;
    if (nextColRef.current < 0) {
      // 首次：在视口右边缘外 1 列
      colIndex = Math.ceil(viewportRightEdge);
    } else {
      // 后续：递增，但不小于视口右边缘
      colIndex = Math.max(nextColRef.current, Math.ceil(viewportRightEdge));
    }
    nextColRef.current = colIndex + 1;

    const halfVisible = Math.floor(visibleRows / 2);

    const newCells: BetCell[] = newColumn.map((tick, rowIndex) => {
      const betType: BetType = rowIndex < halfVisible ? 'high' : 'low';
      // 映射后端状态到前端状态
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
    });

    setBettingCells(prev => [...prev, ...newCells]);
  }, [newColumn, visibleRows, visibleCols, updateCount]);

  return { bettingCells, setBettingCells };
}
