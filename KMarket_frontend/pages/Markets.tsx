import React, { useState, useMemo } from 'react';
import { Page } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { AssetCard } from '../components/AssetCard';
import { useGateMarkets, MarketAsset } from '../hooks/useGateMarkets';
import { allEventAssets, EventAsset } from '../data/events';

// Convert EventAsset to MarketAsset format
const convertEventToMarket = (event: EventAsset): MarketAsset => ({
  id: event.id,
  symbol: event.symbol,
  name: event.name,
  price: event.price,
  change: event.change,
  color: event.color,
  category: event.category,
  data: event.data,
  volume: event.volume,
  high24h: event.high24h,
  low24h: event.low24h
});

// Fallback mock data (used when no live data yet)
const fallbackAssets: MarketAsset[] = [
  { id: 'BTC', symbol: 'BTC', name: 'Bitcoin', price: 0, change: 0, color: '#94a3b8', category: 'Layer 1', data: [25,25,25,25,25], volume: 0, high24h: 0, low24h: 0 },
  { id: 'ETH', symbol: 'ETH', name: 'Ethereum', price: 0, change: 0, color: '#94a3b8', category: 'Layer 1', data: [25,25,25,25,25], volume: 0, high24h: 0, low24h: 0 },
];

export default function Markets({
  onNavigate,
  onSelectAsset
}: {
  onNavigate: (page: Page) => void;
  onSelectAsset: (asset: { symbol: string; name: string; price: number; change: number }) => void;
}) {
  const { t } = useLanguage();
  const { assets: liveAssets, status } = useGateMarkets();
  const [activeFilter, setActiveFilter] = useState('All');
  const [favorites, setFavorites] = useState<string[]>(['BTC']); // BTC favorited by default
  const [searchTerm, setSearchTerm] = useState('');

  // Combine live crypto assets with event-based markets
  const eventMarkets = allEventAssets.map(convertEventToMarket);
  const cryptoAssets = liveAssets.length > 0 ? liveAssets : fallbackAssets;
  const assets = [...cryptoAssets, ...eventMarkets];

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(fav => fav !== id) : [...prev, id]
    );
  };

  // Filter Logic
  const filteredAssets = useMemo(() => {
    let data = assets;
    
    if (activeFilter === t.markets.favorites) {
      data = data.filter(asset => favorites.includes(asset.id));
    } else if (activeFilter !== 'All' && activeFilter !== t.markets.all) {
       // Simple mapping for demo purposes matching translations to data categories
       const categoryMap: Record<string, string[]> = {
           [t.markets.defi]: ['DeFi'],
           [t.markets.l1]: ['Layer 1'],
           [t.markets.l2]: ['Layer 2'],
           [t.markets.meta]: ['Metaverse'],
           '政治': ['Politics'],
           '体育': ['Sports'],
           '经济': ['Economics'],
           '电竞': ['Esports']
       };
       const targetCategories = categoryMap[activeFilter] || [activeFilter];
       data = data.filter(asset => targetCategories.includes(asset.category));
    }
    
    if (searchTerm.trim()) {
      const query = searchTerm.trim().toLowerCase();
      data = data.filter(asset =>
        asset.symbol.toLowerCase().includes(query) ||
        asset.name.toLowerCase().includes(query)
      );
    }

    // Sort by volume (highest first)
    return data.sort((a, b) => b.volume - a.volume);
  }, [activeFilter, favorites, searchTerm, t, assets]);

  return (
    <div className="flex flex-col gap-8 max-w-[1600px] mx-auto w-full">
        {/* Status indicator */}
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${status === 'live' ? 'bg-[#00ff88]' : status === 'error' ? 'bg-[#ff4757]' : 'bg-yellow-500 animate-pulse'}`} />
          <span className="text-gray-500">
            {status === 'live' ? 'Gate.io 实时数据' : status === 'error' ? '连接失败' : '连接中...'}
          </span>
          <span className="text-gray-600">|</span>
          <span className="text-gray-500">{assets.length} 个交易对</span>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex gap-4 overflow-x-auto p-4 w-full md:w-auto no-scrollbar">
                <FilterButton 
                    label={t.markets.all} 
                    active={activeFilter === t.markets.all || activeFilter === 'All'} 
                    onClick={() => setActiveFilter(t.markets.all)}
                />
                <FilterButton 
                    label={t.markets.favorites} 
                    active={activeFilter === t.markets.favorites} 
                    onClick={() => setActiveFilter(t.markets.favorites)}
                />
                <FilterButton 
                    label={t.markets.defi} 
                    active={activeFilter === t.markets.defi} 
                    onClick={() => setActiveFilter(t.markets.defi)}
                />
                <FilterButton 
                    label={t.markets.l1} 
                    active={activeFilter === t.markets.l1} 
                    onClick={() => setActiveFilter(t.markets.l1)}
                />
                <FilterButton 
                    label={t.markets.l2 || 'Layer 2'} 
                    active={activeFilter === (t.markets.l2 || 'Layer 2')} 
                    onClick={() => setActiveFilter(t.markets.l2 || 'Layer 2')}
                />
                <FilterButton 
                    label={t.markets.meta} 
                    active={activeFilter === t.markets.meta} 
                    onClick={() => setActiveFilter(t.markets.meta)}
                />
                <FilterButton 
                    label="政治" 
                    active={activeFilter === '政治'} 
                    onClick={() => setActiveFilter('政治')}
                />
                <FilterButton 
                    label="体育" 
                    active={activeFilter === '体育'} 
                    onClick={() => setActiveFilter('体育')}
                />
                <FilterButton 
                    label="经济" 
                    active={activeFilter === '经济'} 
                    onClick={() => setActiveFilter('经济')}
                />
                <FilterButton 
                    label="电竞" 
                    active={activeFilter === '电竞'} 
                    onClick={() => setActiveFilter('电竞')}
                />
            </div>
            <div className="relative w-full md:w-80">
                <div className="search-inset h-12 rounded-xl flex items-center px-4 gap-2 w-full">
                    <span className="material-symbols-outlined text-slate-600 text-[20px]">search</span>
                    <input
                        className="search-input bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-300 w-full placeholder-slate-600 font-luxury-mono"
                        placeholder={t.markets.search}
                        type="text"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />
                </div>
            </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-12">
            {filteredAssets.length > 0 ? (
                filteredAssets.map((asset) => (
                    <AssetCard 
                        key={asset.id} 
                        asset={asset} 
                        onNavigate={onNavigate} 
                        onSelectAsset={onSelectAsset}
                        isFavorite={favorites.includes(asset.id)}
                        onToggleFavorite={(e: React.MouseEvent) => toggleFavorite(asset.id, e)}
                    />
                ))
            ) : (
                <div className="col-span-full py-20 text-center text-gray-500 font-bold neu-in rounded-3xl">
                    No assets found in this category.
                </div>
            )}
        </div>
    </div>
  );
}

const FilterButton = ({ label, active, onClick }: { label: string, active?: boolean, onClick: () => void }) => (
    <button
        type="button"
        onClick={onClick}
        className={`premium-radio w-auto px-6 rounded-xl uppercase tracking-wider text-[10px] font-bold whitespace-nowrap transition-colors ${active ? 'active text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
    >
        {label}
    </button>
);
