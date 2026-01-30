import { BetCell } from '../types';

export const cryptoAssets = [
  { symbol: 'BTC', name: 'Bitcoin', price: 42100, change: '+1.2%' },
  { symbol: 'ETH', name: 'Ethereum', price: 2300, change: '-0.8%' },
  { symbol: 'SOL', name: 'Solana', price: 95, change: '+4.5%' },
  { symbol: 'XRP', name: 'Ripple', price: 0.55, change: '+0.2%' },
  { symbol: 'AVAX', name: 'Avalanche', price: 35, change: '-1.5%' },
  { symbol: 'MATIC', name: 'Polygon', price: 0.85, change: '+0.5%' }
];

export const forexAssets = [
  { symbol: 'EUR', name: 'Euro', price: 1.08, change: '+0.1%' },
  { symbol: 'GBP', name: 'Pound', price: 1.26, change: '-0.2%' },
  { symbol: 'JPY', name: 'Yen', price: 0.0067, change: '-0.5%' },
  { symbol: 'AUD', name: 'Aus Dollar', price: 0.65, change: '+0.3%' }
];

export const historyItems = [
  {
    id: 'btc',
    symbol: 'BTC/USD',
    entry: '42,100',
    rangeKey: 'high',
    odds: '2.8x',
    payout: '+ $140',
    tone: 'win'
  },
  {
    id: 'eth',
    symbol: 'ETH/USD',
    entry: '2,250',
    rangeKey: 'low',
    odds: '1.9x',
    payout: '- $60',
    tone: 'loss'
  },
  {
    id: 'sol',
    symbol: 'SOL/USD',
    entry: '95.00',
    rangeKey: 'mid',
    odds: '3.2x',
    payout: '+ $220',
    tone: 'win'
  },
  {
    id: 'xrp',
    symbol: 'XRP/USD',
    entry: '0.55',
    rangeKey: 'midLow',
    odds: '2.1x',
    payout: '- $35',
    tone: 'loss'
  },
  {
    id: 'link',
    symbol: 'LINK/USD',
    entry: '14.20',
    rangeKey: 'midHigh',
    odds: '2.4x',
    payout: '+ $0',
    tone: 'live'
  },
  {
    id: 'ada',
    symbol: 'ADA/USD',
    entry: '0.47',
    rangeKey: 'mid',
    odds: '1.8x',
    payout: '+ $0',
    tone: 'live'
  },
  {
    id: 'dot',
    symbol: 'DOT/USD',
    entry: '6.10',
    rangeKey: 'low',
    odds: '2.9x',
    payout: '+ $0',
    tone: 'live'
  },
  {
    id: 'avax',
    symbol: 'AVAX/USD',
    entry: '35.00',
    rangeKey: 'midHigh',
    odds: '2.6x',
    payout: '+ $90',
    tone: 'win'
  },
  {
    id: 'matic',
    symbol: 'MATIC/USD',
    entry: '0.85',
    rangeKey: 'low',
    odds: '1.7x',
    payout: '- $22',
    tone: 'loss'
  },
  {
    id: 'eur',
    symbol: 'EUR/USD',
    entry: '1.0800',
    rangeKey: 'mid',
    odds: '1.6x',
    payout: '+ $48',
    tone: 'win'
  },
  {
    id: 'gbp',
    symbol: 'GBP/USD',
    entry: '1.2600',
    rangeKey: 'high',
    odds: '2.0x',
    payout: '+ $70',
    tone: 'win'
  }
];

// Mock投注网格数据 - 供同伴对接
export const generateBettingCells = (colCount: number = 3, rowStart: number = 0, rowCount: number = 5): BetCell[] => {
  const labels = ['High', 'Mid-High', 'Mid', 'Mid-Low', 'Low'];
  const cells: BetCell[] = [];

  for (let row = rowStart; row < rowStart + rowCount; row++) {
    for (let col = 0; col < colCount; col++) {
      const id = `${row}-${col}`;
      const labelIndex = ((row % labels.length) + labels.length) % labels.length;
      cells.push({
        id,
        row,
        col,
        label: labels[labelIndex],
        odds: 1.5 + Math.random() * 5,
        status: 'default'
      });
    }
  }
  return cells;
};

// 生成新的一列预测网格
export const generateNewColumn = (colIndex: number, rowStart: number = 0, rowCount: number = 5): BetCell[] => {
  const labels = ['High', 'Mid-High', 'Mid', 'Mid-Low', 'Low'];
  const cells: BetCell[] = [];

  for (let row = rowStart; row < rowStart + rowCount; row++) {
    const labelIndex = ((row % labels.length) + labels.length) % labels.length;
    cells.push({
      id: `${row}-${colIndex}`,
      row,
      col: colIndex,
      label: labels[labelIndex],
      odds: 1.5 + Math.random() * 5,
      status: 'default'
    });
  }
  return cells;
};
