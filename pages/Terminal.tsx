import React, { useState, useEffect } from 'react';
import { Settings, Maximize2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { AssetListItem } from '../components/AssetListItem';
import { NeuButton } from '../components/NeuButton';
import { PredictionChart } from '../components/PredictionChart';
import { BetCell, CandleData } from '../types';

// Generate realistic OHLCV data with trend support for continuous animation
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
  return data;
};

// 生成下一根K线 - 基于最后一根K线的收盘价
const generateNextCandle = (lastCandle: CandleData, volatility: number): CandleData => {
  const basePrice = lastCandle.close;
  // 添加趋势偏移，使走势更自然
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

// Mock asset list for sidebar
const cryptoAssets = [
    { symbol: 'BTC', name: 'Bitcoin', price: 42100, change: '+1.2%' },
    { symbol: 'ETH', name: 'Ethereum', price: 2300, change: '-0.8%' },
    { symbol: 'SOL', name: 'Solana', price: 95, change: '+4.5%' },
    { symbol: 'XRP', name: 'Ripple', price: 0.55, change: '+0.2%' },
    { symbol: 'AVAX', name: 'Avalanche', price: 35, change: '-1.5%' },
    { symbol: 'MATIC', name: 'Polygon', price: 0.85, change: '+0.5%' },
];

const forexAssets = [
    { symbol: 'EUR', name: 'Euro', price: 1.08, change: '+0.1%' },
    { symbol: 'GBP', name: 'Pound', price: 1.26, change: '-0.2%' },
    { symbol: 'JPY', name: 'Yen', price: 0.0067, change: '-0.5%' },
    { symbol: 'AUD', name: 'Aus Dollar', price: 0.65, change: '+0.3%' },
];

// Mock投注网格数据 - 供同伴对接
const generateBettingCells = (colCount: number = 3, rowStart: number = 0, rowCount: number = 5): BetCell[] => {
  const labels = ['High', 'Mid-High', 'Mid', 'Mid-Low', 'Low'];
  const cells: BetCell[] = [];

  for (let row = rowStart; row < rowStart + rowCount; row++) {
    for (let col = 0; col < colCount; col++) {
      const id = `${row}-${col}`;
      const labelIndex = ((row % labels.length) + labels.length) % labels.length;
      cells.push({
        id,
        row,
        col,
        label: labels[labelIndex],
        odds: 1.5 + Math.random() * 5,
        status: 'default'
      });
    }
  }
  return cells;
};

// 生成新的一列预测网格
const generateNewColumn = (colIndex: number, rowStart: number = 0, rowCount: number = 5): BetCell[] => {
  const labels = ['High', 'Mid-High', 'Mid', 'Mid-Low', 'Low'];
  const cells: BetCell[] = [];

  for (let row = rowStart; row < rowStart + rowCount; row++) {
    const labelIndex = ((row % labels.length) + labels.length) % labels.length;
    cells.push({
      id: `${row}-${colIndex}`,
      row,
      col: colIndex,
      label: labels[labelIndex],
      odds: 1.5 + Math.random() * 5,
      status: 'default'
    });
  }
  return cells;
};

const GRID_ROWS = 5;
const GRID_BUFFER_ROWS = 10;
const GRID_ROW_START = -GRID_BUFFER_ROWS;
const GRID_TOTAL_ROWS = GRID_ROWS + GRID_BUFFER_ROWS * 2;
const VISIBLE_COLS = 9;
const GRID_BUFFER_COLS = 3;
const INITIAL_GRID_COLS = VISIBLE_COLS + GRID_BUFFER_COLS;

export default function Terminal({ requestConfirm }: { requestConfirm: () => void }) {
  const { t } = useLanguage();

  // State for interactivity
  const [activeCategory, setActiveCategory] = useState<'crypto' | 'forex'>('crypto');
  const [activeSymbol, setActiveSymbol] = useState(cryptoAssets[0]);
  const [activeTimeframe, setActiveTimeframe] = useState('1H');
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [bettingCells, setBettingCells] = useState<BetCell[]>(() => generateBettingCells(INITIAL_GRID_COLS, GRID_ROW_START, GRID_TOTAL_ROWS));
  const [gridColsTotal, setGridColsTotal] = useState(INITIAL_GRID_COLS);
  const [updateCount, setUpdateCount] = useState(0); // K线更新计数，驱动网格滚动

  // Effect: Update asset list when category changes
  useEffect(() => {
      const list = activeCategory === 'crypto' ? cryptoAssets : forexAssets;
      setActiveSymbol(list[0]);
  }, [activeCategory]);

  // Effect: Regenerate chart data when symbol or timeframe changes
  useEffect(() => {
      // Create a volatility factor based on asset type/price
      const volatility = activeSymbol.price * 0.005;
      setChartData(generateData(activeSymbol.price, volatility));
  }, [activeSymbol, activeTimeframe]);

  // Effect: 动态更新K线 - 每2秒生成新K线，模拟实时走势
  useEffect(() => {
    const volatility = activeSymbol.price * 0.005;

    const interval = setInterval(() => {
      setChartData(prevData => {
        if (prevData.length === 0) return prevData;

        const lastCandle = prevData[prevData.length - 1];
        const newCandle = generateNextCandle(lastCandle, volatility);

        // 保持最多40根K线，移除最旧的
        const newData = [...prevData.slice(-39), newCandle];
        return newData;
      });
      // 递增更新计数，驱动网格滚动
      setUpdateCount(prev => prev + 1);
    }, 2000); // 每2秒更新一次

    return () => clearInterval(interval);
  }, [activeSymbol]);

  // Effect: 自动新增预测网格列 - 每滚动一个网格宽度（6根蜡烛）就新增一列
  useEffect(() => {
    const CANDLES_PER_GRID = 6;
    const neededCols = Math.max(
      INITIAL_GRID_COLS,
      INITIAL_GRID_COLS + Math.floor(updateCount / CANDLES_PER_GRID)
    );

    if (neededCols > gridColsTotal) {
      const newCells: BetCell[] = [];
      for (let col = gridColsTotal; col < neededCols; col += 1) {
        newCells.push(...generateNewColumn(col, GRID_ROW_START, GRID_TOTAL_ROWS));
      }
      setBettingCells(prev => [...prev, ...newCells]);
      setGridColsTotal(neededCols);
    }
  }, [updateCount, gridColsTotal]);

  const assetsList = activeCategory === 'crypto' ? cryptoAssets : forexAssets;
  const lastCandle = chartData.length > 0 ? chartData[chartData.length - 1] : { close: 0 };

  // 下注处理 - 供同伴对接
  const handleBet = (cellId: string, amount: number) => {
    console.log('Bet placed:', { cellId, amount });
    setBettingCells(prev => prev.map(cell => {
      if (cell.id !== cellId) return cell;
      if (cell.status !== 'default') return cell;
      return { ...cell, status: 'selected' };
    }));
    // TODO: 对接实际下注逻辑
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full pb-0">
      {/* Assets Sidebar */}
      <aside className="w-64 flex-col gap-4 hidden lg:flex shrink-0 h-full">
        <div className="neu-out p-4 flex flex-col gap-4 rounded-2xl">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-gray-300">{t.terminal.assets}</h2>
          </div>
          <div className="flex gap-2">
            <NeuButton 
                onClick={() => setActiveCategory('crypto')}
                active={activeCategory === 'crypto'}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeCategory === 'crypto' ? 'text-primary' : 'text-gray-500'}`}
            >
                {t.terminal.crypto}
            </NeuButton>
            <NeuButton 
                onClick={() => setActiveCategory('forex')}
                active={activeCategory === 'forex'}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeCategory === 'forex' ? 'text-primary' : 'text-gray-500'}`}
            >
                {t.terminal.forex}
            </NeuButton>
          </div>
        </div>
        <div className="neu-out flex-1 p-3 flex flex-col gap-3 overflow-y-auto custom-scrollbar rounded-2xl">
           {assetsList.map((asset) => (
               <AssetListItem 
                   key={asset.symbol}
                   symbol={asset.symbol} 
                   name={asset.name} 
                   change={asset.change} 
                   active={activeSymbol.symbol === asset.symbol} 
                   onClick={() => setActiveSymbol(asset)}
               />
           ))}
        </div>
      </aside>

      {/* Main Chart Area */}
      <section className="flex-1 flex flex-col gap-4 min-w-0 h-full">
         <div className="flex-1 neu-out p-1 rounded-3xl relative flex flex-col h-full overflow-hidden outline-none">
            {/* Chart Toolbar */}
            <div className="flex justify-between items-center p-4 border-b border-white/5 bg-[#1e293b]">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                       <div className="size-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">{activeSymbol.symbol[0]}</div>
                       <div>
                          <h2 className="font-bold text-lg text-gray-200 leading-none">{activeSymbol.symbol}/USD</h2>
                          <span className="text-xs text-gray-500">{activeSymbol.name}</span>
                       </div>
                    </div>
                    <div className="h-8 w-px bg-white/10"></div>
                    <div className="flex flex-col">
                        <span className="text-2xl font-digital font-bold text-success">${lastCandle.close?.toFixed(activeCategory === 'forex' ? 4 : 2)}</span>
                        <span className={`text-xs font-bold flex items-center gap-1 ${activeSymbol.change.startsWith('+') ? 'text-success' : 'text-danger'}`}>
                             <span className="material-symbols-outlined text-xs font-bold">trending_up</span>
                             {activeSymbol.change} (24h)
                        </span>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex bg-[#161f2d] rounded-lg p-1">
                        {['1H', '4H', '1D'].map(tf => (
                            <button 
                                key={tf} 
                                onClick={() => setActiveTimeframe(tf)}
                                className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${activeTimeframe === tf ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                    <NeuButton className="size-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-white">
                        <Settings size={16}/>
                    </NeuButton>
                    <NeuButton className="size-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-white">
                        <Maximize2 size={16}/>
                    </NeuButton>
                </div>
            </div>
            
            {/* Chart Area with Betting Grid - 统一网格系统 */}
            <div className="flex-1 neu-in relative overflow-hidden rounded-xl border border-white/5 bg-[#10151e] m-1">
                <PredictionChart
                    candleData={chartData}
                    bettingCells={bettingCells}
                    onBet={handleBet}
                    gridRows={GRID_ROWS}
                    bufferRows={GRID_BUFFER_ROWS}
                    visibleCols={VISIBLE_COLS}
                    updateCount={updateCount}
                />
            </div>

         </div>
      </section>
    </div>
  );
}
