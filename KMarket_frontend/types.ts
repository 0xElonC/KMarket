export enum Page {
  HOME = 'HOME',
  MARKETS = 'MARKETS',
  TERMINAL = 'TERMINAL',
  DASHBOARD = 'DASHBOARD'
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

// 投注单元格状态
export type BetCellStatus = 'default' | 'selected' | 'win' | 'fail' | 'dissolved';

// 投注类型：买升或买跌
export type BetType = 'high' | 'low';

// 投注单元格数据
export interface BetCell {
  id: string;
  row: number;        // 价格区间行
  col: number;        // 时间列
  label: string;      // 显示标签 (High/Low)
  odds: number;       // 赔率
  status: BetCellStatus;
  betType: BetType;   // 买升或买跌
}

// 投注网格配置
export interface BettingGridConfig {
  timeIntervals: string[];  // ['+10m', '+30m', '+1h']
  priceRanges: string[];    // ['High', 'Mid-High', 'Mid', 'Mid-Low', 'Low']
}
