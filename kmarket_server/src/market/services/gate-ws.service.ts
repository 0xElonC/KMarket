import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import WebSocket from 'ws';

export interface PriceData {
    symbol: string;
    price: string;
    timestamp: number;
    change24h: number;
}

export interface KLineData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

@Injectable()
export class GateWsService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(GateWsService.name);
    private ws: WebSocket | null = null;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private pingTimer: NodeJS.Timeout | null = null;
    private isConnected = false;

    private currentPrices: Map<string, PriceData> = new Map();
    private klineBuffer: Map<string, KLineData[]> = new Map();

    constructor(private readonly eventEmitter: EventEmitter2) { }

    onModuleInit() {
        this.connect();
    }

    onModuleDestroy() {
        this.disconnect();
    }

    private connect() {
        this.logger.log('Connecting to Gate.io WebSocket...');

        try {
            this.ws = new WebSocket('wss://api.gateio.ws/ws/v4/');

            this.ws.on('open', () => {
                this.isConnected = true;
                this.logger.log('Gate.io WebSocket connected');

                // Subscribe to ETH_USDT ticker
                this.subscribe('ETH_USDT');

                // Start ping interval
                this.pingTimer = setInterval(() => {
                    if (this.ws?.readyState === WebSocket.OPEN) {
                        this.ws.send(JSON.stringify({
                            time: Math.floor(Date.now() / 1000),
                            channel: 'spot.ping',
                        }));
                    }
                }, 15000);
            });

            this.ws.on('message', (data: WebSocket.Data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    this.handleMessage(msg);
                } catch (err) {
                    this.logger.error('Failed to parse Gate.io message', err);
                }
            });

            this.ws.on('close', () => {
                this.isConnected = false;
                this.logger.warn('Gate.io WebSocket closed, reconnecting...');
                this.scheduleReconnect();
            });

            this.ws.on('error', (err) => {
                this.logger.error('Gate.io WebSocket error', err);
            });
        } catch (err) {
            this.logger.error('Failed to create WebSocket', err);
            this.scheduleReconnect();
        }
    }

    private disconnect() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
    }

    private scheduleReconnect() {
        if (this.reconnectTimer) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, 3000);
    }

    private subscribe(symbol: string) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        // Subscribe to ticker
        this.ws.send(JSON.stringify({
            time: Math.floor(Date.now() / 1000),
            channel: 'spot.tickers',
            event: 'subscribe',
            payload: [symbol],
        }));

        // Subscribe to 1s kline
        this.ws.send(JSON.stringify({
            time: Math.floor(Date.now() / 1000),
            channel: 'spot.candlesticks',
            event: 'subscribe',
            payload: ['1s', symbol],
        }));

        this.logger.log(`Subscribed to ${symbol} ticker and kline`);
    }

    private handleMessage(msg: any) {
        // Handle ticker updates
        if (msg.channel === 'spot.tickers' && msg.event === 'update') {
            const result = msg.result;
            if (!result) return;

            const symbol = result.currency_pair?.replace('_', '_') || 'ETH_USDT';
            const priceData: PriceData = {
                symbol,
                price: result.last,
                timestamp: Date.now(),
                change24h: parseFloat(result.change_percentage || '0'),
            };

            this.currentPrices.set(symbol, priceData);

            // Emit price update event
            this.eventEmitter.emit('market.price.update', priceData);
        }

        // Handle kline updates
        if (msg.channel === 'spot.candlesticks' && msg.event === 'update') {
            const result = msg.result;
            if (!result) return;

            const [timeStr, , symbol, open, close, high, low, volume] = result.n?.split(',') || [];
            if (!timeStr) return;

            const kline: KLineData = {
                time: parseInt(timeStr) * 1000,
                open: parseFloat(open),
                high: parseFloat(high),
                low: parseFloat(low),
                close: parseFloat(close),
                volume: parseFloat(volume),
            };

            // Store in buffer
            const key = symbol || 'ETH_USDT';
            if (!this.klineBuffer.has(key)) {
                this.klineBuffer.set(key, []);
            }
            const buffer = this.klineBuffer.get(key)!;
            buffer.push(kline);
            if (buffer.length > 500) buffer.shift();

            // Emit kline event
            this.eventEmitter.emit('market.kline.update', { symbol: key, kline });
        }
    }

    getCurrentPrice(symbol: string): PriceData | null {
        return this.currentPrices.get(symbol) || null;
    }

    getKlineHistory(symbol: string, limit: number = 100): KLineData[] {
        const buffer = this.klineBuffer.get(symbol) || [];
        return buffer.slice(-limit);
    }

    isConnectionActive(): boolean {
        return this.isConnected;
    }
}
