export enum Page {
  HOME = 'HOME',
  MARKETS = 'MARKETS',
  TERMINAL = 'TERMINAL',
  DASHBOARD = 'DASHBOARD',
  HOW_IT_WORKS = 'HOW_IT_WORKS'
}

export type Language = 'CN' | 'EN';

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  color: string;
  icon: string;
}

export interface Bet {
  id: string;
  event: string;
  selection: string;
  stake: number;
  return: number;
  status: 'LIVE' | 'WON' | 'LOST' | 'HELD';
  date: string;
  league: string;
}

// K线数据接口 - 供同伴对接
export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// 实时价格点 - K项目风格的流动价格曲线数据
export interface PricePoint {
  time: number;    // 时间戳 (ms)
  price: number;   // 实时价格
}

// 投注单元格状态
// K项目风格: idle(可下注) -> active(已下注) -> won/lost(结算)
export type BetCellStatus = 'default' | 'selected' | 'win' | 'fail' | 'dissolved' | 'idle' | 'active' | 'won' | 'lost';

// 投注类型：买升或买跌
export type BetType = 'high' | 'low';

// 投注单元格数据
export interface BetCell {
  id: string;
  row: number;        // 价格区间行
  col: number;        // 时间列
  label: string;      // 显示标签 (High/Low 或后端 priceRange.label)
  odds: number;       // 赔率
  status: BetCellStatus;
  betType: BetType;   // 买升或买跌
  // K项目风格新增字段
  x?: number;         // 格子当前X坐标 (px)
  priceHigh?: number; // 格子对应的价格上限
  priceLow?: number;  // 格子对应的价格下限
  betTime?: number;   // 下注时间戳
  // 后端数据字段
  tickId?: string;
  expiryTime?: number;
  basisPrice?: number;
  priceRange?: {
    min: number | null;
    max: number | null;
    label: string;
    percentMin: number;
    percentMax: number;
  };
}

// 投注网格配置
export interface BettingGridConfig {
  timeIntervals: string[];  // ['+10m', '+30m', '+1h']
  priceRanges: string[];    // ['High', 'Mid-High', 'Mid', 'Mid-Low', 'Low']
}
