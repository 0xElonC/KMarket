import { Injectable } from '@nestjs/common';

/**
 * 网格配置
 */
export interface GridConfig {
  rows: number;
  cols: number;
  cellWidth: number;
  cellHeight: number;
  scrollSpeed: number;
  priceRange: number;
  minBetDistance: number;
  intervalMs: number;
}

/**
 * 下注配置
 */
export interface BetConfig {
  minAmount: string;
  maxAmount: string;
  currency: string;
  decimals: number;
}

/**
 * 赔率配置
 */
export interface OddsConfig {
  baseMin: number;
  baseMax: number;
  timeFactor: number;
}

/**
 * 完整市场配置
 */
export interface MarketConfig {
  symbol: string;
  grid: GridConfig;
  bet: BetConfig;
  odds: OddsConfig;
}

@Injectable()
export class MarketConfigService {
  private configs: Map<string, MarketConfig> = new Map();

  constructor() {
    // 默认 ETH_USDT 配置
    this.configs.set('ETH_USDT', {
      symbol: 'ETH_USDT',
      grid: {
        rows: 40,
        cols: 40,
        cellWidth: 65,
        cellHeight: 36,
        scrollSpeed: 30,
        priceRange: 0.25,
        minBetDistance: 5,
        intervalMs: 1000,
      },
      bet: {
        minAmount: '10000000',
        maxAmount: '1000000000',
        currency: 'USDC',
        decimals: 6,
      },
      odds: {
        baseMin: 1.2,
        baseMax: 3.0,
        timeFactor: 0.03,
      },
    });
  }

  getConfig(symbol: string): MarketConfig | null {
    return this.configs.get(symbol) || null;
  }

  getAllSymbols(): string[] {
    return Array.from(this.configs.keys());
  }
}
