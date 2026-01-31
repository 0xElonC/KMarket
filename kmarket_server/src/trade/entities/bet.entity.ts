import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum BetStatus {
    ACTIVE = 'active',
    WON = 'won',
    LOST = 'lost',
    CANCELLED = 'cancelled',
}

@Entity('bets')
@Index('idx_bets_user_created', ['userId', 'createdAt'])
@Index('idx_bets_settlement', ['status', 'settlementTime'])
@Index('idx_bets_symbol', ['symbol', 'settlementTime'])
@Index('idx_bets_tickId', ['tickId'])
export class Bet {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    userId: number;

    @Column({ length: 20 })
    symbol: string; // e.g., "ETHUSDT"

    @Column({ length: 50 })
    tickId: string; // e.g., "1706600003000_3" (expiryTime_rowIndex)

    @Column({ type: 'int' })
    rowIndex: number; // 行索引 (1-6)

    @Column({ type: 'decimal', precision: 36, scale: 18 })
    amount: string;

    @Column({ type: 'decimal', precision: 36, scale: 18, nullable: true })
    priceRangeMin: string | null; // 价格区间下限 (null = 无下限)

    @Column({ type: 'decimal', precision: 36, scale: 18, nullable: true })
    priceRangeMax: string | null; // 价格区间上限 (null = 无上限)

    @Column({ type: 'decimal', precision: 36, scale: 18 })
    basisPrice: string; // 下注时的基准价格

    @Column({ type: 'decimal', precision: 10, scale: 4 })
    odds: string; // 下注时锁定的赔率

    @Column({ type: 'enum', enum: BetStatus, default: BetStatus.ACTIVE })
    status: BetStatus;

    @Column({ type: 'decimal', precision: 36, scale: 18, nullable: true })
    settlementPrice?: string; // 结算价格

    @Column({ type: 'decimal', precision: 36, scale: 18, nullable: true })
    payout?: string; // 派彩金额

    @Column({ type: 'timestamp' })
    settlementTime: Date; // 结算时间 (= expiryTime)

    @Column({ type: 'timestamp', nullable: true })
    settledAt?: Date; // 实际结算时间

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // ============ 废弃字段 (兼容旧数据) ============

    @Column({ type: 'int', nullable: true })
    priceTick?: number; // @deprecated - 使用 rowIndex

    @Column({ type: 'decimal', precision: 36, scale: 18, nullable: true })
    tickLower?: string; // @deprecated - 使用 priceRangeMin

    @Column({ type: 'decimal', precision: 36, scale: 18, nullable: true })
    tickUpper?: string; // @deprecated - 使用 priceRangeMax

    @Column({ type: 'decimal', precision: 36, scale: 18, nullable: true })
    basePrice?: string; // @deprecated - 使用 basisPrice
}
