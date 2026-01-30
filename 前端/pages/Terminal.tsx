import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { PredictionChart } from '../components/PredictionChart';
import { BetCell } from '../types';
import { CANDLES_PER_GRID, NOW_LINE_RATIO } from '../utils/chartConfig';
import { HistoryPanel } from '../components/terminal/HistoryPanel';
import { ChartToolbar } from '../components/terminal/ChartToolbar';
import { useBettingGrid } from '../hooks/useBettingGrid';
import { useMockCandles } from '../hooks/useMockCandles';
import { useBetResolution } from '../hooks/useBetResolution';
import { useBinanceCandles } from '../hooks/useBinanceCandles';
import {
  cryptoAssets,
  forexAssets,
  historyItems,
} from '../data/terminal';


const GRID_ROWS = 5;
const GRID_BUFFER_ROWS = 10;
const GRID_ROW_START = -GRID_BUFFER_ROWS;
const GRID_TOTAL_ROWS = GRID_ROWS + GRID_BUFFER_ROWS * 2;
const VISIBLE_COLS = 9;
const GRID_BUFFER_COLS = 3;
const INITIAL_GRID_COLS = VISIBLE_COLS + GRID_BUFFER_COLS;

export default function Terminal({
  requestConfirm,
  selectedAsset
}: {
  requestConfirm: () => void;
  selectedAsset?: { symbol: string; name: string; price: number; change: number } | null;
}) {
  const { t } = useLanguage();

  // State for interactivity
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
  const [mockUpdateCount, setMockUpdateCount] = useState(0); // K线更新计数，驱动网格滚动
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
    initialCols: INITIAL_GRID_COLS,
    gridRowStart: GRID_ROW_START,
    gridTotalRows: GRID_TOTAL_ROWS
  });
  // 记录活跃的下注，用于自动判定
  const [activeBets, setActiveBets] = useState<Array<{
    cellId: string;
    row: number;
    col: number;
    betUpdateCount: number;
    targetUpdateCount: number;
  }>>([]);

  // Effect: 动态更新K线 - 每2秒生成新K线，模拟实时走势
  useEffect(() => {
    if (isLiveReady) return;
    const interval = setInterval(() => {
      // 递增更新计数，驱动网格滚动
      setMockUpdateCount(prev => prev + 1);
    }, 2000);

    return () => clearInterval(interval);
  }, [activeSymbol, isLiveReady]);

  // Effect: 自动新增预测网格列逻辑已抽离到 useBettingGrid

  // Effect: 自动判定下注结果
  useBetResolution({
    chartData,
    updateCount,
    activeBets,
    setActiveBets,
    setBettingCells,
    gridRows: GRID_ROWS,
    gridRowStart: GRID_ROW_START,
    gridTotalRows: GRID_TOTAL_ROWS
  });

  const lastCandle = chartData.length > 0 ? chartData[chartData.length - 1] : { close: 0 };
  const isForex = forexAssets.some((asset) => asset.symbol === activeSymbol.symbol);
  const rangeLabels: Record<string, string> = {
    high: t.terminal.rangeHigh,
    midHigh: t.terminal.rangeMidHigh,
    mid: t.terminal.rangeMid,
    midLow: t.terminal.rangeMidLow,
    low: t.terminal.rangeLow
  };

  // 下注处理 - 供同伴对接
  const handleBet = (cellId: string, amount: number) => {
    // 解析cellId获取row和col（支持负数行）
    const match = cellId.match(/^(-?\d+)-(-?\d+)$/);
    if (!match) return;
    const row = Number(match[1]);
    const col = Number(match[2]);

    // 计算到达NOW线需要的updateCount
    // NOW线在1/3处，且网格会随updateCount向左移动
    const nowLineCol = VISIBLE_COLS * NOW_LINE_RATIO;
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

    // 记录下注信息
    setActiveBets(prev => [...prev, {
      cellId,
      row,
      col,
      betUpdateCount: updateCount,
      targetUpdateCount
    }]);

    // 更新格子状态为selected
    setBettingCells(prev => prev.map(cell => {
      if (cell.id !== cellId) return cell;
      if (cell.status !== 'default') return cell;
      return { ...cell, status: 'selected' };
    }));
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full pb-0">
      <div className="flex-1 neu-out p-1 rounded-3xl relative flex flex-col h-full min-h-0 overflow-hidden outline-none">
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 h-full">
      <HistoryPanel
        items={historyItems}
        rangeLabels={rangeLabels}
        labels={{
          title: t.terminal.history,
          window: t.terminal.historyWindow,
          entry: t.terminal.historyEntry,
          win: t.terminal.historyWin,
          loss: t.terminal.historyLoss,
          live: t.terminal.historyLive
        }}
      />

      {/* Main Chart Area */}
      <section className="flex-1 flex flex-col gap-4 min-w-0 h-full min-h-0">
            {/* Chart Toolbar */}
            <ChartToolbar
              activeSymbol={activeSymbol}
              lastClose={lastCandle.close ?? 0}
              isForex={isForex}
              betAmount={betAmount}
              onBetAmountChange={setBetAmount}
              activeTimeframe={activeTimeframe}
              onTimeframeChange={setActiveTimeframe}
              labels={{ betAmount: t.terminal.betAmount }}
            />
            
            {/* Chart Area with Betting Grid - 统一网格系统 */}
    <div className="flex-1 neu-in relative overflow-hidden rounded-xl border border-white/5 bg-[#10151e] m-1 min-h-0">
                <PredictionChart
                    candleData={chartData}
                    bettingCells={bettingCells}
                    onBet={handleBet}
                    gridRows={GRID_ROWS}
                    bufferRows={GRID_BUFFER_ROWS}
                    visibleCols={VISIBLE_COLS}
                    updateCount={updateCount}
                    onPanChange={setPanOffset}
                />
            </div>
      </section>
        </div>
      </div>
    </div>
  );
}
