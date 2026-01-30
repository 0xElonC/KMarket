import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Transaction, TransactionType, TransactionStatus } from './entities/transaction.entity';

/**
 * 余额操作选项
 */
export interface BalanceOptions {
    type: TransactionType;
    refType?: string;
    refId?: string;
    txHash?: string;
    remark?: string;
    metadata?: Record<string, unknown>;
}

/**
 * 余额响应
 */
export interface BalanceResponse {
    available: string;
    claimable: string;
    inBets: string;
    total: string;
}

/**
 * 领取响应
 */
export interface ClaimResponse {
    claimed: string;
    newBalance: string;
}

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
        private readonly dataSource: DataSource,
    ) { }

    async findByAddress(address: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: { address: address.toLowerCase() },
        });
    }

    async findById(userId: number): Promise<User | null> {
        return this.userRepository.findOne({
            where: { id: userId },
        });
    }

    async findOrCreate(address: string): Promise<User> {
        const normalizedAddress = address.toLowerCase();
        let user = await this.findByAddress(normalizedAddress);

        if (!user) {
            user = this.userRepository.create({
                address: normalizedAddress,
                balance: '0',
                claimable: '0',
                frozenBalance: '0', // 废弃字段，保留兼容
            });
            user = await this.userRepository.save(user);
            this.logger.log(`Created new user: ${normalizedAddress}`);
        }

        return user;
    }

    /**
     * 获取用户余额信息
     * @returns available: 可用余额, claimable: 待领取, inBets: 在押, total: 总资产
     */
    async getBalance(userId: number): Promise<BalanceResponse> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const inBets = await this.getInBetsAmount(userId);
        const available = user.balance;
        const claimable = user.claimable;

        const total = (
            BigInt(available) +
            BigInt(claimable) +
            BigInt(inBets)
        ).toString();

        return { available, claimable, inBets, total };
    }

    /**
     * 获取在押资金 (从 bets 表聚合)
     * 注意: bets 表由 Trade 模块管理，这里需要跨模块查询
     */
    async getInBetsAmount(userId: number): Promise<string> {
        // TODO: Trade 模块实现后，使用实际查询
        // SELECT COALESCE(SUM(amount), 0) FROM bets WHERE userId = ? AND status = 'active'
        // 暂时返回 0
        return '0';
    }

    /**
     * 增加用户余额 (通用方法)
     */
    async addBalance(
        userId: number,
        amount: string,
        options: BalanceOptions,
    ): Promise<User> {
        return this.dataSource.transaction(async (manager) => {
            const user = await manager.findOne(User, {
                where: { id: userId },
                lock: { mode: 'pessimistic_write' },
            });

            if (!user) {
                throw new NotFoundException('User not found');
            }

            const balanceBefore = user.balance;
            const newBalance = (BigInt(user.balance) + BigInt(amount)).toString();
            user.balance = newBalance;

            await manager.save(User, user);

            const transaction = manager.create(Transaction, {
                userId,
                type: options.type,
                status: TransactionStatus.COMPLETED,
                amount,
                balanceBefore,
                balanceAfter: newBalance,
                txHash: options.txHash,
                refType: options.refType,
                refId: options.refId,
                remark: options.remark,
                metadata: options.metadata,
            });
            await manager.save(Transaction, transaction);

            this.logger.log(`Added balance: userId=${userId}, amount=${amount}, type=${options.type}`);
            return user;
        });
    }

    /**
     * 扣减用户余额
     * @throws BadRequestException 余额不足时抛出
     */
    async deductBalance(
        userId: number,
        amount: string,
        options: BalanceOptions,
    ): Promise<User> {
        return this.dataSource.transaction(async (manager) => {
            const user = await manager.findOne(User, {
                where: { id: userId },
                lock: { mode: 'pessimistic_write' },
            });

            if (!user) {
                throw new NotFoundException('User not found');
            }

            const currentBalance = BigInt(user.balance);
            const deductAmount = BigInt(amount);

            if (currentBalance < deductAmount) {
                throw new BadRequestException('Insufficient balance');
            }

            const balanceBefore = user.balance;
            const newBalance = (currentBalance - deductAmount).toString();
            user.balance = newBalance;

            await manager.save(User, user);

            const transaction = manager.create(Transaction, {
                userId,
                type: options.type,
                status: TransactionStatus.COMPLETED,
                amount,
                balanceBefore,
                balanceAfter: newBalance,
                refType: options.refType,
                refId: options.refId,
                remark: options.remark,
                metadata: options.metadata,
            });
            await manager.save(Transaction, transaction);

            this.logger.log(`Deducted balance: userId=${userId}, amount=${amount}, type=${options.type}`);
            return user;
        });
    }

    /**
     * 结算赢 - 赔付进入待领取余额
     * @param payout 赔付金额 (本金 × 赔率)
     */
    async settleWin(
        userId: number,
        payout: string,
        betId: number,
    ): Promise<User> {
        return this.dataSource.transaction(async (manager) => {
            const user = await manager.findOne(User, {
                where: { id: userId },
                lock: { mode: 'pessimistic_write' },
            });

            if (!user) {
                throw new NotFoundException('User not found');
            }

            const claimableBefore = user.claimable;
            const newClaimable = (BigInt(user.claimable) + BigInt(payout)).toString();
            user.claimable = newClaimable;

            await manager.save(User, user);

            const transaction = manager.create(Transaction, {
                userId,
                type: TransactionType.WIN,
                status: TransactionStatus.COMPLETED,
                amount: payout,
                balanceBefore: claimableBefore,
                balanceAfter: newClaimable,
                refType: 'bet',
                refId: betId.toString(),
                remark: '结算赢',
            });
            await manager.save(Transaction, transaction);

            this.logger.log(`Settlement WIN: userId=${userId}, payout=${payout}, betId=${betId}`);
            return user;
        });
    }

    /**
     * 结算输 - 退款进入待领取余额
     * @param refundAmount 退款金额 (本金 / 赔率)，0 表示全亏
     */
    async settleLose(
        userId: number,
        refundAmount: string,
        betId: number,
    ): Promise<User> {
        // 全亏时不产生流水
        if (refundAmount === '0') {
            const user = await this.userRepository.findOne({ where: { id: userId } });
            if (!user) {
                throw new NotFoundException('User not found');
            }
            this.logger.log(`Settlement LOSE (no refund): userId=${userId}, betId=${betId}`);
            return user;
        }

        return this.dataSource.transaction(async (manager) => {
            const user = await manager.findOne(User, {
                where: { id: userId },
                lock: { mode: 'pessimistic_write' },
            });

            if (!user) {
                throw new NotFoundException('User not found');
            }

            const claimableBefore = user.claimable;
            const newClaimable = (BigInt(user.claimable) + BigInt(refundAmount)).toString();
            user.claimable = newClaimable;

            await manager.save(User, user);

            const transaction = manager.create(Transaction, {
                userId,
                type: TransactionType.LOSE,
                status: TransactionStatus.COMPLETED,
                amount: refundAmount,
                balanceBefore: claimableBefore,
                balanceAfter: newClaimable,
                refType: 'bet',
                refId: betId.toString(),
                remark: '结算输退款',
            });
            await manager.save(Transaction, transaction);

            this.logger.log(`Settlement LOSE: userId=${userId}, refund=${refundAmount}, betId=${betId}`);
            return user;
        });
    }

    /**
     * 领取待领取余额到可用余额
     */
    async claim(userId: number): Promise<ClaimResponse> {
        return this.dataSource.transaction(async (manager) => {
            const user = await manager.findOne(User, {
                where: { id: userId },
                lock: { mode: 'pessimistic_write' },
            });

            if (!user) {
                throw new NotFoundException('User not found');
            }

            const claimableAmount = BigInt(user.claimable);
            if (claimableAmount <= 0n) {
                throw new BadRequestException('No claimable balance');
            }

            const claimed = user.claimable;
            const balanceBefore = user.balance;
            const newBalance = (BigInt(user.balance) + claimableAmount).toString();

            user.balance = newBalance;
            user.claimable = '0';

            await manager.save(User, user);

            const transaction = manager.create(Transaction, {
                userId,
                type: TransactionType.CLAIM,
                status: TransactionStatus.COMPLETED,
                amount: claimed,
                balanceBefore,
                balanceAfter: newBalance,
                remark: '领取待领取余额',
            });
            await manager.save(Transaction, transaction);

            this.logger.log(`Claimed: userId=${userId}, amount=${claimed}, newBalance=${newBalance}`);
            return { claimed, newBalance };
        });
    }

    /**
     * 幂等充值 - 检查 txHash 防止重复处理
     */
    async addBalanceFromDeposit(
        userId: number,
        amount: string,
        txHash: string,
        remark?: string,
    ): Promise<User | null> {
        // 检查是否已处理
        const existing = await this.transactionRepository.findOne({
            where: { txHash },
        });
        if (existing) {
            this.logger.warn(`Deposit already processed: txHash=${txHash}`);
            return null;
        }

        return this.addBalance(userId, amount, {
            type: TransactionType.DEPOSIT,
            refType: 'chain_deposit',
            refId: txHash,
            txHash,
            remark: remark || `Deposit from chain`,
        });
    }

    /**
     * @deprecated 使用 bets 表聚合代替
     */
    async freezeBalance(userId: number, amount: string): Promise<User> {
        return this.dataSource.transaction(async (manager) => {
            const user = await manager.findOne(User, {
                where: { id: userId },
                lock: { mode: 'pessimistic_write' },
            });

            if (!user) {
                throw new NotFoundException('User not found');
            }

            const currentBalance = BigInt(user.balance);
            const freezeAmount = BigInt(amount);

            if (currentBalance < freezeAmount) {
                throw new BadRequestException('Insufficient balance to freeze');
            }

            user.balance = (currentBalance - freezeAmount).toString();
            user.frozenBalance = (BigInt(user.frozenBalance) + freezeAmount).toString();

            return manager.save(User, user);
        });
    }

    /**
     * @deprecated 使用 bets 表聚合代替
     */
    async unfreezeBalance(userId: number, amount: string): Promise<User> {
        return this.dataSource.transaction(async (manager) => {
            const user = await manager.findOne(User, {
                where: { id: userId },
                lock: { mode: 'pessimistic_write' },
            });

            if (!user) {
                throw new NotFoundException('User not found');
            }

            const frozenBalance = BigInt(user.frozenBalance);
            const unfreezeAmount = BigInt(amount);

            if (frozenBalance < unfreezeAmount) {
                throw new BadRequestException('Insufficient frozen balance');
            }

            user.balance = (BigInt(user.balance) + unfreezeAmount).toString();
            user.frozenBalance = (frozenBalance - unfreezeAmount).toString();

            return manager.save(User, user);
        });
    }

    async incrementWithdrawNonce(userId: number): Promise<number> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        user.withdrawNonce += 1;
        await this.userRepository.save(user);

        return user.withdrawNonce;
    }

    /**
     * 获取交易流水
     * @param type 可选，按类型过滤
     */
    async getTransactions(
        userId: number,
        limit: number = 20,
        offset: number = 0,
        type?: TransactionType,
    ): Promise<{ items: Transaction[]; total: number }> {
        const where: { userId: number; type?: TransactionType } = { userId };
        if (type) {
            where.type = type;
        }

        const [items, total] = await this.transactionRepository.findAndCount({
            where,
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });

        return { items, total };
    }
}
