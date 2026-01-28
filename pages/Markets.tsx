import React, { useState, useMemo } from 'react';
import { Page } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { AssetCard } from '../components/AssetCard';
import { NeuButton } from '../components/NeuButton';

// Expanded mock data with categories
const initialAssets = [
  { id: '1', symbol: 'BTC', name: 'Bitcoin Network', price: 48294.12, change: 2.45, color: '#10b981', category: 'Layer 1', data: [35,30,32,20,25,15,22,10,18,5,12] },
  { id: '2', symbol: 'ETH', name: 'Ethereum Mainnet', price: 3402.80, change: 1.12, color: '#10b981', category: 'Layer 1', data: [30,35,20,15,25,30,28,32,40,38,42] },
  { id: '3', symbol: 'SOL', name: 'Solana', price: 148.50, change: -0.85, color: '#ef4444', category: 'Layer 1', data: [10,15,5,20,18,30,25,35,20,15,10] },
  { id: '4', symbol: 'DOT', name: 'Polkadot', price: 7.24, change: -0.05, color: '#94a3b8', category: 'Layer 1', data: [20,22,18,20,19,20,20,21,19,20,20] },
  { id: '5', symbol: 'LINK', name: 'Chainlink', price: 18.90, change: 4.50, color: '#10b981', category: 'DeFi', data: [35,30,25,28,15,10,5,12,18,25,30] },
  { id: '6', symbol: 'ADA', name: 'Cardano', price: 0.58, change: -1.20, color: '#ef4444', category: 'Layer 1', data: [10,20,15,25,30,28,25,20,15,10,5] },
  { id: '7', symbol: 'UNI', name: 'Uniswap', price: 12.40, change: 3.20, color: '#10b981', category: 'DeFi', data: [20,25,30,28,35,40,38,42,45,40,48] },
  { id: '8', symbol: 'MANA', name: 'Decentraland', price: 0.65, change: -5.40, color: '#ef4444', category: 'Metaverse', data: [50,45,40,35,30,28,25,20,15,18,16] },
];

export default function Markets({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState('All');
  const [favorites, setFavorites] = useState<string[]>(['1']); // BTC favorited by default

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(fav => fav !== id) : [...prev, id]
    );
  };

  // Filter Logic
  const filteredAssets = useMemo(() => {
    let data = initialAssets;
    
    if (activeFilter === t.markets.favorites) {
      data = data.filter(asset => favorites.includes(asset.id));
    } else if (activeFilter !== 'All' && activeFilter !== t.markets.all) {
       // Simple mapping for demo purposes matching translations to data categories
       const categoryMap: Record<string, string> = {
           [t.markets.defi]: 'DeFi',
           [t.markets.l1]: 'Layer 1',
           [t.markets.meta]: 'Metaverse'
       };
       const targetCategory = categoryMap[activeFilter] || activeFilter;
       data = data.filter(asset => asset.category === targetCategory);
    }
    
    return data;
  }, [activeFilter, favorites, t]);

  return (
    <div className="flex flex-col gap-8 max-w-[1600px] mx-auto w-full">
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
                    label={t.markets.meta} 
                    active={activeFilter === t.markets.meta} 
                    onClick={() => setActiveFilter(t.markets.meta)}
                />
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
    <NeuButton 
        onClick={onClick}
        active={active}
        className={`px-6 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 ${active ? 'text-primary scale-95' : 'text-gray-500 hover:text-gray-300'}`}
    >
        {label}
    </NeuButton>
);
