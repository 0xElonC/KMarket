import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export function YieldEarnedSection() {
  const { t } = useLanguage();
  const yieldCards = [
    {
      title: t.dashboard.predictionMarkets,
      amount: '$854.20',
      apy: '+18% APY',
      icon: 'emoji_events',
      iconWrapClass: 'text-accent-green bg-green-900/10',
      badgeClass: 'text-accent-green bg-green-900/10 border border-green-500/10',
      footerLabel: t.dashboard.totalWinnings,
      action: t.dashboard.history,
      watermark: 'trophy'
    },
    {
      title: t.dashboard.liquidityPools,
      amount: '$386.30',
      apy: '+5.2% APY',
      icon: 'waves',
      iconWrapClass: 'text-primary bg-blue-900/10',
      badgeClass: 'text-primary bg-blue-900/10 border border-blue-500/10',
      footerLabel: t.dashboard.providedUsdcEth,
      action: t.dashboard.manage,
      watermark: 'water_drop'
    },
    {
      title: t.dashboard.ethStaking,
      amount: '$124.55',
      apy: '+3.5% APY',
      icon: 'lock',
      iconWrapClass: 'text-accent-purple bg-purple-900/10',
      badgeClass: 'text-accent-purple bg-purple-900/10 border border-purple-500/10',
      footerLabel: t.dashboard.stakedEth,
      action: t.dashboard.unstake,
      watermark: 'lock_clock'
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-bold text-white">{t.dashboard.yieldEarned}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {yieldCards.map((card) => (
          <div key={card.title} className="neu-out p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 text-[120px] text-white/5 pointer-events-none material-symbols-outlined rotate-12">
              {card.watermark}
            </div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className={`size-10 rounded-xl neu-in flex items-center justify-center ${card.iconWrapClass}`}>
                <span className="material-symbols-outlined">{card.icon}</span>
              </div>
              <span className={`neu-in px-3 py-1 rounded-full text-xs font-bold ${card.badgeClass}`}>{card.apy}</span>
            </div>
            <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wide mb-1 relative z-10">
              {card.title}
            </h3>
            <p className="text-3xl font-mono font-bold text-white relative z-10">{card.amount}</p>
            <div className="mt-4 pt-4 border-t border-gray-700/50 flex justify-between items-center relative z-10">
              <span className="text-xs text-gray-500">{card.footerLabel}</span>
              <button className="text-xs font-bold text-primary hover:text-white transition-colors flex items-center gap-1" type="button">
                {card.action} <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
