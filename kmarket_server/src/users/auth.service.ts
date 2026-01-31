import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { verifyMessage } from 'ethers';
import { UsersService } from './users.service';
import { LoginDto, LoginResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async login(loginDto: LoginDto): Promise<LoginResponseDto> {
        const { message, signature, address } = loginDto;

        this.logger.log(`Login attempt - Address: ${address}`);
        this.logger.log(`Message: "${message}"`);
        this.logger.log(`Signature: ${signature}`);

        // Verify the signature
        try {
            this.logger.log('Calling verifyMessage...');
            const recoveredAddress = verifyMessage(message, signature);
            this.logger.log(`Recovered address: ${recoveredAddress}`);
            this.logger.log(`Expected address: ${address}`);

            if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
                this.logger.warn(`Address mismatch: recovered=${recoveredAddress}, expected=${address}`);
                throw new UnauthorizedException('Invalid signature');
            }
            this.logger.log('Signature verified successfully!');
        } catch (error: any) {
            this.logger.error(`Signature verification failed: ${error.message}`);
            this.logger.error(`Error details:`, error);
            throw new UnauthorizedException('Invalid signature');
        }

        // Find or create user
        const user = await this.usersService.findOrCreate(address);

        // Generate JWT
        const payload = { sub: user.id, address: user.address };
        const accessToken = this.jwtService.sign(payload);

        return {
            accessToken,
            user: {
                id: user.id,
                address: user.address,
                balance: user.balance,
            },
        };
    }

    async validateUser(userId: number): Promise<{ id: number; address: string } | null> {
        const user = await this.usersService.findByAddress('');
        // This would need to be implemented with findById
        return null;
    }

    generateNonce(): string {
        return `Sign this message to login to KMarket: ${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }
}
