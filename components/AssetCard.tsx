import React, { useState } from 'react';
import { Star, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Page, Asset } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { NeuButton } from './NeuButton';

interface AssetCardProps {
  asset: Asset & { data: number[], category?: string };
  onNavigate: (page: Page) => void;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, onNavigate, isFavorite, onToggleFavorite }) => {
    const { t } = useLanguage();
    const chartData = asset.data.map((val: number, i: number) => ({ i, val }));
    const isPositive = asset.change >= 0;
    const colorClass = isPositive ? 'text-success' : 'text-danger';
    const [activeTimeframe, setActiveTimeframe] = useState('1m');

    return (
        <article className="neu-out p-6 flex flex-col gap-6 relative group hover:scale-[1.01] transition-transform duration-300 rounded-3xl">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <div className="size-14 neu-btn rounded-2xl flex items-center justify-center text-gray-200">
                        <span className="font-bold text-lg">{asset.symbol[0]}</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-200">{asset.symbol}<span className="text-gray-500 text-lg font-medium">/USD</span></h2>
                        <p className="text-xs font-bold text-gray-500">{asset.name}</p>
                    </div>
                </div>
                <button 
                    onClick={onToggleFavorite}
                    className={`neu-btn size-10 rounded-full flex items-center justify-center transition-colors ${isFavorite ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-500'}`}
                >
                    <Star size={18} fill={isFavorite ? "currentColor" : "none"} />
                </button>
            </div>

            <div className="neu-in p-5 flex flex-col gap-4 relative overflow-hidden rounded-2xl bg-[#1a2433]">
                <div className="flex justify-between items-end z-10 relative">
                    <div>
                        <span className="block text-[10px] font-bold opacity-50 mb-1 text-gray-400">{t.markets.currentPrice}</span>
                        <span className="font-digital text-4xl font-bold text-gray-200 tracking-wider shadow-white/5 drop-shadow-sm">
                            ${asset.price.toFixed(2)}
                        </span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className={`${colorClass} font-digital text-lg flex items-center drop-shadow-[0_0_8px_currentColor]`}>
                            {isPositive ? <ArrowUpRight size={16} className="mr-1" /> : <ArrowDownRight size={16} className="mr-1" />}
                            {Math.abs(asset.change)}%
                        </span>
                    </div>
                </div>
                
                <div className="h-16 w-full opacity-60 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <Area 
                                type="monotone" 
                                dataKey="val" 
                                stroke={asset.color} 
                                fill="transparent" 
                                strokeWidth={2} 
                                dot={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="flex items-center justify-between mt-2">
                <div className="flex gap-4">
                    {['30s', '1m', '5m'].map((tf) => (
                        <NeuButton 
                            key={tf} 
                            onClick={() => setActiveTimeframe(tf)}
                            active={activeTimeframe === tf}
                            className={`size-8 rounded-full text-xs font-bold ${activeTimeframe === tf ? 'text-primary' : 'text-gray-500'}`}
                        >
                            {tf}
                        </NeuButton>
                    ))}
                </div>
                <div className="neu-in px-4 py-2 rounded-xl flex items-center gap-2 bg-opacity-30">
                    <Clock size={14} className="text-gray-500" />
                    <span className="font-digital text-xl font-bold text-gray-400">00:{(Math.random()*59).toFixed(0).padStart(2,'0')}</span>
                </div>
            </div>

            <NeuButton 
                onClick={() => onNavigate(Page.TERMINAL)}
                className="w-full py-4 rounded-2xl font-bold text-gray-400 flex items-center justify-center gap-2 hover:text-primary active:text-primary mt-2 group-active:scale-[0.98]"
            >
                <span>{t.markets.enter}</span>
                <ArrowUpRight size={18} />
            </NeuButton>
        </article>
    );
};