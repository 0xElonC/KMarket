import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTransactionActivity } from '../../hooks/useTransactionActivity';
import type { ActivityItem } from '../../utils/activityUtils';

/**
 * 交易历史页面 - 显示完整的交易记录
 */
export function TransactionHistorySection() {
  const { t } = useLanguage();
  const { activities, loading, error } = useTransactionActivity(50, 5000); // 显示更多历史,5秒刷新
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'won' | 'lost'>('all');

  // 过滤数据
  const filteredActivities = activities.filter(activity => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return activity.status === 'LIVE';
    if (filterStatus === 'won') return activity.status === 'WON';
    if (filterStatus === 'lost') return activity.status === 'LOST';
    return true;
  });

  return (
    <section className="flex-1 flex flex-col gap-6 min-w-0 pr-2 pb-4">
      {/* 标题和过滤器 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-700 dark:text-white">{t.dashboard.menuTransactions}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {filteredActivities.length} {filteredActivities.length === 1 ? 'transaction' : 'transactions'}
          </p>
        </div>

        {/* 状态过滤器 */}
        <div className="neu-in p-1.5 rounded-xl flex items-center gap-1 bg-gray-200/50 dark:bg-[#0f131b]">
          <button
            className={`py-2 px-4 rounded-lg text-sm font-bold transition-all ${filterStatus === 'all'
                ? 'neu-out text-primary shadow-sm dark:text-blue-400 dark:bg-blue-500/10'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            onClick={() => setFilterStatus('all')}
          >
            All
          </button>
          <button
            className={`py-2 px-4 rounded-lg text-sm font-bold transition-all ${filterStatus === 'active'
                ? 'neu-out text-primary shadow-sm dark:text-blue-400 dark:bg-blue-500/10'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            onClick={() => setFilterStatus('active')}
          >
            Active
          </button>
          <button
            className={`py-2 px-4 rounded-lg text-sm font-bold transition-all ${filterStatus === 'won'
                ? 'neu-out text-accent-green shadow-sm dark:bg-green-500/10'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            onClick={() => setFilterStatus('won')}
          >
            Won
          </button>
          <button
            className={`py-2 px-4 rounded-lg text-sm font-bold transition-all ${filterStatus === 'lost'
                ? 'neu-out text-accent-red shadow-sm dark:bg-red-500/10'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            onClick={() => setFilterStatus('lost')}
          >
            Lost
          </button>
        </div>
      </div>

      {/* 交易列表 */}
      {loading && filteredActivities.length === 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="neu-out p-5 rounded-2xl animate-pulse">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded dark:bg-gray-700 w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded dark:bg-gray-700 w-1/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="neu-out p-8 rounded-2xl text-center">
          <p className="text-red-500 dark:text-red-400">{error}</p>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="neu-out p-12 rounded-2xl text-center">
          <div className="flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600">receipt_long</span>
            <div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">No transactions found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {filterStatus !== 'all' ? `No ${filterStatus} transactions` : 'Start trading to see your history'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredActivities.map((activity) => (
            <TransactionCard key={activity.id} activity={activity} t={t} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * 交易卡片组件
 */
interface TransactionCardProps {
  activity: ActivityItem;
  t: any;
}

function TransactionCard({ activity, t }: TransactionCardProps) {
  const borderColorClass =
    activity.status === 'LIVE' ? 'border-primary dark:border-blue-500' :
      activity.status === 'WON' ? 'border-accent-green' :
        activity.status === 'LOST' ? 'border-accent-red' :
          'border-gray-300 dark:border-gray-600';

  const badgeClass =
    activity.status === 'LIVE' ? 'neu-in px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30 animate-pulse' :
      activity.status === 'WON' ? 'neu-in px-3 py-1 rounded-full bg-green-50 text-accent-green text-xs font-bold border border-green-100 dark:bg-green-900/20 dark:border-green-900/30' :
        activity.status === 'LOST' ? 'neu-in px-3 py-1 rounded-full bg-red-50 text-accent-red text-xs font-bold border border-red-100 dark:bg-red-900/20 dark:border-red-900/30' :
          'neu-in px-3 py-1 rounded-full bg-gray-100 text-gray-400 text-xs font-bold border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';

  const directionColor = activity.direction === 'LONG' ? 'text-accent-green' : 'text-accent-red';
  const directionIcon = activity.direction === 'LONG' ? 'trending_up' : 'trending_down';

  return (
    <div className={`neu-out p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-l-4 ${borderColorClass} group hover:bg-white/40 transition-colors cursor-pointer dark:hover:bg-white/5`}>
      <div className="flex items-center gap-4">
        <div className={`size-12 rounded-xl neu-in flex items-center justify-center text-gray-400 bg-gray-100 dark:bg-[#0f131b] ${activity.status === 'LIVE' ? 'dark:text-blue-400 border border-blue-500/20' :
            activity.status === 'WON' ? 'dark:text-green-400 border border-green-500/20' :
              'dark:text-gray-300 border border-gray-700'
          }`}>
          <span className="material-symbols-outlined">{activity.coinIcon}</span>
        </div>
        <div>
          <h3 className="font-bold text-gray-800 text-lg dark:text-white font-mono">{activity.displaySymbol}</h3>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            <span>{activity.directionLabel}</span>
            <span className="size-1 rounded-full bg-gray-400"></span>
            <span className={activity.status === 'LIVE' ? 'text-blue-400' : ''}>{activity.statusLabel}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto justify-between md:justify-end pl-16 md:pl-0">
        <div className="flex flex-col items-start md:items-end">
          <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.selection}</span>
          <span className={`font-bold ${directionColor} flex items-center gap-1`}>
            <span className="material-symbols-outlined text-sm">{directionIcon}</span> {activity.direction}
          </span>
        </div>
        <div className="flex flex-col items-start md:items-end">
          <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.stake}</span>
          <span className="font-bold text-gray-700 dark:text-gray-200">{activity.amount}</span>
        </div>
        <div className="flex flex-col items-start md:items-end">
          <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.return}</span>
          <span className={`font-bold ${activity.returnValue
              ? activity.returnValue.startsWith('+') ? 'text-accent-green' : 'text-accent-red'
              : 'text-primary dark:text-blue-400'
            }`}>
            {activity.returnValue || activity.odds}
          </span>
        </div>
        <div className={`${badgeClass} hidden sm:block`}>
          {activity.status}
        </div>
      </div>
    </div>
  );
}
