import { useEffect, useState } from 'react';
import { CandleData } from '../types';

const generateData = (basePrice: number, volatility: number, count: number = 40) => {
  const data = [];
  let price = basePrice;
  let time = new Date();
  time.setHours(10, 0, 0, 0);

  for (let i = 0; i < count; i++) {
    const move = (Math.random() - 0.5) * volatility;
    const open = price;
    const close = price + move;
    const high = Math.max(open, close) + Math.random() * (volatility / 2);
    const low = Math.min(open, close) - Math.random() * (volatility / 2);

    data.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      open,
      high,
      low,
      close,
    });

    price = close;
    time.setMinutes(time.getMinutes() + 30);
  }
  return data as CandleData[];
};

const generateNextCandle = (lastCandle: CandleData, volatility: number): CandleData => {
  const basePrice = lastCandle.close;
  const trendBias = (Math.random() - 0.48) * volatility * 0.5;
  const move = (Math.random() - 0.5) * volatility + trendBias;

  const open = basePrice;
  const close = basePrice + move;
  const high = Math.max(open, close) + Math.random() * (volatility / 2);
  const low = Math.min(open, close) - Math.random() * (volatility / 2);

  const now = new Date();
  return {
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    open,
    high,
    low,
    close,
  };
};

interface UseMockCandlesOptions {
  basePrice: number;
  volatilityRatio?: number;
  enabled?: boolean;
}

export function useMockCandles({ basePrice, volatilityRatio = 0.005, enabled = true }: UseMockCandlesOptions) {
  const [chartData, setChartData] = useState<CandleData[]>([]);

  useEffect(() => {
    if (!enabled) return;
    const volatility = basePrice * volatilityRatio;
    setChartData(generateData(basePrice, volatility));
  }, [basePrice, volatilityRatio, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const volatility = basePrice * volatilityRatio;

    const interval = setInterval(() => {
      setChartData(prevData => {
        if (prevData.length === 0) return prevData;

        const lastCandle = prevData[prevData.length - 1];
        const newCandle = generateNextCandle(lastCandle, volatility);

        return [...prevData.slice(-39), newCandle];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [basePrice, volatilityRatio, enabled]);

  return { chartData, setChartData };
}
