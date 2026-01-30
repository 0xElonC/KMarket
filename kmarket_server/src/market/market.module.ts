import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MarketController } from './market.controller';
import {
    BinanceService,
    PriceStoreService,
    OddsCalculatorService,
    BlockManagerService,
} from './services';

@Module({
    imports: [EventEmitterModule.forRoot()],
    controllers: [MarketController],
    providers: [
        BinanceService,
        PriceStoreService,
        OddsCalculatorService,
        BlockManagerService,
    ],
    exports: [
        BlockManagerService,
        PriceStoreService,
        OddsCalculatorService,
    ],
})
export class MarketModule { }

