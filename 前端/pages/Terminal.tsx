import React, { useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { PredictionChart } from '../components/PredictionChart';
import { HistoryPanel } from '../components/terminal/HistoryPanel';
import { ChartToolbar } from '../components/terminal/ChartToolbar';
import {
  historyItems
} from '../data/terminal';
import { useTerminalState } from '../hooks/useTerminalState';


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

  const {
    activeSymbol,
    activeTimeframe,
    setActiveTimeframe,
    betAmount,
    setBetAmount,
    setPanOffset,
    chartData,
    updateCount,
    bettingCells,
    handleBet,
    isForex,
    lastCandle
  } = useTerminalState({
    selectedAsset,
    gridRows: GRID_ROWS,
    gridRowStart: GRID_ROW_START,
    gridTotalRows: GRID_TOTAL_ROWS,
    initialCols: INITIAL_GRID_COLS,
    visibleCols: VISIBLE_COLS
  });
  const rangeLabels = useMemo<Record<string, string>>(
    () => ({
      high: t.terminal.rangeHigh,
      midHigh: t.terminal.rangeMidHigh,
      mid: t.terminal.rangeMid,
      midLow: t.terminal.rangeMidLow,
      low: t.terminal.rangeLow
    }),
    [t]
  );
  const historyLabels = useMemo(
    () => ({
      title: t.terminal.history,
      window: t.terminal.historyWindow,
      entry: t.terminal.historyEntry,
      win: t.terminal.historyWin,
      loss: t.terminal.historyLoss,
      live: t.terminal.historyLive
    }),
    [t]
  );
  const toolbarLabels = useMemo(
    () => ({ betAmount: t.terminal.betAmount }),
    [t]
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full pb-0">
      <div className="flex-1 neu-out terminal-shell p-1 rounded-3xl relative flex flex-col h-full min-h-0 overflow-hidden outline-none">
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 h-full">
      <HistoryPanel items={historyItems} rangeLabels={rangeLabels} labels={historyLabels} />

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
              labels={toolbarLabels}
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
