import { useCallback, useEffect, useMemo, useState } from 'react';
import { CANDLES_PER_GRID, NOW_LINE_RATIO } from '../utils/chartConfig';
import { useBettingGrid } from './useBettingGrid';
import { useMockCandles } from './useMockCandles';
import { useBetResolution } from './useBetResolution';
import { useBinanceCandles } from './useBinanceCandles';
import { cryptoAssets, forexAssets } from '../data/terminal';

interface SelectedAsset {
  symbol: string;
  name: string;
  price: number;
  change: number;
}

interface UseTerminalStateOptions {
  selectedAsset?: SelectedAsset | null;
  gridRows: number;
  gridRowStart: number;
  gridTotalRows: number;
  initialCols: number;
  visibleCols: number;
}

export function useTerminalState({
  selectedAsset,
  gridRows,
  gridRowStart,
  gridTotalRows,
  initialCols,
  visibleCols
}: UseTerminalStateOptions) {
  const defaultSymbol = useMemo(
    () => cryptoAssets.find((asset) => asset.symbol === 'ETH') ?? cryptoAssets[0],
    []
  );
  const [activeSymbol, setActiveSymbol] = useState(defaultSymbol);
  useEffect(() => {
    if (!selectedAsset) {
      setActiveSymbol(defaultSymbol);
      return;
    }

    const matched =
      cryptoAssets.find((asset) => asset.symbol === selectedAsset.symbol) ??
      forexAssets.find((asset) => asset.symbol === selectedAsset.symbol);

    if (matched) {
      setActiveSymbol(matched);
      return;
    }

    const changeValue = Number.isFinite(selectedAsset.change) ? selectedAsset.change : 0;
    setActiveSymbol({
      symbol: selectedAsset.symbol,
      name: selectedAsset.name,
      price: selectedAsset.price,
      change: `${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(2)}%`
    });
  }, [defaultSymbol, selectedAsset]);

  const [activeTimeframe, setActiveTimeframe] = useState('1H');
  const [mockUpdateCount, setMockUpdateCount] = useState(0);
  const [betAmount, setBetAmount] = useState(50);
  const [panOffset, setPanOffset] = useState(0);

  const isEthSymbol = activeSymbol.symbol === 'ETH';
  const { chartData: liveChartData, updateCount: liveUpdateCount } = useBinanceCandles({
    symbol: 'ETHUSDT',
    interval: '1m',
    enabled: isEthSymbol
  });
  const { chartData: mockChartData } = useMockCandles({
    basePrice: activeSymbol.price,
    enabled: !isEthSymbol || liveChartData.length === 0
  });
  const isLiveReady = isEthSymbol && liveChartData.length > 0;
  const chartData = isLiveReady ? liveChartData : mockChartData;
  const updateCount = isLiveReady ? liveUpdateCount : mockUpdateCount;

  const { bettingCells, setBettingCells } = useBettingGrid({
    updateCount,
    initialCols,
    gridRowStart,
    gridTotalRows
  });
  const [activeBets, setActiveBets] = useState<Array<{
    cellId: string;
    row: number;
    col: number;
    betUpdateCount: number;
    targetUpdateCount: number;
  }>>([]);

  useEffect(() => {
    if (isLiveReady) return;
    const interval = setInterval(() => {
      setMockUpdateCount((prev) => prev + 1);
    }, 2000);

    return () => clearInterval(interval);
  }, [activeSymbol, isLiveReady]);

  useBetResolution({
    chartData,
    updateCount,
    activeBets,
    setActiveBets,
    setBettingCells,
    gridRows,
    gridRowStart,
    gridTotalRows
  });

  const handleBet = useCallback(
    (cellId: string, amount: number) => {
      const match = cellId.match(/^(-?\d+)-(-?\d+)$/);
      if (!match) return;
      const row = Number(match[1]);
      const col = Number(match[2]);

      const nowLineCol = visibleCols * NOW_LINE_RATIO;
      const currentNowCol = nowLineCol + updateCount / CANDLES_PER_GRID;
      const colsToNowLine = col - currentNowCol;
      const updateCountsToWait = Math.round(colsToNowLine * CANDLES_PER_GRID);
      const targetUpdateCount = updateCount + updateCountsToWait;

      console.log('🎲 下注成功！', {
        cellId,
        row,
        col,
        当前updateCount: updateCount,
        目标updateCount: targetUpdateCount,
        需要等待: updateCountsToWait,
        预计时间: `${updateCountsToWait * 2}秒`
      });

      setActiveBets((prev) => [
        ...prev,
        {
          cellId,
          row,
          col,
          betUpdateCount: updateCount,
          targetUpdateCount
        }
      ]);

      setBettingCells((prev) =>
        prev.map((cell) => {
          if (cell.id !== cellId) return cell;
          if (cell.status !== 'default') return cell;
          return { ...cell, status: 'selected' };
        })
      );
    },
    [updateCount, visibleCols, setBettingCells]
  );

  const lastCandle = chartData.length > 0 ? chartData[chartData.length - 1] : { close: 0 };
  const isForex = forexAssets.some((asset) => asset.symbol === activeSymbol.symbol);

  return {
    activeSymbol,
    activeTimeframe,
    setActiveTimeframe,
    betAmount,
    setBetAmount,
    panOffset,
    setPanOffset,
    chartData,
    updateCount,
    bettingCells,
    handleBet,
    isForex,
    lastCandle
  };
}
