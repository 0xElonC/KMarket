import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// 配置
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
const WS_NAMESPACE = '/market';

// 消息类型
export enum WsMessageType {
    INIT_GRID = 'INIT_GRID',
    PRICE_UPDATE = 'PRICE_UPDATE',
    GRID_APPEND = 'GRID_APPEND',
    CELL_SETTLE = 'CELL_SETTLE',
    KLINE_UPDATE = 'KLINE_UPDATE',
    CONFIG = 'CONFIG',
    ERROR = 'ERROR',
}

// 网格单元格
export interface WsGridCell {
    id: string;
    tickId: string;
    row: number;
    col: number;
    priceHigh: number;
    priceLow: number;
    basisPrice: number;
    odds: number;
    expiryTime: number;
    status: 'idle' | 'active' | 'won' | 'lost';
}

// 市场配置
export interface MarketConfig {
    symbol: string;
    grid: {
        rows: number;
        cols: number;
        cellWidth: number;
        cellHeight: number;
        scrollSpeed: number;
        priceRange: number;
        minBetDistance: number;
        intervalMs: number;
    };
    bet: {
        minAmount: string;
        maxAmount: string;
        currency: string;
        decimals: number;
    };
    odds: {
        baseMin: number;
        baseMax: number;
        timeFactor: number;
    };
}

// Hook 返回类型
interface UseMarketWebSocketReturn {
    isConnected: boolean;
    config: MarketConfig | null;
    gridCells: WsGridCell[];
    currentPrice: number;
    priceChange: number;
    subscribe: (symbol: string) => void;
    unsubscribe: () => void;
}

export function useMarketWebSocket(): UseMarketWebSocketReturn {
    const socketRef = useRef<Socket | null>(null);
    const configRef = useRef<MarketConfig | null>(null); // 用 ref 避免闭包问题
    const [isConnected, setIsConnected] = useState(false);
    const [config, setConfig] = useState<MarketConfig | null>(null);
    const [gridCells, setGridCells] = useState<WsGridCell[]>([]);
    const [currentPrice, setCurrentPrice] = useState(0);
    const [priceChange, setPriceChange] = useState(0);

    // 同步 config 到 ref
    useEffect(() => {
        configRef.current = config;
    }, [config]);

    // 初始化 Socket 连接 (只运行一次)
    useEffect(() => {
        const socket = io(`${WS_URL}${WS_NAMESPACE}`, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('🔌 WebSocket connected');
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            console.log('🔌 WebSocket disconnected');
            setIsConnected(false);
        });

        // 接收配置
        socket.on(WsMessageType.CONFIG, (cfg: MarketConfig) => {
            console.log('📦 Received config:', cfg);
            setConfig(cfg);
        });

        // 接收初始网格
        socket.on(WsMessageType.INIT_GRID, (msg: { data: { cells: WsGridCell[]; basePrice: number } }) => {
            console.log('📊 Received init grid:', msg.data.cells.length, 'cells');
            setGridCells(msg.data.cells);
            setCurrentPrice(msg.data.basePrice);
        });

        // 接收价格更新
        socket.on(WsMessageType.PRICE_UPDATE, (msg: { data: { price: number; change24h: number } }) => {
            setCurrentPrice(msg.data.price);
            setPriceChange(msg.data.change24h);
        });

        // 接收新列追加
        socket.on(WsMessageType.GRID_APPEND, (msg: { data: { cells: WsGridCell[] } }) => {
            console.log('➕ Grid append:', msg.data.cells.length, 'cells');
            setGridCells(prev => {
                const newCells = [...prev, ...msg.data.cells];
                // 使用 ref 获取最新的 config
                const cols = configRef.current?.grid.cols || 40;
                const maxCol = Math.max(...newCells.map(c => c.col));
                const minCol = maxCol - cols * 2;
                return newCells.filter(c => c.col > minCol);
            });
        });

        // 接收结算通知
        socket.on(WsMessageType.CELL_SETTLE, (msg: { data: { tickId: string; result: 'won' | 'lost' } }) => {
            console.log('🎯 Cell settled:', msg.data);
            setGridCells(prev => prev.map(cell =>
                cell.tickId === msg.data.tickId
                    ? { ...cell, status: msg.data.result }
                    : cell
            ));
        });

        return () => {
            socket.disconnect();
        };
    }, []); // 空依赖数组，只运行一次

    // 订阅市场
    const subscribe = useCallback((symbol: string) => {
        if (socketRef.current) {
            console.log('📡 Subscribing to:', symbol);
            socketRef.current.emit('subscribe', symbol);
        }
    }, []);

    // 取消订阅
    const unsubscribe = useCallback(() => {
        if (socketRef.current && config) {
            socketRef.current.emit('unsubscribe', config.symbol);
        }
    }, [config]);

    return {
        isConnected,
        config,
        gridCells,
        currentPrice,
        priceChange,
        subscribe,
        unsubscribe,
    };
}

