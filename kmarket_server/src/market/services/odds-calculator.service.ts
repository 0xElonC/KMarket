import { Injectable, Logger } from '@nestjs/common';

export interface OddsConfig {
    baseOdds: number;
    maxOdds: number;
    minOdds: number;
    tickSize: number; // e.g. 0.5 (%)
}

@Injectable()
export class OddsCalculatorService {
    private readonly logger = new Logger(OddsCalculatorService.name);

    private readonly defaultConfig: OddsConfig = {
        baseOdds: 1.1,
        maxOdds: 20.0,
        minOdds: 1.05,
        tickSize: 0.5,
    };

    /**
     * Calculate odds based on price distance and time remaining
     * @param priceTick The tick index away from current price (e.g., -5, 0, +10)
     * @param timeToSettleMs Time remaining until settlement in milliseconds
     * @param config Optional configuration override
     */
    calculateOdds(
        priceTick: number,
        timeToSettleMs: number,
        config: OddsConfig = this.defaultConfig,
    ): number {
        const { baseOdds, maxOdds, minOdds, tickSize } = config;

        // 1. Price Distance Factor
        // Convert tick count to percentage distance
        const distance = Math.abs(priceTick) * tickSize;
        let priceFactor: number;

        // Formula from 03_MARKET_MODULE.md
        if (distance >= 50) {
            priceFactor = 20.0; // Cap
        } else if (distance <= 1) {
            priceFactor = distance * 0.3;
        } else if (distance <= 5) {
            priceFactor = 0.3 + (distance - 1) * 0.4;
        } else if (distance <= 10) {
            priceFactor = 1.9 + (distance - 5) * 0.5;
        } else {
            priceFactor = 4.4 + (distance - 10) * 0.3;
        }

        // 2. Time Decay Factor
        // Map 3~6 mins (180s ~ 360s) to 0 ~ 1 for normalization
        // timeToSettleMs is effectively 180s + elapsed(0~180s) in the bettable window
        // But actually, for 3~6 mins block:
        // At creation (+6m): timeToSettle = 360s. Normalized = 1.
        // At lock (+3m): timeToSettle = 180s. Normalized = 0.

        const secondsAhead = timeToSettleMs / 1000;
        let normalizedTime = (secondsAhead - 180) / 180;

        // Clamp normalized time
        if (normalizedTime < 0) normalizedTime = 0;
        if (normalizedTime > 1) normalizedTime = 1;

        // Factor = 1 - 0.5 * normalizedTime
        // At +6m (Norm=1): Factor = 0.5
        // At +3m (Norm=0): Factor = 1.0 (Full price factor applied close to lock)
        const timeFactor = 1 - 0.5 * normalizedTime;

        // 3. Final Calculation
        let odds = baseOdds + (priceFactor * timeFactor);

        // 4. Clamping
        return Math.round(Math.max(minOdds, Math.min(maxOdds, odds)) * 100) / 100;
    }

    calculatePayout(amount: string, odds: number): string {
        try {
            const betAmount = BigInt(amount);
            // odds is float (e.g. 1.5). We need precision.
            // Payout = Amount * Odds
            // Using Number for odds might lose precision for large amounts if not careful, 
            // but typical "Odds" usage in betting allows 2 decimals.
            // 1.50 * 100 = 150.
            // Safe approach: Convert odds to integer (x100), multiply, divide by 100.
            const oddsInt = Math.round(odds * 100);
            const payout = (betAmount * BigInt(oddsInt)) / 100n;
            return payout.toString();
        } catch (e) {
            // Fallback for non-integer amount strings or other issues
            const val = parseFloat(amount) * odds;
            return Math.floor(val).toString(); // Return as string integer (Wei)
        }
    }

    calculateRefund(amount: string, odds: number): string {
        try {
            const betAmount = BigInt(amount);
            // Refund = Amount / Odds
            // Amount * 100 / (Odds * 100)
            const oddsInt = Math.round(odds * 100);
            if (oddsInt === 0) return '0';
            const refund = (betAmount * 100n) / BigInt(oddsInt);
            return refund.toString();
        } catch (e) {
            const val = parseFloat(amount) / odds;
            return Math.floor(val).toString();
        }
    }
}
