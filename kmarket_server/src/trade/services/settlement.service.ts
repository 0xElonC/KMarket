import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bet, BetStatus } from '../entities/bet.entity';
import { UsersService } from '../../users/users.service';
import { OddsCalculatorService } from '../../market/services/odds-calculator.service';
import { BetService } from './bet.service';

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

    private async settleBet(bet: Bet, exitPrice: number): Promise<void> {
        try {
            const tickLower = parseFloat(bet.tickLower);
            const tickUpper = parseFloat(bet.tickUpper);

            // 判定输赢: [lower, upper)
            const isWin = exitPrice >= tickLower && exitPrice < tickUpper;

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
        } catch (error) {
            this.logger.error(`Failed to settle bet #${bet.id}`, error);
        }
    }
}
