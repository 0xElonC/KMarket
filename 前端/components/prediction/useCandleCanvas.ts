import { RefObject, useEffect } from 'react';
import { CandleData } from '../../types';
import { CANDLES_PER_GRID, EMA_PERIOD, NOW_LINE_RATIO } from '../../utils/chartConfig';

interface UseCandleCanvasOptions {
  candleCanvasRef: RefObject<HTMLCanvasElement>;
  candleData: CandleData[];
  gridWidthPx: number;
  scrollOffsetPx: number;
  scrollWidthPx: number;
  viewportWidth: number;
  viewportHeight: number;
  baseMinPrice: number;
  priceRange: number;
}

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

export function useCandleCanvas({
  candleCanvasRef,
  candleData,
  gridWidthPx,
  scrollOffsetPx,
  scrollWidthPx,
  viewportWidth,
  viewportHeight,
  baseMinPrice,
  priceRange
}: UseCandleCanvasOptions) {
  useEffect(() => {
    if (!candleCanvasRef.current || viewportWidth === 0 || viewportHeight === 0 || scrollWidthPx === 0) {
      return;
    }

    let rafId = 0;
    rafId = window.requestAnimationFrame(() => {
      const canvas = candleCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = scrollWidthPx;
      const height = viewportHeight;
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
      const nowLineX = scrollOffsetPx + viewportWidth * NOW_LINE_RATIO;
      const viewLeft = scrollOffsetPx;
      const viewRight = scrollOffsetPx + viewportWidth;

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
    });

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [
    candleData,
    gridWidthPx,
    baseMinPrice,
    priceRange,
    scrollOffsetPx,
    scrollWidthPx,
    viewportWidth,
    viewportHeight,
    candleCanvasRef
  ]);
}
