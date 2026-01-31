/**
 * 6×6 网格 DTO 定义
 * - 6 列: 时间维度 (3s 间隔)
 * - 6 行: 价格区间维度
 */

// LockedBetData 从 block-manager.service.ts 导出，供下单模块使用
export type { LockedBetData } from '../services/block-manager.service';

/**
 * 价格区间定义
 */
export interface PriceRange {
    min: number | null;      // 最低价 (null = 无下限)
    max: number | null;      // 最高价 (null = 无上限)
    label: string;           // 显示标签 如 "+1%~+2%"
    percentMin: number;      // 百分比下限
    percentMax: number;      // 百分比上限
}

/**
 * 单个格子
 */
export interface GridCell {
    odds: string;            // 赔率 (字符串格式)
    expiryTime: number;      // 到期时间戳 (ms)
    priceRange: PriceRange;  // 价格区间
    tickId: string;          // 唯一标识 格式: {expiryTime}_{row}
    status: 'settled' | 'locked' | 'betting';  // 状态
    basisPrice: string;      // 基准价格
    isWinning?: boolean;     // 是否中奖 (仅 settled 状态)
    settlementPrice?: string; // 结算价格 (仅 settled 状态)
}

/**
 * 网格配置
 */
export interface GridConfig {
    cols: number;            // 列数 (6)
    rows: number;            // 行数 (6)
    intervalSec: number;     // 列间隔 (3s)
    priceZones: {
        label: string;
        percentMin: number;
        percentMax: number;
    }[];
}

/**
 * 列数据 (用于 Redis 存储)
 */
export interface GridColumn {
    expiryTime: number;      // 该列到期时间
    basisPrice: string;      // 该列基准价格
    rows: GridCell[];        // 该列所有行
}

/**
 * Redis 存储的网格结构
 */
export interface StoredGrid {
    symbol: string;
    createdAt: number;
    columns: GridColumn[];   // 6 列
}

/**
 * API 响应格式 (按列组织)
 */
export interface ColumnGridResponseDto {
    symbol: string;
    currentPrice: string;
    currentTime: number;
    intervalSec: number;
    lockTimeSec: number;         // Lock 时间 (秒)
    latestExpiryTime: number;    // 最新列的 expiryTime (用于去重)
    col1: GridCell[];
    col2: GridCell[];
    col3: GridCell[];
    col4: GridCell[];
    col5: GridCell[];
    col6: GridCell[];
    update: boolean;             // 是否有列滑动
}

// ============ 以下为旧 DTO，暂时保留兼容 ============

export interface TickOdds {
    priceTick: number;        // e.g. -20, -19... 0 ... +19, +20
    priceRange: {
        lower: string;
        upper: string;
    };
    odds: number;             // 0 if locked
}

export interface TimeSlice {
    id: string;               // Unique ID
    symbol: string;
    settlementTime: number;   // Timestamp of settlement (Start of the second)
    basisPrice: string;       // Price when this slice was created
    locked: boolean;
    status: 'pending' | 'settled';
    ticks: TickOdds[];
}

export interface GridResponseDto {
    symbol: string;
    currentPrice: string;
    currentTime: number;
    slices: TimeSlice[];
}
