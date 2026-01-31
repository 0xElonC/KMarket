import { ethers } from 'ethers';

// ============ 类型定义 ============

export interface PositionDto {
    id: number;
    symbol: string;
    tickId: string;
    rowIndex: number;
    amount: string;
    priceRange: {
        min: string | null;
        max: string | null;
    };
    odds: string;
    settlementTime: string;
    remainingSeconds: number;
    status: string;
}

export interface BetResponseDto {
    id: number;
    symbol: string;
    tickId: string;
    rowIndex: number;
    amount: string;
    priceRange: {
        min: string | null;
        max: string | null;
        label?: string;
    };
    basisPrice: string;
    odds: string;
    settlementTime: string;
    status: string;
    createdAt: string;
    settlementPrice?: string;
    payout?: string;
    settledAt?: string;
}

export interface ActivityItem {
    id: number;
    symbol: string;           // "ETHUSDT"
    displaySymbol: string;    // "ETH/USDT"
    coinIcon: string;         // Material icon name
    direction: 'LONG' | 'SHORT';
    directionLabel: string;   // "+2%↑", "小跌" 等
    amount: string;           // 格式化后的金额
    amountRaw: string;        // 原始金额 (Wei)
    odds: string;             // "1.85x"
    returnValue?: string;     // 实际收益 (仅历史)
    status: 'LIVE' | 'WON' | 'LOST' | 'COMPLETED';
    statusLabel: string;      // "Live", "Expired 2m ago"
    timestamp: number;        // 用于排序
    createdAt: Date;
    settlementTime: Date;
    remainingSeconds?: number; // 仅持仓有
}

// ============ 工具函数 ============

/**
 * 格式化交易对显示
 * @example "ETHUSDT" → "ETH/USDT"
 */
export function formatSymbol(symbol: string): string {
    return symbol.replace(/USDT$/, '/USDT').replace(/USDC$/, '/USDC');
}

/**
 * 获取币种图标
 */
export function getCoinIcon(symbol: string): string {
    const coin = symbol.replace(/(USDT|USDC)$/, '');
    const iconMap: Record<string, string> = {
        'BTC': 'currency_bitcoin',
        'ETH': 'token',
        'SOL': 'deployed_code',
    };
    return iconMap[coin] || 'currency_exchange';
}

/**
 * 获取行标签
 */
export function getRowLabel(rowIndex: number): string {
    const labels = ['+2%↑', '+1%~+2%', '0~+1%', '-1%~0', '-2%~-1%', '-2%↓'];
    return labels[rowIndex - 1] || '';
}

/**
 * 格式化金额 (6位小数 USDC 格式 → 显示格式)
 */
export function formatAmount(rawAmount: string): string {
    try {
        // 处理 PostgreSQL 返回的 decimal 格式 (如 "51282051.000000000000000000")
        const cleanAmount = rawAmount.split('.')[0];
        // 假设 6 位小数精度 (USDC)
        const num = parseFloat(cleanAmount) / 1e6;
        if (num >= 1000) {
            return `${(num / 1000).toFixed(3)}K`;
        }
        return num.toFixed(3);
    } catch {
        return '0.000';
    }
}

/**
 * 格式化相对时间
 */
export function formatRelativeTime(date: Date | string): string {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const now = Date.now();
    const diff = now - targetDate.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

/**
 * 计算时间类型标签
 */
export function getTimeTypeLabel(createdAt: Date, settlementTime: Date): string {
    const duration = (settlementTime.getTime() - createdAt.getTime()) / 1000; // 秒

    if (duration <= 60) return '1m Blitz';
    if (duration <= 180) return '3m Quick';
    if (duration <= 300) return '5m Turbo';
    if (duration <= 900) return '15m Options';
    return `${Math.floor(duration / 60)}m`;
}

// ============ 数据转换函数 ============

/**
 * 持仓数据 → ActivityItem
 */
export function mapPositionToActivity(position: PositionDto): ActivityItem {
    const rowIndex = position.rowIndex;
    const direction = rowIndex <= 3 ? 'LONG' : 'SHORT';
    const settlementTime = new Date(position.settlementTime);

    return {
        id: position.id,
        symbol: position.symbol,
        displaySymbol: formatSymbol(position.symbol),
        coinIcon: getCoinIcon(position.symbol),
        direction,
        directionLabel: getRowLabel(rowIndex),
        amount: formatAmount(position.amount),
        amountRaw: position.amount,
        odds: `${position.odds}x`,
        status: 'LIVE',
        statusLabel: position.remainingSeconds > 0
            ? 'Live'
            : `Expired ${formatRelativeTime(settlementTime)}`,
        timestamp: settlementTime.getTime(),
        createdAt: new Date(), // 持仓接口没有 createdAt, 使用当前时间
        settlementTime,
        remainingSeconds: position.remainingSeconds,
    };
}

/**
 * 历史数据 → ActivityItem
 */
export function mapHistoryToActivity(bet: BetResponseDto): ActivityItem {
    const rowIndex = bet.rowIndex;
    const direction = rowIndex <= 3 ? 'LONG' : 'SHORT';
    const createdAt = new Date(bet.createdAt);
    const settlementTime = new Date(bet.settlementTime);

    // 计算实际收益 (USDC 6位小数)
    let returnValue: string | undefined;
    if (bet.payout) {
        const payoutNum = parseFloat(bet.payout.split('.')[0]) / 1e6;
        const amountNum = parseFloat(bet.amount.split('.')[0]) / 1e6;
        const profit = payoutNum - amountNum;
        returnValue = profit >= 0 ? `+$${profit.toFixed(3)}` : `-$${Math.abs(profit).toFixed(3)}`;
    }

    // 状态映射
    let status: 'LIVE' | 'WON' | 'LOST' | 'COMPLETED';
    if (bet.status === 'won') status = 'WON';
    else if (bet.status === 'lost') status = 'LOST';
    else status = 'COMPLETED';

    return {
        id: bet.id,
        symbol: bet.symbol,
        displaySymbol: formatSymbol(bet.symbol),
        coinIcon: getCoinIcon(bet.symbol),
        direction,
        directionLabel: bet.priceRange.label || getRowLabel(rowIndex),
        amount: formatAmount(bet.amount),
        amountRaw: bet.amount,
        odds: `${bet.odds}x`,
        returnValue,
        status,
        statusLabel: formatRelativeTime(bet.settledAt || bet.settlementTime),
        timestamp: createdAt.getTime(),
        createdAt,
        settlementTime,
    };
}
