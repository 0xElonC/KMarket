import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { WithdrawSignerService } from './services/withdraw-signer.service';
import { ChainQueryService } from './services/chain-query.service';
import { DepositListenerService, ListenerStatus } from './services/deposit-listener.service';
import { WithdrawRequestDto, WithdrawResponseDto } from './dto/withdraw.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ApiResponse } from '../common/dto';

/**
 * 链服务状态响应
 */
interface ChainStatusResponse {
    chainId: number;
    blockNumber: number | null;
    depositListener: ListenerStatus;
    serverAddress: string | null;
    isReady: boolean;
}

/**
 * Vault 余额响应
 */
interface VaultBalanceResponse {
    address: string;
    vaultBalance: string;
    blockNumber: number;
}

@Controller('chain')
export class ChainController {
    constructor(
        private readonly withdrawSignerService: WithdrawSignerService,
        private readonly chainQueryService: ChainQueryService,
        private readonly depositListenerService: DepositListenerService,
    ) { }

    /**
     * 请求提现凭证
     * POST /api/chain/withdraw-request
     */
    @Post('withdraw-request')
    @UseGuards(JwtAuthGuard)
    async requestWithdraw(
        @CurrentUser() user: CurrentUserPayload,
        @Body() dto: WithdrawRequestDto,
    ): Promise<ApiResponse<WithdrawResponseDto>> {
        const coupon = await this.withdrawSignerService.createWithdrawCoupon(
            user.userId,
            user.address,
            dto.amount,
        );
        return ApiResponse.success(coupon);
    }

    /**
     * 查询链上 Vault 余额
     * GET /api/chain/vault-balance
     */
    @Get('vault-balance')
    @UseGuards(JwtAuthGuard)
    async getVaultBalance(
        @CurrentUser() user: CurrentUserPayload,
    ): Promise<ApiResponse<VaultBalanceResponse | null>> {
        const balance = await this.chainQueryService.getVaultBalance(user.address);
        return ApiResponse.success(balance);
    }

    /**
     * 获取链服务状态
     * GET /api/chain/status
     */
    @Get('status')
    async getStatus(): Promise<ApiResponse<ChainStatusResponse>> {
        const listenerStatus = this.depositListenerService.getStatus();
        const chainId = this.chainQueryService.getChainId();
        const blockNumber = await this.chainQueryService.getBlockNumber();
        const serverAddress = this.withdrawSignerService.getServerAddress();
        const isReady = this.chainQueryService.isReady();

        return ApiResponse.success({
            chainId,
            blockNumber,
            depositListener: listenerStatus,
            serverAddress,
            isReady,
        });
    }
}
