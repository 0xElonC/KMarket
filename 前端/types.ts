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

// 投注单元格数据
export interface BetCell {
  id: string;
  row: number;        // 价格区间行 (0=High, 4=Low)
  col: number;        // 时间列 (0=+10m, 1=+30m, 2=+1h)
  label: string;      // 显示标签 (High/Mid-High/Mid/Mid-Low/Low)
  odds: number;       // 赔率
  status: BetCellStatus;
}

// 投注网格配置
export interface BettingGridConfig {
  timeIntervals: string[];  // ['+10m', '+30m', '+1h']
  priceRanges: string[];    // ['High', 'Mid-High', 'Mid', 'Mid-Low', 'Low']
}
