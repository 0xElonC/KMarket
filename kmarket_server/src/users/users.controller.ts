import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthService } from './auth.service';
import { LoginDto, BalanceResponseDto, ClaimResponseDto, TransactionQueryDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ApiResponse, PaginationDto, PaginatedResult } from '../common/dto';
import { Transaction } from './entities/transaction.entity';

@Controller('users')
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly authService: AuthService,
    ) { }

    // ==================== 认证接口 ====================

    @Post('auth/nonce')
    getNonce(): ApiResponse<{ nonce: string }> {
        const nonce = this.authService.generateNonce();
        return ApiResponse.success({ nonce });
    }

    @Post('auth/login')
    async login(@Body() loginDto: LoginDto): Promise<ApiResponse<{ accessToken: string; user: unknown }>> {
        const result = await this.authService.login(loginDto);
        return ApiResponse.success(result);
    }

    // ==================== 余额接口 ====================

    /**
     * 获取用户余额
     * @returns available: 可用, claimable: 待领取, inBets: 在押, total: 总资产
     */
    @UseGuards(JwtAuthGuard)
    @Get('balance')
    async getBalance(
        @CurrentUser() user: CurrentUserPayload,
    ): Promise<ApiResponse<BalanceResponseDto>> {
        const balance = await this.usersService.getBalance(user.userId);
        return ApiResponse.success(balance);
    }

    /**
     * 领取待领取余额到可用余额
     */
    @UseGuards(JwtAuthGuard)
    @Post('claim')
    async claim(
        @CurrentUser() user: CurrentUserPayload,
    ): Promise<ApiResponse<ClaimResponseDto>> {
        const result = await this.usersService.claim(user.userId);
        return ApiResponse.success(result);
    }

    // ==================== 流水接口 ====================

    /**
     * 获取余额流水
     * @param type 可选，按类型过滤
     */
    @UseGuards(JwtAuthGuard)
    @Get('balance/logs')
    async getTransactions(
        @CurrentUser() user: CurrentUserPayload,
        @Query() pagination: PaginationDto,
        @Query() query: TransactionQueryDto,
    ): Promise<ApiResponse<PaginatedResult<Transaction>>> {
        const { items, total } = await this.usersService.getTransactions(
            user.userId,
            pagination.limit,
            pagination.skip,
            query.type,
        );

        const result = new PaginatedResult(
            items,
            total,
            pagination.page ?? 1,
            pagination.limit ?? 20,
        );

        return ApiResponse.success(result);
    }
}
