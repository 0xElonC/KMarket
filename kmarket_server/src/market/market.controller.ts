import { Controller, Get, Query } from '@nestjs/common';
import { PriceStoreService, KLineData, PriceData } from './services/price-store.service';
import { BlockManagerService } from './services/block-manager.service';
import { ApiResponse } from '../common/dto';
import { GridResponseDto } from './dto/grid.dto';

@Controller('market')
export class MarketController {
    constructor(
        private readonly priceStoreService: PriceStoreService,
        private readonly blockManagerService: BlockManagerService,
    ) { }

    @Get('price')
    getCurrentPrice(@Query('symbol') symbol: string = 'ETHUSDT'): ApiResponse<PriceData | null> {
        const price = this.priceStoreService.getCurrentPrice(symbol);
        return ApiResponse.success(price);
    }

    @Get('kline')
    async getKline(
        @Query('symbol') symbol: string = 'ETHUSDT',
        @Query('startTime') startTime?: string,
        @Query('endTime') endTime?: string,
    ): Promise<ApiResponse<KLineData[]>> {
        // Simple implementation for now.
        // If we need chart, we might need a dedicated ChartService or use PriceStore.
        // PriceStore has getKLineHistory (MVP).
        const start = startTime ? parseInt(startTime) : Date.now() - 3600000;
        const end = endTime ? parseInt(endTime) : Date.now();

        const klines = await this.priceStoreService.getKLineHistory(symbol, start, end);
        return ApiResponse.success(klines);
    }

    @Get('grid')
    getGrid(@Query('symbol') symbol: string = 'ETHUSDT'): ApiResponse<GridResponseDto> {
        const slices = this.blockManagerService.getGrid();
        const price = this.priceStoreService.getCurrentPrice(symbol);

        return ApiResponse.success({
            symbol,
            currentPrice: price?.price || '0',
            currentTime: Date.now(),
            slices
        });
    }
}
