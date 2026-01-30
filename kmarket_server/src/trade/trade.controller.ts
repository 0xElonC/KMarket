import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { BetService } from './services/bet.service';
import { CreateBetDto, BetResponseDto, PositionsResponseDto, HistoryResponseDto } from './dto/bet.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ApiResponse, PaginationDto } from '../common/dto';

@Controller('trade')
@UseGuards(JwtAuthGuard)
export class TradeController {
    constructor(private readonly betService: BetService) { }

    @Post('bet')
    async createBet(
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: CreateBetDto,
    ): Promise<ApiResponse<BetResponseDto>> {
        const bet = await this.betService.placeBet(user.userId, dto);
        return ApiResponse.success(bet);
    }

    @Get('positions')
    async getActivePositions(
        @CurrentUser() user: CurrentUserPayload,
        @Query('symbol') symbol?: string,
    ): Promise<ApiResponse<PositionsResponseDto>> {
        const positions = await this.betService.getActiveBets(user.userId, symbol);
        return ApiResponse.success(positions);
    }

    @Get('history')
    async getBetHistory(
        @CurrentUser() user: CurrentUserPayload,
        @Query() pagination: PaginationDto,
    ): Promise<ApiResponse<HistoryResponseDto>> {
        const result = await this.betService.getBetHistory(
            user.userId,
            pagination.page ?? 1,
            pagination.limit ?? 20,
        );

        return ApiResponse.success(result);
    }
}
