import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { TradeController } from './trade.controller';
import { BetService, SettlementService } from './services';
import { Bet } from './entities/bet.entity';
import { UsersModule } from '../users/users.module';
import { ChainModule } from '../chain/chain.module';
import { MarketModule } from '../market/market.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Bet]),
        ScheduleModule.forRoot(),
        UsersModule,
        ChainModule,
        MarketModule,
    ],
    controllers: [TradeController],
    providers: [BetService, SettlementService],
    exports: [BetService],
})
export class TradeModule { }
