import { useEffect, useMemo, useRef, useState } from 'react';
import { CandleData, PricePoint } from '../types';

interface UseGateCandlesOptions {
  symbol: string; // e.g. ETH_USDT
  interval?: string; // Gate interval (1m, 5m, 1h, etc.)
  limit?: number;
  enabled?: boolean;
}

const DEFAULT_LIMIT = 60;
const UPDATE_TICK_MS = 100;
const MAX_PRICE_POINTS = 500;

const formatTime = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const intervalToMs = (interval: string) => {
  const map: Record<string, number> = {
    '10s': 10_000,
    '1m': 60_000,
    '5m': 300_000,
    '15m': 900_000,
    '30m': 1_800_000,
    '1h': 3_600_000,
    '4h': 14_400_000,
    '8h': 28_800_000,
    '1d': 86_400_000,
    '7d': 604_800_000,
  };
  return map[interval] ?? 60_000;
};

// Convert symbol format: ETHUSDT -> ETH_USDT
const toBinanceSymbol = (symbol: string) => symbol.replace('_', '');
const toGateSymbol = (symbol: string) => {
  // If already has underscore, return as is
  if (symbol.includes('_')) return symbol;
  // Convert ETHUSDT to ETH_USDT
  if (symbol.endsWith('USDT')) {
    return symbol.slice(0, -4) + '_USDT';
  }
  return symbol;
};

export function useGateCandles({
  symbol,
  interval = '1m',
  limit = DEFAULT_LIMIT,
  enabled = true
}: UseGateCandlesOptions) {
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const lastOpenTimeRef = useRef<number | null>(null);
  const lastFinalOpenTimeRef = useRef<number | null>(null);
  const baseCountRef = useRef(0);

  const gateSymbol = useMemo(() => toGateSymbol(symbol), [symbol]);
  const intervalMs = useMemo(() => intervalToMs(interval), [interval]);

  // Gate.io REST API endpoint for candlesticks
  const endpoint = useMemo(() => {
    const params = new URLSearchParams({
      currency_pair: gateSymbol,
      interval,
      limit: String(limit)
    });
    return `https://api.gateio.ws/api/v4/spot/candlesticks?${params.toString()}`;
  }, [gateSymbol, interval, limit]);

  // Reset state when symbol or interval changes
  useEffect(() => {
    baseCountRef.current = 0;
    lastOpenTimeRef.current = null;
    lastFinalOpenTimeRef.current = null;
    setUpdateCount(0);
    setChartData([]);
    setPriceData([]);
    setCurrentPrice(null);
  }, [symbol, interval]);

  // Fetch initial candlestick data
  useEffect(() => {
    if (!enabled) return;

    let isActive = true;

    const fetchSnapshot = async () => {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        // Gate.io candlesticks format: [[timestamp_sec, quote_volume, close, high, low, open, base_volume], ...]
        // Note: timestamp is in seconds, not milliseconds
        const payload = (await response.json()) as Array<
          [string, string, string, string, string, string, string?]
        >;
        if (!Array.isArray(payload)) {
          throw new Error('Unexpected response');
        }

        console.log('Gate.io raw data sample:', payload.slice(-3));

        const mapped = payload.map((row) => {
          const candle = {
            time: formatTime(Number(row[0])),
            open: Number(row[5]),
            high: Number(row[3]),
            low: Number(row[4]),
            close: Number(row[2]),
            volume: Number(row[6] || row[1]) // base_volume or quote_volume
          };
          return candle;
        });

        console.log('Gate.io mapped data sample:', mapped.slice(-3));

        if (!isActive) return;

        const lastRow = payload[payload.length - 1];
        if (lastRow) {
          const openTime = Number(lastRow[0]) * 1000; // Convert to ms
          lastOpenTimeRef.current = openTime;
          const progress = intervalMs > 0
            ? Math.min(1, Math.max(0, (Date.now() - openTime) / intervalMs))
            : 0;
          setUpdateCount(baseCountRef.current + progress);
          const closePrice = Number(lastRow[2]);
          setCurrentPrice(closePrice);
          console.log('Gate.io current price:', closePrice);
        }

        setChartData(mapped.slice(-40));
        setError(null);
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Fetch failed');
        }
      }
    };

    fetchSnapshot();

    return () => {
      isActive = false;
    };
  }, [enabled, endpoint, intervalMs]);

  // Gate.io WebSocket for real-time updates
  useEffect(() => {
    if (!enabled) return;

    let isActive = true;
    let ws: WebSocket | null = null;
    let pingInterval: number | null = null;

    const connect = () => {
      ws = new WebSocket('wss://api.gateio.ws/ws/v4/');

      ws.onopen = () => {
        if (!ws || !isActive) return;
        
        // Subscribe to candlestick channel
        const subscribeMsg = {
          time: Math.floor(Date.now() / 1000),
          channel: 'spot.candlesticks',
          event: 'subscribe',
          payload: [interval, gateSymbol]
        };
        ws.send(JSON.stringify(subscribeMsg));

        // Also subscribe to ticker for real-time price
        const tickerMsg = {
          time: Math.floor(Date.now() / 1000),
          channel: 'spot.tickers',
          event: 'subscribe',
          payload: [gateSymbol]
        };
        ws.send(JSON.stringify(tickerMsg));

        // Ping every 15 seconds to keep connection alive
        pingInterval = window.setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              time: Math.floor(Date.now() / 1000),
              channel: 'spot.ping'
            }));
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        if (!isActive) return;
        try {
          const data = JSON.parse(event.data as string);
          
          // Handle candlestick updates
          if (data.channel === 'spot.candlesticks' && data.event === 'update') {
            const result = data.result;
            if (!result) return;

            // Gate.io candlestick format: { t: timestamp, v: volume, c: close, h: high, l: low, o: open, n: interval, a: amount }
            const openTime = Number(result.t) * 1000;
            const closePrice = Number(result.c);
            const eventTime = Date.now();

            setCurrentPrice(closePrice);
            setPriceData((prev) => {
              const newPoint: PricePoint = { time: eventTime, price: closePrice };
              const next = [...prev, newPoint];
              return next.slice(-MAX_PRICE_POINTS);
            });

            const nextCandle: CandleData = {
              time: formatTime(Number(result.t)),
              open: Number(result.o),
              high: Number(result.h),
              low: Number(result.l),
              close: closePrice,
              volume: Number(result.v)
            };

            setChartData((prev) => {
              if (!prev.length) {
                lastOpenTimeRef.current = openTime;
                return [nextCandle];
              }

              const lastOpen = lastOpenTimeRef.current;

              if (lastOpen === openTime || lastOpen === null) {
                lastOpenTimeRef.current = openTime;
                const updated = prev.slice();
                updated[updated.length - 1] = nextCandle;
                return updated;
              }

              if (openTime > lastOpen) {
                // New candle started
                if (lastFinalOpenTimeRef.current !== lastOpen) {
                  lastFinalOpenTimeRef.current = lastOpen;
                  baseCountRef.current += 1;
                  setUpdateCount(baseCountRef.current);
                }
                lastOpenTimeRef.current = openTime;
                const next = [...prev, nextCandle];
                return next.slice(-40);
              }

              return prev;
            });
          }

          // Handle ticker updates for more frequent price updates
          if (data.channel === 'spot.tickers' && data.event === 'update') {
            const result = data.result;
            if (!result) return;

            const lastPrice = Number(result.last);
            const eventTime = Date.now();

            setCurrentPrice(lastPrice);
            setPriceData((prev) => {
              const newPoint: PricePoint = { time: eventTime, price: lastPrice };
              const next = [...prev, newPoint];
              return next.slice(-MAX_PRICE_POINTS);
            });

            // Update the current candle's close price
            setChartData((prev) => {
              if (!prev.length) return prev;
              const updated = prev.slice();
              const lastCandle = { ...updated[updated.length - 1] };
              lastCandle.close = lastPrice;
              lastCandle.high = Math.max(lastCandle.high, lastPrice);
              lastCandle.low = Math.min(lastCandle.low, lastPrice);
              updated[updated.length - 1] = lastCandle;
              return updated;
            });
          }
        } catch (err) {
          console.error('Gate.io WebSocket parse error:', err);
        }
      };

      ws.onerror = () => {
        if (isActive) setError('WebSocket error');
      };

      ws.onclose = () => {
        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = null;
        }
        // Reconnect after 3 seconds if still active
        if (isActive) {
          setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      isActive = false;
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [enabled, gateSymbol, interval]);

  // Progress tick for smooth updateCount
  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      const openTime = lastOpenTimeRef.current;
      if (openTime === null || intervalMs <= 0) return;
      const progress = Math.min(1, Math.max(0, (Date.now() - openTime) / intervalMs));
      setUpdateCount(baseCountRef.current + progress);
    };

    tick();
    const intervalId = window.setInterval(tick, UPDATE_TICK_MS);
    return () => window.clearInterval(intervalId);
  }, [enabled, intervalMs]);

  return { chartData, priceData, currentPrice, error, updateCount };
}
