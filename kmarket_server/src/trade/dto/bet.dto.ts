import { IsString, IsNotEmpty, IsNumber, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBetDto {
    @IsString()
    @IsNotEmpty()
    symbol: string;

    @IsString()
    @IsNotEmpty()
    amount: string;

    @IsInt()
    @Type(() => Number)
    @Min(-20)
    @Max(20)
    priceTick: number;

    @IsNumber()
    @Type(() => Number)
    settlementTime: number; // timestamp (ms)
}

export class BetResponseDto {
    id: number;
    symbol: string;
    amount: string;
    priceTick: number;
    priceRange: { lower: string; upper: string };
    basePrice: string;
    odds: string;
    settlementTime: Date;
    status: string;
    createdAt: Date;
}

export class PositionDto {
    id: number;
    symbol: string;
    amount: string;
    priceTick: number;
    priceRange: { lower: string; upper: string };
    odds: string;
    settlementTime: Date;
    remainingSeconds: number;
    status: string;
}

export class PositionsResponseDto {
    items: PositionDto[];
    totalInBets: string;
}

export class HistorySummaryDto {
    totalBets: number;
    wins: number;
    losses: number;
    totalWagered: string;
    totalPayout: string;
    netProfit: string;
}

export class HistoryResponseDto {
    items: BetResponseDto[];
    total: number;
    page: number;
    limit: number;
    summary: HistorySummaryDto;
}
