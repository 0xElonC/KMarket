import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    JsonRpcProvider,
    WebSocketProvider,
    Contract,
    Provider,
} from 'ethers';
import * as VaultABI from '../abis/KMarketVault.json';

/**
 * Provider 统一管理服务
 * 负责管理 HTTP 和 WebSocket Provider 连接
 */
@Injectable()
export class ProviderService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ProviderService.name);

    private httpProvider: JsonRpcProvider | null = null;
    private wsProvider: WebSocketProvider | null = null;
    private vaultContract: Contract | null = null;

    private readonly rpcUrl: string;
    private readonly rpcWsUrl: string;
    private readonly vaultAddress: string;
    private readonly chainId: number;

    constructor(private readonly configService: ConfigService) {
        this.rpcUrl = this.configService.get<string>('chain.rpcUrl') || '';
        this.rpcWsUrl = this.configService.get<string>('chain.rpcWsUrl') || '';
        this.vaultAddress = this.configService.get<string>('chain.vaultAddress') || '';
        this.chainId = this.configService.get<number>('chain.chainId') || 137;
    }

    async onModuleInit() {
        await this.initializeProviders();
    }

    private async initializeProviders() {
        // HTTP Provider (必需)
        if (this.rpcUrl) {
            try {
                this.httpProvider = new JsonRpcProvider(this.rpcUrl, this.chainId);
                this.logger.log(`HTTP Provider initialized: ${this.rpcUrl}`);
            } catch (error) {
                this.logger.error(`Failed to initialize HTTP Provider: ${error.message}`);
            }
        } else {
            this.logger.warn('RPC_URL not configured, HTTP Provider disabled');
        }

        // WebSocket Provider (可选)
        if (this.rpcWsUrl) {
            try {
                this.wsProvider = new WebSocketProvider(this.rpcWsUrl, this.chainId);
                this.logger.log(`WebSocket Provider initialized: ${this.rpcWsUrl}`);
            } catch (error) {
                this.logger.warn(`Failed to initialize WebSocket Provider: ${error.message}`);
            }
        } else {
            this.logger.log('RPC_WS_URL not configured, WebSocket Provider disabled');
        }

        // Vault Contract
        if (this.vaultAddress && this.httpProvider) {
            try {
                this.vaultContract = new Contract(this.vaultAddress, VaultABI, this.httpProvider);
                this.logger.log(`Vault Contract initialized: ${this.vaultAddress}`);
            } catch (error) {
                this.logger.error(`Failed to initialize Vault Contract: ${error.message}`);
            }
        } else if (!this.vaultAddress) {
            this.logger.warn('VAULT_ADDRESS not configured, Vault Contract disabled');
        }
    }

    /**
     * 获取 HTTP Provider
     */
    getHttpProvider(): JsonRpcProvider | null {
        return this.httpProvider;
    }

    /**
     * 获取 WebSocket Provider
     */
    getWsProvider(): WebSocketProvider | null {
        return this.wsProvider;
    }

    /**
     * 获取活跃的 Provider (优先 WebSocket)
     */
    getActiveProvider(): Provider | null {
        return this.wsProvider || this.httpProvider;
    }

    /**
     * 获取 Vault 合约实例
     */
    getVaultContract(): Contract | null {
        return this.vaultContract;
    }

    /**
     * 使用指定 Provider 创建 Vault 合约实例
     */
    getVaultContractWithProvider(provider: Provider): Contract | null {
        if (!this.vaultAddress) return null;
        return new Contract(this.vaultAddress, VaultABI, provider);
    }

    /**
     * 获取链 ID
     */
    getChainId(): number {
        return this.chainId;
    }

    /**
     * 获取 Vault 地址
     */
    getVaultAddress(): string {
        return this.vaultAddress;
    }

    /**
     * 检查 WebSocket 是否可用
     */
    hasWebSocket(): boolean {
        return this.wsProvider !== null;
    }

    /**
     * 检查服务是否就绪
     */
    isReady(): boolean {
        return this.httpProvider !== null;
    }

    async onModuleDestroy() {
        if (this.wsProvider) {
            try {
                await this.wsProvider.destroy();
                this.logger.log('WebSocket Provider destroyed');
            } catch (error) {
                this.logger.error(`Error destroying WebSocket Provider: ${error.message}`);
            }
        }
    }
}
