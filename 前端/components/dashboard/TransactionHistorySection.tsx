import React, { useMemo, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export function TransactionHistorySection() {
  const { t } = useLanguage();
  type FilterId = 'all' | 'bets' | 'lp' | 'transfers';
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');

  const filters = useMemo<Array<{ id: FilterId; label: string }>>(
    () => [
      { id: 'all', label: t.dashboard.transactionFilterAll },
      { id: 'bets', label: t.dashboard.transactionFilterBets },
      { id: 'lp', label: t.dashboard.transactionFilterLp },
      { id: 'transfers', label: t.dashboard.transactionFilterTransfers }
    ],
    [t]
  );

  const transactions = useMemo(
    () => [
      {
        id: 'tx-2',
        category: 'lp' as FilterId,
        border: 'border-yellow-500',
        date: t.dashboard.transactionRow2Date,
        time: t.dashboard.transactionRow2Time,
        icon: 'water_drop',
        iconClass:
          'size-10 rounded-xl neu-in flex items-center justify-center text-yellow-500 bg-yellow-50 dark:bg-yellow-900/10 dark:text-yellow-500 shrink-0',
        type: t.dashboard.transactionTypeAddLiquidity,
        sub: t.dashboard.transactionSubAddLiquidity,
        amountMainClass: 'font-bold text-gray-700 dark:text-gray-300 text-sm',
        amountMain: t.dashboard.transactionRow2AmountMain,
        amountSub: t.dashboard.transactionAmountEstimatedValue,
        status: t.dashboard.transactionStatusPending,
        statusClass:
          'px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/50 flex items-center gap-1',
        statusDotClass: 'size-1.5 rounded-full bg-yellow-500'
      },
      {
        id: 'tx-3',
        category: 'transfers' as FilterId,
        border: 'border-primary',
        date: t.dashboard.transactionRow3Date,
        time: t.dashboard.transactionRow3Time,
        icon: 'swap_horiz',
        iconClass:
          'size-10 rounded-xl neu-in flex items-center justify-center text-primary bg-blue-50 dark:bg-blue-900/10 dark:text-blue-400 shrink-0',
        type: t.dashboard.transactionTypeTokenSwap,
        sub: t.dashboard.transactionSubTokenSwap,
        amountMainClass: 'font-bold text-gray-700 dark:text-gray-300 text-sm',
        amountMain: t.dashboard.transactionRow3AmountMain,
        amountSub: t.dashboard.transactionAmountSwapReceived,
        status: t.dashboard.transactionStatusCompleted,
        statusClass:
          'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50 flex items-center gap-1',
        statusDotClass: 'size-1.5 rounded-full bg-green-500'
      },
      {
        id: 'tx-4',
        category: 'transfers' as FilterId,
        border: 'border-gray-400',
        date: t.dashboard.transactionRow4Date,
        time: t.dashboard.transactionRow4Time,
        icon: 'send',
        iconClass:
          'size-10 rounded-xl neu-in flex items-center justify-center text-gray-500 bg-gray-50 dark:bg-gray-800/30 dark:text-gray-400 shrink-0',
        type: t.dashboard.transactionTypeTransferOut,
        sub: t.dashboard.transactionSubTransferOut,
        amountMainClass: 'font-bold text-gray-700 dark:text-gray-300 text-sm',
        amountMain: t.dashboard.transactionRow4AmountMain,
        amountSub: t.dashboard.transactionAmountWithdrawal,
        status: t.dashboard.transactionStatusCompleted,
        statusClass:
          'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50 flex items-center gap-1',
        statusDotClass: 'size-1.5 rounded-full bg-green-500'
      },
      {
        id: 'tx-5',
        category: 'bets' as FilterId,
        border: 'border-accent-red',
        date: t.dashboard.transactionRow5Date,
        time: t.dashboard.transactionRow5Time,
        icon: 'insights',
        iconClass:
          'size-10 rounded-xl neu-in flex items-center justify-center text-accent-red bg-red-50 dark:bg-red-900/10 dark:text-accent-red shrink-0',
        type: t.dashboard.transactionTypeCasinoBet,
        sub: t.dashboard.transactionSubCasinoTable,
        amountMainClass: 'font-bold text-accent-red text-sm',
        amountMain: t.dashboard.transactionRow5AmountMain,
        amountSub: t.dashboard.transactionAmountLostStake,
        status: t.dashboard.transactionStatusCompleted,
        statusClass:
          'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50 flex items-center gap-1',
        statusDotClass: 'size-1.5 rounded-full bg-green-500'
      },
      {
        id: 'tx-6',
        category: 'transfers' as FilterId,
        border: 'border-gray-400',
        date: t.dashboard.transactionRow6Date,
        time: t.dashboard.transactionRow6Time,
        icon: 'download',
        iconClass:
          'size-10 rounded-xl neu-in flex items-center justify-center text-gray-500 bg-gray-50 dark:bg-gray-800/30 dark:text-gray-400 shrink-0',
        type: t.dashboard.transactionTypeDeposit,
        sub: t.dashboard.transactionSubDepositSource,
        amountMainClass: 'font-bold text-accent-green text-sm',
        amountMain: t.dashboard.transactionRow6AmountMain,
        amountSub: t.dashboard.transactionAmountReceived,
        status: t.dashboard.transactionStatusCompleted,
        statusClass:
          'px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50 flex items-center gap-1',
        statusDotClass: 'size-1.5 rounded-full bg-green-500'
      }
    ],
    [t]
  );
  const filteredTransactions = useMemo(
    () =>
      activeFilter === 'all'
        ? transactions
        : transactions.filter((tx) => tx.category === activeFilter),
    [activeFilter, transactions]
  );

  return (
    <section className="flex-1 flex flex-col gap-8 min-w-0">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-700 dark:text-white">
            {t.dashboard.transactionHistoryTitle}
          </h2>
          <div className="flex items-center gap-3">
            <div className="neu-in px-4 py-2 rounded-xl flex items-center gap-2 dark:bg-[#0f131b] w-full md:w-64">
              <span className="material-symbols-outlined text-gray-400 text-lg">search</span>
              <input
                className="bg-transparent border-none outline-none text-sm w-full text-gray-600 dark:text-gray-300 placeholder-gray-400 focus:ring-0 p-0"
                placeholder={t.dashboard.transactionSearchPlaceholder}
                type="text"
              />
            </div>
            <button className="neu-btn size-10 rounded-xl flex items-center justify-center text-gray-500 hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-white">
              <span className="material-symbols-outlined">filter_list</span>
            </button>
            <button className="neu-btn size-10 rounded-xl flex items-center justify-center text-gray-500 hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-white">
              <span className="material-symbols-outlined">download</span>
            </button>
          </div>
        </div>
        <div className="neu-out p-1.5 rounded-2xl flex flex-wrap gap-2 w-full md:w-fit bg-gray-100 dark:bg-[#121721] self-start">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              aria-pressed={activeFilter === filter.id}
              className={
                activeFilter === filter.id
                  ? 'neu-in px-6 py-2 rounded-xl text-sm font-bold text-primary shadow-inner dark:bg-[#0f131b] dark:text-blue-400'
                  : 'px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-gray-200'
              }
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="hidden md:block px-6 pr-10">
          <div className="grid grid-cols-12 gap-4 border-l-4 border-transparent px-4 md:px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider dark:text-gray-500">
            <div className="col-span-3">{t.dashboard.transactionHeaderDate}</div>
            <div className="col-span-3">{t.dashboard.transactionHeaderType}</div>
            <div className="col-span-2 text-right">{t.dashboard.transactionHeaderAmount}</div>
            <div className="col-span-2 text-center">{t.dashboard.transactionHeaderStatus}</div>
            <div className="col-span-2 text-right">{t.dashboard.transactionHeaderExplorer}</div>
          </div>
        </div>
        <div className="overflow-y-auto px-6 pr-10 pt-2 pb-8 space-y-4">
          {filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className={`neu-out p-4 md:p-5 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-4 items-center group hover:bg-white/50 dark:hover:bg-white/5 transition-all cursor-pointer border-l-4 ${tx.border}`}
            >
              <div className="col-span-12 md:col-span-3 flex items-center gap-3">
                <div className="size-10 rounded-lg neu-in flex items-center justify-center text-gray-400 dark:bg-[#0f131b] dark:text-gray-500 md:hidden">
                  <span className="material-symbols-outlined">calendar_today</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{tx.date}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{tx.time}</span>
                </div>
              </div>
              <div className="col-span-6 md:col-span-3 flex items-center gap-3">
                <div className={tx.iconClass}>
                  <span className="material-symbols-outlined">{tx.icon}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">{tx.type}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{tx.sub}</span>
                </div>
              </div>
              <div className="col-span-6 md:col-span-2 flex flex-col items-end md:items-end justify-center">
                <span className={tx.amountMainClass}>{tx.amountMain}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{tx.amountSub}</span>
              </div>
              <div className="col-span-6 md:col-span-2 flex justify-start md:justify-center">
                <span className={tx.statusClass}>
                  <span className={tx.statusDotClass}></span>
                  {tx.status}
                </span>
              </div>
              <div className="col-span-6 md:col-span-2 text-right">
                <a className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-blue-400 transition-colors no-underline hover:no-underline dark:text-blue-400" href="#">
                  {t.dashboard.transactionViewTx}
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
