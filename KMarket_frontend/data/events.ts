// Event-based prediction markets data

export interface EventAsset {
  id: string;
  symbol: string;
  name: string;
  price: number; // Current prediction probability (0-100)
  change: number; // Change in probability
  color: string;
  category: 'Politics' | 'Sports' | 'Economics' | 'Esports';
  subcategory: string;
  data: number[]; // Historical probability data for mini chart
  volume: number;
  high24h: number;
  low24h: number;
  description: string;
  deadline: string; // Event deadline
}

// 🏛️ Political Events
export const politicalEvents: EventAsset[] = [
  {
    id: 'US_ELECTION_2024',
    symbol: 'US2024',
    name: '2024美国总统选举',
    price: 52.5,
    change: 2.3,
    color: '#3b82f6',
    category: 'Politics',
    subcategory: '选举',
    data: [48, 49, 50, 51.5, 52.5],
    volume: 2500000,
    high24h: 53.2,
    low24h: 50.1,
    description: '民主党候选人获胜概率',
    deadline: '2024-11-05'
  },
  {
    id: 'CONGRESS_BILL_AI',
    symbol: 'AI-REG',
    name: 'AI监管法案通过',
    price: 68.5,
    change: -1.2,
    color: '#8b5cf6',
    category: 'Politics',
    subcategory: '立法',
    data: [72, 71, 70, 69, 68.5],
    volume: 850000,
    high24h: 70.5,
    low24h: 67.8,
    description: '国会通过AI监管法案概率',
    deadline: '2024-06-30'
  },
  {
    id: 'APPROVAL_RATING_70',
    symbol: 'APPR-70',
    name: '总统支持率>70%',
    price: 15.2,
    change: 0.8,
    color: '#06b6d4',
    category: 'Politics',
    subcategory: '民调',
    data: [13, 14, 14.5, 15, 15.2],
    volume: 420000,
    high24h: 16.1,
    low24h: 14.5,
    description: '总统支持率突破70%概率',
    deadline: '2024-12-31'
  }
];

// ⚽ Sports Events
export const sportsEvents: EventAsset[] = [
  {
    id: 'NBA_FINALS_LAL',
    symbol: 'LAL-WIN',
    name: '湖人夺冠',
    price: 35.8,
    change: 5.2,
    color: '#fbbf24',
    category: 'Sports',
    subcategory: '篮球',
    data: [28, 30, 32, 34, 35.8],
    volume: 3200000,
    high24h: 37.2,
    low24h: 33.5,
    description: '湖人获得NBA总冠军概率',
    deadline: '2024-06-20'
  },
  {
    id: 'WORLD_CUP_BRA',
    symbol: 'BRA-WC',
    name: '巴西世界杯夺冠',
    price: 22.5,
    change: -0.8,
    color: '#10b981',
    category: 'Sports',
    subcategory: '足球',
    data: [24, 23.5, 23, 22.8, 22.5],
    volume: 4500000,
    high24h: 24.5,
    low24h: 21.8,
    description: '巴西获得世界杯冠军概率',
    deadline: '2026-07-19'
  },
  {
    id: 'SUPER_BOWL_KC',
    symbol: 'KC-SB',
    name: '酋长三连冠',
    price: 28.3,
    change: 1.5,
    color: '#ef4444',
    category: 'Sports',
    subcategory: '橄榄球',
    data: [25, 26, 27, 27.8, 28.3],
    volume: 2100000,
    high24h: 29.5,
    low24h: 26.2,
    description: '堪萨斯城酋长队超级碗三连冠概率',
    deadline: '2025-02-09'
  },
  {
    id: 'ESPORTS_T1_WORLDS',
    symbol: 'T1-LOL',
    name: 'T1世界赛五冠',
    price: 42.1,
    change: 3.7,
    color: '#ec4899',
    category: 'Sports',
    subcategory: '电竞',
    data: [36, 38, 40, 41, 42.1],
    volume: 1800000,
    high24h: 43.8,
    low24h: 39.5,
    description: 'T1战队获得英雄联盟世界赛冠军概率',
    deadline: '2024-11-02'
  },
  {
    id: 'F1_VER_CHAMPION',
    symbol: 'VER-F1',
    name: '维斯塔潘卫冕',
    price: 75.6,
    change: -2.1,
    color: '#f97316',
    category: 'Sports',
    subcategory: '赛车',
    data: [80, 78, 77, 76, 75.6],
    volume: 950000,
    high24h: 78.2,
    low24h: 74.5,
    description: '维斯塔潘获得F1年度总冠军概率',
    deadline: '2024-12-08'
  }
];

// 📊 Economic Events
export const economicEvents: EventAsset[] = [
  {
    id: 'FED_RATE_CUT_50',
    symbol: 'FED-50',
    name: '美联储降息50基点',
    price: 32.4,
    change: 8.5,
    color: '#14b8a6',
    category: 'Economics',
    subcategory: '货币政策',
    data: [18, 22, 26, 30, 32.4],
    volume: 5200000,
    high24h: 35.1,
    low24h: 28.9,
    description: '下次会议降息50个基点概率',
    deadline: '2024-06-12'
  },
  {
    id: 'CPI_ABOVE_3',
    symbol: 'CPI-3',
    name: 'CPI突破3%',
    price: 45.8,
    change: -3.2,
    color: '#f59e0b',
    category: 'Economics',
    subcategory: '宏观数据',
    data: [52, 50, 48, 47, 45.8],
    volume: 1900000,
    high24h: 48.5,
    low24h: 44.2,
    description: '下月CPI年率超过3%概率',
    deadline: '2024-06-15'
  },
  {
    id: 'TSLA_EARNINGS_BEAT',
    symbol: 'TSLA-ER',
    name: '特斯拉超预期',
    price: 58.2,
    change: 4.1,
    color: '#6366f1',
    category: 'Economics',
    subcategory: '公司财报',
    data: [52, 54, 56, 57, 58.2],
    volume: 2800000,
    high24h: 59.8,
    low24h: 55.3,
    description: '特斯拉Q2财报超分析师预期概率',
    deadline: '2024-07-23'
  },
  {
    id: 'RECESSION_2024',
    symbol: 'REC-24',
    name: '2024经济衰退',
    price: 28.5,
    change: -1.8,
    color: '#dc2626',
    category: 'Economics',
    subcategory: '宏观经济',
    data: [32, 31, 30, 29, 28.5],
    volume: 3500000,
    high24h: 30.2,
    low24h: 27.1,
    description: '2024年发生经济衰退概率',
    deadline: '2024-12-31'
  },
  {
    id: 'UNEMPLOYMENT_4',
    symbol: 'UNEMP-4',
    name: '失业率<4%',
    price: 62.3,
    change: 2.5,
    color: '#059669',
    category: 'Economics',
    subcategory: '就业数据',
    data: [58, 59, 60, 61, 62.3],
    volume: 1400000,
    high24h: 63.5,
    low24h: 60.8,
    description: '年末失业率低于4%概率',
    deadline: '2024-12-31'
  },
  {
    id: 'BITCOIN_ETF_APPROVAL',
    symbol: 'BTC-ETF',
    name: '比特币ETF通过',
    price: 88.7,
    change: 1.2,
    color: '#f59e0b',
    category: 'Economics',
    subcategory: '金融监管',
    data: [85, 86, 87, 88, 88.7],
    volume: 6200000,
    high24h: 90.1,
    low24h: 87.3,
    description: 'SEC批准比特币现货ETF概率',
    deadline: '2024-03-15'
  }
];

// 🎮 Esports Events
export const esportsEvents: EventAsset[] = [
  {
    id: 'CSGO_AWP_DRAGON_LORE',
    symbol: 'AWP-DL',
    name: 'AWP龙狙>$15000',
    price: 72.3,
    change: 3.8,
    color: '#fbbf24',
    category: 'Esports',
    subcategory: 'CS饰品',
    data: [68, 69, 70, 71, 72.3],
    volume: 1800000,
    high24h: 73.5,
    low24h: 70.2,
    description: 'AWP龙狙FN价格突破$15000概率',
    deadline: '2024-06-30'
  },
  {
    id: 'CSGO_KARAMBIT_FADE',
    symbol: 'KAR-FD',
    name: '卡兰比特渐变>$3000',
    price: 65.8,
    change: 2.1,
    color: '#ec4899',
    category: 'Esports',
    subcategory: 'CS饰品',
    data: [62, 63, 64, 65, 65.8],
    volume: 950000,
    high24h: 67.2,
    low24h: 64.1,
    description: 'Karambit渐变刀具价格>$3000概率',
    deadline: '2024-05-31'
  },
  {
    id: 'TI_DOTA2_CHINA',
    symbol: 'TI-CN',
    name: 'TI冠军-中国队',
    price: 45.2,
    change: 1.5,
    color: '#ef4444',
    category: 'Esports',
    subcategory: 'DOTA2',
    data: [42, 43, 44, 44.5, 45.2],
    volume: 3200000,
    high24h: 46.8,
    low24h: 43.5,
    description: 'The International中国战队夺冠概率',
    deadline: '2024-10-15'
  },
  {
    id: 'LOL_WORLDS_LPL',
    symbol: 'WCS-LPL',
    name: 'S赛冠军-LPL',
    price: 58.6,
    change: -2.3,
    color: '#8b5cf6',
    category: 'Esports',
    subcategory: 'LOL',
    data: [62, 61, 60, 59, 58.6],
    volume: 4500000,
    high24h: 61.2,
    low24h: 57.8,
    description: 'LOL全球总决赛LPL赛区夺冠概率',
    deadline: '2024-11-05'
  },
  {
    id: 'VALORANT_MASTERS_EMEA',
    symbol: 'VAL-EMEA',
    name: 'Valorant大师赛-EMEA',
    price: 38.4,
    change: 4.7,
    color: '#06b6d4',
    category: 'Esports',
    subcategory: 'Valorant',
    data: [32, 34, 35, 37, 38.4],
    volume: 1200000,
    high24h: 39.8,
    low24h: 35.2,
    description: 'Valorant大师赛EMEA战队夺冠概率',
    deadline: '2024-06-15'
  },
  {
    id: 'CSGO_MAJOR_NAVI',
    symbol: 'MAJ-NAVI',
    name: 'Major冠军-NAVI',
    price: 32.1,
    change: 1.8,
    color: '#f59e0b',
    category: 'Esports',
    subcategory: 'CS:GO赛事',
    data: [29, 30, 31, 31.5, 32.1],
    volume: 2800000,
    high24h: 33.5,
    low24h: 30.8,
    description: 'CS:GO Major锦标赛NAVI夺冠概率',
    deadline: '2024-05-12'
  }
];

// Combined export
export const allEventAssets: EventAsset[] = [
  ...politicalEvents,
  ...sportsEvents,
  ...economicEvents,
  ...esportsEvents
];
