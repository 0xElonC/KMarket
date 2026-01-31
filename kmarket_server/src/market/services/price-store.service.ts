import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import Redis from 'ioredis';

export interface PriceData {
    symbol: string;
    price: string;
    timestamp: number;
}

export interface KLineData {
    symbol: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
    timestamp: number;
    interval: string; // '1s'
}

@Injectable()
export class PriceStoreService implements OnModuleInit {
    private readonly logger = new Logger(PriceStoreService.name);
    private redis: Redis | null = null;
    private redisAvailable = false;

    // In-memory cache for ultra-fast access
    private currentPrices: Map<string, PriceData> = new Map();
    // In-memory K-line history fallback
    private klineHistory: Map<string, KLineData> = new Map();

    constructor(private readonly configService: ConfigService) { }

    onModuleInit() {
        this.initializeRedis();
    }

    private initializeRedis() {
        const redisHost = this.configService.get<string>('REDIS_HOST');
        const redisPort = this.configService.get<number>('REDIS_PORT', 6379);

        if (redisHost) {
            try {
                this.redis = new Redis({
                    host: redisHost,
                    port: redisPort,
                    maxRetriesPerRequest: 3,
                    retryStrategy: (times) => {
                        if (times > 3) {
                            this.logger.warn('Redis connection failed, using in-memory only');
                            this.redisAvailable = false;
                            return null;
                        }
                        return Math.min(times * 100, 1000);
                    },
                    lazyConnect: true,
                });

                this.redis.connect()
                    .then(() => {
                        this.redisAvailable = true;
                        this.logger.log(`Redis connected for PriceStore: ${redisHost}:${redisPort}`);
                    })
                    .catch((err) => {
                        this.logger.warn(`Redis connection failed: ${err.message}, using in-memory only`);
                        this.redisAvailable = false;
                        this.redis = null;
                    });
            } catch (err) {
                this.logger.warn('Redis initialization failed, using in-memory only');
                this.redisAvailable = false;
                this.redis = null;
            }
        } else {
            this.logger.warn('Redis not configured, using in-memory only');
        }
    }

    /**
     * Handle real-time price updates from BinanceService
     */
    @OnEvent('market.price.updated')
    async handlePriceUpdate(data: PriceData) {
        // 1. Update In-Memory
        this.currentPrices.set(data.symbol, data);

        // 2. Update Redis (Current Price) - TTL 10s
        if (this.redis && this.redisAvailable) {
            try {
                const key = `price:${data.symbol}:current`;
                await this.redis.set(key, JSON.stringify(data), 'EX', 10);
            } catch (err) {
                this.redisAvailable = false;
            }
        }
    }

    /**
     * Handle closed K-line for history storage
     */
    @OnEvent('market.kline.closed')
    async handleKlineClosed(data: { symbol: string; kline: any; timestamp: number }) {
        const klineData: KLineData = {
            symbol: data.symbol,
            open: data.kline.o,
            high: data.kline.h,
            low: data.kline.l,
            close: data.kline.c,
            volume: data.kline.v,
            timestamp: data.timestamp,
            interval: '1s'
        };

        // Always store in memory
        const memKey = `${data.symbol}:${data.timestamp}`;
        this.klineHistory.set(memKey, klineData);

        // Limit memory usage (keep last 3600 entries per symbol)
        if (this.klineHistory.size > 10000) {
            const firstKey = this.klineHistory.keys().next().value;
            if (firstKey) this.klineHistory.delete(firstKey);
        }

        // Try Redis if available
        if (this.redis && this.redisAvailable) {
            try {
                const key = `kline:${data.symbol}:1s`;
                const field = data.timestamp.toString();
                await this.redis.hset(key, field, JSON.stringify(klineData));
                this.redis.expire(key, 3600);
            } catch (err) {
                this.redisAvailable = false;
            }
        }
    }

    getCurrentPrice(symbol: string): PriceData | null {
        return this.currentPrices.get(symbol) ?? null;
    }

    async getPriceFromRedis(symbol: string): Promise<PriceData | null> {
        if (!this.redis || !this.redisAvailable) return null;
        try {
            const data = await this.redis.get(`price:${symbol}:current`);
            return data ? JSON.parse(data) : null;
        } catch (err) {
            this.redisAvailable = false;
            return null;
        }
    }

    /**
     * Get K-line history (with in-memory fallback)
     */
    async getKLineHistory(symbol: string, start: number, end: number): Promise<KLineData[]> {
        // Try Redis first
        if (this.redis && this.redisAvailable) {
            try {
                const allData = await this.redis.hgetall(`kline:${symbol}:1s`);
                const result: KLineData[] = [];

                for (const [ts, val] of Object.entries(allData)) {
                    const timestamp = parseInt(ts);
                    if (timestamp >= start && timestamp <= end) {
                        result.push(JSON.parse(val));
                    }
                }

                return result.sort((a, b) => a.timestamp - b.timestamp);
            } catch (err) {
                this.redisAvailable = false;
            }
        }

        // Fallback to in-memory
        const result: KLineData[] = [];
        for (const [key, kline] of this.klineHistory) {
            if (kline.symbol === symbol && kline.timestamp >= start && kline.timestamp <= end) {
                result.push(kline);
            }
        }
        return result.sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * Get specific K-line for settlement (with in-memory fallback)
     */
    async getKlineAt(symbol: string, timestamp: number): Promise<KLineData | null> {
        // Try Redis first
        if (this.redis && this.redisAvailable) {
            try {
                const data = await this.redis.hget(`kline:${symbol}:1s`, timestamp.toString());
                if (data) return JSON.parse(data);
            } catch (err) {
                this.redisAvailable = false;
            }
        }

        // Fallback to in-memory
        const memKey = `${symbol}:${timestamp}`;
        return this.klineHistory.get(memKey) ?? null;
    }
}
