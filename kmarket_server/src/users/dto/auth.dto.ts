import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class LoginDto {
    @IsString()
    @IsNotEmpty()
    message: string;

    @IsString()
    @IsNotEmpty()
    signature: string;

    @IsString()
    @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid Ethereum address' })
    address: string;
}

export class LoginResponseDto {
    accessToken: string;
    user: {
        id: number;
        address: string;
        balance: string;
    };
}
