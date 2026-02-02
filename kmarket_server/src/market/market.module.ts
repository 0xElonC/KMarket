import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MarketController } from './market.controller';
import { MarketGateway } from './market.gateway';
import {
    PriceStoreService,
    OddsCalculatorService,
} from './services';
import { MarketConfigService } from './services/market-config.service';
import { GateWsService } from './services/gate-ws.service';
import { GridManagerService } from './services/grid-manager.service';

@Module({
    imports: [EventEmitterModule.forRoot()],
    controllers: [MarketController],
    providers: [
        // 新服务
        MarketConfigService,
        GateWsService,
        GridManagerService,
        MarketGateway,
        // 保留的服务
        PriceStoreService,
        OddsCalculatorService,
    ],
    exports: [
        GridManagerService,
        GateWsService,
        MarketConfigService,
        PriceStoreService,
        OddsCalculatorService,
        MarketGateway,
    ],
})
export class MarketModule { }
