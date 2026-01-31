import React, { useState } from 'react';
import { Star, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Page, Asset } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface AssetCardProps {
  asset: Asset & { data: number[], category?: string };
  onNavigate: (page: Page) => void;
  onSelectAsset: (asset: { symbol: string; name: string; price: number; change: number }) => void;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, onNavigate, onSelectAsset, isFavorite, onToggleFavorite }) => {
    const { t } = useLanguage();
    const chartData = asset.data.map((val: number, i: number) => ({ i, val }));
    const assetIconMap: Record<string, string> = {
        BTC: 'currency_bitcoin',
        ETH: 'diamond',
        SOL: 'sunny',
        DOT: 'blur_on',
        LINK: 'link',
        ADA: 'hub',
        UNI: 'swap_horiz',
        AVAX: 'ac_unit',
        MATIC: 'hexagon',
        ATOM: 'blur_circular',
        NEAR: 'near_me',
        ARB: 'architecture',
        OP: 'circle',
        AAVE: 'account_balance',
        MKR: 'precision_manufacturing',
        CRV: 'show_chart',
        DYDX: 'trending_up',
        APE: 'pets',
        SAND: 'landscape',
        MANA: 'public',
    };
    const toRgba = (hex: string, alpha: number) => {
        const match = hex.replace('#', '').match(/.{1,2}/g);
        if (!match) return `rgba(255,255,255,${alpha})`;
        const [r, g, b] = match.map((part) => parseInt(part, 16));
        return `rgba(${r},${g},${b},${alpha})`;
    };
    const iconName = assetIconMap[asset.symbol] ?? 'token';
    const iconGlow = toRgba(asset.color, 0.4);
    const isPositive = asset.change > 0;
    const isNegative = asset.change < 0;
    const colorClass = isPositive ? 'text-market-green' : isNegative ? 'text-market-red' : 'text-slate-400';
    const glowClass = isPositive ? 'glow-text-green' : isNegative ? 'glow-text-red' : '';
    const sparkGlowClass = isPositive ? 'sparkline-glow-green' : isNegative ? 'sparkline-glow-red' : 'sparkline-glow-neutral';
    const sparkColor = isPositive ? '#10b981' : isNegative ? '#ef4444' : '#94a3b8';
    const gradId = `grad-${asset.symbol.toLowerCase()}`;
    const [activeTimeframe, setActiveTimeframe] = useState('1m');

    return (
        <article className="premium-card p-6 flex flex-col gap-6 group hover:scale-[1.01] transition-transform duration-300">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <div className="size-14 premium-btn rounded-2xl flex items-center justify-center shadow-inner bg-[#1a1f2e]" style={{ color: asset.color }}>
                        <span
                            className="material-symbols-outlined text-3xl"
                            style={{ filter: `drop-shadow(0 0 8px ${iconGlow})` }}
                        >
                            {iconName}
                        </span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-200 tracking-tight">{asset.symbol}<span className="text-slate-500 text-lg font-medium">/USD</span></h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{asset.name}</p>
                    </div>
                </div>
                <button 
                    onClick={onToggleFavorite}
                    className={`premium-btn size-10 rounded-full flex items-center justify-center transition-colors ${isFavorite ? 'text-yellow-400' : 'text-slate-500 hover:text-yellow-500'} active:text-yellow-500`}
                >
                    <Star size={18} className="text-[20px] fill-current" fill={isFavorite ? "currentColor" : "none"} />
                </button>
            </div>

            <div className="premium-glass p-5 flex flex-col gap-4 relative overflow-hidden">
                <div className="flex justify-between items-end z-10 relative">
                    <div>
                        <span className="block text-[9px] font-bold opacity-50 mb-1 text-slate-400 tracking-widest uppercase">{t.markets.currentPrice}</span>
                        <span className="font-luxury-mono text-3xl font-bold text-slate-100 tracking-tight drop-shadow-md">
                            ${asset.price.toFixed(2)}
                        </span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className={`${colorClass} ${glowClass} font-luxury-mono text-base font-bold flex items-center`}>
                            {isPositive ? <ArrowUpRight size={14} className="mr-1" /> : isNegative ? <ArrowDownRight size={14} className="mr-1" /> : <span className="mr-1">—</span>}
                            {Math.abs(asset.change)}%
                        </span>
                    </div>
                </div>
                
                <div className="h-16 w-full opacity-80 mix-blend-screen">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} className={`overflow-visible ${sparkGlowClass}`}>
                            <defs>
                                <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={sparkColor} stopOpacity={0.2} />
                                    <stop offset="100%" stopColor={sparkColor} stopOpacity={1} />
                                </linearGradient>
                            </defs>
                            <Area 
                                type="monotone" 
                                dataKey="val" 
                                stroke={`url(#${gradId})`}
                                fill="transparent" 
                                strokeWidth={2.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                dot={(props) => {
                                    const { cx, cy, index } = props;
                                    if (index !== chartData.length - 1) return null;
                                    return (
                                        <circle
                                            cx={cx}
                                            cy={cy}
                                            r={2.5}
                                            fill={sparkColor}
                                            style={{ filter: `drop-shadow(0 0 10px ${sparkColor})` }}
                                        />
                                    );
                                }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="flex items-center justify-between mt-2">
                <div className="flex gap-3">
                    {['30s', '1m', '5m'].map((tf) => (
                        <div key={tf} className="flex flex-col items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setActiveTimeframe(tf)}
                                className={`premium-radio w-10 h-10 text-xs ${activeTimeframe === tf ? 'active' : 'text-slate-500'}`}
                            >
                                {tf}
                            </button>
                        </div>
                    ))}
                </div>
                <div className="search-inset px-4 py-2 rounded-xl flex items-center gap-2 bg-opacity-40 border border-slate-800">
                    <Clock size={14} className="text-slate-500 text-xs" />
                    <span className="font-digital text-lg font-bold text-slate-400 tracking-widest">00:{(Math.random()*59).toFixed(0).padStart(2,'0')}</span>
                </div>
            </div>

            <button
                type="button"
                onClick={() => {
                    onSelectAsset({
                        symbol: asset.symbol,
                        name: asset.name,
                        price: asset.price,
                        change: asset.change
                    });
                    onNavigate(Page.TERMINAL);
                }}
                className="action-btn w-full py-4 rounded-xl font-bold text-slate-400 flex items-center justify-center gap-2 hover:text-blue-400 active:text-blue-400 transition-all mt-2 group-active:scale-[0.99] uppercase tracking-wider text-xs border-t border-white/5"
            >
                <span>{t.markets.enter}</span>
                <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-1" />
            </button>
        </article>
    );
};
