import { useEffect, useMemo, useRef, useState } from 'react';
import { CandleData, PricePoint } from '../types';

interface UseBinanceCandlesOptions {
  symbol: string; // e.g. ETHUSDT
  interval?: string; // Binance interval (1m, 5m, 1h, etc.)
  limit?: number;
  enabled?: boolean;
}

const DEFAULT_LIMIT = 60;
const UPDATE_TICK_MS = 100;
const MAX_PRICE_POINTS = 500; // K项目风格：保留最多500个价格点

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const intervalToMs = (interval: string) => {
  const map: Record<string, number> = {
    '1m': 60_000,
    '3m': 180_000,
    '5m': 300_000,
    '15m': 900_000,
    '30m': 1_800_000,
    '1h': 3_600_000,
    '2h': 7_200_000,
    '4h': 14_400_000,
    '6h': 21_600_000,
    '8h': 28_800_000,
    '12h': 43_200_000,
    '1d': 86_400_000,
    '1w': 604_800_000,
    '1M': 2_592_000_000
  };
  return map[interval] ?? 60_000;
};

export function useBinanceCandles({
  symbol,
  interval = '1m',
  limit = DEFAULT_LIMIT,
  enabled = true
}: UseBinanceCandlesOptions) {
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [priceData, setPriceData] = useState<PricePoint[]>([]); // K项目风格：实时价格点流
  const [currentPrice, setCurrentPrice] = useState<number | null>(null); // 当前价格
  const [error, setError] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const lastOpenTimeRef = useRef<number | null>(null);
  const lastFinalOpenTimeRef = useRef<number | null>(null);
  const baseCountRef = useRef(0);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({
      symbol,
      interval,
      limit: String(limit)
    });
    // Use binance.vision API which is accessible globally
    return `https://data-api.binance.vision/api/v3/klines?${params.toString()}`;
  }, [symbol, interval, limit]);

  const intervalMs = useMemo(() => intervalToMs(interval), [interval]);
  const streamUrl = useMemo(() => {
    const stream = `${symbol.toLowerCase()}@kline_${interval}`;
    // Use binance.vision WebSocket which is accessible globally
    return `wss://data-stream.binance.vision/ws/${stream}`;
  }, [symbol, interval]);

  useEffect(() => {
    baseCountRef.current = 0;
    lastOpenTimeRef.current = null;
    lastFinalOpenTimeRef.current = null;
    setUpdateCount(0);
    setChartData([]);
    setPriceData([]);
    setCurrentPrice(null);
  }, [symbol, interval]);

  useEffect(() => {
    if (!enabled) return;

    let isActive = true;

    const fetchSnapshot = async () => {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = (await response.json()) as Array<
          [number, string, string, string, string, string]
        >;
        if (!Array.isArray(payload)) {
          throw new Error('Unexpected response');
        }

        const mapped = payload.map((row) => ({
          time: formatTime(row[0]),
          open: Number(row[1]),
          high: Number(row[2]),
          low: Number(row[3]),
          close: Number(row[4]),
          volume: Number(row[5])
        }));

        if (!isActive) return;

        const lastRow = payload[payload.length - 1];
        if (lastRow) {
          lastOpenTimeRef.current = lastRow[0];
          const progress = intervalMs > 0
            ? Math.min(1, Math.max(0, (Date.now() - lastRow[0]) / intervalMs))
            : 0;
          setUpdateCount(baseCountRef.current + progress);
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

  useEffect(() => {
    if (!enabled) return;

    let isActive = true;
    let ws: WebSocket | null = null;

    const handleKline = (raw: MessageEvent) => {
      if (!isActive) return;
      try {
        const data = JSON.parse(raw.data as string) as {
          e?: string;
          E?: number;
          k?: {
            t: number;
            T: number;
            o: string;
            c: string;
            h: string;
            l: string;
            v: string;
            x: boolean;
          };
        };
        if (data.e !== 'kline' || !data.k) return;

        const eventTime = data.E ?? Date.now();
        const { t: openTime, o, c, h, l, v, x: isFinal } = data.k;
        const closePrice = Number(c);

        // K项目风格：收集实时价格点用于绘制流动曲线
        setCurrentPrice(closePrice);
        setPriceData((prev) => {
          const newPoint: PricePoint = { time: eventTime, price: closePrice };
          const next = [...prev, newPoint];
          return next.slice(-MAX_PRICE_POINTS);
        });

        setChartData((prev) => {
          if (!prev.length) {
            lastOpenTimeRef.current = openTime;
            return [{
              time: formatTime(openTime),
              open: Number(o),
              high: Number(h),
              low: Number(l),
              close: Number(c),
              volume: Number(v)
            }];
          }

          const lastOpen = lastOpenTimeRef.current;
          const nextCandle = {
            time: formatTime(openTime),
            open: Number(o),
            high: Number(h),
            low: Number(l),
            close: Number(c),
            volume: Number(v)
          };

          if (lastOpen === openTime || lastOpen === null) {
            lastOpenTimeRef.current = openTime;
            const updated = prev.slice();
            updated[updated.length - 1] = nextCandle;
            return updated;
          }

          if (openTime > lastOpen) {
            lastOpenTimeRef.current = openTime;
            const next = [...prev, nextCandle];
            return next.slice(-40);
          }

          return prev;
        });

        if (isFinal && lastFinalOpenTimeRef.current !== openTime) {
          lastFinalOpenTimeRef.current = openTime;
          baseCountRef.current += 1;
          lastOpenTimeRef.current = intervalMs > 0 ? openTime + intervalMs : openTime;
          setUpdateCount(baseCountRef.current);
          return;
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Stream error');
        }
      }
    };

    ws = new WebSocket(streamUrl);
    ws.addEventListener('message', handleKline);
    ws.addEventListener('error', () => {
      if (isActive) setError('WebSocket error');
    });

    return () => {
      isActive = false;
      if (ws) {
        ws.removeEventListener('message', handleKline);
        ws.close();
      }
    };
  }, [enabled, intervalMs, streamUrl]);

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
