import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export function LiquidityPoolSection() {
  const { t } = useLanguage();
  const [showLiquidityModal, setShowLiquidityModal] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-xl font-bold text-gray-700 dark:text-white">{t.dashboard.activeLiquidityPool}</h2>
          <div className="neu-in p-1.5 rounded-xl flex items-center bg-gray-200/50 dark:bg-[#0f131b]">
            <button className="neu-out py-2 px-6 rounded-lg text-sm font-bold text-primary shadow-sm transition-all transform active:scale-95 dark:text-blue-400 dark:shadow-none dark:neu-btn active dark:bg-blue-500/10">
              ETH/USDC
            </button>
            <button className="py-2 px-6 rounded-lg text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors dark:text-gray-400 dark:hover:text-gray-200">
              {t.dashboard.history}
            </button>
          </div>
        </div>
        <div className="neu-out p-6 lg:p-8 rounded-3xl flex flex-col gap-8 border-l-4 border-primary dark:border-blue-500 relative">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="flex gap-[5px] shrink-0">
                <div className="size-14 rounded-full neu-in flex items-center justify-center bg-gray-50 dark:bg-[#0f131b] z-10 border-4 border-transparent dark:border-[#121721]">
                  <span className="material-symbols-outlined text-3xl text-blue-500">attach_money</span>
                </div>
                <div className="size-14 rounded-full neu-in flex items-center justify-center bg-gray-50 dark:bg-[#0f131b] border-4 border-transparent dark:border-[#121721]">
                  <span className="material-symbols-outlined text-3xl text-indigo-400">diamond</span>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-2xl text-gray-800 dark:text-white mb-1">USDC / ETH</h3>
                <div className="flex items-center gap-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <span className="bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-md border border-blue-500/20">
                    0.05% {t.dashboard.feeTier}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-1.5 bg-green-500 rounded-full"></span> {t.dashboard.active}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-4 md:gap-8 w-full md:w-auto">
              <div className="bg-gray-100 dark:bg-[#0f131b] p-3 rounded-xl neu-in min-w-[120px]">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">{t.dashboard.poolTvl}</p>
                <p className="text-xl font-bold text-gray-700 dark:text-gray-200">$142.5M</p>
                <p className="text-xs text-accent-green font-bold">+2.1% (24h)</p>
              </div>
              <div className="bg-gray-100 dark:bg-[#0f131b] p-3 rounded-xl neu-in min-w-[120px]">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">{t.dashboard.apr}</p>
                <p className="text-xl font-bold text-accent-green">12.4%</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.dashboard.baseRewards}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-[#e8ecf1] dark:bg-[#0d1118] neu-in rounded-2xl p-6 min-h-[300px] relative flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t.dashboard.depthVolume}
                </h4>
                <div className="flex gap-2">
                  <button className="px-2 py-1 text-xs font-bold rounded bg-white dark:bg-[#1a212f] shadow-sm text-primary dark:text-blue-400">
                    {t.dashboard.oneHour}
                  </button>
                  <button className="px-2 py-1 text-xs font-bold rounded hover:bg-white/50 dark:hover:bg-[#1a212f] text-gray-500 dark:text-gray-500 transition-colors">
                    {t.dashboard.oneDay}
                  </button>
                  <button className="px-2 py-1 text-xs font-bold rounded hover:bg-white/50 dark:hover:bg-[#1a212f] text-gray-500 dark:text-gray-500 transition-colors">
                    {t.dashboard.oneWeek}
                  </button>
                </div>
              </div>
              <div className="flex-1 w-full relative flex items-end gap-1 px-2 pb-4">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                  <div className="w-full h-px bg-gray-500"></div>
                  <div className="w-full h-px bg-gray-500"></div>
                  <div className="w-full h-px bg-gray-500"></div>
                  <div className="w-full h-px bg-gray-500"></div>
                  <div className="w-full h-px bg-gray-500"></div>
                </div>
                <div className="w-full h-full flex items-end justify-between gap-[2%]">
                  <div className="w-full bg-blue-500/20 rounded-t-sm h-[40%] relative group">
                    <div className="absolute bottom-0 w-full bg-blue-500 h-1/2 rounded-t-sm opacity-60 chart-line-glow"></div>
                  </div>
                  <div className="w-full bg-blue-500/20 rounded-t-sm h-[55%] relative group">
                    <div className="absolute bottom-0 w-full bg-blue-500 h-2/3 rounded-t-sm opacity-60 chart-line-glow"></div>
                  </div>
                  <div className="w-full bg-blue-500/20 rounded-t-sm h-[45%] relative group">
                    <div className="absolute bottom-0 w-full bg-accent-red h-1/2 rounded-t-sm opacity-60 chart-line-glow"></div>
                  </div>
                  <div className="w-full bg-blue-500/20 rounded-t-sm h-[60%] relative group">
                    <div className="absolute bottom-0 w-full bg-accent-green h-3/4 rounded-t-sm opacity-60 chart-line-glow"></div>
                  </div>
                  <div className="w-full bg-blue-500/20 rounded-t-sm h-[75%] relative group">
                    <div className="absolute bottom-0 w-full bg-accent-green h-2/3 rounded-t-sm opacity-60 chart-line-glow"></div>
                  </div>
                  <div className="w-full bg-blue-500/20 rounded-t-sm h-[50%] relative group">
                    <div className="absolute bottom-0 w-full bg-blue-500 h-1/2 rounded-t-sm opacity-60 chart-line-glow"></div>
                  </div>
                  <div className="w-full bg-blue-500/20 rounded-t-sm h-[65%] relative group">
                    <div className="absolute bottom-0 w-full bg-accent-green h-2/3 rounded-t-sm opacity-60 chart-line-glow"></div>
                  </div>
                  <div className="w-full bg-blue-500/20 rounded-t-sm h-[80%] relative group">
                    <div className="absolute bottom-0 w-full bg-accent-green h-3/4 rounded-t-sm opacity-80 chart-line-glow"></div>
                  </div>
                  <div className="w-full bg-blue-500/20 rounded-t-sm h-[70%] relative group">
                    <div className="absolute bottom-0 w-full bg-accent-green h-1/2 rounded-t-sm opacity-60 chart-line-glow"></div>
                  </div>
                  <div className="w-full bg-blue-500/20 rounded-t-sm h-[85%] relative group">
                    <div className="absolute bottom-0 w-full bg-accent-green h-3/4 rounded-t-sm opacity-90 chart-line-glow"></div>
                  </div>
                  <div className="w-full bg-blue-500/20 rounded-t-sm h-[60%] relative group">
                    <div className="absolute bottom-0 w-full bg-accent-red h-1/3 rounded-t-sm opacity-60 chart-line-glow"></div>
                  </div>
                  <div className="w-full bg-blue-500/20 rounded-t-sm h-[90%] relative group">
                    <div className="absolute bottom-0 w-full bg-accent-green h-4/5 rounded-t-sm opacity-100 chart-line-glow"></div>
                  </div>
                </div>
                <div className="absolute left-0 right-0 top-[20%] h-[1px] border-t border-dashed border-gray-400/30 dark:border-gray-500/30">
                  <span className="absolute right-0 -top-2.5 bg-gray-200 dark:bg-[#1a212f] text-[10px] px-1 rounded text-gray-500">
                    {t.dashboard.target}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-between gap-6">
              <div className="bg-gray-50 dark:bg-[#151b26] p-5 rounded-2xl border border-gray-200 dark:border-gray-800">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-4 dark:text-gray-400">{t.dashboard.myPosition}</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{t.dashboard.liquidity}</span>
                    <span className="font-mono font-bold text-gray-800 dark:text-white">$8,250.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{t.dashboard.share}</span>
                    <span className="font-mono font-bold text-gray-800 dark:text-white">0.004%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{t.dashboard.unclaimedFees}</span>
                    <span className="font-mono font-bold text-accent-green">$42.12</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">{t.dashboard.status}</span>
                      <span className="text-green-500 font-bold flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-green-500"></span> {t.dashboard.inRange}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  className="neu-btn w-full py-4 rounded-xl text-sm font-bold text-accent-green hover:text-green-400 transition-colors flex items-center justify-center gap-2 shadow-lg dark:shadow-[0_4px_14px_rgba(16,185,129,0.2)]"
                  type="button"
                  onClick={() => setShowLiquidityModal(true)}
                >
                  <span className="material-symbols-outlined">add_circle</span>
                  <span>{t.dashboard.addLiquidity}</span>
                </button>
                <div className="flex gap-3">
                  <button className="neu-btn flex-1 py-3 rounded-xl text-sm font-bold text-gray-500 hover:text-red-400 transition-colors flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-sm">remove_circle</span>
                    <span>{t.dashboard.remove}</span>
                  </button>
                  <button className="neu-btn flex-1 py-3 rounded-xl text-sm font-bold text-primary hover:text-blue-400 transition-colors flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-sm">payments</span>
                    <span>{t.dashboard.claim}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showLiquidityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40">
          <div className="relative w-full max-w-lg neu-out p-8 rounded-3xl flex flex-col gap-6 animate-[fadeIn_0.3s_ease-out] shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-700 dark:text-white flex items-center gap-3">
                <span className="p-2 neu-in rounded-xl flex items-center justify-center text-primary dark:text-blue-400">
                  <span className="material-symbols-outlined">add_card</span>
                </span>
                {t.dashboard.addLiquidity}
              </h2>
              <button
                className="neu-btn size-10 rounded-full flex items-center justify-center text-gray-500 hover:text-red-400 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                type="button"
                onClick={() => setShowLiquidityModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="neu-in p-4 rounded-2xl flex flex-col gap-2 relative group transition-all">
                <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400 px-1">
                  <span>{t.dashboard.input}</span>
                  <span>
                    {t.dashboard.available} <span className="text-primary dark:text-blue-400">14.5 ETH</span>
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    className="w-full bg-transparent border-none p-0 text-2xl font-bold text-gray-700 dark:text-white focus:ring-0 focus:ring-offset-0 focus:outline-none focus:shadow-none placeholder-gray-400 dark:placeholder-gray-600 font-mono"
                    placeholder="0.0"
                    type="number"
                  />
                  <div className="flex items-center gap-2 neu-out px-3 py-1.5 rounded-xl shrink-0 bg-gray-50 dark:bg-[#151b26]">
                    <span className="material-symbols-outlined text-indigo-400">diamond</span>
                    <span className="font-bold text-sm text-gray-700 dark:text-white">ETH</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-center -my-2 relative z-10">
                <div className="neu-out size-8 rounded-full flex items-center justify-center bg-gray-100 dark:bg-[#121721] text-gray-400 dark:text-gray-500">
                  <span className="material-symbols-outlined text-sm">add</span>
                </div>
              </div>
              <div className="neu-in p-4 rounded-2xl flex flex-col gap-2 relative group transition-all">
                <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-gray-400 px-1">
                  <span>{t.dashboard.input}</span>
                  <span>
                    {t.dashboard.available} <span className="text-primary dark:text-blue-400">25,400 USDC</span>
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    className="w-full bg-transparent border-none p-0 text-2xl font-bold text-gray-700 dark:text-white focus:ring-0 focus:ring-offset-0 focus:outline-none focus:shadow-none placeholder-gray-400 dark:placeholder-gray-600 font-mono"
                    placeholder="0.0"
                    type="number"
                  />
                  <div className="flex items-center gap-2 neu-out px-3 py-1.5 rounded-xl shrink-0 bg-gray-50 dark:bg-[#151b26]">
                    <span className="material-symbols-outlined text-blue-500">attach_money</span>
                    <span className="font-bold text-sm text-gray-700 dark:text-white">USDC</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="neu-out p-5 rounded-2xl flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t.dashboard.priceRange}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-500 border border-green-500/20">
                  {t.dashboard.inRange}
                </span>
              </div>
              <div className="h-16 relative w-full flex items-end gap-1 overflow-hidden opacity-80">
                <div className="w-1/12 h-[20%] bg-gray-300 dark:bg-gray-700 rounded-t-sm"></div>
                <div className="w-1/12 h-[35%] bg-gray-300 dark:bg-gray-700 rounded-t-sm"></div>
                <div className="w-1/12 h-[45%] bg-gray-300 dark:bg-gray-700 rounded-t-sm"></div>
                <div className="w-3/12 h-full bg-primary/10 dark:bg-blue-500/10 border-x border-t border-primary/30 dark:border-blue-500/30 rounded-t-md relative flex items-end justify-center gap-0.5 px-1">
                  <div className="w-1/3 h-[60%] bg-primary dark:bg-blue-500 rounded-t-sm shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                  <div className="w-1/3 h-[85%] bg-primary dark:bg-blue-500 rounded-t-sm shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                  <div className="w-1/3 h-[55%] bg-primary dark:bg-blue-500 rounded-t-sm shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                </div>
                <div className="w-1/12 h-[40%] bg-gray-300 dark:bg-gray-700 rounded-t-sm"></div>
                <div className="w-1/12 h-[25%] bg-gray-300 dark:bg-gray-700 rounded-t-sm"></div>
                <div className="w-1/12 h-[15%] bg-gray-300 dark:bg-gray-700 rounded-t-sm"></div>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-gray-400 dark:text-gray-500 mt-1">
                <span>{t.dashboard.min}: 1800 USDC</span>
                <span>{t.dashboard.current}: 2240</span>
                <span>{t.dashboard.max}: 2600 USDC</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 p-3 neu-in rounded-xl bg-gray-100/50 dark:bg-[#151b26]/50">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t.dashboard.poolShare}</span>
                <span className="font-bold text-gray-700 dark:text-gray-200 font-mono">0.003%</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400">{t.dashboard.estimatedApr}</span>
                <span className="font-bold text-accent-green font-mono">~14.2%</span>
              </div>
            </div>
            <button className="w-full py-4 rounded-xl font-bold text-white text-lg transition-all shadow-[0_4px_14px_rgba(59,130,246,0.4)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.6)] active:scale-[0.98] relative overflow-hidden group bg-gradient-to-r from-blue-600 to-blue-500 border-t border-white/20">
              <span className="relative z-10 flex items-center justify-center gap-2">
                {t.dashboard.confirmAddLiquidity}
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
