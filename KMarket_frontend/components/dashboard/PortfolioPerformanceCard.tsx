import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { usePerformanceData } from '../../hooks/usePerformanceData';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * 盈亏表现卡片 - 方案 A: 简洁折线图
 */
export function PortfolioPerformanceCard() {
  const { t } = useLanguage();
  const { performanceData, loading, period, setPeriod } = usePerformanceData('week');

  if (loading) {
    return <PerformanceSkeleton />;
  }

  if (!performanceData) {
    return (
      <div className="neu-out p-6 rounded-3xl xl:col-span-2">
        <p className="text-red-500 dark:text-red-400 text-center">加载失败</p>
      </div>
    );
  }

  const isPositive = performanceData.totalProfit >= 0;
  const profitColor = isPositive ? 'text-accent-green' : 'text-accent-red';
  const chartColor = isPositive ? '#10b981' : '#ef4444';

  return (
    <div className="neu-out p-6 rounded-3xl xl:col-span-2 flex flex-col gap-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg text-gray-700 dark:text-white">{t.dashboard.performance}</h3>

        {/* 时间范围选择器 */}
        <div className="neu-in p-1 rounded-lg flex items-center gap-1 bg-gray-200/50 dark:bg-[#0f131b]">
          <button
            className={`py-1.5 px-4 rounded-md text-xs font-bold transition-all ${period === 'week'
              ? 'neu-out text-primary shadow-sm dark:text-blue-400 dark:bg-blue-500/10'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            onClick={() => setPeriod('week')}
          >
            {t.dashboard.week}
          </button>
          <button
            className={`py-1.5 px-4 rounded-md text-xs font-bold transition-all ${period === 'month'
              ? 'neu-out text-primary shadow-sm dark:text-blue-400 dark:bg-blue-500/10'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            onClick={() => setPeriod('month')}
          >
            {t.dashboard.lastMonth}
          </button>
        </div>
      </div>

      {/* 总收益显示 */}
      <div className="flex items-baseline gap-3">
        <span className={`text-3xl font-bold ${profitColor} font-mono`}>
          {isPositive ? '+' : ''}${performanceData.totalProfit.toFixed(2)}
        </span>
        <div className={`flex items-center gap-1 ${profitColor}`}>
          <span className="material-symbols-outlined text-sm">
            {isPositive ? 'trending_up' : 'trending_down'}
          </span>
          <span className="text-sm font-bold">
            {isPositive ? '+' : ''}{performanceData.profitPercentage.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* 折线图 - 调整高度适配侧边栏 */}
      <div className="w-full h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={performanceData.chartData}
            margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              opacity={0.3}
              className="dark:stroke-gray-700"
            />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              style={{ fontSize: '10px' }}
              tick={{ fill: '#9ca3af' }}
              className="dark:stroke-gray-500"
            />
            <YAxis
              stroke="#9ca3af"
              style={{ fontSize: '10px' }}
              tick={{ fill: '#9ca3af' }}
              className="dark:stroke-gray-500"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '11px',
              }}
              labelStyle={{ color: '#374151', fontWeight: 'bold' }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, '收益']}
            />
            <Line
              type="monotone"
              dataKey="profit"
              stroke={chartColor}
              strokeWidth={2}
              dot={{ fill: chartColor, r: 3 }}
              activeDot={{ r: 5 }}
              fill="url(#colorProfit)"
              animationDuration={500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * 加载骨架屏
 */
function PerformanceSkeleton() {
  return (
    <div className="neu-out p-6 rounded-3xl xl:col-span-2 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
      </div>
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-4"></div>
      <div className="h-[200px] bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  );
}
