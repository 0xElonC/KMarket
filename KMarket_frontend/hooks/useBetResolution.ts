import React, { useEffect, useRef } from 'react';
import { BetCell, BetType, CandleData } from '../types';
import { computePriceDomain, FLOW_CONFIG } from '../utils/chartConfig';

interface ActiveBet {
  cellId: string;
  row: number;
  col: number;
  betUpdateCount: number;
  targetUpdateCount: number;
  betType: BetType;
}

interface UseBetResolutionOptions {
  chartData: CandleData[];
  currentPrice?: number | null;
  basePrice?: number | null;
  updateCount: number;
  activeBets: ActiveBet[];
  setActiveBets: React.Dispatch<React.SetStateAction<ActiveBet[]>>;
  setBettingCells: React.Dispatch<React.SetStateAction<BetCell[]>>;
  gridRows: number;
}

export function useBetResolution({
  chartData,
  currentPrice,
  basePrice,
  updateCount,
  activeBets,
  setActiveBets,
  setBettingCells,
  gridRows,
}: UseBetResolutionOptions) {
  const processedBetsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (activeBets.length === 0) return;

    const price = currentPrice ?? (chartData.length > 0 ? chartData[chartData.length - 1].close : null);
    if (price === null) return;

    const betsToJudge = activeBets.filter(
      bet => updateCount >= bet.targetUpdateCount && !processedBetsRef.current.has(bet.cellId)
    );
    if (betsToJudge.length === 0) return;

    let effectiveMax: number;
    let rowValue: number;

    if (basePrice !== null && basePrice !== undefined) {
      const range = basePrice * (FLOW_CONFIG.PRICE_RANGE / 100) * 2;
      effectiveMax = basePrice + range / 2;
      rowValue = range / gridRows;
    } else {
      const priceDomain = computePriceDomain(chartData);
      const baseRange = priceDomain.max - priceDomain.min || 1;
      effectiveMax = priceDomain.max;
      rowValue = baseRange / gridRows;
    }

    betsToJudge.forEach(bet => {
      processedBetsRef.current.add(bet.cellId);
    });

    const statusById = new Map<string, 'win' | 'fail'>();
    betsToJudge.forEach(bet => {
      const cellTopPrice = effectiveMax - bet.row * rowValue;
      const cellBottomPrice = effectiveMax - (bet.row + 1) * rowValue;

      let isWin: boolean;
      if (bet.betType === 'high') {
        isWin = price > cellBottomPrice;
      } else {
        isWin = price < cellTopPrice;
      }

      statusById.set(bet.cellId, isWin ? 'win' : 'fail');

      console.log(isWin ? '🎉 赢了！' : '💔 输了', {
        cellId: bet.cellId,
        betType: bet.betType,
        currentPrice: price.toFixed(2),
        cellPriceRange: `${cellBottomPrice.toFixed(2)} - ${cellTopPrice.toFixed(2)}`
      });
    });

    setBettingCells(prev => {
      return prev.map(cell => {
        const nextStatus = statusById.get(cell.id);
        if (!nextStatus) return cell;
        if (cell.status === 'win' || cell.status === 'fail') return cell;
        return { ...cell, status: nextStatus };
      });
    });

    setActiveBets(prev => prev.filter(bet => !statusById.has(bet.cellId)));
  }, [
    activeBets,
    chartData,
    currentPrice,
    basePrice,
    gridRows,
    setActiveBets,
    setBettingCells,
    updateCount
  ]);

  useEffect(() => {
    const activeIds = new Set(activeBets.map(bet => bet.cellId));
    processedBetsRef.current.forEach(id => {
      if (!activeIds.has(id)) {
        setTimeout(() => {
          processedBetsRef.current.delete(id);
        }, 2000);
      }
    });
  }, [activeBets]);
}
