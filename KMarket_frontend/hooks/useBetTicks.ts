import { useEffect, useState } from 'react';
import { BackendTick, generateMockResponse } from '../data/mockBetTicks';

interface UseBetTicksOptions {
  enabled?: boolean;
  pollInterval?: number;
}

export function useBetTicks({
  enabled = true,
  pollInterval = 1000,
}: UseBetTicksOptions = {}) {
  // 只保存最新的 col4（新增的列）
  const [newColumn, setNewColumn] = useState<BackendTick[] | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [intervalSec, setIntervalSec] = useState(3);

  useEffect(() => {
    if (!enabled) return;

    const poll = () => {
      const response = generateMockResponse();

      // 只有 update: true 且 col4 存在时才传递新列
      if (response.data.update && response.data.col4) {
        setNewColumn(response.data.col4);
      }

      setCurrentPrice(parseFloat(response.data.currentPrice));
      setIntervalSec(response.data.intervalSec);
    };

    poll();
    const timer = setInterval(poll, pollInterval);
    return () => clearInterval(timer);
  }, [pollInterval, enabled]);

  return { newColumn, currentPrice, intervalSec };
}
