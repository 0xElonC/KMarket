import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from './common/common.module';
import { UsersModule } from './users/users.module';
import { ChainModule } from './chain/chain.module';
import { MarketModule } from './market/market.module';
import { TradeModule } from './trade/trade.module';

// Entities
import { User, Transaction } from './users/entities';
import { Bet } from './trade/entities';

@Module({
  imports: [
    // Global config
    CommonModule,

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        entities: [User, Transaction, Bet],
        synchronize: true, // Only for development!
        logging: process.env.NODE_ENV !== 'production',
        ssl: {
          rejectUnauthorized: false, // Required for Supabase
        },
      }),
      inject: [ConfigService],
    }),

    // Business modules
    UsersModule,
    ChainModule,
    MarketModule,
    TradeModule,
  ],
})
export class AppModule { }
