import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export function DashboardSidebar() {
  const { t } = useLanguage();
  const recentActivities = [
    {
      label: t.dashboard.deposit,
      time: t.dashboard.activityToday,
      amount: '+$500.00',
      icon: 'arrow_downward',
      iconClass: 'text-accent-green',
      iconBg: 'bg-green-500/20'
    },
    {
      label: t.dashboard.buyBtc,
      time: t.dashboard.activityYesterday,
      amount: '-$2,100.00',
      icon: 'shopping_cart',
      iconClass: 'text-primary',
      iconBg: 'bg-blue-500/20'
    },
    {
      label: t.dashboard.withdrawal,
      time: t.dashboard.activityDate,
      amount: '-$150.00',
      icon: 'arrow_upward',
      iconClass: 'text-accent-red',
      iconBg: 'bg-red-500/20'
    }
  ];

  return (
    <aside className="w-80 hidden xl:flex flex-col gap-6 shrink-0">
      <div className="neu-out p-6 rounded-3xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-white">{t.dashboard.myCards}</h2>
          <button className="neu-btn size-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white" type="button">
            <span className="material-symbols-outlined text-sm">add</span>
          </button>
        </div>
        <div className="neu-in p-6 rounded-2xl bg-gradient-to-br from-[#0f131b] to-[#1a212f] relative overflow-hidden group hover:from-blue-900/20 hover:to-blue-800/20 transition-colors cursor-pointer border border-white/5">
          <div className="absolute top-0 right-0 p-4">
            <span className="material-symbols-outlined text-gray-600 text-3xl">contactless</span>
          </div>
          <div className="flex flex-col gap-8 relative z-10">
            <div className="size-8 bg-red-500/80 rounded-full shadow-sm flex items-center justify-center -ml-2">
              <div className="size-8 bg-yellow-500/80 rounded-full shadow-sm ml-5"></div>
            </div>
            <div>
              <p className="font-mono text-gray-400 text-sm tracking-widest mb-1">•••• •••• •••• 4288</p>
              <div className="flex justify-between items-end">
                <p className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.cardHolder}</p>
                <p className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.expires}</p>
              </div>
              <div className="flex justify-between items-end">
                <p className="font-bold text-gray-200">Alex M.</p>
                <p className="font-bold text-gray-200">12/25</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-gray-400 uppercase">{t.dashboard.recentActivity}</h3>
            <button className="text-xs font-bold text-primary" type="button">
              {t.dashboard.viewAll}
            </button>
          </div>
          {recentActivities.map((activity) => (
            <div key={activity.label} className="neu-in p-3 rounded-xl flex items-center gap-3 bg-[#0f131b]">
              <div className={`size-8 rounded-lg flex items-center justify-center ${activity.iconBg} ${activity.iconClass}`}>
                <span className="material-symbols-outlined text-sm">{activity.icon}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-200">{activity.label}</p>
                <p className="text-xs text-gray-500">{activity.time}</p>
              </div>
              <p className="text-sm font-bold text-gray-200">{activity.amount}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="neu-out p-6 rounded-3xl flex flex-col gap-4">
        <h2 className="font-bold text-lg text-white mb-2">{t.dashboard.marketInsights}</h2>
        <div className="neu-in p-4 rounded-xl border border-primary/10 bg-blue-900/10">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-sm">tips_and_updates</span>
            <span className="font-bold text-primary text-xs uppercase">{t.dashboard.proTip}</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            {t.dashboard.marketInsightText}
          </p>
        </div>
        <button className="neu-btn w-full py-3 rounded-xl flex items-center justify-center gap-2 text-primary hover:text-white transition-colors text-sm font-bold" type="button">
          {t.dashboard.exploreOpportunities}
        </button>
      </div>
    </aside>
  );
}
