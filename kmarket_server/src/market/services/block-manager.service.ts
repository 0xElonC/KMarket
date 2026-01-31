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
 */
const BASE_ODDS = [3.0, 2.2, 1.6, 1.6, 2.2, 3.0];

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
        INTERVAL_SEC: 3,         // 每列间隔 3 秒
        LOCKED_COLS: 2,          // 前 2 列锁定 (不可下注)
        HISTORY_COLS: 10,        // Redis 中保留的历史列数 (用于下单验证)
        SYMBOL: 'ETHUSDT',
        REDIS_KEY: 'market:grid:ETHUSDT',
        REDIS_HISTORY_KEY: 'market:grid:history:ETHUSDT',
    };

    private redis: Redis | null = null;

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
            this.redis = new Redis({
                host: redisHost,
                port: redisPort,
            });
            this.logger.log(`Redis connected for BlockManager: ${redisHost}:${redisPort}`);
        } else {
            this.logger.warn('Redis not configured, grid will be regenerated each request');
        }
    }

    /**
     * 获取 6×6 网格 (主入口)
     * 1. 从 Redis 获取或创建网格
     * 2. 检查是否需要滑动
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
            // Redis 为空，生成新网格
            storedGrid = this.generateFullGrid(currentPrice, now);
            await this.saveStoredGrid(storedGrid);
            updated = true;
            this.logger.log('Generated new 6×6 grid');
        } else {
            // 检查是否需要滑动 (基于返回给前端的第一列)
            const displayStartIdx = Math.max(0, storedGrid.columns.length - this.CONFIG.COLS);
            const firstDisplayCol = storedGrid.columns[displayStartIdx];

            if (firstDisplayCol && firstDisplayCol.expiryTime <= now) {
                // 需要滑动
                storedGrid = this.slideGrid(storedGrid, currentPrice, now);
                await this.saveStoredGrid(storedGrid);
                updated = true;
                this.logger.debug('Grid slid: added new column');
            }
        }

        // 2. 构建响应 (只返回最后 6 列，实时计算赔率)
        return this.buildResponse(storedGrid, currentPrice, now, updated);
    }

    /**
     * 生成完整网格 (包含历史列)
     */
    private generateFullGrid(basisPrice: number, now: number): StoredGrid {
        const intervalMs = this.CONFIG.INTERVAL_SEC * 1000;
        const alignedNow = Math.floor(now / intervalMs) * intervalMs;

        const columns: GridColumn[] = [];
        const totalCols = this.CONFIG.COLS + this.CONFIG.HISTORY_COLS; // 6 + 10 = 16 列

        for (let col = 0; col < totalCols; col++) {
            // 从历史开始生成
            // col 0: 最旧的历史 (T - (HISTORY_COLS + LOCKED_COLS - 1) * interval)
            // col HISTORY_COLS: 当前显示的 col1
            const colOffset = col - this.CONFIG.HISTORY_COLS - this.CONFIG.LOCKED_COLS + 1;
            const expiryTime = alignedNow + colOffset * intervalMs;

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
     * 滑动网格: 保留历史，添加新列
     */
    private slideGrid(grid: StoredGrid, basisPrice: number, now: number): StoredGrid {
        const intervalMs = this.CONFIG.INTERVAL_SEC * 1000;
        const maxCols = this.CONFIG.COLS + this.CONFIG.HISTORY_COLS;

        // 计算新列的到期时间
        const lastCol = grid.columns[grid.columns.length - 1];
        const newExpiryTime = lastCol.expiryTime + intervalMs;

        // 添加新列
        grid.columns.push({
            expiryTime: newExpiryTime,
            basisPrice: basisPrice.toString(),
            rows: [],
        });

        // 如果超过最大列数，移除最旧的历史列
        while (grid.columns.length > maxCols) {
            const removed = grid.columns.shift();
            if (removed) {
                // 将移除的列存入历史 Redis (用于结算)
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
        const response: ColumnGridResponseDto = {
            symbol: grid.symbol,
            currentPrice: currentPrice.toString(),
            currentTime: now,
            intervalSec: this.CONFIG.INTERVAL_SEC,
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
     */
    private calculateDynamicOdds(rowIdx: number, timeToSettleSec: number): number {
        const baseOdds = BASE_ODDS[rowIdx];

        // 时间因子: 0-18s 内，越远赔率越高 (最多 +50%)
        const maxTimeSec = this.CONFIG.COLS * this.CONFIG.INTERVAL_SEC;
        const timeFactor = 1 + (timeToSettleSec / maxTimeSec) * 0.5;

        const odds = baseOdds * timeFactor;

        // 限制范围 [1.1, 10.0]
        return Math.round(Math.max(1.1, Math.min(10.0, odds)) * 100) / 100;
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

    // ============ Redis 操作 ============

    private async getStoredGrid(): Promise<StoredGrid | null> {
        if (!this.redis) return null;

        const data = await this.redis.get(this.CONFIG.REDIS_KEY);
        return data ? JSON.parse(data) : null;
    }

    private async saveStoredGrid(grid: StoredGrid): Promise<void> {
        if (!this.redis) return;

        await this.redis.set(this.CONFIG.REDIS_KEY, JSON.stringify(grid));
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
