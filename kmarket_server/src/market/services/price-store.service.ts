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

    // In-memory cache for ultra-fast access
    private currentPrices: Map<string, PriceData> = new Map();

    constructor(private readonly configService: ConfigService) { }

    onModuleInit() {
        this.initializeRedis();
    }

    private initializeRedis() {
        const redisHost = this.configService.get<string>('REDIS_HOST');
        const redisPort = this.configService.get<number>('REDIS_PORT', 6379);

        if (redisHost) {
            this.redis = new Redis({
                host: redisHost,
                port: redisPort,
                // password: ...
            });
            this.logger.log(`Redis connected for PriceStore: ${redisHost}:${redisPort}`);
        } else {
            this.logger.warn('Redis not configured, using in-memory only (History will be lost on restart)');
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
        if (this.redis) {
            const key = `price:${data.symbol}:current`;
            await this.redis.set(key, JSON.stringify(data), 'EX', 10);
        }
    }

    /**
     * Handle closed K-line for history storage
     */
    @OnEvent('market.kline.closed')
    async handleKlineClosed(data: { symbol: string; kline: any; timestamp: number }) {
        if (!this.redis) return;

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

        const key = `kline:${data.symbol}:1s`;
        const field = data.timestamp.toString();

        // Use HSET to store historical klines
        await this.redis.hset(key, field, JSON.stringify(klineData));

        // Optional: Set expiry for the hash key itself is tricky because HSET doesn't support field expiry.
        // We typically rely on a scheduled job to clean up old fields or just let it grow if memory permits (1s kline for 24h is ~86400 entries, manageable).
        // Or we can use separate keys per kline if we want TTL per second, but that spams keyspace.
        // For now, let's keep it simple.
        this.redis.expire(key, 3600); // Reset expiry to 1h on every update, so it keeps rolling window? No, that clears whole hash.
        // Correct approach for rolling window in Redis Hash is manual cleanup or ZSET.
        // Let's use ZSET for time-series if we need range queries, or just rely on HASH for direct lookup.
        // For MVP, just storing is fine, we manually clean up or set a long TTL for the whole key (e.g. 24h) and accept it gets cleared fully if inactive.
    }

    getCurrentPrice(symbol: string): PriceData | null {
        return this.currentPrices.get(symbol) ?? null;
    }

    async getPriceFromRedis(symbol: string): Promise<PriceData | null> {
        if (!this.redis) return null;
        const data = await this.redis.get(`price:${symbol}:current`);
        return data ? JSON.parse(data) : null;
    }

    /**
     * Get K-line history (MVP: from Redis Hash)
     */
    async getKLineHistory(symbol: string, start: number, end: number): Promise<KLineData[]> {
        if (!this.redis) return [];

        // Hash scan is inefficient for range queries. 
        // If we strictly need range queries (e.g. chart), ZSET or TS.ADD (RedisTimeSeries) is better.
        // But for "Settlement Check", we usually need "Get specific timestamp".

        // For getKline API (charting), fetching all fields is okay if list is small.
        const allData = await this.redis.hgetall(`kline:${symbol}:1s`);
        const result: KLineData[] = [];

        for (const [ts, val] of Object.entries(allData)) {
            const timestamp = parseInt(ts);
            if (timestamp >= start && timestamp <= end) {
                result.push(JSON.parse(val));
            }
        }

        return result.sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * Get specific K-line for settlement
     */
    async getKlineAt(symbol: string, timestamp: number): Promise<KLineData | null> {
        if (!this.redis) return null;

        const data = await this.redis.hget(`kline:${symbol}:1s`, timestamp.toString());
        return data ? JSON.parse(data) : null;
    }
}
