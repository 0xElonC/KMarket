import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { MarketConfigService, MarketConfig } from './market-config.service';
import { GateWsService, PriceData } from './gate-ws.service';
import { WsGridCell } from '../dto/websocket.dto';

/**
 * 下注锁定数据
 */
export interface LockedBetData {
    tickId: string;
    expiryTime: number;
    rowIndex: number;
    basisPrice: string;
    odds: string;
    priceRange: {
        min: number | null;
        max: number | null;
        percentMin: number;
        percentMax: number;
    };
    lockedAt: number;
}

/**
 * 内部格子结构
 */
interface InternalGridCell extends WsGridCell {
    createdAt: number;
}

@Injectable()
export class GridManagerService implements OnModuleInit {
    private readonly logger = new Logger(GridManagerService.name);

    // 按 symbol 存储网格
    private grids: Map<string, InternalGridCell[]> = new Map();

    // 当前基准价格
    private basePrices: Map<string, number> = new Map();

    // 列计数器
    private colCounters: Map<string, number> = new Map();

    // 定时器
    private appendTimers: Map<string, NodeJS.Timeout> = new Map();

    constructor(
        private readonly configService: MarketConfigService,
        private readonly gateWsService: GateWsService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    onModuleInit() {
        // 启动网格生成定时器
        const symbols = this.configService.getAllSymbols();
        for (const symbol of symbols) {
            this.startGridTimer(symbol);
        }
    }

    private startGridTimer(symbol: string) {
        const config = this.configService.getConfig(symbol);
        if (!config) return;

        // 每秒检查是否需要追加新列
        const timer = setInterval(() => {
            this.checkAndAppendColumn(symbol);
        }, config.grid.intervalMs);

        this.appendTimers.set(symbol, timer);
    }

    /**
     * 初始化网格 (WebSocket 连接时调用)
     */
    initGrid(symbol: string): WsGridCell[] {
        const config = this.configService.getConfig(symbol);
        if (!config) {
            this.logger.warn(`No config for symbol ${symbol}`);
            return [];
        }

        const priceData = this.gateWsService.getCurrentPrice(symbol);
        const basePrice = priceData ? parseFloat(priceData.price) : 0;

        if (basePrice === 0) {
            this.logger.warn(`No price data for ${symbol}, using placeholder`);
        }

        this.basePrices.set(symbol, basePrice || 2500);
        this.colCounters.set(symbol, 0);

        const cells = this.generateFullGrid(symbol, config, basePrice || 2500);
        this.grids.set(symbol, cells);

        this.logger.log(`Grid initialized for ${symbol}: ${cells.length} cells`);

        return cells.map(c => this.toWsGridCell(c));
    }

    /**
     * 生成完整网格
     */
    private generateFullGrid(symbol: string, config: MarketConfig, basePrice: number): InternalGridCell[] {
        const { rows, cols, scrollSpeed, priceRange, minBetDistance } = config.grid;
        const now = Date.now();
        const cells: InternalGridCell[] = [];

        const priceStep = (priceRange * 2 / rows) / 100;

        for (let col = 0; col < cols; col++) {
            // 计算该列的到期时间 (越右边的列到期时间越晚)
            const expiryTime = now + (col + minBetDistance) * 1000;
            const colBasisPrice = basePrice;

            for (let row = 0; row < rows; row++) {
                const pctHigh = priceRange / 100 - row * priceStep;
                const pctLow = pctHigh - priceStep;
                const priceHigh = colBasisPrice * (1 + pctHigh);
                const priceLow = colBasisPrice * (1 + pctLow);

                // 计算赔率
                const rowFromCenter = Math.abs(row - (rows - 1) / 2);
                const distFactor = rowFromCenter / (rows / 2);
                const timeFactor = 1 + col * config.odds.timeFactor;
                const odds = (config.odds.baseMin + distFactor * (config.odds.baseMax - config.odds.baseMin)) * timeFactor;

                cells.push({
                    id: `cell_${row}_${col}_${now}`,
                    tickId: `${expiryTime}_${row}`,
                    row,
                    col,
                    priceHigh,
                    priceLow,
                    basisPrice: colBasisPrice,
                    odds: parseFloat(odds.toFixed(2)),
                    expiryTime,
                    status: 'idle',
                    createdAt: now,
                });
            }
        }

        this.colCounters.set(symbol, cols);
        return cells;
    }

    /**
     * 检查并追加新列
     */
    private checkAndAppendColumn(symbol: string) {
        const config = this.configService.getConfig(symbol);
        const grid = this.grids.get(symbol);
        if (!config || !grid || grid.length === 0) return;

        const now = Date.now();
        const basePrice = this.basePrices.get(symbol) || 0;

        // 找到当前最大列号
        const maxCol = Math.max(...grid.map(c => c.col));
        const lastColCells = grid.filter(c => c.col === maxCol);
        if (lastColCells.length === 0) return;

        // 检查是否需要追加新列 (最后一列创建超过 intervalMs)
        const lastCreatedAt = lastColCells[0].createdAt;
        if (now - lastCreatedAt < config.grid.intervalMs) return;

        // 生成新列
        const newCol = maxCol + 1;
        const colCounter = this.colCounters.get(symbol) || 0;
        this.colCounters.set(symbol, colCounter + 1);

        const newCells = this.generateColumn(symbol, config, newCol, basePrice, now);

        // 添加到网格
        grid.push(...newCells);

        // 移除过期的列 (保留最近 cols * 2 列)
        const minCol = newCol - config.grid.cols * 2;
        const filteredGrid = grid.filter(c => c.col > minCol);
        this.grids.set(symbol, filteredGrid);

        // 发送追加事件
        this.eventEmitter.emit('market.grid.append', {
            symbol,
            cells: newCells.map(c => this.toWsGridCell(c)),
        });
    }

    /**
     * 生成单列
     */
    private generateColumn(
        symbol: string,
        config: MarketConfig,
        col: number,
        basePrice: number,
        now: number
    ): InternalGridCell[] {
        const { rows, priceRange, minBetDistance } = config.grid;
        const cells: InternalGridCell[] = [];

        const priceStep = (priceRange * 2 / rows) / 100;
        const expiryTime = now + (config.grid.cols + minBetDistance) * 1000;

        // 更新基准价格 (缓慢跟随当前价格)
        const priceData = this.gateWsService.getCurrentPrice(symbol);
        if (priceData) {
            const currentPrice = parseFloat(priceData.price);
            const newBasePrice = basePrice + (currentPrice - basePrice) * 0.01;
            this.basePrices.set(symbol, newBasePrice);
        }

        const colBasisPrice = this.basePrices.get(symbol) || basePrice;

        for (let row = 0; row < rows; row++) {
            const pctHigh = priceRange / 100 - row * priceStep;
            const pctLow = pctHigh - priceStep;
            const priceHigh = colBasisPrice * (1 + pctHigh);
            const priceLow = colBasisPrice * (1 + pctLow);

            const rowFromCenter = Math.abs(row - (rows - 1) / 2);
            const distFactor = rowFromCenter / (rows / 2);
            const randomFactor = 0.9 + Math.random() * 0.2;
            const odds = (config.odds.baseMin + distFactor * (config.odds.baseMax - config.odds.baseMin)) * randomFactor;

            cells.push({
                id: `cell_${row}_${col}_${now}`,
                tickId: `${expiryTime}_${row}`,
                row,
                col,
                priceHigh,
                priceLow,
                basisPrice: colBasisPrice,
                odds: parseFloat(odds.toFixed(2)),
                expiryTime,
                status: 'idle',
                createdAt: now,
            });
        }

        return cells;
    }

    /**
     * 验证下注
     */
    async validateBet(tickId: string): Promise<{ error: string | null; data: LockedBetData | null }> {
        const [expiryTimeStr, rowStr] = tickId.split('_');
        const expiryTime = parseInt(expiryTimeStr);
        const row = parseInt(rowStr);

        if (isNaN(expiryTime) || isNaN(row)) {
            return { error: '无效的 tickId 格式', data: null };
        }

        const now = Date.now();

        if (expiryTime <= now) {
            return { error: '该格子已过期', data: null };
        }

        // 查找格子
        for (const [symbol, grid] of this.grids) {
            const cell = grid.find(c => c.tickId === tickId);
            if (cell) {
                const config = this.configService.getConfig(symbol);
                if (!config) continue;

                // 检查是否在可下注区域
                const timeToExpiry = (expiryTime - now) / 1000;
                if (timeToExpiry < config.grid.minBetDistance) {
                    return { error: '该格子已锁定，无法下注', data: null };
                }

                const lockedData: LockedBetData = {
                    tickId,
                    expiryTime,
                    rowIndex: row + 1,
                    basisPrice: cell.basisPrice.toString(),
                    odds: cell.odds.toFixed(2),
                    priceRange: {
                        min: cell.priceLow,
                        max: cell.priceHigh,
                        percentMin: -0.25 + row * 0.0125,
                        percentMax: -0.25 + (row + 1) * 0.0125,
                    },
                    lockedAt: now,
                };

                return { error: null, data: lockedData };
            }
        }

        return { error: '找不到对应的格子', data: null };
    }

    /**
     * 获取格子 by tickId
     */
    async getColumnByTickId(tickId: string): Promise<LockedBetData | null> {
        const result = await this.validateBet(tickId);
        return result.data;
    }

    /**
     * 标记格子状态
     */
    setCellStatus(tickId: string, status: 'active' | 'won' | 'lost') {
        for (const [, grid] of this.grids) {
            const cell = grid.find(c => c.tickId === tickId);
            if (cell) {
                cell.status = status;
                break;
            }
        }
    }

    /**
     * 获取中奖行
     */
    getWinningRow(priceChangePercent: number, config: MarketConfig): number {
        const { rows, priceRange } = config.grid;
        const totalRange = priceRange * 2;
        const rowHeight = totalRange / rows;

        // 将价格变化百分比转换为行索引
        const normalizedChange = (priceRange - priceChangePercent * 100) / rowHeight;
        const winningRow = Math.floor(normalizedChange);

        return Math.max(0, Math.min(rows - 1, winningRow));
    }

    /**
     * 记录结算
     */
    recordSettlement(expiryTime: number, settlementPrice: string, basisPrice: string) {
        this.logger.debug(`Settlement recorded: expiry=${expiryTime}, price=${settlementPrice}`);
    }

    /**
     * 获取当前价格
     */
    getCurrentPrice(symbol: string): number {
        return this.basePrices.get(symbol) || 0;
    }

    private toWsGridCell(cell: InternalGridCell): WsGridCell {
        return {
            id: cell.id,
            tickId: cell.tickId,
            row: cell.row,
            col: cell.col,
            priceHigh: cell.priceHigh,
            priceLow: cell.priceLow,
            basisPrice: cell.basisPrice,
            odds: cell.odds,
            expiryTime: cell.expiryTime,
            status: cell.status,
        };
    }
}
