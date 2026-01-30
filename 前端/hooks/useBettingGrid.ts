import { useEffect, useState } from 'react';
import { BetCell } from '../types';
import { CANDLES_PER_GRID } from '../utils/chartConfig';
import { generateBettingCells, generateNewColumn } from '../data/terminal';

interface UseBettingGridOptions {
  updateCount: number;
  initialCols: number;
  gridRowStart: number;
  gridTotalRows: number;
}

export function useBettingGrid({
  updateCount,
  initialCols,
  gridRowStart,
  gridTotalRows
}: UseBettingGridOptions) {
  const [bettingCells, setBettingCells] = useState<BetCell[]>(() =>
    generateBettingCells(initialCols, gridRowStart, gridTotalRows)
  );
  const [gridColsTotal, setGridColsTotal] = useState(initialCols);

  useEffect(() => {
    const neededCols = Math.max(
      initialCols,
      initialCols + Math.floor(updateCount / CANDLES_PER_GRID)
    );

    if (neededCols > gridColsTotal) {
      const newCells: BetCell[] = [];
      for (let col = gridColsTotal; col < neededCols; col += 1) {
        newCells.push(...generateNewColumn(col, gridRowStart, gridTotalRows));
      }
      setBettingCells(prev => [...prev, ...newCells]);
      setGridColsTotal(neededCols);
    }
  }, [updateCount, gridColsTotal, gridRowStart, gridTotalRows, initialCols]);

  return { bettingCells, setBettingCells };
}
