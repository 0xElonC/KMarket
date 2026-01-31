import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CandleData, BetCell, PricePoint } from '../types';
import {
  CANDLES_PER_GRID,
  DEFAULT_VISIBLE_COLS,
  FLOW_CONFIG,
  computePriceDomain
} from '../utils/chartConfig';
import { PredictionHeader } from './prediction/PredictionHeader';
import { BettingCellsLayer } from './prediction/BettingCellsLayer';

const PAN_SENSITIVITY = 0.7;
const DEFAULT_BET_AMOUNT = 20;
const CENTER_LINE_RATIO = 0.4; // K项目风格：中心价格线（结算线）在40%位置
const LOCK_LINE_RATIO = 0.67; // 锁定线在67%位置

interface PredictionChartProps {
  candleData: CandleData[];
  priceData?: PricePoint[];  // K项目风格：实时价格点流
  currentPrice?: number | null; // 当前实时价格
  bettingCells: BetCell[];
  onBet?: (cellId: string, amount: number) => void;
  onPanChange?: (offset: number) => void;
  onCellsUpdate?: (cells: BetCell[]) => void; // 格子更新回调
  onScrollTick?: (updateCount: number) => void; // K项目风格：滚动驱动 updateCount
  gridRows?: number;
  bufferRows?: number;
  visibleCols?: number;
  timeIntervals?: string[];
  updateCount?: number;
}

export function PredictionChart({
  candleData,
  priceData = [],
  currentPrice = null,
  bettingCells,
  onBet,
  onPanChange,
  onCellsUpdate,
  onScrollTick,
  gridRows = 6,
  bufferRows = 0,
  visibleCols = DEFAULT_VISIBLE_COLS,
  timeIntervals = ['+10m', '+30m', '+1h'],
  updateCount = 0
}: PredictionChartProps) {
  const chartViewportRef = useRef<HTMLDivElement | null>(null);
  const priceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [panOffset, setPanOffset] = useState(0);
  const panOffsetRef = useRef(0);

  // K项目风格：平滑滚动偏移（与网格同步）
  const smoothScrollRef = useRef(0);
  const lastScrollUCRef = useRef(0);
  const onScrollTickRef = useRef(onScrollTick);
  onScrollTickRef.current = onScrollTick;

  // K项目风格：基于 updateCount 的价格点（与网格同步）
  interface UpdateCountPricePoint {
    updateCount: number;
    price: number;
  }
  const pricePointsRef = useRef<UpdateCountPricePoint[]>([]);

  // K项目风格：价格平滑动画状态
  const [basePrice, setBasePrice] = useState<number | null>(null);
  const [animPrice, setAnimPrice] = useState<number | null>(null);
  const basePriceRef = useRef<number | null>(null);
  const animPriceRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const animationRef = useRef<number>();

  const headerLeftCols = Math.round(visibleCols * 2 / 3);
  const headerRightCols = Math.max(1, visibleCols - headerLeftCols);

  const maxCellCol = bettingCells.length
    ? Math.max(...bettingCells.map((cell) => cell.col))
    : visibleCols - 1;
  const scrollTotalCols = Math.max(visibleCols, maxCellCol + 1);

  // 格子宽度基于可见列数计算
  const gridWidthPx = viewportSize.width > 0 ? viewportSize.width / visibleCols : 0;
  const rowHeightPx = viewportSize.height > 0 ? viewportSize.height / gridRows : 0;
  const scrollWidthPx = gridWidthPx * scrollTotalCols;
  const candleStepPx = gridWidthPx / CANDLES_PER_GRID;
  // BettingCellsLayer 使用离散偏移做锁定线判定
  const scrollOffsetPx = candleStepPx * updateCount;
  const scrollOffsetPercent = gridWidthPx > 0 ? (scrollOffsetPx / gridWidthPx) * (100 / scrollTotalCols) : 0;
  const usePx = gridWidthPx > 0;
  const lockLineX = viewportSize.width * LOCK_LINE_RATIO;
  const lockLinePercent = LOCK_LINE_RATIO * 100;
  const centerLineX = viewportSize.width * CENTER_LINE_RATIO;

  // 初始化基准价格 - Y轴中心为 2750
  useEffect(() => {
    if (basePrice === null) {
      const initialBasePrice = 2750;
      setBasePrice(initialBasePrice);
      setAnimPrice(currentPrice ?? initialBasePrice);
      basePriceRef.current = initialBasePrice;
      animPriceRef.current = currentPrice ?? initialBasePrice;
    }
  }, [currentPrice, basePrice]);

  // 价格点记录已移至 RAF 循环中，基于滚动位置派生的 updateCount

  // 更新目标价格
  useEffect(() => {
    if (currentPrice !== null && animPriceRef.current !== null) {
      // 目标价格立即更新，动画会平滑过渡
    }
  }, [currentPrice]);

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

  // 计算价格范围 - K项目风格：基于 basePrice ± PRICE_RANGE%
  const priceRange = useMemo(() => {
    if (basePrice === null) {
      // 降级到candleData计算
      const domain = computePriceDomain(candleData);
      return { min: domain.min, max: domain.max, range: domain.max - domain.min || 1 };
    }
    const range = basePrice * (FLOW_CONFIG.PRICE_RANGE / 100) * 2;
    const min = basePrice - range / 2;
    const max = basePrice + range / 2;
    return { min, max, range };
  }, [basePrice, candleData]);

  const rowValue = priceRange.range / gridRows;
  const maxPanOffset = bufferRows > 0 ? rowValue * bufferRows : 0;
  const panOffsetPx = viewportSize.height > 0 && priceRange.range > 0
    ? (panOffset / priceRange.range) * viewportSize.height
    : 0;

  // 滚轮缩放价格范围
  useEffect(() => {
    const element = chartViewportRef.current;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      if (priceRange.range <= 0 || gridRows <= 0) return;
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
  }, [priceRange.range, gridRows, maxPanOffset, rowValue]);

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

  // K项目风格：价格到Y坐标的映射
  const priceToY = (price: number): number => {
    if (basePriceRef.current === null) return viewportSize.height / 2;
    const bp = basePriceRef.current;
    const pct = (price - bp) / bp * 100;
    const totalH = viewportSize.height;
    // 价格越高Y越小
    return totalH / 2 - (pct / FLOW_CONFIG.PRICE_RANGE) * (totalH / 2);
  };

  // K项目风格：Canvas动画循环 - 绘制发光价格曲线 + 统一平滑滚动
  useLayoutEffect(() => {
    const canvas = priceCanvasRef.current;
    if (!canvas || viewportSize.width === 0 || viewportSize.height === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = viewportSize.width;
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

    const animate = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // K项目风格：平滑价格动画
      if (currentPrice !== null && animPriceRef.current !== null) {
        animPriceRef.current += (currentPrice - animPriceRef.current) * FLOW_CONFIG.PRICE_SMOOTH;
        setAnimPrice(animPriceRef.current);
      }

      // 注意：不再更新 basePrice，保持Y坐标系固定，避免价格曲线与网格偏离

      // K项目风格：恒定速度平滑滚动
      smoothScrollRef.current += FLOW_CONFIG.SPEED * dt;
      // 直接操作 DOM，避免每帧 React 重渲染
      if (scrollContainerRef.current) {
        scrollContainerRef.current.style.transform = `translateX(-${smoothScrollRef.current}px)`;
      }

      // K项目风格：从滚动位置派生 updateCount，驱动列生成和下注判定
      if (candleStepPx > 0) {
        const derivedUC = Math.floor(smoothScrollRef.current / candleStepPx);
        if (derivedUC !== lastScrollUCRef.current) {
          lastScrollUCRef.current = derivedUC;
          onScrollTickRef.current?.(derivedUC);

          // 记录价格点
          if (currentPrice !== null) {
            pricePointsRef.current.push({ updateCount: derivedUC, price: currentPrice });
            if (pricePointsRef.current.length > 100) {
              pricePointsRef.current = pricePointsRef.current.slice(-100);
            }
          }
        }
      }

      // 绘制价格曲线（基于平滑滚动偏移，与网格完美同步）
      const pricePoints = pricePointsRef.current;
      if (pricePoints.length >= 1 && basePriceRef.current !== null && gridWidthPx > 0) {
        const centerX = width * CENTER_LINE_RATIO;
        const pts: { x: number; y: number }[] = [];

        // 每个 updateCount 对应一个 candleStep 的移动距离
        const candleStep = gridWidthPx / CANDLES_PER_GRID;

        // 使用平滑滚动偏移计算 X 坐标（与网格同步）
        const smoothUpdateCount = smoothScrollRef.current / candleStep;
        pricePoints.forEach(point => {
          const updateCountDiff = smoothUpdateCount - point.updateCount;
          const x = centerX - updateCountDiff * candleStep;
          const y = priceToY(point.price);
          if (x > -50 && x < width + 50) {
            pts.push({ x, y });
          }
        });

        // 添加当前动画价格点（在中心线位置）
        if (animPriceRef.current !== null) {
          pts.push({ x: centerX, y: priceToY(animPriceRef.current) });
        }

        if (pts.length >= 2) {
          // 发光线条
          ctx.shadowColor = FLOW_CONFIG.LINE_GLOW_COLOR;
          ctx.shadowBlur = FLOW_CONFIG.GLOW_BLUR;
          ctx.strokeStyle = FLOW_CONFIG.LINE_COLOR;
          ctx.lineWidth = FLOW_CONFIG.LINE_WIDTH;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);

          // K项目风格：二次贝塞尔曲线平滑连接
          for (let i = 1; i < pts.length; i++) {
            const p0 = pts[i - 1];
            const p1 = pts[i];
            ctx.quadraticCurveTo(p0.x, p0.y, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
          }
          ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
          ctx.stroke();

          // 头部发光点
          const last = pts[pts.length - 1];
          ctx.shadowColor = FLOW_CONFIG.HEAD_GLOW_COLOR;
          ctx.shadowBlur = FLOW_CONFIG.HEAD_GLOW_BLUR;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(last.x, last.y, FLOW_CONFIG.HEAD_RADIUS, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [currentPrice, viewportSize.width, viewportSize.height, gridWidthPx, candleStepPx]);

  // Y轴标签
  const yLabels = Array.from({ length: gridRows + 1 }, (_, i) => {
    const price = priceRange.max - (i * priceRange.range / gridRows) + panOffset;
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
        {/* 滚动容器 - 网格背景、预测单元格在这里同步滚动 */}
        <div
          ref={scrollContainerRef}
          className="absolute h-full"
          style={{
            top: 0,
            left: 0,
            width: usePx ? `${scrollWidthPx}px` : `${(scrollTotalCols * 100) / visibleCols}%`
            // K项目风格：transform 由 RAF 直接操作 DOM，无 transition
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

        {/* K项目风格：价格曲线 - Canvas 覆盖层（固定位置，不随格子滚动） */}
        <canvas
          ref={priceCanvasRef}
          className="absolute inset-0 pointer-events-none z-25"
        />

        {/* K项目风格：中心价格线（替代原NOW线） */}
        <div
          className="absolute top-0 bottom-0 w-[2px] z-30"
          style={{
            left: `${CENTER_LINE_RATIO * 100}%`,
            background: 'rgba(0,212,255,0.3)',
            boxShadow: '0 0 10px rgba(0,212,255,0.5)'
          }}
        />

        {/* 锁定线 - 75%处 */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-amber-500/50 z-30 shadow-[0_0_10px_#F59E0B]"
          style={{ left: `${LOCK_LINE_RATIO * 100}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
            LOCK
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
