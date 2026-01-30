import { Injectable, Logger } from '@nestjs/common';
import { verifyTypedData, TypedDataDomain } from 'ethers';

export interface BetSignatureData {
    bettor: string;
    amount: string;
    direction: number; // 0 = down, 1 = up
    tickLower: string;
    tickUpper: string;
    duration: number; // seconds
    timestamp: number;
    nonce: number;
}

const BET_TYPES = {
    Bet: [
        { name: 'bettor', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'direction', type: 'uint8' },
        { name: 'tickLower', type: 'uint256' },
        { name: 'tickUpper', type: 'uint256' },
        { name: 'duration', type: 'uint256' },
        { name: 'timestamp', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
    ],
};

@Injectable()
export class SignatureVerifyService {
    private readonly logger = new Logger(SignatureVerifyService.name);

    private readonly domain: TypedDataDomain = {
        name: 'KMarket',
        version: '1',
        chainId: 137, // Polygon mainnet
    };

    verifyBetSignature(data: BetSignatureData, signature: string): string | null {
        try {
            const recoveredAddress = verifyTypedData(
                this.domain,
                BET_TYPES,
                data,
                signature,
            );

            if (recoveredAddress.toLowerCase() !== data.bettor.toLowerCase()) {
                this.logger.warn(`Signature mismatch: expected ${data.bettor}, got ${recoveredAddress}`);
                return null;
            }

            return recoveredAddress;
        } catch (error) {
            this.logger.error('Failed to verify bet signature', error);
            return null;
        }
    }

    isSignatureExpired(timestamp: number, maxAgeSeconds: number = 60): boolean {
        const now = Math.floor(Date.now() / 1000);
        return now - timestamp > maxAgeSeconds;
    }
}
