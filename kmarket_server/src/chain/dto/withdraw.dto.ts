import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class WithdrawRequestDto {
    @IsString()
    @IsNotEmpty()
    amount: string;
}

export class WithdrawResponseDto {
    user: string;
    amount: string;
    nonce: number;
    expiry: number;
    signature: string;
}
