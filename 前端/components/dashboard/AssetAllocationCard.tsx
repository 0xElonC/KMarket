import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const legendItems = [
  {
    label: 'USDC',
    colorClass: 'bg-primary',
    glowClass: 'shadow-[0_0_6px_rgba(59,130,246,0.6)]'
  },
  {
    label: 'ETH',
    colorClass: 'bg-accent-purple',
    glowClass: 'shadow-[0_0_6px_rgba(139,92,246,0.6)]'
  },
  {
    label: 'BTC',
    colorClass: 'bg-accent-orange',
    glowClass: 'shadow-[0_0_6px_rgba(249,115,22,0.6)]'
  }
];

export function AssetAllocationCard() {
  const { t } = useLanguage();

  return (
    <div className="neu-out p-8 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden xl:col-span-1">
      <h2 className="text-lg font-bold text-white mb-6 w-full text-left">{t.dashboard.assetAllocation}</h2>
      <div className="relative size-64 flex items-center justify-center mb-6">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" fill="transparent" r="40" stroke="#1e293b" strokeWidth="12"></circle>
          <circle
            className="chart-segment drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]"
            cx="50"
            cy="50"
            fill="transparent"
            r="40"
            stroke="#3b82f6"
            strokeDasharray="113 251"
            strokeDashoffset="0"
            strokeWidth="12"
          ></circle>
          <circle
            className="chart-segment drop-shadow-[0_0_8px_rgba(139,92,246,0.4)]"
            cx="50"
            cy="50"
            fill="transparent"
            r="40"
            stroke="#8b5cf6"
            strokeDasharray="88 251"
            strokeDashoffset="-118"
            strokeWidth="12"
          ></circle>
          <circle
            className="chart-segment drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]"
            cx="50"
            cy="50"
            fill="transparent"
            r="40"
            stroke="#f97316"
            strokeDasharray="50 251"
            strokeDashoffset="-210"
            strokeWidth="12"
          ></circle>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.dashboard.netWorth}</span>
          <span className="text-2xl font-mono font-bold text-white mt-1">$14.25k</span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-6 w-full">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className={`size-3 rounded-full ${item.colorClass} ${item.glowClass}`}></span>
            <span className="text-xs font-bold text-gray-400">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
