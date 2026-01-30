export interface TickOdds {
    priceTick: number;        // e.g. -20, -19... 0 ... +19, +20
    priceRange: {
        lower: string;
        upper: string;
    };
    odds: number;             // 0 if locked
}

export interface TimeSlice {
    id: string;               // Unique ID
    symbol: string;
    settlementTime: number;   // Timestamp of settlement (Start of the second)
    basisPrice: string;       // Price when this slice was created
    locked: boolean;
    status: 'pending' | 'settled';
    ticks: TickOdds[];
}

export interface GridResponseDto {
    symbol: string;
    currentPrice: string;
    currentTime: number;
    slices: TimeSlice[];
}
