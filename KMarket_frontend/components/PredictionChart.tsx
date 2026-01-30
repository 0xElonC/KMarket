import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CandleData, BetCell } from '../types';
import {
  CANDLES_PER_GRID,
  DEFAULT_VISIBLE_COLS,
  EMA_PERIOD,
  NOW_LINE_RATIO,
  LOCK_LINE_RATIO,
  computePriceDomain
} from '../utils/chartConfig';
import { PredictionHeader } from './prediction/PredictionHeader';
import { BettingCellsLayer } from './prediction/BettingCellsLayer';

const PAN_SENSITIVITY = 0.7;
const DEFAULT_BET_AMOUNT = 20;

// 计算EMA数组
function calculateEMA(data: CandleData[], period: number): number[] {
  if (data.length === 0) return [];

  const emaValues: number[] = [];
  const alpha = 2 / (period + 1);
  let ema = data[0].close;
  emaValues.push(ema);

  for (let i = 1; i < data.length; i += 1) {
    ema = alpha * data[i].close + (1 - alpha) * ema;
    emaValues.push(ema);
  }

  return emaValues;
}

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
  const [panOffset, setPanOffset] = useState(0);
  const panOffsetRef = useRef(0);

  const headerLeftCols = Math.round(visibleCols * 2 / 3);
  const headerRightCols = Math.max(1, visibleCols - headerLeftCols);

  const maxCellCol = bettingCells.length
    ? Math.max(...bettingCells.map((cell) => cell.col))
    : visibleCols - 1;
  const scrollTotalCols = Math.max(visibleCols, maxCellCol + 1);
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

  useEffect(() => {
    panOffsetRef.current = panOffset;
    onPanChange?.(panOffset);
  }, [panOffset, onPanChange]);

  // 计算价格范围（固定高度 + 跟随中心）
  const basePriceDomain = useMemo(() => computePriceDomain(candleData), [candleData]);
  const baseRange = basePriceDomain.max - basePriceDomain.min || 1;
  const baseMinPrice = basePriceDomain.min;
  const baseMaxPrice = basePriceDomain.max;
  const labelMinPrice = baseMinPrice + panOffset;
  const labelMaxPrice = baseMaxPrice + panOffset;
  const priceRange = baseRange;
  const rowValue = baseRange / gridRows;
  const maxPanOffset = bufferRows > 0 ? rowValue * bufferRows : 0;
  const panOffsetPx = viewportSize.height > 0 && baseRange > 0
    ? (panOffset / baseRange) * viewportSize.height
    : 0;

  useEffect(() => {
    const element = chartViewportRef.current;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      if (baseRange <= 0 || gridRows <= 0) return;
      event.preventDefault();
      const priceDelta = (-event.deltaY / 100) * rowValue * PAN_SENSITIVITY;
      const nextOffset = panOffsetRef.current + priceDelta;
      const clampedOffset = maxPanOffset > 0
        ? Math.max(-maxPanOffset, Math.min(nextOffset, maxPanOffset))
        : 0;
      panOffsetRef.current = clampedOffset;
      setPanOffset(clampedOffset);
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [baseRange, gridRows, maxPanOffset, rowValue]);

  useEffect(() => {
    if (maxPanOffset <= 0) {
      if (panOffsetRef.current !== 0) {
        panOffsetRef.current = 0;
        setPanOffset(0);
      }
      return;
    }
    const clampedOffset = Math.max(-maxPanOffset, Math.min(panOffsetRef.current, maxPanOffset));
    if (clampedOffset !== panOffsetRef.current) {
      panOffsetRef.current = clampedOffset;
      setPanOffset(clampedOffset);
    }
  }, [maxPanOffset]);

  useLayoutEffect(() => {
    const canvas = candleCanvasRef.current;
    if (!canvas || viewportSize.width === 0 || viewportSize.height === 0 || scrollWidthPx === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = scrollWidthPx;
    const height = viewportSize.height;
    const dpr = window.devicePixelRatio || 1;
    const canvasWidth = Math.max(1, Math.round(width * dpr));
    const canvasHeight = Math.max(1, Math.round(height * dpr));

    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    }
    if (canvas.style.width !== `${width}px` || canvas.style.height !== `${height}px`) {
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (!candleData.length || gridWidthPx <= 0) return;

    const candleStepPx = gridWidthPx / CANDLES_PER_GRID;
    const candleWidthPx = Math.max(1, candleStepPx * 0.6);
    const nowLineX = scrollOffsetPx + viewportSize.width * NOW_LINE_RATIO;
    const viewLeft = scrollOffsetPx;
    const viewRight = scrollOffsetPx + viewportSize.width;

    const getY = (price: number) => height - ((price - baseMinPrice) / priceRange) * height;

    ctx.lineWidth = 1;

    candleData.forEach((candle, i) => {
      const distanceFromNow = candleData.length - 1 - i;
      const gridIndex = Math.floor(distanceFromNow / CANDLES_PER_GRID);
      const posInGrid = distanceFromNow % CANDLES_PER_GRID;

      const centerX = nowLineX - (gridIndex * gridWidthPx) - (posInGrid * candleStepPx) - candleStepPx / 2;
      if (centerX < viewLeft - candleWidthPx || centerX > viewRight + candleWidthPx) return;

      const isUp = candle.close >= candle.open;
      const color = isUp ? '#10B981' : '#EF4444';

      const yHigh = getY(candle.high);
      const yLow = getY(candle.low);
      const yOpen = getY(candle.open);
      const yClose = getY(candle.close);
      const bodyTop = Math.min(yOpen, yClose);
      const bodyBottom = Math.max(yOpen, yClose);
      const bodyHeight = Math.max(2, bodyBottom - bodyTop);

      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      ctx.beginPath();
      ctx.moveTo(centerX, yHigh);
      ctx.lineTo(centerX, yLow);
      ctx.stroke();

      if (isUp) {
        ctx.fillRect(centerX - candleWidthPx / 2, bodyTop, candleWidthPx, bodyHeight);
      } else {
        ctx.fillRect(centerX - candleWidthPx / 2, bodyTop, candleWidthPx, bodyHeight);
      }
    });

    // 绘制EMA线
    const emaValues = calculateEMA(candleData, EMA_PERIOD);
    if (emaValues.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;

      let firstPoint = true;
      candleData.forEach((candle, i) => {
        const distanceFromNow = candleData.length - 1 - i;
        const gridIndex = Math.floor(distanceFromNow / CANDLES_PER_GRID);
        const posInGrid = distanceFromNow % CANDLES_PER_GRID;
        const centerX = nowLineX - (gridIndex * gridWidthPx) - (posInGrid * candleStepPx) - candleStepPx / 2;

        if (centerX < viewLeft - candleWidthPx || centerX > viewRight + candleWidthPx) return;

        const yEma = getY(emaValues[i]);

        if (firstPoint) {
          ctx.moveTo(centerX, yEma);
          firstPoint = false;
        } else {
          ctx.lineTo(centerX, yEma);
        }
      });

      ctx.stroke();
    }
  }, [
    candleData,
    gridWidthPx,
    baseMinPrice,
    priceRange,
    scrollOffsetPx,
    scrollWidthPx,
    viewportSize.width,
    viewportSize.height
  ]);

  // Y轴标签
  const yLabels = Array.from({ length: gridRows + 1 }, (_, i) => {
    const price = labelMaxPrice - (i * priceRange / gridRows);
    return price < 1 ? price.toFixed(4) : price.toLocaleString();
  });

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
