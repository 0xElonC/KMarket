import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import WebSocket from 'ws';

@Injectable()
export class BinanceService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(BinanceService.name);
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private readonly maxReconnectAttempts = 10;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private readonly symbol = 'ethusdt'; // Configurable later if needed

    constructor(
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    onModuleInit() {
        this.connect();
    }

    private connect() {
        const wsUrl = this.configService.get<string>('exchange.binanceWsUrl', 'wss://stream.binance.com:9443/ws');
        const streamUrl = `${wsUrl}/${this.symbol}@kline_1s`;

        try {
            this.ws = new WebSocket(streamUrl);

            this.ws.on('open', () => {
                this.logger.log(`Connected to Binance WebSocket: ${streamUrl}`);
                this.reconnectAttempts = 0;
            });

            this.ws.on('message', (data: Buffer) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleMessage(message);
                } catch (error) {
                    this.logger.error('Failed to parse WebSocket message', error);
                }
            });

            this.ws.on('error', (error) => {
                this.logger.error('WebSocket error', error);
            });

            this.ws.on('close', () => {
                this.logger.warn('WebSocket connection closed');
                this.scheduleReconnect();
            });
        } catch (error) {
            this.logger.error('Failed to connect to WebSocket', error);
            this.scheduleReconnect();
        }
    }

    private handleMessage(message: any) {
        if (message.e !== 'kline') return;

        const k = message.k;
        const price = k.c; // Close price
        const timestamp = k.t; // Start time of the kline
        const isClosed = k.x; // Is this kline closed?

        // 1. Emit real-time price update (for UI & Odds calculation)
        this.eventEmitter.emit('market.price.updated', {
            symbol: message.s,
            price: price,
            timestamp: Date.now(),
        });

        // 2. Emit Kline Closed event (for Settlement) ONLY when k.x is true
        if (isClosed) {
            this.logger.log(`Kline closed: ${message.s} @ ${price} (Time: ${timestamp})`);

            // Emit async event for settlement
            this.eventEmitter.emitAsync('market.kline.closed', {
                symbol: message.s,
                price: price,
                timestamp: timestamp,
                kline: {
                    o: k.o,
                    h: k.h,
                    l: k.l,
                    c: k.c,
                    v: k.v,
                    T: k.T // Close time
                }
            });
        }
    }

    private scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.logger.error('Max reconnection attempts reached. Manual intervention required.');
            return;
        }

        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;

        this.logger.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, delay);
    }

    onModuleDestroy() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        if (this.ws) {
            this.ws.close();
        }
        this.logger.log('Binance service stopped');
    }
}
