import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers, Wallet, TypedDataDomain } from 'ethers';
import { UsersService } from '../../users/users.service';
import { TransactionType } from '../../users/entities/transaction.entity';
import { ProviderService } from './provider.service';

/**
 * 提现凭证
 */
export interface WithdrawCoupon {
    user: string;
    amount: string;
    nonce: number;
    expiry: number;
    signature: string;
}

/**
 * EIP-712 提现类型定义
 */
const WITHDRAW_TYPES = {
    Withdraw: [
        { name: 'user', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'expiry', type: 'uint256' },
    ],
};

/**
 * 提现签名服务
 * 生成 EIP-712 提现凭证供用户在链上提现
 */
@Injectable()
export class WithdrawSignerService {
    private readonly logger = new Logger(WithdrawSignerService.name);
    private readonly serverWallet: Wallet | null = null;
    private readonly domain: TypedDataDomain;

    constructor(
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
        private readonly providerService: ProviderService,
    ) {
        const privateKey = this.configService.get<string>('chain.serverPrivateKey');
        const vaultAddress = this.providerService.getVaultAddress();
        const chainId = this.providerService.getChainId();

        if (privateKey) {
            this.serverWallet = new Wallet(privateKey);
            this.logger.log(`Server signer initialized: ${this.serverWallet.address}`);
        } else {
            this.logger.warn('Server private key not configured, withdraw signing disabled');
        }

        this.domain = {
            name: 'KMarketVault',
            version: '1',
            chainId: chainId,
            verifyingContract: vaultAddress || ethers.ZeroAddress,
        };

        this.logger.log(`EIP-712 domain: chainId=${chainId}, contract=${vaultAddress || 'not configured'}`);
    }

    /**
     * 创建提现凭证
     * @param userId 用户 ID
     * @param userAddress 用户钱包地址
     * @param amount 提现金额 (字符串，保持精度)
     */
    async createWithdrawCoupon(
        userId: number,
        userAddress: string,
        amount: string,
    ): Promise<WithdrawCoupon> {
        if (!this.serverWallet) {
            throw new BadRequestException('Withdraw signing not available');
        }

        // 验证金额格式
        if (!amount || BigInt(amount) <= 0n) {
            throw new BadRequestException('Invalid withdraw amount');
        }

        // 验证用户有足够余额
        const { available } = await this.usersService.getBalance(userId);
        if (BigInt(available) < BigInt(amount)) {
            throw new BadRequestException('Insufficient balance');
        }

        // 扣减余额并记录流水
        await this.usersService.deductBalance(userId, amount, {
            type: TransactionType.WITHDRAW,
            refType: 'chain_withdraw',
            remark: `Requested at ${new Date().toISOString()}`,
        });

        // 获取新的 nonce
        const nonce = await this.usersService.incrementWithdrawNonce(userId);

        // 设置过期时间 (1 小时)
        const expiry = Math.floor(Date.now() / 1000) + 3600;

        const message = {
            user: userAddress,
            amount: amount,
            nonce: nonce,
            expiry: expiry,
        };

        // 使用服务端私钥签名
        const signature = await this.serverWallet.signTypedData(
            this.domain,
            WITHDRAW_TYPES,
            message,
        );

        this.logger.log(`Created withdraw coupon for ${userAddress}: amount=${amount}, nonce=${nonce}`);

        return {
            user: userAddress,
            amount,
            nonce,
            expiry,
            signature,
        };
    }

    /**
     * 获取服务端签名地址
     */
    getServerAddress(): string | null {
        return this.serverWallet?.address ?? null;
    }

    /**
     * 检查服务是否可用
     */
    isAvailable(): boolean {
        return this.serverWallet !== null;
    }

    /**
     * 获取 EIP-712 Domain 信息
     */
    getDomain(): TypedDataDomain {
        return this.domain;
    }
}
