import { BackendTick, MockBetResponse } from '../types/betting';

// 价格区间：2887.5 到 2612.5，平均分 6 格
const PRICE_HIGH = 2887.5;
const PRICE_LOW = 2612.5;
const PRICE_STEP = (PRICE_HIGH - PRICE_LOW) / 6; // 45.8333...

const PRICE_RANGES = [
  { min: PRICE_HIGH - PRICE_STEP * 0, max: PRICE_HIGH - PRICE_STEP * 1, label: '2887.5~2841.7' },
  { min: PRICE_HIGH - PRICE_STEP * 1, max: PRICE_HIGH - PRICE_STEP * 2, label: '2841.7~2795.8' },
  { min: PRICE_HIGH - PRICE_STEP * 2, max: PRICE_HIGH - PRICE_STEP * 3, label: '2795.8~2750.0' },
  { min: PRICE_HIGH - PRICE_STEP * 3, max: PRICE_HIGH - PRICE_STEP * 4, label: '2750.0~2704.2' },
  { min: PRICE_HIGH - PRICE_STEP * 4, max: PRICE_HIGH - PRICE_STEP * 5, label: '2704.2~2658.3' },
  { min: PRICE_HIGH - PRICE_STEP * 5, max: PRICE_HIGH - PRICE_STEP * 6, label: '2658.3~2612.5' },
];

// Mock 状态管理 - 滑动窗口
let mockState = {
  lastUpdateTime: 0,
  nextColumnIndex: 0,
  windowColumns: [] as BackendTick[][],
  initialized: false,
};

// 根据行索引计算赔率：中间低，两端高，范围 1.1x~1.4x
function calculateOdds(rowIndex: number, totalRows: number): number {
  const center = (totalRows - 1) / 2; // 中心位置 (6行时为2.5)
  const distanceFromCenter = Math.abs(rowIndex - center); // 距离中心的距离
  const maxDistance = center; // 最大距离

  // 归一化距离 [0, 1]，0=中心，1=边缘
  const normalizedDistance = distanceFromCenter / maxDistance;

  // 基础赔率范围：1.1 (10%) 到 1.4 (40%)
  const minOdds = 1.1;
  const maxOdds = 1.4;

  // 基础赔率：中心最低，边缘最高
  const baseOdds = minOdds + (maxOdds - minOdds) * normalizedDistance;

  // 添加随机波动 ±0.05，但不超出范围
  const randomVariation = (Math.random() - 0.5) * 0.1;
  const finalOdds = Math.max(minOdds, Math.min(maxOdds, baseOdds + randomVariation));

  return finalOdds;
}

function generateColumn(columnIndex: number, basisPrice: number): BackendTick[] {
  const expiryTime = Date.now() + 12000;
  const totalRows = PRICE_RANGES.length;

  return PRICE_RANGES.map((range, rowIndex) => ({
    tickId: `col_${columnIndex}_row_${rowIndex}`,
    odds: calculateOdds(rowIndex, totalRows).toFixed(2),
    status: 'pending' as const,
    expiryTime,
    basisPrice: String(basisPrice),
    priceRange: {
      min: range.max,
      max: range.min,
      label: range.label,
      percentMin: ((range.max - basisPrice) / basisPrice) * 100,
      percentMax: ((range.min - basisPrice) / basisPrice) * 100,
    },
  }));
}

export function generateMockResponse(): MockBetResponse {
  const basePrice = 2700;
  const now = Date.now();
  const intervalMs = 3000;

  if (!mockState.initialized) {
    mockState.initialized = true;
    mockState.lastUpdateTime = now;
    return {
      success: true,
      data: {
        symbol: 'ETHUSDT',
        currentPrice: String(basePrice + (Math.random() - 0.5) * 20),
        currentTime: now,
        intervalSec: 3,
        update: false,
        col1: null,
        col2: null,
        col3: null,
        col4: null,
      },
    };
  }

  const shouldUpdate = now - mockState.lastUpdateTime >= intervalMs;

  if (shouldUpdate) {
    mockState.lastUpdateTime = now;
    if (mockState.windowColumns.length >= 4) {
      mockState.windowColumns.shift();
    }
    mockState.windowColumns.push(generateColumn(mockState.nextColumnIndex++, basePrice));
  }

  const cols = mockState.windowColumns;
  const len = cols.length;

  return {
    success: true,
    data: {
      symbol: 'ETHUSDT',
      currentPrice: String(basePrice + (Math.random() - 0.5) * 20),
      currentTime: now,
      intervalSec: 3,
      update: shouldUpdate,
      col1: len >= 4 ? cols[0] : null,
      col2: len >= 3 ? cols[len >= 4 ? 1 : 0] : null,
      col3: len >= 2 ? cols[len >= 4 ? 2 : len >= 3 ? 1 : 0] : null,
      col4: len >= 1 ? cols[len - 1] : null,
    },
  };
}

export function resetMockState() {
  mockState = {
    lastUpdateTime: 0,
    nextColumnIndex: 0,
    windowColumns: [],
    initialized: false,
  };
}
