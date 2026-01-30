import { useEffect, useRef } from 'react';
import { BetCell, BetType, CandleData } from '../types';
import { computePriceDomain } from '../utils/chartConfig';

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
  // 使用 ref 追踪已处理的下注，避免重复处理
  const processedBetsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (activeBets.length === 0 || chartData.length === 0) return;

    const betsToJudge = activeBets.filter(
      bet => updateCount >= bet.targetUpdateCount && !processedBetsRef.current.has(bet.cellId)
    );
    if (betsToJudge.length === 0) return;

    const currentClose = chartData[chartData.length - 1].close;

    const priceDomain = computePriceDomain(chartData);
    const baseRange = priceDomain.max - priceDomain.min || 1;
    const effectiveMax = priceDomain.max;
    const effectiveMin = priceDomain.min;
    const rowValue = baseRange / gridRows;

    // 标记为已处理
    betsToJudge.forEach(bet => {
      processedBetsRef.current.add(bet.cellId);
    });

    // 构建状态映射
    // 判定规则：
    // - High（买升）：当前价格 > 格子底部价格 = 赢
    // - Low（买跌）：当前价格 < 格子顶部价格 = 赢
    const statusById = new Map<string, 'win' | 'fail'>();
    betsToJudge.forEach(bet => {
      // 计算格子的价格边界
      // row 越小价格越高，所以：
      // 格子顶部价格 = effectiveMax - row * rowValue
      // 格子底部价格 = effectiveMax - (row + 1) * rowValue
      const cellTopPrice = effectiveMax - (bet.row - gridRowStart) * rowValue;
      const cellBottomPrice = effectiveMax - (bet.row - gridRowStart + 1) * rowValue;

      let isWin: boolean;
      if (bet.betType === 'high') {
        // 买升：当前价格 > 格子底部价格 = 赢
        isWin = currentClose > cellBottomPrice;
      } else {
        // 买跌：当前价格 < 格子顶部价格 = 赢
        isWin = currentClose < cellTopPrice;
      }

      statusById.set(bet.cellId, isWin ? 'win' : 'fail');
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
