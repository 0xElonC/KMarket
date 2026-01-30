import { IsOptional, IsEnum } from 'class-validator';
import { TransactionType } from '../entities/transaction.entity';

/**
 * 余额响应 DTO
 */
export class BalanceResponseDto {
    /**
     * 可用余额 (可下注/可提现)
     */
    available: string;

    /**
     * 待领取余额 (结算赔付，需手动领取)
     */
    claimable: string;

    /**
     * 在押资金 (活跃订单聚合)
     */
    inBets: string;

    /**
     * 总资产 = available + claimable + inBets
     */
    total: string;
}

/**
 * 领取响应 DTO
 */
export class ClaimResponseDto {
    /**
     * 领取金额
     */
    claimed: string;

    /**
     * 领取后的可用余额
     */
    newBalance: string;
}

/**
 * 交易查询 DTO
 */
export class TransactionQueryDto {
    @IsOptional()
    @IsEnum(TransactionType)
    type?: TransactionType;
}
