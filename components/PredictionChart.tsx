import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CandleData, BetCell } from '../types';

// 每个网格包含的蜡烛数量
const CANDLES_PER_GRID = 6;
// 可见列数（用于计算格子宽度）
const DEFAULT_VISIBLE_COLS = 9;
const NOW_LINE_RATIO = 1 / 3;
const LOCK_LINE_RATIO = 2 / 3;
// 价格域计算参数（固定高度 + 跟随中心）
const PRICE_WINDOW = 40;
const EMA_PERIOD = 10;
const ATR_PERIOD = 14;
const ATR_MULTIPLIER = 6;
const MIN_RANGE_PCT = 0.01;
const RANGE_PADDING_PCT = 0.1;
const PAN_SENSITIVITY = 0.7;
const DEFAULT_BET_AMOUNT = 20;

function computePriceDomain(data: CandleData[]) {
  if (!data.length) {
    return { min: 0, max: 100 };
  }

  const window = data.slice(-PRICE_WINDOW);
  const lastClose = window[window.length - 1].close;

  let windowHigh = -Infinity;
  let windowLow = Infinity;
  for (const candle of window) {
    if (candle.high > windowHigh) windowHigh = candle.high;
    if (candle.low < windowLow) windowLow = candle.low;
  }
  const windowRange = Math.max(0, windowHigh - windowLow);

  const emaPeriod = Math.min(EMA_PERIOD, window.length);
  const alpha = 2 / (emaPeriod + 1);
  let ema = window[0].close;
  for (let i = 1; i < window.length; i += 1) {
    ema = alpha * window[i].close + (1 - alpha) * ema;
  }

  const atrPeriod = Math.min(ATR_PERIOD, Math.max(1, window.length - 1));
  let atr = 0;
  if (atrPeriod > 0) {
    const startIndex = Math.max(1, window.length - atrPeriod);
    let sumTR = 0;
    let count = 0;
    for (let i = startIndex; i < window.length; i += 1) {
      const current = window[i];
      const prev = window[i - 1];
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - prev.close),
        Math.abs(current.low - prev.close)
      );
      sumTR += tr;
      count += 1;
    }
    atr = count ? sumTR / count : 0;
  }

  const baseRange = Math.max(atr * ATR_MULTIPLIER, lastClose * MIN_RANGE_PCT);
  const range = Math.max(baseRange, windowRange * (1 + RANGE_PADDING_PCT));
  const halfRange = range / 2;

  let center = ema;
  if (windowRange > 0 && range >= windowRange) {
    const minCenter = windowLow + halfRange;
    const maxCenter = windowHigh - halfRange;
    if (minCenter <= maxCenter) {
      center = Math.min(Math.max(center, minCenter), maxCenter);
    } else {
      center = (windowHigh + windowLow) / 2;
    }
  }

  const min = center - halfRange;
  const max = center + halfRange;
  if (min === max) {
    return { min: min - 1, max: max + 1 };
  }
  return { min, max };
}

interface PredictionChartProps {
  candleData: CandleData[];
  bettingCells: BetCell[];
  onBet?: (cellId: string, amount: number) => void;
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
  }, [panOffset]);

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
      const priceDelta = (event.deltaY / 100) * rowValue * PAN_SENSITIVITY;
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
        ctx.strokeRect(centerX - candleWidthPx / 2, bodyTop, candleWidthPx, bodyHeight);
      } else {
        ctx.fillRect(centerX - candleWidthPx / 2, bodyTop, candleWidthPx, bodyHeight);
        ctx.strokeRect(centerX - candleWidthPx / 2, bodyTop, candleWidthPx, bodyHeight);
      }
    });
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
      <Header
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
          <BettingCells
            cells={bettingCells}
            gridRows={gridRows}
            totalCols={scrollTotalCols}
            gridWidthPx={gridWidthPx}
            rowHeightPx={rowHeightPx}
            scrollOffsetPx={scrollOffsetPx}
            scrollOffsetPercent={scrollOffsetPercent}
            lockLineX={lockLineX}
            lockLinePercent={lockLinePercent}
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

// 头部组件
function Header({
  gridColsLeft,
  gridColsRight,
  totalCols,
  timeIntervals
}: {
  gridColsLeft: number;
  gridColsRight: number;
  totalCols: number;
  timeIntervals: string[];
}) {
  return (
    <div className="h-[50px] border-b border-white/5 shrink-0 flex">
      <div className="flex items-center px-4" style={{ width: `${(gridColsLeft / totalCols) * 100}%` }}>
        <span className="text-[10px] font-bold text-gray-500 font-mono">PRICE CHART</span>
      </div>
      <div className="flex border-l border-white/5" style={{ width: `${(gridColsRight / totalCols) * 100}%` }}>
        {timeIntervals.map((interval, i) => (
          <div key={interval} className={`flex-1 flex items-center justify-center text-[10px] font-bold text-gray-500 font-mono ${i > 0 ? 'border-l border-white/5' : ''}`}>
            {interval}
          </div>
        ))}
      </div>
    </div>
  );
}


// 单元格样式
const cellStyles: Record<string, string> = {
  default: 'bet-cell-base',
  selected: 'bet-cell-base bet-cell-selected',
  win: 'bet-cell-base bet-cell-win pulse-gold',
  fail: 'bet-cell-base bet-cell-fail',
  dissolved: 'bet-cell-base bet-cell-dissolved'
};

const labelColors: Record<string, string> = {
  default: 'text-gray-600 group-hover:text-gray-400',
  selected: 'text-blue-400',
  win: 'text-yellow-500',
  fail: 'text-red-400 opacity-80',
  dissolved: 'text-gray-600'
};

const oddsColors: Record<string, string> = {
  default: 'text-gray-500 text-glow-hover',
  selected: 'text-white font-bold drop-shadow-md',
  win: 'text-white font-bold drop-shadow-md',
  fail: 'text-red-300',
  dissolved: 'text-gray-500'
};

// 投注单元格层
function BettingCells({
  cells,
  gridRows,
  totalCols,
  gridWidthPx,
  rowHeightPx,
  scrollOffsetPx = 0,
  scrollOffsetPercent = 0,
  lockLineX = 0,
  lockLinePercent = 0,
  onBet
}: {
  cells: BetCell[];
  gridRows: number;
  totalCols: number;
  gridWidthPx?: number;
  rowHeightPx?: number;
  scrollOffsetPx?: number;
  scrollOffsetPercent?: number;
  lockLineX?: number;
  lockLinePercent?: number;
  onBet?: (cellId: string, amount: number) => void;
}) {
  const usePx = (gridWidthPx ?? 0) > 0;
  const gridWidthPercent = 100 / totalCols;
  const cellHeightPercent = 100 / gridRows;

  return (
    <div className="absolute inset-0 z-10">
      {cells.map((cell) => {
        // 单元格位置：从左边缘开始（覆盖整个区域）
        const left = usePx
          ? cell.col * (gridWidthPx ?? 0)
          : cell.col * gridWidthPercent;
        const top = usePx && (rowHeightPx ?? 0) > 0
          ? cell.row * (rowHeightPx ?? 0)
          : cell.row * cellHeightPercent;
        const cellLeftInView = usePx
          ? (left as number) - scrollOffsetPx
          : (left as number) - scrollOffsetPercent;
        const isLocked = usePx ? cellLeftInView <= lockLineX : cellLeftInView <= lockLinePercent;
        const effectiveStatus = cell.status;
        const shouldHideInfo = isLocked && cell.status === 'default';

        return (
          <div
            key={cell.id}
            className={`${cellStyles[effectiveStatus]} group cursor-pointer absolute`}
            style={{
              left: usePx ? left : `${left}%`,
              top: usePx && (rowHeightPx ?? 0) > 0 ? top : `${top}%`,
              width: usePx ? (gridWidthPx ?? 0) : `${gridWidthPercent}%`,
              height: usePx && (rowHeightPx ?? 0) > 0 ? (rowHeightPx ?? 0) : `${cellHeightPercent}%`
            }}
            onDoubleClick={() => {
              if (cell.status === 'dissolved' || isLocked) return;
              onBet?.(cell.id, DEFAULT_BET_AMOUNT);
            }}
          >
            {cell.status === 'win' && (
              <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-[8px] font-extrabold px-1 rounded-full shadow-lg z-30 animate-bounce">+USDC</div>
            )}
            {!shouldHideInfo && (
              <>
                <span className={`text-[9px] font-bold uppercase ${labelColors[effectiveStatus]}`}>
                  {cell.status === 'selected' ? 'Active' : cell.status === 'win' ? 'WIN' : cell.status === 'fail' ? 'Missed' : cell.label}
                </span>
                <span className={`text-[10px] font-mono mt-1 ${oddsColors[effectiveStatus]}`}>{cell.odds.toFixed(1)}x</span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
