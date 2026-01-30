import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Contract, EventLog } from 'ethers';
import { UsersService } from '../../users/users.service';
import { TransactionType } from '../../users/entities/transaction.entity';
import { ProviderService } from './provider.service';
import * as VaultABI from '../abis/KMarketVault.json';

/**
 * 监听器状态
 */
export interface ListenerStatus {
    isListening: boolean;
    mode: 'websocket' | 'polling' | 'disabled';
    lastBlock: number;
}

/**
 * 充值监听服务
 * 监听链上 Deposit 事件，同步用户余额
 * 支持 WebSocket 实时监听和 HTTP 轮询两种模式
 */
@Injectable()
export class DepositListenerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(DepositListenerService.name);

    private wsContract: Contract | null = null;
    private httpContract: Contract | null = null;
    private pollInterval: NodeJS.Timeout | null = null;
    private lastProcessedBlock: number = 0;
    private isListening = false;
    private mode: 'websocket' | 'polling' | 'disabled' = 'disabled';

    private readonly pollIntervalMs: number;
    private readonly startBlock: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
        private readonly providerService: ProviderService,
    ) {
        this.pollIntervalMs = this.configService.get<number>('chain.pollInterval') || 5000;
        this.startBlock = this.configService.get<number>('chain.startBlock') || 0;
    }

    async onModuleInit() {
        const vaultAddress = this.providerService.getVaultAddress();

        if (!vaultAddress) {
            this.logger.warn('Vault address not configured, deposit listener disabled');
            return;
        }

        // 优先使用 WebSocket 模式
        if (this.providerService.hasWebSocket()) {
            await this.startWebSocketListener(vaultAddress);
        } else if (this.providerService.getHttpProvider()) {
            // 回退到 HTTP 轮询模式
            await this.startPollingListener(vaultAddress);
        } else {
            this.logger.warn('No provider available, deposit listener disabled');
        }
    }

    /**
     * 启动 WebSocket 实时监听
     */
    private async startWebSocketListener(vaultAddress: string) {
        const wsProvider = this.providerService.getWsProvider();
        if (!wsProvider) return;

        try {
            this.wsContract = new Contract(vaultAddress, VaultABI, wsProvider);
            this.isListening = true;
            this.mode = 'websocket';
            this.logger.log('Started WebSocket deposit listener');

            this.wsContract.on('Deposit', async (user: string, amount: bigint, event) => {
                await this.handleDepositEvent(user, amount, event);
            });
        } catch (error) {
            this.logger.error('Failed to start WebSocket listener', error);
            // 尝试回退到轮询模式
            await this.startPollingListener(vaultAddress);
        }
    }

    /**
     * 启动 HTTP 轮询监听
     */
    private async startPollingListener(vaultAddress: string) {
        const httpProvider = this.providerService.getHttpProvider();
        if (!httpProvider) {
            this.logger.warn('No HTTP provider available for polling');
            return;
        }

        try {
            this.httpContract = new Contract(vaultAddress, VaultABI, httpProvider);
            this.isListening = true;
            this.mode = 'polling';

            // 初始化最后处理的区块
            await this.initializeLastBlock();

            this.logger.log(`Started HTTP polling deposit listener (interval: ${this.pollIntervalMs}ms, startBlock: ${this.lastProcessedBlock})`);

            // 定时轮询
            this.pollInterval = setInterval(() => this.pollForDeposits(), this.pollIntervalMs);
        } catch (error) {
            this.logger.error('Failed to start polling listener', error);
        }
    }

    /**
     * 初始化最后处理的区块号
     */
    private async initializeLastBlock() {
        const provider = this.providerService.getHttpProvider();
        if (!provider) return;

        try {
            if (this.startBlock > 0) {
                this.lastProcessedBlock = this.startBlock;
            } else {
                // 从当前区块开始，不扫描历史
                this.lastProcessedBlock = await provider.getBlockNumber();
            }
            this.logger.log(`Deposit listener starting from block ${this.lastProcessedBlock}`);
        } catch (error) {
            this.logger.error('Failed to get initial block number', error);
            this.lastProcessedBlock = 0;
        }
    }

    /**
     * 轮询查询 Deposit 事件
     */
    private async pollForDeposits() {
        if (!this.httpContract) return;

        try {
            const provider = this.providerService.getHttpProvider();
            if (!provider) return;

            const currentBlock = await provider.getBlockNumber();

            if (currentBlock <= this.lastProcessedBlock) {
                return; // 没有新区块
            }

            // 查询事件 (限制范围避免 RPC 限制)
            const fromBlock = this.lastProcessedBlock + 1;
            const toBlock = Math.min(currentBlock, fromBlock + 1000); // 最多查询 1000 个区块

            const filter = this.httpContract.filters.Deposit();
            const events = await this.httpContract.queryFilter(filter, fromBlock, toBlock);

            if (events.length > 0) {
                this.logger.log(`Found ${events.length} deposit events in blocks ${fromBlock}-${toBlock}`);
            }

            for (const event of events) {
                if (event instanceof EventLog && event.args) {
                    const [user, amount] = event.args;
                    await this.handleDepositEvent(user, amount, event);
                }
            }

            this.lastProcessedBlock = toBlock;
        } catch (error) {
            this.logger.error('Error polling for deposits', error);
        }
    }

    /**
     * 处理 Deposit 事件
     */
    private async handleDepositEvent(user: string, amount: bigint, event: any) {
        try {
            const txHash = event.log?.transactionHash || event.transactionHash;
            const blockNumber = event.log?.blockNumber || event.blockNumber;

            this.logger.log(`Deposit detected: ${user} deposited ${amount.toString()} (tx: ${txHash?.slice(0, 10)}...)`);

            // 查找或创建用户
            const dbUser = await this.usersService.findOrCreate(user);

            if (txHash) {
                // 幂等处理，防止重复充值
                const result = await this.usersService.addBalanceFromDeposit(
                    dbUser.id,
                    amount.toString(),
                    txHash,
                    `Block #${blockNumber}`,
                );

                if (result === null) {
                    this.logger.log(`Deposit already processed: ${txHash}`);
                    return;
                }
            } else {
                // 无 txHash 时直接增加余额 (不建议)
                await this.usersService.addBalance(
                    dbUser.id,
                    amount.toString(),
                    {
                        type: TransactionType.DEPOSIT,
                        refType: 'chain_deposit',
                        remark: `Block #${blockNumber}`,
                    },
                );
            }

            this.logger.log(`Deposit processed for user ${user}: +${amount.toString()}`);
        } catch (error) {
            this.logger.error(`Failed to process deposit for ${user}`, error);
        }
    }

    /**
     * 获取监听器状态
     */
    getStatus(): ListenerStatus {
        return {
            isListening: this.isListening,
            mode: this.mode,
            lastBlock: this.lastProcessedBlock,
        };
    }

    async onModuleDestroy() {
        if (this.wsContract) {
            try {
                this.wsContract.removeAllListeners();
            } catch (error) {
                this.logger.error('Error removing WebSocket listeners', error);
            }
        }
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        this.isListening = false;
        this.mode = 'disabled';
        this.logger.log('Deposit listener stopped');
    }
}
