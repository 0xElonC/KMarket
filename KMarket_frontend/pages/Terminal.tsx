import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { PredictionChart } from '../components/PredictionChart';
import { BetCell, BetType } from '../types';
import { CANDLES_PER_GRID } from '../utils/chartConfig';
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

// K项目风格：中心价格线（结算线）在40%位置
const CENTER_LINE_RATIO = 0.4;


const GRID_ROWS = 6;
const GRID_BUFFER_ROWS = 12;
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
  const [mockUpdateCount, setMockUpdateCount] = useState(0); // K项目风格：由滚动驱动
  const [betAmount, setBetAmount] = useState(50);
  const [panOffset, setPanOffset] = useState(0);
  const [isDemoMode, setIsDemoMode] = useState(true); // 演示模式开关，默认开启
  const isEthSymbol = activeSymbol.symbol === 'ETH';

  // K项目风格：滚动驱动 updateCount（替代定时器）
  const handleScrollTick = useCallback((uc: number) => {
    setMockUpdateCount(uc);
  }, []);

  // K项目风格：获取实时价格数据流
  const {
    chartData: liveChartData,
    priceData: livePriceData,
    currentPrice: liveCurrentPrice,
    updateCount: liveUpdateCount
  } = useBinanceCandles({
    symbol: 'ETHUSDT',
    interval: '1m',
    enabled: isEthSymbol && !isDemoMode
  });

  const { chartData: mockChartData } = useMockCandles({
    basePrice: activeSymbol.price,
    updateCount: mockUpdateCount,
    enabled: !isEthSymbol || liveChartData.length === 0 || isDemoMode
  });

  const isLiveReady = isEthSymbol && liveChartData.length > 0 && !isDemoMode;
  const chartData = isLiveReady ? liveChartData : mockChartData;
  const updateCount = isLiveReady ? liveUpdateCount : mockUpdateCount;

  // DEMO 模式：currentPrice 直接取 mock K线最后一根的 close
  const mockCurrentPrice = mockChartData.length > 0
    ? mockChartData[mockChartData.length - 1].close
    : null;
  const currentPrice = isLiveReady ? liveCurrentPrice : mockCurrentPrice;
  const priceData = isLiveReady ? livePriceData : [];
  const { bettingCells, setBettingCells } = useBettingGrid({
    updateCount,
    initialCols: INITIAL_GRID_COLS,
    gridRowStart: GRID_ROW_START,
    gridTotalRows: GRID_TOTAL_ROWS,
    visibleRows: GRID_ROWS
  });
  // 记录活跃的下注，用于自动判定
  const [activeBets, setActiveBets] = useState<Array<{
    cellId: string;
    row: number;
    col: number;
    betUpdateCount: number;
    targetUpdateCount: number;
    betType: BetType;
  }>>([]);

  // K项目风格：updateCount 由 PredictionChart 的 onScrollTick 驱动，无需定时器

  // Effect: 自动新增预测网格列逻辑已抽离到 useBettingGrid

  // Effect: 自动判定下注结果 - K项目风格：使用实时价格
  useBetResolution({
    chartData,
    currentPrice,
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

  // 下注处理 - K项目风格：双击下注
  const handleBet = (cellId: string, amount: number) => {
    // 解析cellId获取row和col（支持负数行）
    const match = cellId.match(/^(-?\d+)-(-?\d+)$/);
    if (!match) return;
    const row = Number(match[1]);
    const col = Number(match[2]);

    // 找到对应的格子获取 betType
    const cell = bettingCells.find(c => c.id === cellId);
    if (!cell) return;
    const betType = cell.betType;

    // K项目风格：计算到达中心价格线需要的updateCount
    const centerLineCol = VISIBLE_COLS * CENTER_LINE_RATIO;
    const currentCenterCol = centerLineCol + updateCount / CANDLES_PER_GRID;
    const colsToCenterLine = col - currentCenterCol;
    const updateCountsToWait = Math.round(colsToCenterLine * CANDLES_PER_GRID);
    const targetUpdateCount = updateCount + updateCountsToWait;

    console.log('🎲 下注成功！', {
      cellId,
      row,
      col,
      betType,
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
      targetUpdateCount,
      betType
    }]);

    // 更新格子状态为selected (K项目风格：active)
    setBettingCells(prev => prev.map(c => {
      if (c.id !== cellId) return c;
      if (c.status !== 'default') return c;
      return { ...c, status: 'selected', betTime: Date.now() };
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
              isDemoMode={isDemoMode}
              onDemoModeChange={setIsDemoMode}
            />
            
            {/* Chart Area with Betting Grid - 统一网格系统 */}
    <div className="flex-1 neu-in relative overflow-hidden rounded-xl border border-white/5 bg-[#10151e] m-1 min-h-0">
                <PredictionChart
                    candleData={chartData}
                    priceData={priceData}
                    currentPrice={currentPrice}
                    bettingCells={bettingCells}
                    onBet={handleBet}
                    gridRows={GRID_ROWS}
                    bufferRows={GRID_BUFFER_ROWS}
                    visibleCols={VISIBLE_COLS}
                    updateCount={updateCount}
                    onPanChange={setPanOffset}
                    onScrollTick={handleScrollTick}
                />
            </div>
      </section>
        </div>
      </div>
    </div>
  );
}
