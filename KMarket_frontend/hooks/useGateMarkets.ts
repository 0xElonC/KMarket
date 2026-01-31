import { useState, useEffect, useRef, useCallback } from 'react';

// Gate.io 交易对映射
const GATE_SYMBOLS: Record<string, { name: string; category: string }> = {
  'BTC_USDT': { name: 'Bitcoin', category: 'Layer 1' },
  'ETH_USDT': { name: 'Ethereum', category: 'Layer 1' },
  'SOL_USDT': { name: 'Solana', category: 'Layer 1' },
  'DOT_USDT': { name: 'Polkadot', category: 'Layer 1' },
  'LINK_USDT': { name: 'Chainlink', category: 'DeFi' },
  'ADA_USDT': { name: 'Cardano', category: 'Layer 1' },
  'UNI_USDT': { name: 'Uniswap', category: 'DeFi' },
  'AVAX_USDT': { name: 'Avalanche', category: 'Layer 1' },
  'MATIC_USDT': { name: 'Polygon', category: 'Layer 2' },
  'ATOM_USDT': { name: 'Cosmos', category: 'Layer 1' },
  'NEAR_USDT': { name: 'NEAR Protocol', category: 'Layer 1' },
  'ARB_USDT': { name: 'Arbitrum', category: 'Layer 2' },
  'OP_USDT': { name: 'Optimism', category: 'Layer 2' },
  'AAVE_USDT': { name: 'Aave', category: 'DeFi' },
  'MKR_USDT': { name: 'Maker', category: 'DeFi' },
  'CRV_USDT': { name: 'Curve', category: 'DeFi' },
  'DYDX_USDT': { name: 'dYdX', category: 'DeFi' },
  'APE_USDT': { name: 'ApeCoin', category: 'Metaverse' },
  'SAND_USDT': { name: 'The Sandbox', category: 'Metaverse' },
  'MANA_USDT': { name: 'Decentraland', category: 'Metaverse' },
};

const SYMBOL_LIST = Object.keys(GATE_SYMBOLS);

export interface MarketAsset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  category: string;
  volume: number;
  high24h: number;
  low24h: number;
  color: string;
  data: number[]; // 价格历史用于迷你图表
}

export function useGateMarkets() {
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [status, setStatus] = useState<'connecting' | 'live' | 'error'>('connecting');
  const receivedCountRef = useRef(0);

  const updateAsset = useCallback((gateSymbol: string, ticker: any) => {
    const info = GATE_SYMBOLS[gateSymbol];
    if (!info) return;

    const symbol = gateSymbol.replace('_USDT', '');
    const price = parseFloat(ticker.last || ticker.close || '0');
    const change = parseFloat(ticker.change_percentage || '0');
    const volume = parseFloat(ticker.quote_volume || ticker.base_volume || '0');
    const high24h = parseFloat(ticker.high_24h || ticker.last || '0');
    const low24h = parseFloat(ticker.low_24h || ticker.last || '0');

    if (price === 0) return;

    // 生成随机图表数据
    const baseVal = 25;
    const data = Array.from({ length: 10 }, () => baseVal + (Math.random() - 0.5) * 20);

    setAssets(prev => {
      const existing = prev.find(a => a.symbol === symbol);
      const newAsset: MarketAsset = {
        id: symbol,
        symbol,
        name: info.name,
        price,
        change,
        category: info.category,
        volume,
        high24h,
        low24h,
        color: change >= 0 ? '#10b981' : '#ef4444',
        data,
      };

      if (existing) {
        return prev.map(a => a.symbol === symbol ? newAsset : a);
      } else {
        return [...prev, newAsset];
      }
    });
  }, []);

  useEffect(() => {
    let isActive = true;
    receivedCountRef.current = 0;

    console.log('🔌 Markets: Connecting to Gate.io WebSocket...');
    const ws = new WebSocket('wss://api.gateio.ws/ws/v4/');

    ws.onopen = () => {
      if (!isActive) return;
      console.log('✅ Markets: WebSocket connected, requesting tickers...');

      // 逐个请求每个交易对的 ticker
      SYMBOL_LIST.forEach(symbol => {
        const msg = {
          time: Math.floor(Date.now() / 1000),
          channel: 'spot.tickers',
          event: 'subscribe',
          payload: [symbol]
        };
        ws.send(JSON.stringify(msg));
      });
    };

    ws.onmessage = (event) => {
      if (!isActive) return;
      try {
        const data = JSON.parse(event.data as string);
        
        // 处理 ticker 更新
        if (data.channel === 'spot.tickers' && data.event === 'update') {
          const result = data.result;
          if (result && result.currency_pair && GATE_SYMBOLS[result.currency_pair]) {
            updateAsset(result.currency_pair, result);
            receivedCountRef.current++;
            
            // 收到足够数据后标记为 live 并关闭连接
            if (receivedCountRef.current >= SYMBOL_LIST.length) {
              console.log('✅ Markets: Got all', receivedCountRef.current, 'tickers, closing connection');
              setStatus('live');
              ws.close();
            }
          }
        }
      } catch (err) {
        console.error('Markets: WebSocket parse error:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('Markets: WebSocket error:', err);
      if (isActive) setStatus('error');
    };

    ws.onclose = () => {
      console.log('🔌 Markets: WebSocket closed');
      if (isActive && receivedCountRef.current > 0) {
        setStatus('live');
      }
    };

    // 超时处理 - 5秒后如果还没收到所有数据就关闭
    const timeout = setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log('⏱️ Markets: Timeout, got', receivedCountRef.current, 'tickers');
        if (receivedCountRef.current > 0) {
          setStatus('live');
        }
        ws.close();
      }
    }, 5000);

    return () => {
      isActive = false;
      clearTimeout(timeout);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [updateAsset]);

  return { assets, status };
}
