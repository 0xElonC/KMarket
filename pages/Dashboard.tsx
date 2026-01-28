import React, { useState, useMemo } from 'react';
import { Eye, Plus, ArrowUpRight, CheckCircle, Flame, ChevronDown } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';
import { BetCard } from '../components/BetCard';
import { StatRow } from '../components/StatRow';
import { NeuButton } from '../components/NeuButton';

// Mock data generator for different time ranges
const getPerformanceData = (range: string) => {
  switch (range) {
    case 'lastWeek':
      return [
        { day: 'M', val: 50 }, { day: 'T', val: 40 }, { day: 'W', val: 70 }, 
        { day: 'T', val: 30 }, { day: 'F', val: 80 }, { day: 'S', val: 60 }, { day: 'S', val: 90 }
      ];
    case 'month':
      return [
        { day: 'W1', val: 300 }, { day: 'W2', val: 450 }, { day: 'W3', val: 200 }, { day: 'W4', val: 550 }
      ];
    case 'lastMonth':
      return [
        { day: 'W1', val: 400 }, { day: 'W2', val: 300 }, { day: 'W3', val: 500 }, { day: 'W4', val: 450 }
      ];
    case 'week':
    default:
      return [
        { day: 'M', val: 40 }, { day: 'T', val: 60 }, { day: 'W', val: 30 }, 
        { day: 'T', val: 85 }, { day: 'F', val: 50 }, { day: 'S', val: 90 }, { day: 'S', val: 20 }
      ];
  }
};

export default function Dashboard() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'inProgress' | 'history'>('inProgress');
  const [timeRange, setTimeRange] = useState('week');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const performanceData = useMemo(() => getPerformanceData(timeRange), [timeRange]);

  const handleAction = (action: string) => {
      alert(`${action} functionality would open a modal here.`);
  };

  const timeOptions = [
    { key: 'week', label: t.dashboard.week },
    { key: 'lastWeek', label: t.dashboard.lastWeek },
    { key: 'month', label: t.dashboard.month },
    { key: 'lastMonth', label: t.dashboard.lastMonth },
  ];

  const currentLabel = timeOptions.find(o => o.key === timeRange)?.label;

  return (
    <div className="flex flex-col gap-8 pb-8">
       {/* Top Stats Row */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Balance Card */}
           <div className="lg:col-span-2 neu-out p-8 relative flex flex-col justify-center gap-6 rounded-3xl">
              <div className="flex justify-between items-start">
                  <div>
                      <h2 className="text-gray-500 font-bold text-sm uppercase tracking-wide mb-1">{t.dashboard.totalBalance}</h2>
                      <div className="flex items-baseline gap-2 text-success">
                          <ArrowUpRight size={14} />
                          <span className="text-sm font-bold">+2.4% {t.dashboard.week}</span>
                      </div>
                  </div>
                  <NeuButton className="size-10 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-200"><Eye size={18}/></NeuButton>
              </div>
              
              <div className="neu-in p-6 rounded-2xl flex items-center justify-center bg-[#1a2433]">
                  <span className="text-4xl md:text-5xl lg:text-6xl font-digital font-bold text-gray-200 tracking-tighter drop-shadow-lg">$14,250.45</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <ActionButton icon={<Plus size={18} />} label={t.dashboard.deposit} accent onClick={() => handleAction(t.dashboard.deposit)} />
                  <ActionButton icon={<ArrowUpRight size={18} />} label={t.dashboard.withdraw} onClick={() => handleAction(t.dashboard.withdraw)} />
              </div>
           </div>

           {/* Quick Stats */}
           <div className="neu-out p-6 flex flex-col gap-4 rounded-3xl justify-between">
              <div>
                  <h3 className="font-bold text-gray-400 mb-4">{t.dashboard.quickStats}</h3>
                  <StatRow label={t.dashboard.activeBets} value={activeTab === 'inProgress' ? "3" : "0"} progress={75} color="bg-primary" />
                  <StatRow label={t.dashboard.winRate} value="68%" progress={68} color="bg-success" />
              </div>
              <div className="neu-in p-4 rounded-xl border border-primary/10 bg-primary/5 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                      <Flame size={16} /> {t.dashboard.hotPromo}
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{t.dashboard.promoDesc}</p>
              </div>
           </div>
       </div>

       {/* Activity Section */}
       <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
           <div className="xl:col-span-2 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-200">{t.dashboard.activity}</h2>
                  <div className="neu-in p-1 rounded-xl flex bg-[#161f2d]">
                      <button 
                        onClick={() => setActiveTab('inProgress')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'inProgress' ? 'neu-out text-primary' : 'text-gray-500'}`}
                      >
                          {t.dashboard.inProgress}
                      </button>
                      <button 
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'history' ? 'neu-out text-primary' : 'text-gray-500'}`}
                      >
                          {t.dashboard.history}
                      </button>
                  </div>
              </div>
              
              <div className="flex flex-col gap-4">
                  {activeTab === 'inProgress' ? (
                      <>
                        <BetCard 
                            title="Lakers vs Warriors" sub="NBA • Today 20:00" selection="Lakers Win" stake={200} payout={380} status="LIVE" icon="🏀" color="border-primary"
                        />
                         <BetCard 
                            title="Bitcoin Purchase" sub="Crypto • 12 Jul" selection="Buy Order" stake={0.05} payout={3200} status="HELD" icon="₿" color="border-blue-500" isCrypto
                        />
                        <BetCard 
                            title="Super Bowl LVIII" sub="NFL • Pending" selection="Chiefs -3.5" stake={150} payout={285} status="LIVE" icon="🏈" color="border-primary"
                        />
                      </>
                  ) : (
                      <>
                        <BetCard 
                            title="Man City vs Arsenal" sub="Premier League • Yesterday" selection="Over 2.5 Goals" stake={500} payout={950} status="WON" icon="⚽" color="border-success"
                        />
                        <BetCard 
                            title="Djokovic vs Alcaraz" sub="Wimbledon • Last Week" selection="Alcaraz Win" stake={300} payout={0} status="LOST" icon="🎾" color="border-red-500"
                        />
                      </>
                  )}
              </div>
           </div>

           {/* Cards & Perf */}
           <div className="flex flex-col gap-6">
               <div className="neu-out p-6 rounded-3xl flex flex-col gap-6 h-full relative z-10">
                   <div className="flex items-center justify-between">
                       <h2 className="font-bold text-lg text-gray-200">{t.dashboard.performance}</h2>
                       
                       {/* Custom Dropdown */}
                       <div className="relative">
                            <NeuButton 
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-primary active:scale-95 border border-transparent hover:border-primary/20"
                            >
                                <span>{currentLabel}</span>
                                <ChevronDown size={14} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </NeuButton>
                            
                            {isDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>
                                    <div className="absolute top-full right-0 mt-2 w-32 neu-out bg-[#1e293b] rounded-xl overflow-hidden z-20 flex flex-col shadow-2xl border border-white/5 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                        {timeOptions.map((opt) => (
                                            <button
                                                key={opt.key}
                                                onClick={() => {
                                                    setTimeRange(opt.key);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className={`px-4 py-3 text-xs font-bold text-left transition-colors flex items-center justify-between ${timeRange === opt.key ? 'text-primary bg-black/20' : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'}`}
                                            >
                                                {opt.label}
                                                {timeRange === opt.key && <div className="size-1.5 rounded-full bg-primary shadow-[0_0_5px_#3B82F6]"></div>}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                       </div>
                   </div>
                   
                   <div className="flex-1 min-h-[200px]">
                       <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={performanceData}>
                               <Bar dataKey="val" radius={[4,4,0,0]} animationDuration={500}>
                                   {performanceData.map((entry, index) => {
                                       // Simple logic to color high/low values for demo
                                       const color = entry.val > 80 ? '#10b981' : entry.val < 40 ? '#ef4444' : '#3b82f6';
                                       return <Cell key={`cell-${index}`} fill={color} fillOpacity={0.8} />
                                   })}
                               </Bar>
                           </BarChart>
                       </ResponsiveContainer>
                   </div>
                   <div className="neu-out p-4 rounded-2xl flex items-center gap-3">
                       <div className="neu-btn size-10 rounded-full flex items-center justify-center text-success"><CheckCircle size={18} /></div>
                       <div>
                           <p className="text-xs font-bold text-gray-500 uppercase">{t.dashboard.lastResult}</p>
                           <p className="font-bold text-sm text-gray-200">{t.dashboard.won} $950.00</p>
                       </div>
                   </div>
               </div>
           </div>
       </div>
    </div>
  );
}

const ActionButton = ({ icon, label, accent, onClick }: any) => (
    <NeuButton 
        onClick={onClick}
        className={`py-4 rounded-xl flex items-center justify-center gap-2 text-gray-200 hover:text-white transition-colors group active:scale-95`}
    >
        <div className={`size-8 rounded-full flex items-center justify-center transition-colors ${accent ? 'bg-success/10 text-success group-hover:bg-success group-hover:text-white' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'}`}>
            {icon}
        </div>
        <span className="font-bold">{label}</span>
    </NeuButton>
);
