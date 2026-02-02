import { Controller, Get, Param, Query } from '@nestjs/common';
import { GateWsService, KLineData, PriceData } from './services/gate-ws.service';
import { GridManagerService } from './services/grid-manager.service';
import { MarketConfigService, MarketConfig } from './services/market-config.service';
import { ApiResponse } from '../common/dto';
import { WsGridCell } from './dto/websocket.dto';

@Controller('market')
export class MarketController {
    constructor(
        private readonly gateWsService: GateWsService,
        private readonly gridManagerService: GridManagerService,
        private readonly configService: MarketConfigService,
    ) { }

    /**
     * 获取市场配置
     */
    @Get(':symbol/config')
    getConfig(@Param('symbol') symbol: string): ApiResponse<MarketConfig | null> {
        const config = this.configService.getConfig(symbol);
        return ApiResponse.success(config);
    }

    /**
     * 获取当前价格
     */
    @Get(':symbol/price')
    getCurrentPrice(@Param('symbol') symbol: string): ApiResponse<PriceData | null> {
        const price = this.gateWsService.getCurrentPrice(symbol);
        return ApiResponse.success(price);
    }

    /**
     * 获取K线历史
     */
    @Get(':symbol/kline')
    async getKline(
        @Param('symbol') symbol: string,
        @Query('limit') limit?: string,
    ): Promise<ApiResponse<KLineData[]>> {
        const klines = this.gateWsService.getKlineHistory(symbol, parseInt(limit || '100'));
        return ApiResponse.success(klines);
    }

    /**
     * 获取初始网格 (备用 REST 接口，推荐使用 WebSocket)
     */
    @Get(':symbol/grid/init')
    getInitGrid(@Param('symbol') symbol: string): ApiResponse<{ cells: WsGridCell[]; basePrice: number }> {
        const cells = this.gridManagerService.initGrid(symbol);
        const basePrice = this.gridManagerService.getCurrentPrice(symbol);
        return ApiResponse.success({ cells, basePrice });
    }

    /**
     * 获取支持的交易对
     */
    @Get('symbols')
    getSymbols(): ApiResponse<string[]> {
        const symbols = this.configService.getAllSymbols();
        return ApiResponse.success(symbols);
    }
}
