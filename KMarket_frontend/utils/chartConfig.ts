import { CandleData } from '../types';

// Shared chart/grid config
export const CANDLES_PER_GRID = 6;
export const DEFAULT_VISIBLE_COLS = 9;
export const NOW_LINE_RATIO = 0.4;
export const LOCK_LINE_RATIO = 0.67;

// K项目风格配置 - 流动价格曲线
export const FLOW_CONFIG = {
  SPEED: 12,              // 格子移动速度 px/s（K项目风格：恒定速度）
  PRICE_RANGE: 5,         // Y轴价格范围 ±5%
  CENTER_LINE_RATIO: 0.4, // 中心价格线位置（屏幕40%）
  PRICE_SMOOTH: 0.1,      // 价格平滑缓动因子
  BASE_PRICE_SMOOTH: 0.0005, // 基准价格跟随因子
  LINE_GLOW_COLOR: 'rgba(0,212,255,0.6)', // 价格线发光颜色
  LINE_COLOR: '#00d4ff',  // 价格线颜色
  LINE_WIDTH: 3,          // 价格线宽度
  GLOW_BLUR: 15,          // 发光模糊半径
  HEAD_GLOW_COLOR: '#00ff88', // 头部发光点颜色
  HEAD_GLOW_BLUR: 25,     // 头部发光模糊
  HEAD_RADIUS: 6,         // 头部圆点半径
};

// Price-domain calculation params (fixed height + centered)
const PRICE_WINDOW = 40;
export const EMA_PERIOD = 10;
const ATR_PERIOD = 14;
const ATR_MULTIPLIER = 6;
const MIN_RANGE_PCT = 0.01;
const RANGE_PADDING_PCT = 0.1;

export function computePriceDomain(data: CandleData[]) {
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
