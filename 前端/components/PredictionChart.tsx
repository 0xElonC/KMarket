import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CandleData, BetCell } from '../types';
import {
  CANDLES_PER_GRID,
  DEFAULT_VISIBLE_COLS,
  NOW_LINE_RATIO,
  LOCK_LINE_RATIO
} from '../utils/chartConfig';
import { PredictionHeader } from './prediction/PredictionHeader';
import { BettingCellsLayer } from './prediction/BettingCellsLayer';
import { useChartPan } from './prediction/useChartPan';
import { useCandleCanvas } from './prediction/useCandleCanvas';

const DEFAULT_BET_AMOUNT = 20;

interface PredictionChartProps {
  candleData: CandleData[];
  bettingCells: BetCell[];
  onBet?: (cellId: string, amount: number) => void;
  onPanChange?: (offset: number) => void;
  gridRows?: number;
  bufferRows?: number;
  visibleCols?: number;
  timeIntervals?: string[];
  updateCount?: number;
}

export function PredictionChart({
  candleData,
  bettingCells,
  onBet,
  onPanChange,
  gridRows = 5,
  bufferRows = 0,
  visibleCols = DEFAULT_VISIBLE_COLS,
  timeIntervals = ['+10m', '+30m', '+1h'],
  updateCount = 0
}: PredictionChartProps) {
  const chartViewportRef = useRef<HTMLDivElement | null>(null);
  const candleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const headerLeftCols = Math.round(visibleCols * 2 / 3);
  const headerRightCols = Math.max(1, visibleCols - headerLeftCols);

  const maxCellCol = useMemo(() => {
    if (!bettingCells.length) return visibleCols - 1;
    let maxCol = visibleCols - 1;
    bettingCells.forEach((cell) => {
      if (cell.col > maxCol) maxCol = cell.col;
    });
    return maxCol;
  }, [bettingCells, visibleCols]);
  const scrollTotalCols = useMemo(
    () => Math.max(visibleCols, maxCellCol + 1),
    [visibleCols, maxCellCol]
  );
  const lockLineRatio = LOCK_LINE_RATIO;

  // 格子宽度基于可见列数计算
  const gridWidthPx = viewportSize.width > 0 ? viewportSize.width / visibleCols : 0;
  const rowHeightPx = viewportSize.height > 0 ? viewportSize.height / gridRows : 0;
  // 滚动容器宽度 = 格子宽度 * 格子总列数
  const scrollWidthPx = gridWidthPx * scrollTotalCols;
  const candleStepPx = gridWidthPx / CANDLES_PER_GRID;
  const scrollOffsetPx = candleStepPx * updateCount;
  const scrollOffsetPercent = (updateCount / CANDLES_PER_GRID) * (100 / scrollTotalCols);
  const usePx = gridWidthPx > 0;
  const lockLineX = viewportSize.width * lockLineRatio;
  const lockLinePercent = lockLineRatio * 100;

  useEffect(() => {
    const element = chartViewportRef.current;
    if (!element) return;

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      setViewportSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    };

    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateSize);
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const { panOffset, panOffsetPx, baseMinPrice, priceRange, labelMaxPrice } = useChartPan({
    chartViewportRef,
    candleData,
    gridRows,
    bufferRows,
    viewportHeight: viewportSize.height
  });

  useEffect(() => {
    onPanChange?.(panOffset);
  }, [panOffset, onPanChange]);

  useCandleCanvas({
    candleCanvasRef,
    candleData,
    gridWidthPx,
    scrollOffsetPx,
    scrollWidthPx,
    viewportWidth: viewportSize.width,
    viewportHeight: viewportSize.height,
    baseMinPrice,
    priceRange
  });

  // Y轴标签
  const yLabels = useMemo(
    () =>
      Array.from({ length: gridRows + 1 }, (_, i) => {
        const price = labelMaxPrice - (i * priceRange / gridRows);
        return price < 1 ? price.toFixed(4) : price.toLocaleString();
      }),
    [gridRows, labelMaxPrice, priceRange]
  );

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* 头部 */}
      <PredictionHeader
        gridColsLeft={headerLeftCols}
        gridColsRight={headerRightCols}
        totalCols={visibleCols}
        timeIntervals={timeIntervals}
      />

      {/* 主体区域 */}
      <div ref={chartViewportRef} className="flex-1 relative overflow-hidden">
        {/* 滚动容器 - 网格背景、预测单元格、K线蜡烛在这里同步滚动 */}
        <div
          className="absolute h-full"
          style={{
            top: 0,
            left: 0,
            width: usePx ? `${scrollWidthPx}px` : `${(scrollTotalCols * 100) / visibleCols}%`,
            transform: usePx ? `translateX(-${scrollOffsetPx}px)` : `translateX(-${scrollOffsetPercent}%)`,
            transition: 'transform 0.3s ease-out'
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              transform: usePx ? `translateY(${panOffsetPx}px)` : undefined
            }}
          >
            {/* 网格背景 */}
            <div
              className="absolute inset-0 z-0 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
                backgroundSize: usePx && rowHeightPx > 0
                  ? `${gridWidthPx}px ${rowHeightPx}px`
                  : `calc(100% / ${scrollTotalCols}) calc(100% / ${gridRows})`
              }}
            />

            {/* 预测网格单元格 - z-10 */}
          <BettingCellsLayer
            cells={bettingCells}
            gridRows={gridRows}
            totalCols={scrollTotalCols}
            gridWidthPx={gridWidthPx}
            rowHeightPx={rowHeightPx}
            scrollOffsetPx={scrollOffsetPx}
            scrollOffsetPercent={scrollOffsetPercent}
            lockLineX={lockLineX}
            lockLinePercent={lockLinePercent}
            defaultBetAmount={DEFAULT_BET_AMOUNT}
            onBet={onBet}
          />
          </div>
        </div>

        {/* K线蜡烛 - Canvas 覆盖层 */}
        <div
          className="absolute h-full pointer-events-none"
          style={{
            top: 0,
            left: 0,
            zIndex: 25,
            width: usePx ? `${scrollWidthPx}px` : `${(scrollTotalCols * 100) / visibleCols}%`,
            transform: usePx ? `translateX(-${scrollOffsetPx}px)` : `translateX(-${scrollOffsetPercent}%)`,
            transition: 'transform 0.3s ease-out'
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              transform: usePx ? `translateY(${panOffsetPx}px)` : undefined
            }}
          >
            <canvas
              ref={candleCanvasRef}
              className="absolute inset-0 pointer-events-none"
            />
          </div>
        </div>

        {/* NOW 分界线 - 1/3处 */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-blue-500/50 z-30 shadow-[0_0_10px_#3B82F6]"
          style={{ left: `${NOW_LINE_RATIO * 100}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
            NOW
          </div>
        </div>

        {/* +3分钟线 - 2/3处 */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-amber-500/50 z-30 shadow-[0_0_10px_#F59E0B]"
          style={{ left: `${LOCK_LINE_RATIO * 100}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
            +3m
          </div>
        </div>

        {/* Y轴标签 - 固定位置 */}
        <div className="absolute left-1 top-0 bottom-0 flex flex-col justify-between py-1 text-[9px] font-mono text-gray-500 select-none pointer-events-none z-40">
          {yLabels.map((label, i) => (
            <span key={i} className="bg-[#10151e]/80 px-0.5">{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
