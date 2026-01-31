import { Controller, Get, Query } from '@nestjs/common';
import { PriceStoreService, KLineData, PriceData } from './services/price-store.service';
import { BlockManagerService } from './services/block-manager.service';
import { ApiResponse } from '../common/dto';
import { ColumnGridResponseDto, GridResponseDto } from './dto/grid.dto';

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
        const start = startTime ? parseInt(startTime) : Date.now() - 3600000;
        const end = endTime ? parseInt(endTime) : Date.now();

        const klines = await this.priceStoreService.getKLineHistory(symbol, start, end);
        return ApiResponse.success(klines);
    }

    /**
     * 获取 6×6 下注网格
     * - 6 列: 时间维度 (3s 间隔)
     * - 6 行: 价格区间 (大涨/中涨/小涨/小跌/中跌/大跌)
     * - 前 2 列锁定，后 4 列可下注
     */
    @Get('grid')
    async getGrid(@Query('symbol') symbol: string = 'ETHUSDT'): Promise<ApiResponse<ColumnGridResponseDto>> {
        const gridData = await this.blockManagerService.getColumnGrid();
        return ApiResponse.success(gridData);
    }
}
