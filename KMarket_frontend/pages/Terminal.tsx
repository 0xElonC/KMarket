import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useWallet } from '../contexts/WalletContext';
import { KMarketGame } from '../components/KMarketGame';
import { HistoryPanel } from '../components/terminal/HistoryPanel';
import { ChartToolbar } from '../components/terminal/ChartToolbar';
import {
  cryptoAssets,
  forexAssets,
  historyItems
} from '../data/terminal';

export default function Terminal({
  requestConfirm,
  selectedAsset
}: {
  requestConfirm: () => void;
  selectedAsset?: { symbol: string; name: string; price: number; change: number } | null;
}) {
  const { t } = useLanguage();
  const { address: userAddress, isConnected } = useWallet();

  // State for interactivity
  const defaultSymbol = useMemo(
    () => cryptoAssets.find((asset) => asset.symbol === 'ETH') ?? cryptoAssets[0],
    []
  );
  const [activeSymbol, setActiveSymbol] = useState(defaultSymbol);
  useEffect(() => {
    if (!selectedAsset) {
      setActiveSymbol(defaultSymbol);
      return;
    }

    const matched =
      cryptoAssets.find((asset) => asset.symbol === selectedAsset.symbol) ??
      forexAssets.find((asset) => asset.symbol === selectedAsset.symbol);

    if (matched) {
      setActiveSymbol(matched);
      return;
    }

    const changeValue = Number.isFinite(selectedAsset.change) ? selectedAsset.change : 0;
    setActiveSymbol({
      symbol: selectedAsset.symbol,
      name: selectedAsset.name,
      price: selectedAsset.price,
      change: `${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(2)}%`
    });
  }, [defaultSymbol, selectedAsset]);

  const [activeTimeframe, setActiveTimeframe] = useState('1H');
  const [betAmount, setBetAmount] = useState(10);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [onChainBalance, setOnChainBalance] = useState<string>('0');

  const isForex = forexAssets.some((a) => a.symbol === activeSymbol.symbol);
  const lastClose = currentPrice ?? activeSymbol.price;

  // Callbacks
  const handlePriceChange = useCallback((price: number, change: number) => {
    setCurrentPrice(price);
    setPriceChange(change);
  }, []);

  const handleBalanceChange = useCallback((balance: string) => {
    setOnChainBalance(balance);
  }, []);

  // Range labels for history panel
  const rangeLabels: Record<string, string> = {
    high: t.terminal.rangeHigh,
    midHigh: t.terminal.rangeMidHigh,
    mid: t.terminal.rangeMid,
    midLow: t.terminal.rangeMidLow,
    low: t.terminal.rangeLow
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full">
      {/* Main content area */}
      <div className="flex-1 flex min-h-0 h-full">
        {/* Left: Chart area */}
        <div className="flex-1 flex flex-col min-h-0 h-full">
          {/* Chart Toolbar */}
          <ChartToolbar
            activeSymbol={{
              ...activeSymbol,
              change: priceChange !== 0 
                ? `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`
                : activeSymbol.change
            }}
            lastClose={lastClose}
            isForex={isForex}
            betAmount={betAmount}
            onBetAmountChange={setBetAmount}
            activeTimeframe={activeTimeframe}
            onTimeframeChange={setActiveTimeframe}
            labels={{ betAmount: t.terminal.betAmount }}
            isDemoMode={isDemoMode}
            onDemoModeChange={setIsDemoMode}
          />

          {/* Chart Area with Game */}
          <div className="flex-1 neu-in relative overflow-hidden rounded-xl border border-white/5 bg-[#10151e] m-1 min-h-0">
            <KMarketGame
              userAddress={isConnected ? userAddress : undefined}
              onBalanceChange={handleBalanceChange}
              onPriceChange={handlePriceChange}
            />
          </div>

          {/* Bottom info bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#121721] border-t border-white/5 text-xs">
            <div className="flex items-center gap-4">
              <span className="text-gray-500">
                <span className="text-[#00d4ff]">●</span> 活跃下注
                <span className="mx-2">|</span>
                <span className="text-[#00ff88]">●</span> 赢
                <span className="mx-2">|</span>
                <span className="text-[#ff4757]">●</span> 输
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-500">
                双击格子下注 | 格子向左移动 | 价格线碰到格子区间即赢
              </span>
            </div>
          </div>
        </div>

        {/* Right: History Panel */}
        <HistoryPanel
          rangeLabels={rangeLabels}
          labels={{
            title: t.terminal.history,
            window: t.terminal.historyWindow,
            entry: t.terminal.entry,
            win: t.terminal.win,
            loss: t.terminal.loss,
            live: t.terminal.live
          }}
        />
      </div>
    </div>
  );
}
