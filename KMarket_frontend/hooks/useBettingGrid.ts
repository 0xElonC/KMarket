import { useEffect, useState, useRef } from 'react';
import { BetCell, BetType } from '../types';
import { BackendTick } from './useBetTicks';
import { CANDLES_PER_GRID } from '../utils/chartConfig';

interface UseBettingGridOptions {
  visibleRows: number;
  visibleCols: number;
  updateCount: number;
  newColumn?: BackendTick[] | null;
  demoMode?: boolean; // Demo mode: auto-generate cells
  basePrice?: number | null; // Base price for demo mode
}

// Default odds for demo mode (symmetric around center)
const DEMO_ODDS = [2.85, 2.10, 1.55, 1.55, 2.10, 2.85];
const DEMO_LABELS = ['+2%↑', '+1%~+2%', '0~+1%', '-1%~0', '-2%~-1%', '-2%↓'];

export function useBettingGrid({
  visibleRows,
  visibleCols = 9,
  updateCount = 0,
  newColumn = null,
  demoMode = false,
  basePrice = null,
}: UseBettingGridOptions) {
  const [bettingCells, setBettingCells] = useState<BetCell[]>([]);
  // 使用 expiryTime 去重 (后端每列有唯一的 expiryTime)
  const knownExpiryTimesRef = useRef<Set<number>>(new Set());
  // 递增的列索引，确保每次新增的列位置连续
  const nextColRef = useRef<number>(-1);
  // Demo mode: track generated columns
  const demoColsRef = useRef<Set<number>>(new Set());
  const lastUpdateCountRef = useRef<number>(-1);

  // Demo mode: auto-generate cells
  useEffect(() => {
    if (!demoMode) return;

    // Calculate current scroll position in columns
    const scrolledCols = updateCount / CANDLES_PER_GRID;
    const viewportRightEdge = Math.ceil(scrolledCols + visibleCols);
    
    // Generate cells for columns that are visible or about to be visible
    const startCol = Math.max(0, Math.floor(scrolledCols) - 1);
    const endCol = viewportRightEdge + 2; // Buffer for smooth scrolling

    const newCells: BetCell[] = [];
    const halfVisible = Math.floor(visibleRows / 2);

    for (let col = startCol; col <= endCol; col++) {
      if (demoColsRef.current.has(col)) continue;
      demoColsRef.current.add(col);

      for (let row = 0; row < visibleRows; row++) {
        const betType: BetType = row < halfVisible ? 'high' : 'low';
        const odds = DEMO_ODDS[row] || 1.5;
        const label = DEMO_LABELS[row] || `Row ${row}`;

        newCells.push({
          id: `${row}-${col}`,
          row,
          col,
          label,
          odds,
          status: 'default',
          betType,
        });
      }
    }

    if (newCells.length > 0) {
      setBettingCells(prev => [...prev, ...newCells]);
    }

    // Clean up old cells that are far behind the viewport
    const cleanupThreshold = Math.floor(scrolledCols) - 5;
    if (cleanupThreshold > 0 && lastUpdateCountRef.current !== Math.floor(updateCount)) {
      lastUpdateCountRef.current = Math.floor(updateCount);
      setBettingCells(prev => prev.filter(cell => cell.col >= cleanupThreshold));
      // Also clean up the tracking set
      demoColsRef.current.forEach(col => {
        if (col < cleanupThreshold) {
          demoColsRef.current.delete(col);
        }
      });
    }
  }, [demoMode, updateCount, visibleRows, visibleCols]);

  // Backend mode: use newColumn data
  useEffect(() => {
    if (demoMode) return; // Skip in demo mode
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
  }, [demoMode, newColumn, visibleRows, visibleCols, updateCount]);

  return { bettingCells, setBettingCells };
}
