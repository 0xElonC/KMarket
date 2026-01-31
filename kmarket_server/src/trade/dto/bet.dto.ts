import { IsString, IsNotEmpty } from 'class-validator';

/**
 * 下注请求 DTO
 */
export class CreateBetDto {
    @IsString()
    @IsNotEmpty()
    symbol: string; // 交易对, e.g., "ETHUSDT"

    @IsString()
    @IsNotEmpty()
    amount: string; // 下注金额 (wei)

    @IsString()
    @IsNotEmpty()
    tickId: string; // 格子ID, e.g., "1706600003000_3" (expiryTime_rowIndex)
}

/**
 * 下注响应 DTO
 */
export class BetResponseDto {
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
    settlementTime: Date;
    status: string;
    createdAt: Date;
}

/**
 * 持仓项 DTO
 */
export class PositionDto {
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
    settlementTime: Date;
    remainingSeconds: number;
    status: string;
}

/**
 * 持仓列表响应
 */
export class PositionsResponseDto {
    items: PositionDto[];
    totalInBets: string;
}

/**
 * 历史统计
 */
export class HistorySummaryDto {
    totalBets: number;
    wins: number;
    losses: number;
    totalWagered: string;
    totalPayout: string;
    netProfit: string;
}

/**
 * 历史记录响应
 */
export class HistoryResponseDto {
    items: BetResponseDto[];
    total: number;
    page: number;
    limit: number;
    summary: HistorySummaryDto;
}
