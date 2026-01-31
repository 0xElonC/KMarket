import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bet, BetStatus } from '../entities/bet.entity';
import { UsersService } from '../../users/users.service';
import { OddsCalculatorService } from '../../market/services/odds-calculator.service';
import { BetService } from './bet.service';
import { BlockManagerService } from '../../market/services/block-manager.service';

@Injectable()
export class SettlementService {
    private readonly logger = new Logger(SettlementService.name);
    private processingTimestamps = new Set<number>();

    constructor(
        @InjectRepository(Bet)
        private readonly betRepository: Repository<Bet>,
        private readonly betService: BetService,
        private readonly usersService: UsersService,
        private readonly oddsCalculatorService: OddsCalculatorService,
        private readonly blockManagerService: BlockManagerService,
    ) { }

    /**
     * Event Driven Settlement
     * Triggered when a K-line closes in Market Module
     */
    @OnEvent('market.kline.closed')
    async handleKlineClosed(event: { symbol: string; price: string; timestamp: number }) {
        // Prevent duplicate processing
        if (this.processingTimestamps.has(event.timestamp)) {
            return;
        }
        this.processingTimestamps.add(event.timestamp);

        // Cleanup old timestamps (keep last 60)
        if (this.processingTimestamps.size > 60) {
            const arr = Array.from(this.processingTimestamps);
            arr.slice(0, arr.length - 60).forEach(t => this.processingTimestamps.delete(t));
        }

        try {
            // Find bets expiring at (or before) this K-line timestamp
            const settlementDate = new Date(event.timestamp);
            const expiredBets = await this.betService.getExpiredBets(settlementDate);

            // Filter by symbol
            const matchingBets = expiredBets.filter(bet => bet.symbol === event.symbol);

            if (matchingBets.length > 0) {
                this.logger.log(`Settling ${matchingBets.length} bets for ${event.symbol} at ${event.timestamp} (Price: ${event.price})`);
            }

            for (const bet of matchingBets) {
                await this.settleBet(bet, parseFloat(event.price));
            }
        } catch (error) {
            this.logger.error('Settlement processing error', error);
        }
    }

    /**
     * 结算单个注单
     */
    private async settleBet(bet: Bet, exitPrice: number): Promise<void> {
        try {
            // 使用订单中保存的 basisPrice 和 rowIndex 判断输赢
            const basisPrice = parseFloat(bet.basisPrice);
            const priceChangePercent = ((exitPrice - basisPrice) / basisPrice) * 100;

            // 判断中奖行
            const winningRow = this.blockManagerService.getWinningRow(priceChangePercent);

            // 判定输赢: 用户下注的行 == 中奖行
            const isWin = bet.rowIndex === (winningRow + 1); // winningRow 是 0-based, rowIndex 是 1-based

            const odds = parseFloat(bet.odds);

            if (isWin) {
                // Win: payout = Principal * Odds
                const payout = this.oddsCalculatorService.calculatePayout(bet.amount, odds);

                await this.usersService.settleWin(bet.userId, payout, bet.id);

                bet.status = BetStatus.WON;
                bet.payout = payout;

                this.logger.log(`Bet #${bet.id} WON: payout ${payout} -> claimable`);
            } else {
                // Loss: refund = Principal / Odds
                const refund = this.oddsCalculatorService.calculateRefund(bet.amount, odds);

                await this.usersService.settleLose(bet.userId, refund, bet.id);

                bet.status = BetStatus.LOST;
                bet.payout = refund;

                this.logger.log(`Bet #${bet.id} LOST: refund ${refund} -> claimable`);
            }

            bet.settlementPrice = exitPrice.toString();
            bet.settledAt = new Date();

            await this.betRepository.save(bet);

            // 记录结算结果到 BlockManager (用于 API 显示)
            this.blockManagerService.recordSettlement(
                bet.settlementTime.getTime(),
                exitPrice.toString(),
                bet.basisPrice,
            );
        } catch (error) {
            this.logger.error(`Failed to settle bet #${bet.id}`, error);
        }
    }
}
