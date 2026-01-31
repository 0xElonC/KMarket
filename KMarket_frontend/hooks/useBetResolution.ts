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
  odds?: number;
  betAmount?: number;
  entryPrice?: number;
  rangeLabel?: string;
}

// 结算结果回调参数
export interface SettlementResult {
  cellId: string;
  betType: BetType;
  result: 'win' | 'loss';
  entryPrice: number;
  settlementPrice: number;
  odds: number;
  betAmount: number;
  rangeLabel: string;
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
  onSettlement?: (result: SettlementResult) => void;
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
  onSettlement,
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
    const settlementResults: SettlementResult[] = [];

    betsToJudge.forEach(bet => {
      const cellTopPrice = effectiveMax - bet.row * rowValue;
      const cellBottomPrice = effectiveMax - (bet.row + 1) * rowValue;

      // 结算逻辑：
      // 买升(high/绿色)：蓝点价格 > 格子底部价格线 = 赢
      // 买跌(low/红色)：蓝点价格 < 格子顶部价格线 = 赢
      let isWin: boolean;
      if (bet.betType === 'high') {
        // 买升：价格需要在格子底部线上方
        isWin = price > cellBottomPrice;
      } else {
        // 买跌：价格需要在格子顶部线下方
        isWin = price < cellTopPrice;
      }

      console.log('📊 结算判定', {
        cellId: bet.cellId,
        betType: bet.betType,
        isWin,
        将设置状态: isWin ? 'win' : 'fail',
      });

      statusById.set(bet.cellId, isWin ? 'win' : 'fail');

      // 构建结算结果
      const result: SettlementResult = {
        cellId: bet.cellId,
        betType: bet.betType,
        result: isWin ? 'win' : 'loss',
        entryPrice: bet.entryPrice ?? 0,
        settlementPrice: price,
        odds: bet.odds ?? 1.5,
        betAmount: bet.betAmount ?? 50,
        rangeLabel: bet.rangeLabel ?? (bet.betType === 'high' ? 'High' : 'Low'),
      };
      settlementResults.push(result);

      console.log(isWin ? '🎉 赢了！' : '💔 输了', {
        cellId: bet.cellId,
        betType: bet.betType,
        currentPrice: price.toFixed(2),
        cellPriceRange: `${cellBottomPrice.toFixed(2)} - ${cellTopPrice.toFixed(2)}`,
        判定: bet.betType === 'high'
          ? `价格 ${price.toFixed(2)} ${isWin ? '>' : '<='} 底部线 ${cellBottomPrice.toFixed(2)}`
          : `价格 ${price.toFixed(2)} ${isWin ? '<' : '>='} 顶部线 ${cellTopPrice.toFixed(2)}`
      });
    });

    // 触发结算回调
    if (onSettlement) {
      settlementResults.forEach(result => onSettlement(result));
    }

    setBettingCells(prev => {
      console.log('📝 更新格子状态', {
        statusById: Array.from(statusById.entries()),
        将更新的格子: prev.filter(cell => statusById.has(cell.id)).map(c => ({ id: c.id, currentStatus: c.status })),
      });
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
