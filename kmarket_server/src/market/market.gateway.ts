import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { GridManagerService } from './services/grid-manager.service';
import { GateWsService } from './services/gate-ws.service';
import type { PriceData, KLineData } from './services/gate-ws.service';
import { MarketConfigService } from './services/market-config.service';
import {
    WsMessageType,
    WsGridCell,
    WsInitGridDto,
    WsPriceUpdateDto,
    WsGridAppendDto,
    WsCellSettleDto,
    WsKlineUpdateDto,
} from './dto/websocket.dto';

@WebSocketGateway({
    namespace: '/market',
    cors: {
        origin: '*',
        credentials: true,
    },
})
export class MarketGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    private readonly logger = new Logger(MarketGateway.name);

    constructor(
        private readonly gridManagerService: GridManagerService,
        private readonly gateWsService: GateWsService,
        private readonly configService: MarketConfigService,
    ) { }

    afterInit(server: Server) {
        this.logger.log('Market WebSocket Gateway initialized');
    }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    /**
     * 订阅市场
     */
    @SubscribeMessage('subscribe')
    handleSubscribe(
        @ConnectedSocket() client: Socket,
        @MessageBody() symbol: string,
    ) {
        const normalizedSymbol = symbol || 'ETH_USDT';
        client.join(`market:${normalizedSymbol}`);
        this.logger.log(`Client ${client.id} subscribed to ${normalizedSymbol}`);

        // 发送配置
        const config = this.configService.getConfig(normalizedSymbol);
        if (config) {
            client.emit('CONFIG', config);
        }

        // 发送初始网格
        const cells = this.gridManagerService.initGrid(normalizedSymbol);
        const priceData = this.gateWsService.getCurrentPrice(normalizedSymbol);

        const initMsg: WsInitGridDto = {
            type: WsMessageType.INIT_GRID,
            data: {
                symbol: normalizedSymbol,
                basePrice: priceData ? parseFloat(priceData.price) : 0,
                timestamp: Date.now(),
                cells,
            },
        };

        client.emit(WsMessageType.INIT_GRID, initMsg);

        return { status: 'subscribed', symbol: normalizedSymbol };
    }

    /**
     * 取消订阅
     */
    @SubscribeMessage('unsubscribe')
    handleUnsubscribe(
        @ConnectedSocket() client: Socket,
        @MessageBody() symbol: string,
    ) {
        client.leave(`market:${symbol}`);
        this.logger.log(`Client ${client.id} unsubscribed from ${symbol}`);
        return { status: 'unsubscribed', symbol };
    }

    /**
     * 监听价格更新事件，广播给订阅者
     */
    @OnEvent('market.price.update')
    handlePriceUpdate(priceData: PriceData) {
        const msg: WsPriceUpdateDto = {
            type: WsMessageType.PRICE_UPDATE,
            data: {
                price: parseFloat(priceData.price),
                timestamp: priceData.timestamp,
                change24h: priceData.change24h,
            },
        };

        this.server.to(`market:${priceData.symbol}`).emit(WsMessageType.PRICE_UPDATE, msg);
    }

    /**
     * 监听网格追加事件
     */
    @OnEvent('market.grid.append')
    handleGridAppend(event: { symbol: string; cells: WsGridCell[] }) {
        const msg: WsGridAppendDto = {
            type: WsMessageType.GRID_APPEND,
            data: {
                cells: event.cells,
            },
        };

        this.server.to(`market:${event.symbol}`).emit(WsMessageType.GRID_APPEND, msg);
    }

    /**
     * 监听K线更新事件
     */
    @OnEvent('market.kline.update')
    handleKlineUpdate(event: { symbol: string; kline: KLineData }) {
        const msg: WsKlineUpdateDto = {
            type: WsMessageType.KLINE_UPDATE,
            data: event.kline,
        };

        this.server.to(`market:${event.symbol}`).emit(WsMessageType.KLINE_UPDATE, msg);
    }

    /**
     * 发送结算通知 (由 SettlementService 调用)
     */
    emitCellSettle(symbol: string, data: WsCellSettleDto['data']) {
        const msg: WsCellSettleDto = {
            type: WsMessageType.CELL_SETTLE,
            data,
        };

        this.server.to(`market:${symbol}`).emit(WsMessageType.CELL_SETTLE, msg);
    }
}
