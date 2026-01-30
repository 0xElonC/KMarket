import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 42, unique: true })
    @Index()
    address: string;

    @Column({ type: 'decimal', precision: 36, scale: 18, default: '0' })
    balance: string;

    /**
     * 待领取余额 - 结算赔付先进入这里，用户需手动领取到 balance
     */
    @Column({ type: 'decimal', precision: 36, scale: 18, default: '0' })
    claimable: string;

    /**
     * @deprecated 废弃字段，在押资金通过 bets 表聚合计算
     */
    @Column({ type: 'decimal', precision: 36, scale: 18, default: '0' })
    frozenBalance: string;

    @Column({ default: 0 })
    withdrawNonce: number;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
