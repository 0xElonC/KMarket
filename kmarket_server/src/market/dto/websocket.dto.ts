/**
 * WebSocket 消息类型
 */
export enum WsMessageType {
    INIT_GRID = 'INIT_GRID',
    PRICE_UPDATE = 'PRICE_UPDATE',
    GRID_APPEND = 'GRID_APPEND',
    CELL_SETTLE = 'CELL_SETTLE',
    KLINE_UPDATE = 'KLINE_UPDATE',
    ERROR = 'ERROR',
}

/**
 * 网格单元格
 */
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

/**
 * 初始网格消息
 */
export interface WsInitGridDto {
    type: WsMessageType.INIT_GRID;
    data: {
        symbol: string;
        basePrice: number;
        timestamp: number;
        cells: WsGridCell[];
    };
}

/**
 * 价格更新消息
 */
export interface WsPriceUpdateDto {
    type: WsMessageType.PRICE_UPDATE;
    data: {
        price: number;
        timestamp: number;
        change24h: number;
    };
}

/**
 * 新列追加消息
 */
export interface WsGridAppendDto {
    type: WsMessageType.GRID_APPEND;
    data: {
        cells: WsGridCell[];
    };
}

/**
 * 结算通知消息
 */
export interface WsCellSettleDto {
    type: WsMessageType.CELL_SETTLE;
    data: {
        cellId: string;
        tickId: string;
        result: 'won' | 'lost';
        settlePrice: number;
        payout?: string;
    };
}

/**
 * K线更新消息
 */
export interface WsKlineUpdateDto {
    type: WsMessageType.KLINE_UPDATE;
    data: {
        time: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume?: number;
    };
}

/**
 * 错误消息
 */
export interface WsErrorDto {
    type: WsMessageType.ERROR;
    data: {
        code: string;
        message: string;
    };
}

export type WsMessage =
    | WsInitGridDto
    | WsPriceUpdateDto
    | WsGridAppendDto
    | WsCellSettleDto
    | WsKlineUpdateDto
    | WsErrorDto;
