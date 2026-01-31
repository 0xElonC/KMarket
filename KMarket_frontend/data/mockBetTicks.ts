// 后端数据类型定义
export interface BackendTick {
  tickId: string;
  odds: string;
  status: string;  // "pending" | "settled"
  expiryTime: number;
  basisPrice: string;
  priceRange: {
    min: number | null;
    max: number | null;
    label: string;
    percentMin: number;
    percentMax: number;
  };
}

export interface BackendResponse {
  success: boolean;
  data: {
    symbol: string;
    currentPrice: string;
    currentTime: number;
    intervalSec: number;
    update: boolean;  // true = 新增1列
    col1: BackendTick[] | null;  // 最接近结算的列（可能为空）
    col2: BackendTick[] | null;
    col3: BackendTick[] | null;
    col4: BackendTick[] | null;  // 最新生成的列
  };
}

const PRICE_RANGES = [
  { percentMin: 2, percentMax: 100, label: '+2%↑' },
  { percentMin: 1, percentMax: 2, label: '+1%~+2%' },
  { percentMin: 0, percentMax: 1, label: '0~+1%' },
  { percentMin: -1, percentMax: 0, label: '-1%~0' },
  { percentMin: -2, percentMax: -1, label: '-2%~-1%' },
  { percentMin: -100, percentMax: -2, label: '-2%↓' },
];

// Mock 状态管理 - 滑动窗口，从空开始逐渐填充
let mockState = {
  lastUpdateTime: 0,
  nextColumnIndex: 0,
  // 当前窗口的列数据（最多4列，从0列开始逐渐增加）
  windowColumns: [] as BackendTick[][],
  initialized: false,
};

function generateColumn(columnIndex: number, basisPrice: number): BackendTick[] {
  const expiryTime = Date.now() + 12000;

  return PRICE_RANGES.map((range, rowIndex) => ({
    tickId: `col_${columnIndex}_row_${rowIndex}`,
    odds: (1.5 + Math.random() * 2).toFixed(2),
    status: 'pending',
    expiryTime,
    basisPrice: String(basisPrice),
    priceRange: {
      min: range.percentMin === -100 ? null : basisPrice * (1 + range.percentMin / 100),
      max: range.percentMax === 100 ? null : basisPrice * (1 + range.percentMax / 100),
      label: range.label,
      percentMin: range.percentMin,
      percentMax: range.percentMax,
    },
  }));
}

export function generateMockResponse(): BackendResponse {
  const basePrice = 2700;
  const now = Date.now();
  const intervalMs = 3000; // 每3秒产生新列

  // 首次调用：初始化时间，但不生成任何列
  if (!mockState.initialized) {
    mockState.initialized = true;
    mockState.lastUpdateTime = now;
    // 返回空数据，update: false
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

  // 检查是否需要新增一列
  const shouldUpdate = now - mockState.lastUpdateTime >= intervalMs;

  if (shouldUpdate) {
    mockState.lastUpdateTime = now;

    // 窗口未满4列时：直接新增
    // 窗口已满4列时：移除最老的，新增一列
    if (mockState.windowColumns.length >= 4) {
      mockState.windowColumns.shift();
    }
    mockState.windowColumns.push(generateColumn(mockState.nextColumnIndex++, basePrice));
  }

  // 返回当前窗口（右对齐到 col4）
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

// 重置 mock 状态（用于测试）
export function resetMockState() {
  mockState = {
    lastUpdateTime: 0,
    nextColumnIndex: 0,
    windowColumns: [],
    initialized: false,
  };
}
