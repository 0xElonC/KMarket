import React, { useEffect, useRef } from 'react';
import { BetCell, BetType, CandleData } from '../types';
import { computePriceDomain, FLOW_CONFIG } from '../utils/chartConfig';

interface ActiveBet {
  cellId: string;
  row: number;
  col: number;
  betUpdateCount: number;
  targetUpdateCount: number;
  betType: BetType;  // 买升或买跌
}

interface UseBetResolutionOptions {
  chartData: CandleData[];
  currentPrice?: number | null; // K项目风格：实时价格
  basePrice?: number | null;    // K项目风格：基准价格
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
  currentPrice,
  basePrice,
  updateCount,
  activeBets,
  setActiveBets,
  setBettingCells,
  gridRows,
  gridRowStart,
  gridTotalRows
}: UseBetResolutionOptions) {
  // 使用 ref 追踪已处理的下注，避免重复处理
  const processedBetsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (activeBets.length === 0) return;

    // K项目风格：优先使用实时价格
    const price = currentPrice ?? (chartData.length > 0 ? chartData[chartData.length - 1].close : null);
    if (price === null) return;

    const betsToJudge = activeBets.filter(
      bet => updateCount >= bet.targetUpdateCount && !processedBetsRef.current.has(bet.cellId)
    );
    if (betsToJudge.length === 0) return;

    // K项目风格：基于 basePrice ± PRICE_RANGE 计算价格范围
    let effectiveMax: number;
    let effectiveMin: number;
    let rowValue: number;

    if (basePrice !== null && basePrice !== undefined) {
      // K项目风格价格范围
      const range = basePrice * (FLOW_CONFIG.PRICE_RANGE / 100) * 2;
      effectiveMax = basePrice + range / 2;
      effectiveMin = basePrice - range / 2;
      rowValue = range / gridRows;
    } else {
      // 降级到原有的 candleData 计算方式
      const priceDomain = computePriceDomain(chartData);
      const baseRange = priceDomain.max - priceDomain.min || 1;
      effectiveMax = priceDomain.max;
      effectiveMin = priceDomain.min;
      rowValue = baseRange / gridRows;
    }

    // 标记为已处理
    betsToJudge.forEach(bet => {
      processedBetsRef.current.add(bet.cellId);
    });

    // 构建状态映射
    // K项目风格判定规则：
    // - 价格在格子的价格区间内 = 赢
    // - 价格不在区间内 = 输
    const statusById = new Map<string, 'win' | 'fail'>();
    betsToJudge.forEach(bet => {
      // 计算格子的价格边界
      // row 越小价格越高
      const cellTopPrice = effectiveMax - (bet.row - gridRowStart) * rowValue;
      const cellBottomPrice = effectiveMax - (bet.row - gridRowStart + 1) * rowValue;

      let isWin: boolean;
      if (bet.betType === 'high') {
        // 买升：当前价格 > 格子底部价格 = 赢
        isWin = price > cellBottomPrice;
      } else {
        // 买跌：当前价格 < 格子顶部价格 = 赢
        isWin = price < cellTopPrice;
      }

      statusById.set(bet.cellId, isWin ? 'win' : 'fail');

      // K项目风格：输出结算日志
      console.log(isWin ? '🎉 赢了！' : '💔 输了', {
        cellId: bet.cellId,
        betType: bet.betType,
        currentPrice: price.toFixed(2),
        cellPriceRange: `${cellBottomPrice.toFixed(2)} - ${cellTopPrice.toFixed(2)}`
      });
    });

    // 使用函数式更新，确保基于最新状态
    setBettingCells(prev => {
      const next = prev.map(cell => {
        const nextStatus = statusById.get(cell.id);
        if (!nextStatus) return cell;
        // 只更新还未结算的格子
        if (cell.status === 'win' || cell.status === 'fail') return cell;
        return { ...cell, status: nextStatus };
      });
      return next;
    });

    // 移除已结算的下注
    setActiveBets(prev => prev.filter(bet => !statusById.has(bet.cellId)));
  }, [
    activeBets,
    chartData,
    currentPrice,
    basePrice,
    gridRowStart,
    gridRows,
    gridTotalRows,
    setActiveBets,
    setBettingCells,
    updateCount
  ]);

  // 清理已处理的下注记录（当下注被移除时）
  useEffect(() => {
    const activeIds = new Set(activeBets.map(bet => bet.cellId));
    processedBetsRef.current.forEach(id => {
      if (!activeIds.has(id)) {
        // 延迟清理，确保动画完成
        setTimeout(() => {
          processedBetsRef.current.delete(id);
        }, 2000);
      }
    });
  }, [activeBets]);
}
