import { RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { CandleData } from '../../types';
import { computePriceDomain } from '../../utils/chartConfig';

const PAN_SENSITIVITY = 0.7;

interface UseChartPanOptions {
  chartViewportRef: RefObject<HTMLDivElement>;
  candleData: CandleData[];
  gridRows: number;
  bufferRows: number;
  viewportHeight: number;
}

export function useChartPan({
  chartViewportRef,
  candleData,
  gridRows,
  bufferRows,
  viewportHeight
}: UseChartPanOptions) {
  const [panOffset, setPanOffset] = useState(0);
  const panOffsetRef = useRef(0);

  const basePriceDomain = useMemo(() => computePriceDomain(candleData), [candleData]);
  const baseRange = basePriceDomain.max - basePriceDomain.min || 1;
  const baseMinPrice = basePriceDomain.min;
  const baseMaxPrice = basePriceDomain.max;
  const labelMaxPrice = baseMaxPrice + panOffset;
  const priceRange = baseRange;
  const rowValue = baseRange / gridRows;
  const maxPanOffset = bufferRows > 0 ? rowValue * bufferRows : 0;
  const panOffsetPx = viewportHeight > 0 && baseRange > 0
    ? (panOffset / baseRange) * viewportHeight
    : 0;

  useEffect(() => {
    panOffsetRef.current = panOffset;
  }, [panOffset]);

  const wheelMetricsRef = useRef({
    baseRange: 0,
    rowValue: 0,
    maxPanOffset: 0,
    gridRows: 0
  });

  useEffect(() => {
    wheelMetricsRef.current = { baseRange, rowValue, maxPanOffset, gridRows };
  }, [baseRange, rowValue, maxPanOffset, gridRows]);

  useEffect(() => {
    const element = chartViewportRef.current;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      const { baseRange: nextBaseRange, rowValue: nextRowValue, maxPanOffset: nextMaxPan, gridRows: nextGridRows } =
        wheelMetricsRef.current;
      if (nextBaseRange <= 0 || nextGridRows <= 0) return;
      event.preventDefault();
      const priceDelta = (-event.deltaY / 100) * nextRowValue * PAN_SENSITIVITY;
      const nextOffset = panOffsetRef.current + priceDelta;
      const clampedOffset = nextMaxPan > 0
        ? Math.max(-nextMaxPan, Math.min(nextOffset, nextMaxPan))
        : 0;
      panOffsetRef.current = clampedOffset;
      setPanOffset(clampedOffset);
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, [chartViewportRef]);

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

  return {
    panOffset,
    panOffsetPx,
    baseMinPrice,
    priceRange,
    labelMaxPrice
  };
}
