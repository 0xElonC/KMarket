import { Injectable, Logger } from '@nestjs/common';
import { ProviderService } from './provider.service';

/**
 * 链上余额响应
 */
export interface ChainBalance {
    address: string;
    vaultBalance: string;
    blockNumber: number;
}

/**
 * 链上数据查询服务
 * 提供 Vault 合约余额查询等链上数据访问能力
 */
@Injectable()
export class ChainQueryService {
    private readonly logger = new Logger(ChainQueryService.name);

    constructor(private readonly providerService: ProviderService) { }

    /**
     * 查询用户在 Vault 合约中的余额
     * @param userAddress 用户钱包地址
     */
    async getVaultBalance(userAddress: string): Promise<ChainBalance | null> {
        const contract = this.providerService.getVaultContract();
        const provider = this.providerService.getHttpProvider();

        if (!contract || !provider) {
            this.logger.warn('Vault contract or provider not available');
            return null;
        }

        try {
            const balance = await contract.balanceOf(userAddress);
            const blockNumber = await provider.getBlockNumber();

            return {
                address: userAddress,
                vaultBalance: balance.toString(),
                blockNumber,
            };
        } catch (error) {
            this.logger.error(`Failed to get vault balance for ${userAddress}`, error);
            return null;
        }
    }

    /**
     * 获取当前区块号
     */
    async getBlockNumber(): Promise<number | null> {
        const provider = this.providerService.getHttpProvider();
        if (!provider) {
            this.logger.warn('HTTP provider not available');
            return null;
        }

        try {
            return await provider.getBlockNumber();
        } catch (error) {
            this.logger.error('Failed to get block number', error);
            return null;
        }
    }

    /**
     * 获取链 ID
     */
    getChainId(): number {
        return this.providerService.getChainId();
    }

    /**
     * 检查链服务是否就绪
     */
    isReady(): boolean {
        return this.providerService.isReady();
    }
}
