import { useEffect, useState, useRef } from 'react';
import { BackendTick } from '../types/betting';
import { generateMockResponse } from '../data/mockBetTicks';

// 重新导出类型供其他模块使用
export type { BackendTick } from '../types/betting';

interface UseBetTicksOptions {
  enabled?: boolean;
  pollInterval?: number;
}

export function useBetTicks({
  enabled = true,
  pollInterval = 1000,
}: UseBetTicksOptions = {}) {
  const [newColumn, setNewColumn] = useState<BackendTick[] | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [intervalSec, setIntervalSec] = useState(5);
  const [lockTimeSec, setLockTimeSec] = useState(5);

  const lastExpiryTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const poll = () => {
      const mockResponse = generateMockResponse();

      if (mockResponse.success && mockResponse.data) {
        const data = mockResponse.data;

        setCurrentPrice(parseFloat(data.currentPrice));
        setIntervalSec(data.intervalSec);
        setLockTimeSec(5);

        if (data.update && data.col4) {
          const expiryTime = data.col4[0]?.expiryTime;
          if (expiryTime && expiryTime !== lastExpiryTimeRef.current) {
            lastExpiryTimeRef.current = expiryTime;
            setNewColumn(data.col4);
          }
        }
      }
    };

    poll();
    const timer = setInterval(poll, pollInterval);
    return () => clearInterval(timer);
  }, [pollInterval, enabled]);

  return { newColumn, currentPrice, intervalSec, lockTimeSec };
}
