// 后端 GridCell 类型定义
export interface BackendTick {
  tickId: string;
  odds: string;
  status: 'betting' | 'locked' | 'settled' | 'pending';
  expiryTime: number;
  basisPrice: string;
  priceRange: {
    min: number | null;
    max: number | null;
    label: string;
    percentMin: number;
    percentMax: number;
  };
  isWinning?: boolean;
  settlementPrice?: string;
}

// Mock 响应类型
export interface MockBetResponse {
  success: boolean;
  data: {
    symbol: string;
    currentPrice: string;
    currentTime: number;
    intervalSec: number;
    update: boolean;
    col1: BackendTick[] | null;
    col2: BackendTick[] | null;
    col3: BackendTick[] | null;
    col4: BackendTick[] | null;
  };
}
