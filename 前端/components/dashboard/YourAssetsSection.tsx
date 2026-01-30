import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export function YourAssetsSection() {
  const { t } = useLanguage();
  const assetRows = [
    {
      name: 'USDC Coin',
      icon: 'attach_money',
      iconClass: 'text-blue-500',
      iconGlow: 'bg-blue-500/10 shadow-[inset_0_0_10px_rgba(59,130,246,0.2)]',
      tags: [t.dashboard.stablecoin, t.dashboard.usPegged],
      balance: '6,412.70 USDC',
      price: '$1.00',
      equity: '$6,412.70',
      change: '0.00%',
      changeClass: 'text-gray-500'
    },
    {
      name: 'Ethereum',
      icon: 'diamond',
      iconClass: 'text-purple-500',
      iconGlow: 'bg-purple-500/10 shadow-[inset_0_0_10px_rgba(168,85,247,0.2)]',
      tags: [t.dashboard.smartContract, t.dashboard.l1Chain],
      balance: '1.45 ETH',
      price: '$3,450.20',
      equity: '$4,987.75',
      change: '+2.4%',
      changeClass: 'text-accent-green',
      trendIcon: 'trending_up'
    },
    {
      name: 'Bitcoin',
      icon: 'currency_bitcoin',
      iconClass: 'text-orange-500',
      iconGlow: 'bg-orange-500/10 shadow-[inset_0_0_10px_rgba(249,115,22,0.2)]',
      tags: [t.dashboard.storeOfValue, t.dashboard.pow],
      balance: '0.045 BTC',
      price: '$63,200.00',
      equity: '$2,850.00',
      change: '-0.8%',
      changeClass: 'text-accent-red',
      trendIcon: 'trending_down'
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">{t.dashboard.yourAssets}</h2>
        <button className="neu-btn size-10 rounded-full flex items-center justify-center text-primary active" type="button">
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {assetRows.map((asset) => (
          <div
            key={asset.name}
            className="neu-out p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5"
          >
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl neu-in flex items-center justify-center text-white bg-[#0f131b] relative">
                <span className={`material-symbols-outlined ${asset.iconClass}`}>{asset.icon}</span>
                <div className={`absolute inset-0 rounded-xl ${asset.iconGlow}`}></div>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">{asset.name}</h3>
                <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                  <span>{asset.tags[0]}</span>
                  <span className="size-1 rounded-full bg-gray-600"></span>
                  <span>{asset.tags[1]}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-8 md:gap-16 w-full md:w-auto justify-between md:justify-end pl-16 md:pl-0">
              <div className="flex flex-col items-start md:items-end">
                <span className="text-xs font-bold text-gray-500 uppercase">{t.dashboard.balanceLabel}</span>
                <span className="font-bold text-gray-200">{asset.balance}</span>
              </div>
              <div className="flex flex-col items-start md:items-end">
                <span className="text-xs font-bold text-gray-500 uppercase">{t.dashboard.priceLabel}</span>
                <span className="font-bold text-gray-200">{asset.price}</span>
              </div>
              <div className="flex flex-col items-start md:items-end min-w-[100px]">
                <span className="text-xs font-bold text-gray-500 uppercase">{t.dashboard.equityLabel}</span>
                <span className="font-bold text-white text-lg">{asset.equity}</span>
                <span className={`text-xs font-bold ${asset.changeClass} flex items-center gap-1`}>
                  {asset.trendIcon && (
                    <span className="material-symbols-outlined text-xs">{asset.trendIcon}</span>
                  )}
                  {asset.change}
                </span>
              </div>
              <div className="flex gap-2">
                <button className="neu-btn p-2 rounded-lg text-gray-400 hover:text-white transition-colors" type="button">
                  <span className="material-symbols-outlined text-lg">swap_horiz</span>
                </button>
                <button className="neu-btn p-2 rounded-lg text-gray-400 hover:text-white transition-colors" type="button">
                  <span className="material-symbols-outlined text-lg">send</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
