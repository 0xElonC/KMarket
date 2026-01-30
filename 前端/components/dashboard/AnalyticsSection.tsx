import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export function AnalyticsSection() {
  const { t } = useLanguage();
  const analytics = t.dashboard.analytics;
  type RangeKey = '30d' | '3m' | 'ytd';
  const [activeRange, setActiveRange] = useState<RangeKey>('30d');
  const pnlSeriesByRange: Record<
    RangeKey,
    { line: string; area: string; point: { x: number; y: number }; label: string }
  > = {
    '30d': {
      line: 'M0,250 C50,240 100,200 150,210 C200,220 250,180 300,150 C350,120 400,160 450,130 C500,100 550,110 600,80 C650,50 700,70 750,40 L800,20',
      area: 'M0,250 C50,240 100,200 150,210 C200,220 250,180 300,150 C350,120 400,160 450,130 C500,100 550,110 600,80 C650,50 700,70 750,40 L800,20 V300 H0 Z',
      point: { x: 600, y: 80 },
      label: '$12,450'
    },
    '3m': {
      line: 'M0,260 C70,230 120,210 170,190 C220,170 270,160 320,140 C370,120 420,135 470,110 C520,90 570,80 620,70 C670,60 720,50 800,35',
      area: 'M0,260 C70,230 120,210 170,190 C220,170 270,160 320,140 C370,120 420,135 470,110 C520,90 570,80 620,70 C670,60 720,50 800,35 V300 H0 Z',
      point: { x: 520, y: 90 },
      label: '$38,920'
    },
    ytd: {
      line: 'M0,280 C60,250 120,235 180,210 C240,185 300,170 360,150 C420,130 480,110 540,90 C600,70 660,55 720,45 L800,30',
      area: 'M0,280 C60,250 120,235 180,210 C240,185 300,170 360,150 C420,130 480,110 540,90 C600,70 660,55 720,45 L800,30 V300 H0 Z',
      point: { x: 700, y: 55 },
      label: '$72,340'
    }
  };
  const activeSeries = pnlSeriesByRange[activeRange];
  const pnlSubtitle =
    analytics.pnl.subtitleByRange?.[activeRange] ?? analytics.pnl.subtitle;
  const pnlDates =
    analytics.pnlDatesByRange?.[activeRange] ?? analytics.pnlDates;
  const rangeButtonClass = (range: RangeKey) =>
    [
      'px-3 py-1.5 rounded-lg transition-colors duration-200',
      activeRange === range
        ? 'text-primary bg-[#1a212f] shadow-sm'
        : 'text-text-muted hover:text-white'
    ].join(' ');

  return (
    <section className="flex-1 flex flex-col gap-6 min-w-0 overflow-y-auto custom-scrollbar px-4 pr-6 pt-2 pb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="neu-out p-5 flex items-center justify-between rounded-2xl">
          <div>
            <p className="text-text-muted text-xs font-bold uppercase tracking-wide">
              {analytics.stats.totalPredictions}
            </p>
            <h3 className="text-2xl font-bold text-white mt-1">1,248</h3>
          </div>
          <div className="size-12 rounded-xl neu-in flex items-center justify-center text-primary bg-[#0f131b]">
            <span className="material-symbols-outlined">query_stats</span>
          </div>
        </div>
        <div className="neu-out p-5 flex items-center justify-between rounded-2xl">
          <div>
            <p className="text-text-muted text-xs font-bold uppercase tracking-wide">{analytics.stats.avgRoi}</p>
            <h3 className="text-2xl font-bold text-accent-green mt-1">+12.4%</h3>
          </div>
          <div className="size-12 rounded-xl neu-in flex items-center justify-center text-accent-green bg-[#0f131b]">
            <span className="material-symbols-outlined">trending_up</span>
          </div>
        </div>
        <div className="neu-out p-5 flex items-center justify-between rounded-2xl">
          <div>
            <p className="text-text-muted text-xs font-bold uppercase tracking-wide">
              {analytics.stats.activeSignals}
            </p>
            <h3 className="text-2xl font-bold text-accent-purple mt-1">8</h3>
          </div>
          <div className="size-12 rounded-xl neu-in flex items-center justify-center text-accent-purple bg-[#0f131b]">
            <span className="material-symbols-outlined">sensors</span>
          </div>
        </div>
        <div className="neu-out p-5 flex items-center justify-between rounded-2xl">
          <div>
            <p className="text-text-muted text-xs font-bold uppercase tracking-wide">
              {analytics.stats.sharpeRatio}
            </p>
            <h3 className="text-2xl font-bold text-white mt-1">2.1</h3>
          </div>
          <div className="size-12 rounded-xl neu-in flex items-center justify-center text-gray-400 bg-[#0f131b]">
            <span className="material-symbols-outlined">functions</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 neu-out p-6 rounded-3xl flex flex-col h-96">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">{analytics.pnl.title}</h2>
              <p className="text-xs text-text-muted">{pnlSubtitle}</p>
            </div>
            <div className="neu-in p-1 rounded-xl flex text-xs font-bold">
              <button
                type="button"
                className={rangeButtonClass('30d')}
                onClick={() => setActiveRange('30d')}
                aria-pressed={activeRange === '30d'}
              >
                {analytics.pnl.range30d}
              </button>
              <button
                type="button"
                className={rangeButtonClass('3m')}
                onClick={() => setActiveRange('3m')}
                aria-pressed={activeRange === '3m'}
              >
                {analytics.pnl.range3m}
              </button>
              <button
                type="button"
                className={rangeButtonClass('ytd')}
                onClick={() => setActiveRange('ytd')}
                aria-pressed={activeRange === 'ytd'}
              >
                {analytics.pnl.rangeYtd}
              </button>
            </div>
          </div>
          <div className="flex-1 w-full relative flex flex-col min-h-0">
            <div className="flex-1 min-h-0">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 300">
                <line stroke="#1f2937" strokeWidth="1" x1="0" x2="800" y1="250" y2="250" />
                <line stroke="#1f2937" strokeWidth="1" x1="0" x2="800" y1="150" y2="150" />
                <line stroke="#1f2937" strokeWidth="1" x1="0" x2="800" y1="50" y2="50" />
                <defs>
                  <linearGradient id="glowGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  className="chart-line-glow"
                  d={activeSeries.line}
                  fill="none"
                  stroke="#3b82f6"
                  strokeLinecap="round"
                  strokeWidth="3"
                />
                <path
                  d={activeSeries.area}
                  fill="url(#glowGradient)"
                  stroke="none"
                />
                <circle
                  className="chart-line-glow"
                  cx={activeSeries.point.x}
                  cy={activeSeries.point.y}
                  fill="#121721"
                  r="5"
                  stroke="#3b82f6"
                  strokeWidth="2"
                />
                <rect
                  fill="#1e293b"
                  height="30"
                  opacity="0.9"
                  rx="4"
                  width="80"
                  x={activeSeries.point.x - 40}
                  y={Math.max(8, activeSeries.point.y - 50)}
                />
                <text
                  fill="#fff"
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                  x={activeSeries.point.x}
                  y={Math.max(26, activeSeries.point.y - 30)}
                >
                  {activeSeries.label}
                </text>
              </svg>
            </div>
            <div className="mt-2 overflow-x-auto custom-scrollbar">
              <div className="min-w-full flex justify-between gap-6 text-[10px] sm:text-xs text-text-muted font-mono px-1">
                {pnlDates.map((label) => (
                  <span key={label} className="shrink-0">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="neu-out p-6 rounded-3xl flex flex-col items-center justify-center relative">
          <h2 className="text-lg font-bold text-white absolute top-6 left-6">{analytics.winRate.title}</h2>
          <div className="relative w-48 h-48 flex items-center justify-center mt-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="50%" cy="50%" fill="transparent" r="70" stroke="#1a212f" strokeWidth="12" />
              <circle
                cx="50%"
                cy="50%"
                fill="transparent"
                r="70"
                stroke="#10b981"
                strokeDasharray="440"
                strokeDashoffset="123"
                strokeLinecap="round"
                strokeWidth="12"
                style={{ filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.5))' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="text-4xl font-bold text-white"
                style={{ textShadow: '0 0 10px rgba(59, 130, 246, 0.4)' }}
              >
                72%
              </span>
              <span className="text-xs text-accent-green font-bold mt-1">{analytics.winRate.delta}</span>
            </div>
          </div>
          <div className="w-full mt-4 flex justify-between gap-4">
            <div className="neu-in flex-1 p-3 rounded-xl flex flex-col items-center">
              <span className="text-xs text-text-muted uppercase font-bold">{analytics.winRate.wins}</span>
              <span className="text-lg font-bold text-accent-green">898</span>
            </div>
            <div className="neu-in flex-1 p-3 rounded-xl flex flex-col items-center">
              <span className="text-xs text-text-muted uppercase font-bold">{analytics.winRate.losses}</span>
              <span className="text-lg font-bold text-accent-red">350</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="neu-out p-6 rounded-3xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">{analytics.topPairs.title}</h2>
            <button className="neu-btn size-8 rounded-lg flex items-center justify-center text-text-muted hover:text-white">
              <span className="material-symbols-outlined text-sm">more_horiz</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-text-muted border-b border-gray-800">
                  <th className="pb-3 pl-2 font-bold uppercase tracking-wider">{analytics.topPairs.pair}</th>
                  <th className="pb-3 font-bold uppercase tracking-wider">{analytics.topPairs.signals}</th>
                  <th className="pb-3 font-bold uppercase tracking-wider">{analytics.topPairs.winRate}</th>
                  <th className="pb-3 font-bold uppercase tracking-wider text-right pr-2">{analytics.topPairs.pnl}</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="group hover:bg-white/5 transition-colors">
                  <td className="py-3 pl-2 flex items-center gap-3">
                    <div className="size-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
                      <span className="material-symbols-outlined text-sm">currency_bitcoin</span>
                    </div>
                    <span className="font-bold text-white">BTC/USD</span>
                  </td>
                  <td className="py-3 text-gray-400">142</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-accent-green font-bold">78%</span>
                      <div className="w-16 h-1.5 bg-[#1a212f] rounded-full overflow-hidden">
                        <div className="h-full bg-accent-green w-[78%]" />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-right pr-2 font-mono text-accent-green font-bold">+$4,250</td>
                </tr>
                <tr className="group hover:bg-white/5 transition-colors border-t border-gray-800/50">
                  <td className="py-3 pl-2 flex items-center gap-3">
                    <div className="size-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                      <span className="material-symbols-outlined text-sm">token</span>
                    </div>
                    <span className="font-bold text-white">ETH/USD</span>
                  </td>
                  <td className="py-3 text-gray-400">98</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-accent-green font-bold">65%</span>
                      <div className="w-16 h-1.5 bg-[#1a212f] rounded-full overflow-hidden">
                        <div className="h-full bg-accent-green w-[65%]" />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-right pr-2 font-mono text-accent-green font-bold">+$2,105</td>
                </tr>
                <tr className="group hover:bg-white/5 transition-colors border-t border-gray-800/50">
                  <td className="py-3 pl-2 flex items-center gap-3">
                    <div className="size-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                      <span className="material-symbols-outlined text-sm">currency_exchange</span>
                    </div>
                    <span className="font-bold text-white">EUR/USD</span>
                  </td>
                  <td className="py-3 text-gray-400">215</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500 font-bold">58%</span>
                      <div className="w-16 h-1.5 bg-[#1a212f] rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500 w-[58%]" />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-right pr-2 font-mono text-white font-bold">+$850</td>
                </tr>
                <tr className="group hover:bg-white/5 transition-colors border-t border-gray-800/50">
                  <td className="py-3 pl-2 flex items-center gap-3">
                    <div className="size-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 border border-yellow-500/20">
                      <span className="material-symbols-outlined text-sm">monetization_on</span>
                    </div>
                    <span className="font-bold text-white">XAU/USD</span>
                  </td>
                  <td className="py-3 text-gray-400">56</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-accent-red font-bold">42%</span>
                      <div className="w-16 h-1.5 bg-[#1a212f] rounded-full overflow-hidden">
                        <div className="h-full bg-accent-red w-[42%]" />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-right pr-2 font-mono text-accent-red font-bold">-$320</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="neu-out p-6 rounded-3xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">{analytics.accuracy.title}</h2>
            <div className="flex items-center gap-2">
              <span className="size-3 bg-primary rounded-full" />
              <span className="text-xs text-text-muted">{analytics.accuracy.legendShort}</span>
              <span className="size-3 bg-accent-purple rounded-full ml-2" />
              <span className="text-xs text-text-muted">{analytics.accuracy.legendLong}</span>
            </div>
          </div>
          <div className="flex-1 flex items-end justify-between gap-4 px-2 pt-8 pb-2 h-64">
            <div className="flex flex-col items-center gap-2 w-full group">
              <div className="flex items-end gap-1 h-48 w-full justify-center relative">
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs p-2 rounded pointer-events-none whitespace-nowrap border border-gray-700">
                  {analytics.accuracy.tooltips.crypto}
                </div>
                <div className="w-4 bg-primary rounded-t-sm h-[85%] relative shadow-[0_0_10px_rgba(59,130,246,0.3)] hover:brightness-110 transition-all" />
                <div className="w-4 bg-accent-purple rounded-t-sm h-[70%] relative shadow-[0_0_10px_rgba(139,92,246,0.3)] hover:brightness-110 transition-all" />
              </div>
              <span className="text-xs font-bold text-text-muted uppercase">{analytics.accuracy.categories.crypto}</span>
            </div>
            <div className="flex flex-col items-center gap-2 w-full group">
              <div className="flex items-end gap-1 h-48 w-full justify-center relative">
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs p-2 rounded pointer-events-none whitespace-nowrap border border-gray-700">
                  {analytics.accuracy.tooltips.forex}
                </div>
                <div className="w-4 bg-primary rounded-t-sm h-[60%] relative shadow-[0_0_10px_rgba(59,130,246,0.3)] hover:brightness-110 transition-all" />
                <div className="w-4 bg-accent-purple rounded-t-sm h-[55%] relative shadow-[0_0_10px_rgba(139,92,246,0.3)] hover:brightness-110 transition-all" />
              </div>
              <span className="text-xs font-bold text-text-muted uppercase">{analytics.accuracy.categories.forex}</span>
            </div>
            <div className="flex flex-col items-center gap-2 w-full group">
              <div className="flex items-end gap-1 h-48 w-full justify-center relative">
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs p-2 rounded pointer-events-none whitespace-nowrap border border-gray-700">
                  {analytics.accuracy.tooltips.stocks}
                </div>
                <div className="w-4 bg-primary rounded-t-sm h-[75%] relative shadow-[0_0_10px_rgba(59,130,246,0.3)] hover:brightness-110 transition-all" />
                <div className="w-4 bg-accent-purple rounded-t-sm h-[80%] relative shadow-[0_0_10px_rgba(139,92,246,0.3)] hover:brightness-110 transition-all" />
              </div>
              <span className="text-xs font-bold text-text-muted uppercase">{analytics.accuracy.categories.stocks}</span>
            </div>
            <div className="flex flex-col items-center gap-2 w-full group">
              <div className="flex items-end gap-1 h-48 w-full justify-center relative">
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs p-2 rounded pointer-events-none whitespace-nowrap border border-gray-700">
                  {analytics.accuracy.tooltips.indices}
                </div>
                <div className="w-4 bg-primary rounded-t-sm h-[45%] relative shadow-[0_0_10px_rgba(59,130,246,0.3)] hover:brightness-110 transition-all" />
                <div className="w-4 bg-accent-purple rounded-t-sm h-[65%] relative shadow-[0_0_10px_rgba(139,92,246,0.3)] hover:brightness-110 transition-all" />
              </div>
              <span className="text-xs font-bold text-text-muted uppercase">{analytics.accuracy.categories.indices}</span>
            </div>
            <div className="flex flex-col items-center gap-2 w-full group">
              <div className="flex items-end gap-1 h-48 w-full justify-center relative">
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs p-2 rounded pointer-events-none whitespace-nowrap border border-gray-700">
                  {analytics.accuracy.tooltips.metals}
                </div>
                <div className="w-4 bg-primary rounded-t-sm h-[90%] relative shadow-[0_0_10px_rgba(59,130,246,0.3)] hover:brightness-110 transition-all" />
                <div className="w-4 bg-accent-purple rounded-t-sm h-[82%] relative shadow-[0_0_10px_rgba(139,92,246,0.3)] hover:brightness-110 transition-all" />
              </div>
              <span className="text-xs font-bold text-text-muted uppercase">{analytics.accuracy.categories.metals}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
