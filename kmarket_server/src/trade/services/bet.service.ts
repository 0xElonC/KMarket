import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bet, BetStatus } from '../entities/bet.entity';
import { CreateBetDto, BetResponseDto, PositionDto, PositionsResponseDto, HistoryResponseDto, HistorySummaryDto } from '../dto/bet.dto';
import { UsersService } from '../../users/users.service';
import { BlockManagerService } from '../../market/services/block-manager.service';
import { TransactionType } from '../../users/entities/transaction.entity';

@Injectable()
export class BetService {
    private readonly logger = new Logger(BetService.name);

    constructor(
        @InjectRepository(Bet)
        private readonly betRepository: Repository<Bet>,
        private readonly usersService: UsersService,
        private readonly blockManagerService: BlockManagerService,
    ) { }

    async placeBet(userId: number, dto: CreateBetDto): Promise<BetResponseDto> {
        // 1. 获取时间片
        const slice = this.blockManagerService.getSlice(dto.settlementTime);
        if (!slice) {
            throw new BadRequestException('无效的结算时间');
        }
        if (slice.locked) {
            throw new BadRequestException('区块已锁定，不可下注');
        }
        if (slice.status === 'settled') {
            throw new BadRequestException('区块已结算');
        }

        // 2. 获取 Tick 信息
        const tick = slice.ticks.find(t => t.priceTick === dto.priceTick);
        if (!tick) {
            throw new BadRequestException('无效的价格区间');
        }
        if (tick.odds <= 1.0) {
            throw new BadRequestException('赔率不可用');
        }

        const odds = tick.odds;

        // 3. 扣减余额
        await this.usersService.deductBalance(userId, dto.amount, {
            type: TransactionType.BET,
            refType: 'bet',
            remark: `Bet on ${dto.symbol} Tick ${dto.priceTick}`,
        });

        // 4. 创建订单
        const bet = this.betRepository.create({
            userId,
            symbol: dto.symbol,
            amount: dto.amount,
            priceTick: dto.priceTick,
            tickLower: tick.priceRange.lower,
            tickUpper: tick.priceRange.upper,
            basePrice: slice.basisPrice,
            odds: odds.toFixed(4),
            settlementTime: new Date(dto.settlementTime),
            status: BetStatus.ACTIVE,
        });

        const savedBet = await this.betRepository.save(bet);

        this.logger.log(
            `Bet #${savedBet.id} created: User ${userId} bet ${dto.amount} on ${dto.symbol} Tick ${dto.priceTick} @ ${odds}x`,
        );

        return {
            id: savedBet.id,
            symbol: savedBet.symbol,
            amount: savedBet.amount,
            priceTick: savedBet.priceTick,
            priceRange: { lower: savedBet.tickLower, upper: savedBet.tickUpper },
            basePrice: savedBet.basePrice,
            odds: savedBet.odds,
            settlementTime: savedBet.settlementTime,
            status: savedBet.status,
            createdAt: savedBet.createdAt,
        };
    }

    async getActiveBets(userId: number, symbol?: string): Promise<PositionsResponseDto> {
        const whereClause: any = {
            userId,
            status: BetStatus.ACTIVE,
        };
        if (symbol) {
            whereClause.symbol = symbol;
        }

        const bets = await this.betRepository.find({
            where: whereClause,
            order: { settlementTime: 'ASC' },
        });

        const now = Date.now();
        let totalInBets = 0n;

        const items: PositionDto[] = bets.map(bet => {
            const remainingMs = bet.settlementTime.getTime() - now;
            const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
            totalInBets += BigInt(bet.amount);

            return {
                id: bet.id,
                symbol: bet.symbol,
                amount: bet.amount,
                priceTick: bet.priceTick,
                priceRange: { lower: bet.tickLower, upper: bet.tickUpper },
                odds: bet.odds,
                settlementTime: bet.settlementTime,
                remainingSeconds,
                status: bet.status,
            };
        });

        return {
            items,
            totalInBets: totalInBets.toString(),
        };
    }

    async getBetHistory(
        userId: number,
        page: number = 1,
        limit: number = 20,
    ): Promise<HistoryResponseDto> {
        const skip = (page - 1) * limit;

        const [items, total] = await this.betRepository.findAndCount({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit,
            skip,
        });

        // 计算 summary 统计
        const allBets = await this.betRepository.find({ where: { userId } });
        let totalWagered = 0n;
        let totalPayout = 0n;
        let wins = 0;
        let losses = 0;

        for (const bet of allBets) {
            totalWagered += BigInt(bet.amount);
            if (bet.payout) {
                totalPayout += BigInt(bet.payout);
            }
            if (bet.status === BetStatus.WON) wins++;
            if (bet.status === BetStatus.LOST) losses++;
        }

        const netProfit = totalPayout - totalWagered;

        const summary: HistorySummaryDto = {
            totalBets: allBets.length,
            wins,
            losses,
            totalWagered: totalWagered.toString(),
            totalPayout: totalPayout.toString(),
            netProfit: netProfit.toString(),
        };

        const responseItems: BetResponseDto[] = items.map(bet => ({
            id: bet.id,
            symbol: bet.symbol,
            amount: bet.amount,
            priceTick: bet.priceTick,
            priceRange: { lower: bet.tickLower, upper: bet.tickUpper },
            basePrice: bet.basePrice,
            odds: bet.odds,
            settlementTime: bet.settlementTime,
            status: bet.status,
            createdAt: bet.createdAt,
        }));

        return {
            items: responseItems,
            total,
            page,
            limit,
            summary,
        };
    }

    async getExpiredBets(targetDate?: Date): Promise<Bet[]> {
        const date = targetDate || new Date();
        return this.betRepository
            .createQueryBuilder('bet')
            .where('bet.status = :status', { status: BetStatus.ACTIVE })
            .andWhere('bet.settlementTime <= :now', { now: date })
            .getMany();
    }
}
