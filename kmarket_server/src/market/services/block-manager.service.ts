import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PriceStoreService } from './price-store.service';
import { OddsCalculatorService } from './odds-calculator.service';
import { TimeSlice, TickOdds } from '../dto/grid.dto';

@Injectable()
export class BlockManagerService implements OnModuleInit {
    private readonly logger = new Logger(BlockManagerService.name);
    private readonly WINDOW_DURATION_SEC = 360; // 6 minutes
    private readonly LOCK_DURATION_SEC = 180;   // 3 minutes
    private readonly SYMBOL = 'ETHUSDT';        // Hardcoded for MVP

    // In-memory grid storage
    private slices: TimeSlice[] = [];

    constructor(
        private readonly priceStoreService: PriceStoreService,
        private readonly oddsCalculatorService: OddsCalculatorService,
    ) { }

    onModuleInit() {
        this.initializeGrid();
    }

    private initializeGrid() {
        // Wait for price to be available?
        // If no price, we can't generate grid.
        // We will try to generate in the first tick if empty.
        this.logger.log('BlockManager initialized. Waiting for price data...');
    }

    /**
     * Core Loop: Runs every second
     */
    @Cron('* * * * * *')
    async tick() {
        const priceData = this.priceStoreService.getCurrentPrice(this.SYMBOL);
        if (!priceData) {
            // this.logger.debug('No price data yet, skipping tick');
            return;
        }

        const currentPrice = parseFloat(priceData.price);
        const now = Date.now();
        // Align "now" to the next second boundary for generation
        // But for "current time", use actual now.

        // 1. Remove expired slices (keep settled ones briefly for API, but remove very old)
        // Let's say we keep them for 10 seconds after settlement for frontend to catch up
        this.slices = this.slices.filter(s => s.settlementTime > now - 10000);

        // 2. Ensure we have enough slices (Fill the future)
        this.fillTimeSlices(currentPrice);

        // 3. Update Odds & status for active slices
        this.updateSlices(currentPrice, now);
    }

    private fillTimeSlices(currentPrice: number) {
        // Determine the start time for new slices
        // If empty, start from next second.
        // If not, continue from last slice.

        const now = Date.now();
        const nextSecond = Math.floor(now / 1000) * 1000 + 1000;

        let startTime: number;
        if (this.slices.length === 0) {
            startTime = nextSecond;
        } else {
            const lastSlice = this.slices[this.slices.length - 1];
            startTime = lastSlice.settlementTime + 1000;
        }

        const targetTime = now + (this.WINDOW_DURATION_SEC * 1000);

        // Limit generation to avoid infinite loops if something is wrong
        let count = 0;
        while (startTime <= targetTime && count < 360) {
            const newSlice = this.generateSlice(startTime, currentPrice);
            this.slices.push(newSlice);
            startTime += 1000;
            count++;
        }
    }

    private generateSlice(settlementTime: number, basisPrice: number): TimeSlice {
        return {
            id: `${this.SYMBOL}:${settlementTime}`,
            symbol: this.SYMBOL,
            settlementTime,
            basisPrice: basisPrice.toString(),
            locked: false,
            status: 'pending',
            ticks: this.generateTicks(basisPrice, 0) // Initial odds for 6 mins out (max time)
        };
    }

    private generateTicks(basisPrice: number, timeToSettleMs: number): TickOdds[] {
        const ticks: TickOdds[] = [];
        const tickSizePercent = 0.5; // 0.5%

        // Generate +/- 20 ticks
        for (let i = -20; i <= 20; i++) {
            // Calculate range
            const lower = basisPrice * (1 + (i - 0.5) * tickSizePercent / 100);
            const upper = basisPrice * (1 + (i + 0.5) * tickSizePercent / 100);

            // Calculate odds
            // If locked (checked outside), will be 0.
            // Here we just calc dynamic odds.
            const odds = this.oddsCalculatorService.calculateOdds(i, timeToSettleMs);

            ticks.push({
                priceTick: i,
                priceRange: {
                    lower: lower.toFixed(2),
                    upper: upper.toFixed(2),
                },
                odds: odds
            });
        }
        return ticks;
    }

    private updateSlices(currentPrice: number, now: number) {
        for (const slice of this.slices) {
            if (slice.status === 'settled') continue;

            const timeToSettle = slice.settlementTime - now;

            // Lock logic
            if (timeToSettle <= this.LOCK_DURATION_SEC * 1000) {
                if (!slice.locked) {
                    slice.locked = true;
                    // Freeze odds? 
                    // Yes, odds should be set to 0 or "frozen value".
                    // Impl plan says: "odds=0 means unbettable".
                    // But for display, maybe we want to show the LOCKED odds?
                    // Usually we set odds=0 to prevent betting, but frontend might want to see what it *was*.
                    // Let's set to 0 for strictness or handle in frontend.
                    // Following existing doc: "Odd=0 means unbettable" or "Locked".
                    // Let's keep the odds as is for reference, but betting service will reject.
                    // Actually, if we update odds based on current price, they will drift even after lock if we don't stop updating.
                    // So we MUST STOP updating odds if locked.
                }
            }

            // Update odds if NOT locked
            if (!slice.locked) {
                // Dynamic update based on NEW current price vs this slice's basis
                // Wait, basisPrice is fixed at creation? 
                // If basisPrice is fixed, then PriceTick 0 is always basisPrice.
                // But Current Price moves.
                // So "Distance" changes.
                // Wait, is the grid "fixed" (Tick 0 is fixed price) or "floating"?
                // Design doc 2.2: "3分钟外：动态计算赔率 ... slice.basePrice = currentPrice;"
                // AH! The basis price UPDATES until it locks.
                // This means the grid row definitions (price ranges) SHIFT with market price until lock.
                // Once locked, the grid (price ranges) is FIXED.

                slice.basisPrice = currentPrice.toString();
                // Re-generate ticks with new basis and time
                slice.ticks = this.generateTicks(currentPrice, timeToSettle);
            } else {
                // Locked: ticks are frozen. Do not update.
                // Just mark them as unbettable? 
                // We can set a flag or just rely on slice.locked.
            }
        }
    }

    public getGrid() {
        // Return public view
        return this.slices;
    }

    public getSlice(settlementTime: number): TimeSlice | undefined {
        return this.slices.find(s => s.settlementTime === settlementTime);
    }

    public markSettled(settlementTime: number) {
        const slice = this.getSlice(settlementTime);
        if (slice) {
            slice.status = 'settled';
        }
    }
}
