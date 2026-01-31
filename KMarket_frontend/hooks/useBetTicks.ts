import { useEffect, useState, useRef } from 'react';

// 后端 GridCell 类型 (与 grid.dto.ts 对应)
export interface BackendTick {
  tickId: string;
  odds: string;
  status: 'betting' | 'locked' | 'settled';
  expiryTime: number;
  basisPrice: string;
  priceRange: {
    min: number | null;
    max: number | null;
    label: string;
    percentMin: number;
    percentMax: number;
  };
  isWinning?: boolean;
  settlementPrice?: string;
}

interface UseBetTicksOptions {
  enabled?: boolean;
  pollInterval?: number;
  apiBaseUrl?: string;
}

export function useBetTicks({
  enabled = true,
  pollInterval = 1000,
  apiBaseUrl = '/api',
}: UseBetTicksOptions = {}) {
  const [newColumn, setNewColumn] = useState<BackendTick[] | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [intervalSec, setIntervalSec] = useState(5);
  const [lockTimeSec, setLockTimeSec] = useState(5);

  const lastExpiryTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const poll = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/market/grid?symbol=ETHUSDT`);
        if (!response.ok) {
          console.error('Grid API error:', response.status);
          return;
        }

        const json = await response.json();

        if (json.success && json.data) {
          const data = json.data;

          setCurrentPrice(parseFloat(data.currentPrice));
          setIntervalSec(data.intervalSec);
          setLockTimeSec(data.lockTimeSec);

          if (data.update && data.latestExpiryTime !== lastExpiryTimeRef.current) {
            lastExpiryTimeRef.current = data.latestExpiryTime;
            if (data.col6 && data.col6.length > 0) {
              setNewColumn(data.col6);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch grid data:', error);
      }
    };

    poll();
    const timer = setInterval(poll, pollInterval);
    return () => clearInterval(timer);
  }, [pollInterval, enabled, apiBaseUrl]);

  return { newColumn, currentPrice, intervalSec, lockTimeSec };
}
