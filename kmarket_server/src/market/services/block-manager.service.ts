import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PriceStoreService } from './price-store.service';
import { OddsCalculatorService } from './odds-calculator.service';
import {
    GridCell,
    PriceRange,
    GridColumn,
    StoredGrid,
    ColumnGridResponseDto,
    TimeSlice,
} from '../dto/grid.dto';

/**
 * 价格区间配置 (6 行)
 */
const PRICE_ZONES = [
    { label: '+2%↑', percentMin: 2.0, percentMax: 100 },
    { label: '+1%~+2%', percentMin: 1.0, percentMax: 2.0 },
    { label: '0~+1%', percentMin: 0, percentMax: 1.0 },
    { label: '-1%~0', percentMin: -1.0, percentMax: 0 },
    { label: '-2%~-1%', percentMin: -2.0, percentMax: -1.0 },
    { label: '-2%↓', percentMin: -100, percentMax: -2.0 },
];

/**
 * 基础赔率配置 (边缘区间高，中心区间低)
 * 控制在 10% ~ 50% 收益范围 (1.1x ~ 1.5x)
 */
const BASE_ODDS = [1.45, 1.30, 1.15, 1.15, 1.30, 1.45];

/**
 * 下单时锁定的数据结构
 */
export interface LockedBetData {
    tickId: string;
    expiryTime: number;
    rowIndex: number;           // 1-6
    basisPrice: string;
    odds: string;
    priceRange: {
        min: number | null;
        max: number | null;
        percentMin: number;
        percentMax: number;
    };
    lockedAt: number;           // 锁定时间戳
}

@Injectable()
export class BlockManagerService implements OnModuleInit {
    private readonly logger = new Logger(BlockManagerService.name);

    // 配置参数
    private readonly CONFIG = {
        COLS: 6,                 // 返回给前端的列数
        ROWS: 6,                 // 6 行
        INTERVAL_SEC: 5,         // 每列间隔 5 秒
        LOCK_TIME_SEC: 30,       // 新列从生成到Lock线的时间 (与前端一致)
        LOCKED_COLS: 1,          // 最后 1 列锁定 (不可下注)
        HISTORY_COLS: 10,        // 内存中保留的历史列数 (用于下单验证)
        SYMBOL: 'ETHUSDT',
        REDIS_KEY: 'market:grid:ETHUSDT',
        REDIS_HISTORY_KEY: 'market:grid:history:ETHUSDT',
    };

    private redis: Redis | null = null;
    private redisAvailable = false;

    // 内存存储 (Redis 不可用时使用)
    private inMemoryGrid: StoredGrid | null = null;

    // 已结算记录缓存 (settlementTime -> { price, winningRow })
    private settledResults: Map<number, { price: string; winningRow: number }> = new Map();

    constructor(
        private readonly configService: ConfigService,
        private readonly priceStoreService: PriceStoreService,
        private readonly oddsCalculatorService: OddsCalculatorService,
    ) { }

    onModuleInit() {
        this.initializeRedis();
        this.logger.log('BlockManagerService initialized (6×6 grid mode with history)');
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
                            this.logger.warn('Redis connection failed, using in-memory storage');
                            this.redisAvailable = false;
                            return null; // 停止重试
                        }
                        return Math.min(times * 100, 1000);
                    },
                    lazyConnect: true,
                });

                this.redis.connect()
                    .then(() => {
                        this.redisAvailable = true;
                        this.logger.log(`Redis connected for BlockManager: ${redisHost}:${redisPort}`);
                    })
                    .catch((err) => {
                        this.logger.warn(`Redis connection failed: ${err.message}, using in-memory storage`);
                        this.redisAvailable = false;
                        this.redis = null;
                    });
            } catch (err) {
                this.logger.warn('Redis initialization failed, using in-memory storage');
                this.redisAvailable = false;
                this.redis = null;
            }
        } else {
            this.logger.warn('Redis not configured, using in-memory storage');
        }
    }

    /**
     * 列的完整生命周期 (从创建到结算):
     *   LOCK_TIME_SEC + LOCKED_COLS * INTERVAL_SEC = 30 + 5 = 35 秒
     */
    private get columnLifetimeMs(): number {
        return (this.CONFIG.LOCK_TIME_SEC + this.CONFIG.LOCKED_COLS * this.CONFIG.INTERVAL_SEC) * 1000;
    }

    /**
     * 获取 6×6 网格 (主入口)
     * 1. 从存储获取或创建网格
     * 2. 检查是否需要滑动 (每 INTERVAL_SEC 生成新列)
     * 3. 实时计算动态赔率
     */
    async getColumnGrid(): Promise<ColumnGridResponseDto> {
        const now = Date.now();
        const intervalMs = this.CONFIG.INTERVAL_SEC * 1000;
        const priceData = this.priceStoreService.getCurrentPrice(this.CONFIG.SYMBOL);
        const currentPrice = parseFloat(priceData?.price || '0');

        // 1. 获取或创建网格结构
        let storedGrid = await this.getStoredGrid();
        let updated = false;

        if (!storedGrid) {
            storedGrid = this.generateFullGrid(currentPrice, now);
            await this.saveStoredGrid(storedGrid);
            updated = true;
            this.logger.log('Generated new 6×6 grid');
        } else {
            // 每 INTERVAL_SEC 生成一列，可能需要追赶多列
            // 判断依据：最新列的 "创建时间" 距今是否超过 INTERVAL_SEC
            let slideCount = 0;
            const maxSlides = 20; // 防止无限循环

            while (slideCount < maxSlides) {
                const lastCol = storedGrid.columns[storedGrid.columns.length - 1];
                const lastCreatedAt = lastCol.expiryTime - this.columnLifetimeMs;
                const timeSinceLastCreated = now - lastCreatedAt;

                if (timeSinceLastCreated < intervalMs) break;

                storedGrid = this.slideGrid(storedGrid, currentPrice, now);
                slideCount++;
            }

            if (slideCount > 0) {
                updated = true;
                await this.saveStoredGrid(storedGrid);
                this.logger.debug(`Grid slid: added ${slideCount} new column(s)`);
            }
        }

        // 2. 构建响应 (只返回最后 6 列，实时计算赔率)
        return this.buildResponse(storedGrid, currentPrice, now, updated);
    }

    /**
     * 生成完整网格 (包含历史列)
     *
     * 最新列 (col6) 的 expiryTime = now + columnLifetimeMs
     * 每列间隔 INTERVAL_SEC，越旧的列 expiryTime 越早
     */
    private generateFullGrid(basisPrice: number, now: number): StoredGrid {
        const intervalMs = this.CONFIG.INTERVAL_SEC * 1000;
        const totalCols = this.CONFIG.COLS + this.CONFIG.HISTORY_COLS; // 16 列

        // 最新列 (index = totalCols-1) 的 expiryTime
        const newestExpiry = now + this.columnLifetimeMs;

        const columns: GridColumn[] = [];
        for (let col = 0; col < totalCols; col++) {
            // 从最新列往回推算
            const reverseIdx = totalCols - 1 - col;
            const expiryTime = newestExpiry - reverseIdx * intervalMs;

            columns.push({
                expiryTime,
                basisPrice: basisPrice.toString(),
                rows: [],
            });
        }

        return {
            symbol: this.CONFIG.SYMBOL,
            createdAt: now,
            columns,
        };
    }

    /**
     * 滑动网格: 移除最旧列，添加新列
     *
     * 关键：新列的 expiryTime 必须保证有足够的生命周期
     * - 如果按上一列 +intervalMs 计算后已经太接近过期，则基于 now 重新计算
     */
    private slideGrid(grid: StoredGrid, basisPrice: number, now: number): StoredGrid {
        const intervalMs = this.CONFIG.INTERVAL_SEC * 1000;
        const maxCols = this.CONFIG.COLS + this.CONFIG.HISTORY_COLS;

        const lastCol = grid.columns[grid.columns.length - 1];
        let newExpiryTime = lastCol.expiryTime + intervalMs;

        // 如果新列的剩余生命周期不足，基于当前时间重新计算
        // 新列应该有完整的 columnLifetimeMs 生命周期
        const minExpiryTime = now + this.columnLifetimeMs;
        if (newExpiryTime < minExpiryTime) {
            newExpiryTime = minExpiryTime;
            this.logger.debug(`Adjusted new column expiryTime to prevent early expiry`);
        }

        grid.columns.push({
            expiryTime: newExpiryTime,
            basisPrice: basisPrice.toString(),
            rows: [],
        });

        while (grid.columns.length > maxCols) {
            const removed = grid.columns.shift();
            if (removed) {
                this.archiveColumn(removed);
            }
        }

        return grid;
    }

    /**
     * 归档已滑出的列 (存入单独的 Redis key)
     */
    private async archiveColumn(column: GridColumn): Promise<void> {
        if (!this.redis) return;

        const key = `market:column:${this.CONFIG.SYMBOL}:${column.expiryTime}`;
        await this.redis.set(key, JSON.stringify(column), 'EX', 300); // 保留 5 分钟
        this.logger.debug(`Archived column: ${column.expiryTime}`);
    }

    /**
     * 获取指定 tickId 的列数据 (用于下单验证)
     */
    async getColumnByTickId(tickId: string): Promise<LockedBetData | null> {
        const [expiryTimeStr, rowIndexStr] = tickId.split('_');
        const expiryTime = parseInt(expiryTimeStr);
        const rowIndex = parseInt(rowIndexStr);

        if (isNaN(expiryTime) || isNaN(rowIndex) || rowIndex < 1 || rowIndex > this.CONFIG.ROWS) {
            return null;
        }

        // 先从当前网格查找
        const grid = await this.getStoredGrid();
        if (grid) {
            const column = grid.columns.find(c => c.expiryTime === expiryTime);
            if (column) {
                return this.buildLockedBetData(column, rowIndex, expiryTime);
            }
        }

        // 从归档的列查找
        if (this.redis) {
            const key = `market:column:${this.CONFIG.SYMBOL}:${expiryTime}`;
            const data = await this.redis.get(key);
            if (data) {
                const column: GridColumn = JSON.parse(data);
                return this.buildLockedBetData(column, rowIndex, expiryTime);
            }
        }

        return null;
    }

    /**
     * 构建下单锁定数据
     */
    private buildLockedBetData(column: GridColumn, rowIndex: number, expiryTime: number): LockedBetData {
        const zone = PRICE_ZONES[rowIndex - 1];
        const basisPrice = parseFloat(column.basisPrice);
        const now = Date.now();
        const timeToSettleSec = Math.max(0, (expiryTime - now) / 1000);
        const odds = this.calculateDynamicOdds(rowIndex - 1, timeToSettleSec);

        return {
            tickId: `${expiryTime}_${rowIndex}`,
            expiryTime,
            rowIndex,
            basisPrice: column.basisPrice,
            odds: odds.toFixed(2),
            priceRange: {
                min: zone.percentMin <= -100 ? null : basisPrice * (1 + zone.percentMin / 100),
                max: zone.percentMax >= 100 ? null : basisPrice * (1 + zone.percentMax / 100),
                percentMin: zone.percentMin,
                percentMax: zone.percentMax,
            },
            lockedAt: now,
        };
    }

    /**
     * 验证下注请求
     * @returns null 如果验证通过，否则返回错误信息
     */
    async validateBet(tickId: string): Promise<{ error: string | null; data: LockedBetData | null }> {
        const lockedData = await this.getColumnByTickId(tickId);

        if (!lockedData) {
            return { error: '无效的 tickId: 区块不存在或已过期', data: null };
        }

        const now = Date.now();

        // 检查是否还可以下注 (未到期)
        if (lockedData.expiryTime <= now) {
            return { error: '该区块已到期，无法下注', data: null };
        }

        // 检查是否在锁定期内
        const timeToSettle = (lockedData.expiryTime - now) / 1000;
        if (timeToSettle <= this.CONFIG.LOCKED_COLS * this.CONFIG.INTERVAL_SEC) {
            return { error: '该区块已锁定，无法下注', data: null };
        }

        return { error: null, data: lockedData };
    }

    /**
     * 构建 API 响应 (只返回最后 6 列)
     */
    private buildResponse(
        grid: StoredGrid,
        currentPrice: number,
        now: number,
        updated: boolean
    ): ColumnGridResponseDto {
        // 计算 Lock 时间和最新列的 expiryTime
        const lockTimeSec = this.CONFIG.LOCKED_COLS * this.CONFIG.INTERVAL_SEC;
        const latestCol = grid.columns[grid.columns.length - 1];
        const latestExpiryTime = latestCol?.expiryTime ?? 0;

        const response: ColumnGridResponseDto = {
            symbol: grid.symbol,
            currentPrice: currentPrice.toString(),
            currentTime: now,
            intervalSec: this.CONFIG.INTERVAL_SEC,
            lockTimeSec,
            latestExpiryTime,
            col1: [],
            col2: [],
            col3: [],
            col4: [],
            col5: [],
            col6: [],
            update: updated,
        };

        const colKeys = ['col1', 'col2', 'col3', 'col4', 'col5', 'col6'] as const;

        // 只取最后 6 列返回给前端
        const displayStartIdx = Math.max(0, grid.columns.length - this.CONFIG.COLS);

        for (let i = 0; i < this.CONFIG.COLS; i++) {
            const colIdx = displayStartIdx + i;
            const column = grid.columns[colIdx];

            if (!column) continue;

            const cells: GridCell[] = [];
            const isSettled = column.expiryTime <= now;
            const timeToSettleSec = Math.max(0, (column.expiryTime - now) / 1000);

            // 锁定判定: 距离结算时间 <= LOCKED_COLS * INTERVAL_SEC
            const isLocked = timeToSettleSec <= this.CONFIG.LOCKED_COLS * this.CONFIG.INTERVAL_SEC;
            const basisPrice = parseFloat(column.basisPrice);

            // 获取结算结果 (如果有)
            const settledResult = this.settledResults.get(column.expiryTime);

            for (let rowIdx = 0; rowIdx < this.CONFIG.ROWS; rowIdx++) {
                const zone = PRICE_ZONES[rowIdx];

                // 计算价格区间 (基于当前价格)
                const priceRange: PriceRange = {
                    min: zone.percentMin <= -100 ? null : currentPrice * (1 + zone.percentMin / 100),
                    max: zone.percentMax >= 100 ? null : currentPrice * (1 + zone.percentMax / 100),
                    label: zone.label,
                    percentMin: zone.percentMin,
                    percentMax: zone.percentMax,
                };

                // 计算动态赔率
                const odds = this.calculateDynamicOdds(rowIdx, timeToSettleSec);

                // 确定状态
                let status: GridCell['status'];
                if (isSettled) {
                    status = 'settled';
                } else if (isLocked) {
                    status = 'locked';
                } else {
                    status = 'betting';
                }

                const cell: GridCell = {
                    odds: odds.toFixed(2),
                    expiryTime: column.expiryTime,
                    priceRange,
                    tickId: `${column.expiryTime}_${rowIdx + 1}`,
                    status,
                    basisPrice: column.basisPrice,
                };

                // 已结算的格子添加结果
                if (isSettled && settledResult) {
                    cell.isWinning = settledResult.winningRow === rowIdx;
                    cell.settlementPrice = settledResult.price;
                }

                cells.push(cell);
            }

            response[colKeys[i]] = cells;
        }

        return response;
    }

    /**
     * 计算动态赔率
     * 控制在 10% ~ 50% 收益范围 (1.1x ~ 1.5x)
     */
    private calculateDynamicOdds(rowIdx: number, timeToSettleSec: number): number {
        const baseOdds = BASE_ODDS[rowIdx];

        // 时间因子: 越远离结算赔率略高 (最多 +5%)
        const maxTimeSec = this.columnLifetimeMs / 1000; // 35 秒
        const timeFactor = 1 + (Math.min(timeToSettleSec, maxTimeSec) / maxTimeSec) * 0.05;

        const odds = baseOdds * timeFactor;

        // 限制范围 [1.1, 1.5] (10% ~ 50% 收益)
        return Math.round(Math.max(1.1, Math.min(1.5, odds)) * 100) / 100;
    }

    /**
     * 根据价格变化判断中奖行
     */
    getWinningRow(priceChangePercent: number): number {
        if (priceChangePercent >= 2.0) return 0;
        if (priceChangePercent >= 1.0) return 1;
        if (priceChangePercent >= 0) return 2;
        if (priceChangePercent >= -1.0) return 3;
        if (priceChangePercent >= -2.0) return 4;
        return 5;
    }

    /**
     * 记录结算结果 (由 SettlementService 调用)
     */
    recordSettlement(expiryTime: number, settlementPrice: string, basisPrice: string) {
        const priceChange = (parseFloat(settlementPrice) - parseFloat(basisPrice)) / parseFloat(basisPrice) * 100;
        const winningRow = this.getWinningRow(priceChange);

        this.settledResults.set(expiryTime, {
            price: settlementPrice,
            winningRow,
        });

        // 清理太旧的记录 (保留最近 100 个)
        if (this.settledResults.size > 100) {
            const oldest = Math.min(...this.settledResults.keys());
            this.settledResults.delete(oldest);
        }

        this.logger.debug(`Settlement recorded: ${expiryTime} -> row ${winningRow} (${priceChange.toFixed(2)}%)`);
    }

    // ============ Redis 操作 (带内存回退) ============

    private async getStoredGrid(): Promise<StoredGrid | null> {
        // 优先使用 Redis
        if (this.redis && this.redisAvailable) {
            try {
                const data = await this.redis.get(this.CONFIG.REDIS_KEY);
                return data ? JSON.parse(data) : null;
            } catch (err) {
                this.logger.warn('Redis read failed, using in-memory storage');
                this.redisAvailable = false;
            }
        }
        // 回退到内存存储
        return this.inMemoryGrid;
    }

    private async saveStoredGrid(grid: StoredGrid): Promise<void> {
        // 始终保存到内存
        this.inMemoryGrid = grid;

        // 尝试保存到 Redis
        if (this.redis && this.redisAvailable) {
            try {
                await this.redis.set(this.CONFIG.REDIS_KEY, JSON.stringify(grid));
            } catch (err) {
                this.logger.warn('Redis write failed, using in-memory only');
                this.redisAvailable = false;
            }
        }
    }

    // ============ 旧接口兼容 ============

    /** @deprecated */
    getGrid(): TimeSlice[] {
        return [];
    }

    getSlice(settlementTime: number): TimeSlice | undefined {
        return undefined;
    }

    markSettled(settlementTime: number) {
        this.logger.debug(`markSettled called for ${settlementTime}`);
    }
}
