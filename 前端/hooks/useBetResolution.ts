import { useEffect } from 'react';
import { BetCell, CandleData } from '../types';
import { computePriceDomain } from '../utils/chartConfig';

interface ActiveBet {
  cellId: string;
  row: number;
  col: number;
  betUpdateCount: number;
  targetUpdateCount: number;
}

interface UseBetResolutionOptions {
  chartData: CandleData[];
  updateCount: number;
  activeBets: ActiveBet[];
  setActiveBets: React.Dispatch<React.SetStateAction<ActiveBet[]>>;
  setBettingCells: React.Dispatch<React.SetStateAction<BetCell[]>>;
  gridRows: number;
  gridRowStart: number;
  gridTotalRows: number;
}

export function useBetResolution({
  chartData,
  updateCount,
  activeBets,
  setActiveBets,
  setBettingCells,
  gridRows,
  gridRowStart,
  gridTotalRows
}: UseBetResolutionOptions) {
  useEffect(() => {
    if (activeBets.length === 0 || chartData.length === 0) return;

    const betsToJudge = activeBets.filter(bet => updateCount >= bet.targetUpdateCount);
    if (betsToJudge.length === 0) return;

    const currentClose = chartData[chartData.length - 1].close;

    const priceDomain = computePriceDomain(chartData);
    const baseRange = priceDomain.max - priceDomain.min || 1;
    const effectiveMax = priceDomain.max;
    const rowValue = baseRange / gridRows;

    const currentRow = Math.floor((effectiveMax - currentClose) / rowValue);
    const minRow = gridRowStart;
    const maxRow = gridRowStart + gridTotalRows - 1;
    const clampedRow = Math.max(minRow, Math.min(currentRow, maxRow));

    const statusById = new Map<string, 'win' | 'fail'>();
    betsToJudge.forEach(bet => {
      statusById.set(bet.cellId, bet.row === clampedRow ? 'win' : 'fail');
    });

    setBettingCells(prev => {
      if (statusById.size === 0) return prev;
      let changed = false;
      const next = prev.map(cell => {
        const nextStatus = statusById.get(cell.id);
        if (!nextStatus || cell.status === nextStatus) return cell;
        changed = true;
        return { ...cell, status: nextStatus };
      });
      return changed ? next : prev;
    });

    const judgedIds = new Set(betsToJudge.map(bet => bet.cellId));
    setActiveBets(prev => prev.filter(bet => !judgedIds.has(bet.cellId)));
  }, [
    activeBets,
    chartData,
    gridRowStart,
    gridRows,
    gridTotalRows,
    setActiveBets,
    setBettingCells,
    updateCount
  ]);
}
