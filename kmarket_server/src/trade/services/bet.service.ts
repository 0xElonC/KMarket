import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bet, BetStatus } from '../entities/bet.entity';
import { CreateBetDto, BetResponseDto, PositionDto, PositionsResponseDto, HistoryResponseDto, HistorySummaryDto } from '../dto/bet.dto';
import { UsersService } from '../../users/users.service';
import { BlockManagerService } from '../../market/services/block-manager.service';
import { TransactionType } from '../../users/entities/transaction.entity';

// 价格区间标签
const ROW_LABELS = ['+2%↑', '+1%~+2%', '0~+1%', '-1%~0', '-2%~-1%', '-2%↓'];

@Injectable()
export class BetService {
    private readonly logger = new Logger(BetService.name);

    constructor(
        @InjectRepository(Bet)
        private readonly betRepository: Repository<Bet>,
        private readonly usersService: UsersService,
        private readonly blockManagerService: BlockManagerService,
    ) { }

    /**
     * 下注
     */
    async placeBet(userId: number, dto: CreateBetDto): Promise<BetResponseDto> {
        // 1. 用 tickId 从 Redis 获取区块数据
        const columnData = await this.blockManagerService.getColumnByTickId(dto.tickId);

        // 取不到 或 已过期 统一提示
        if (!columnData || columnData.expiryTime <= Date.now()) {
            throw new BadRequestException('区块已过期');
        }

        // 检查是否在锁定期 (距离结算 <= 6s)
        const timeToSettle = (columnData.expiryTime - Date.now()) / 1000;
        if (timeToSettle <= 6) { // LOCKED_COLS * INTERVAL_SEC
            throw new BadRequestException('区块已锁定，无法下注');
        }

        // 2. 扣减余额
        await this.usersService.deductBalance(userId, dto.amount, {
            type: TransactionType.BET,
            refType: 'bet',
            remark: `Bet on ${dto.symbol} ${ROW_LABELS[columnData.rowIndex - 1] || ''}`,
        });

        // 3. 创建订单 (使用从 Redis 读取的数据)
        const bet = this.betRepository.create({
            userId,
            symbol: dto.symbol,
            tickId: dto.tickId,
            rowIndex: columnData.rowIndex,
            amount: dto.amount,
            priceRangeMin: columnData.priceRange.min?.toString() || null,
            priceRangeMax: columnData.priceRange.max?.toString() || null,
            basisPrice: columnData.basisPrice,
            odds: columnData.odds,
            settlementTime: new Date(columnData.expiryTime),
            status: BetStatus.ACTIVE,
        });

        const savedBet = await this.betRepository.save(bet);

        this.logger.log(
            `Bet #${savedBet.id} created: User ${userId} bet ${dto.amount} on ${dto.symbol} [${ROW_LABELS[columnData.rowIndex - 1]}] @ ${columnData.odds}x`,
        );

        return this.toBetResponseDto(savedBet);
    }

    /**
     * 获取用户持仓
     */
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
                tickId: bet.tickId,
                rowIndex: bet.rowIndex,
                amount: bet.amount,
                priceRange: {
                    min: bet.priceRangeMin,
                    max: bet.priceRangeMax,
                },
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

    /**
     * 获取下注历史
     */
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

        // 计算统计
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

        const responseItems: BetResponseDto[] = items.map(bet => this.toBetResponseDto(bet));

        return {
            items: responseItems,
            total,
            page,
            limit,
            summary,
        };
    }

    /**
     * 获取已过期待结算的注单
     */
    async getExpiredBets(targetDate?: Date): Promise<Bet[]> {
        const date = targetDate || new Date();
        return this.betRepository
            .createQueryBuilder('bet')
            .where('bet.status = :status', { status: BetStatus.ACTIVE })
            .andWhere('bet.settlementTime <= :now', { now: date })
            .getMany();
    }

    /**
     * 转换为响应 DTO
     */
    private toBetResponseDto(bet: Bet): BetResponseDto {
        return {
            id: bet.id,
            symbol: bet.symbol,
            tickId: bet.tickId,
            rowIndex: bet.rowIndex,
            amount: bet.amount,
            priceRange: {
                min: bet.priceRangeMin,
                max: bet.priceRangeMax,
                label: ROW_LABELS[bet.rowIndex - 1],
            },
            basisPrice: bet.basisPrice,
            odds: bet.odds,
            settlementTime: bet.settlementTime,
            status: bet.status,
            createdAt: bet.createdAt,
        };
    }
}
