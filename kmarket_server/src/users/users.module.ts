import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { User, Transaction } from './entities';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Transaction]),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('jwt.secret') || 'kmarket-dev-secret',
                signOptions: {
                    expiresIn: 604800, // 7 days in seconds
                },
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [UsersController],
    providers: [UsersService, AuthService, JwtStrategy],
    exports: [UsersService],
})
export class UsersModule { }
