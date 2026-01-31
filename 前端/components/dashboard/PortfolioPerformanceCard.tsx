import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export function PortfolioPerformanceCard() {
  const { t } = useLanguage();
  const [active, setActive] = useState<'1W' | '1M' | '1Y' | 'ALL'>('1W');
  const timeframes = [
    { id: '1W', label: t.dashboard.timeframe1W },
    { id: '1M', label: t.dashboard.timeframe1M },
    { id: '1Y', label: t.dashboard.timeframe1Y },
    { id: 'ALL', label: t.dashboard.timeframeAll }
  ] as const;
  const stats = [
    { label: t.dashboard.totalProfit, value: '+$1,240.50', color: 'text-accent-green' },
    { label: t.dashboard.roiAllTime, value: '+12.8%', color: 'text-accent-green' },
    { label: t.dashboard.activeYield, value: '4.2% APY', color: 'text-primary' },
    { label: t.dashboard.bestAsset, value: 'BTC (+5%)', color: 'text-accent-orange' }
  ];

  return (
    <div className="neu-out p-8 rounded-3xl xl:col-span-2 flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-white mb-2">{t.dashboard.portfolioPerformance}</h2>
          <p className="text-sm text-gray-400">{t.dashboard.portfolioSubtitle}</p>
        </div>
        <div className="neu-in p-1 rounded-lg flex items-center bg-[#0f131b]">
          {timeframes.map((tf) => {
            const isActive = active === tf.id;
            return (
              <button
                key={tf.id}
                type="button"
                onClick={() => setActive(tf.id)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  isActive ? 'text-white bg-white/10 shadow-sm' : 'text-gray-500 hover:text-white'
                }`}
              >
                {tf.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 flex items-end gap-2 h-48 sm:h-auto pb-2 relative">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gray-700/30"></div>
        <div className="absolute inset-x-0 bottom-1/4 h-px bg-gray-700/30 border-dashed"></div>
        <div className="absolute inset-x-0 bottom-2/4 h-px bg-gray-700/30 border-dashed"></div>
        <div className="absolute inset-x-0 bottom-3/4 h-px bg-gray-700/30 border-dashed"></div>
        <svg className="w-full h-full absolute bottom-0 left-0 right-0 z-10 overflow-hidden" preserveAspectRatio="none" viewBox="0 0 600 200">
          <defs>
            <linearGradient id="gradientPath" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.3 }}></stop>
              <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 0 }}></stop>
            </linearGradient>
          </defs>
          <path
            d="M0,150 C50,140 100,100 150,110 C200,120 250,80 300,70 C350,60 400,90 450,50 C500,10 550,30 600,20 L600,200 L0,200 Z"
            fill="url(#gradientPath)"
          ></path>
          <path
            className="drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]"
            d="M0,150 C50,140 100,100 150,110 C200,120 250,80 300,70 C350,60 400,90 450,50 C500,10 550,30 600,20"
            fill="none"
            stroke="#3b82f6"
            strokeLinecap="round"
            strokeWidth="3"
          ></path>
        </svg>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
        {stats.map((stat) => (
          <div key={stat.label} className="neu-in p-4 rounded-xl border border-white/5 bg-[#0f131b]">
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
