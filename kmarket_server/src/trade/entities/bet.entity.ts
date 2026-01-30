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

    @Column({ type: 'decimal', precision: 36, scale: 18 })
    amount: string;

    @Column({ type: 'int' })
    priceTick: number; // 价格 Tick (-20 ~ +20)

    @Column({ type: 'decimal', precision: 36, scale: 18 })
    tickLower: string;

    @Column({ type: 'decimal', precision: 36, scale: 18 })
    tickUpper: string;

    @Column({ type: 'decimal', precision: 36, scale: 18 })
    basePrice: string; // 下注时基准价格

    @Column({ type: 'decimal', precision: 10, scale: 4 })
    odds: string;

    @Column({ type: 'enum', enum: BetStatus, default: BetStatus.ACTIVE })
    status: BetStatus;

    @Column({ type: 'decimal', precision: 36, scale: 18, nullable: true })
    settlementPrice?: string;

    @Column({ type: 'decimal', precision: 36, scale: 18, nullable: true })
    payout?: string;

    @Column({ type: 'timestamp' })
    settlementTime: Date; // 结算时间

    @Column({ type: 'timestamp', nullable: true })
    settledAt?: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
