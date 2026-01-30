import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from './user.entity';

export enum TransactionType {
    DEPOSIT = 'deposit',       // 充值
    WITHDRAW = 'withdraw',     // 提现
    BET = 'bet',               // 下注扣款
    WIN = 'win',               // 结算赢 (→ claimable)
    LOSE = 'lose',             // 结算输退款 (→ claimable)
    CLAIM = 'claim',           // 领取待领取余额 (claimable → balance)
    REFUND = 'refund',         // 订单取消退款
    ADMIN_ADJUST = 'admin_adjust', // 管理员调整
}

export enum TransactionStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

@Entity('transactions')
export class Transaction {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    @Index()
    userId: number;

    @Column({ type: 'enum', enum: TransactionType })
    type: TransactionType;

    @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
    status: TransactionStatus;

    @Column({ type: 'decimal', precision: 36, scale: 18 })
    amount: string;

    @Column({ type: 'decimal', precision: 36, scale: 18, default: '0' })
    balanceBefore: string;

    @Column({ type: 'decimal', precision: 36, scale: 18, default: '0' })
    balanceAfter: string;

    @Column({ length: 66, nullable: true })
    @Index()
    txHash?: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata?: Record<string, unknown>;

    /**
     * 关联业务类型: chain_deposit, chain_withdraw, bet, admin
     */
    @Column({ length: 20, nullable: true })
    @Index()
    refType?: string;

    /**
     * 关联业务ID: txHash, betId, adminId 等
     */
    @Column({ length: 100, nullable: true })
    @Index()
    refId?: string;

    /**
     * 备注信息
     */
    @Column({ length: 255, nullable: true })
    remark?: string;

    @CreateDateColumn()
    @Index()
    createdAt: Date;
}
