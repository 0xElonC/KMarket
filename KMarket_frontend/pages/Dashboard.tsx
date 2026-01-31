import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useWallet } from '../contexts/WalletContext';
import { useProxyWallet } from '../hooks/useProxyWallet';
import DepositWithdrawModal from '../components/DepositWithdrawModal';

export default function Dashboard() {
  const { t } = useLanguage();
  const { isConnected, usdcBalance } = useWallet();
  const { depositBalance, hasProxy, isLoading, isCreatingProxy, proxyAddress } = useProxyWallet();
  const [modalMode, setModalMode] = useState<'deposit' | 'withdraw' | null>(null);

  // Calculate total balance (wallet + trading)
  const totalBalance = isConnected 
    ? (parseFloat(usdcBalance) + parseFloat(depositBalance)).toFixed(2)
    : '0.00';

  const handleOpenDeposit = () => setModalMode('deposit');
  const handleOpenWithdraw = () => setModalMode('withdraw');
  const handleCloseModal = () => setModalMode(null);

  return (
    <div className="dashboard-skin neu-base flex flex-1 min-h-0 min-w-0 flex-col xl:flex-row gap-8 overflow-visible">
      <aside className="w-20 lg:w-64 flex flex-col gap-6 shrink-0 z-10">
        <div className="neu-out p-4 flex flex-col gap-4 h-full">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold opacity-40 px-3 mb-2 uppercase tracking-wider hidden lg:block dark:opacity-60">
              {t.dashboard.menuMain}
            </p>
            <button className="neu-in p-3 rounded-xl flex items-center gap-4 text-primary active dark:text-blue-400 dark:bg-[#0f131b]">
              <span className="material-symbols-outlined">dashboard</span>
              <span className="font-bold hidden lg:block">{t.dashboard.menuOverview}</span>
            </button>
            <button className="p-3 rounded-xl flex items-center gap-4 text-gray-500 hover:text-primary hover:bg-white/40 transition-all dark:text-text-muted dark:hover:text-white dark:hover:bg-white/5">
              <span className="material-symbols-outlined">pie_chart</span>
              <span className="font-medium hidden lg:block">{t.dashboard.menuPortfolio}</span>
            </button>
            <button className="p-3 rounded-xl flex items-center gap-4 text-gray-500 hover:text-primary hover:bg-white/40 transition-all dark:text-text-muted dark:hover:text-white dark:hover:bg-white/5">
              <span className="material-symbols-outlined">history</span>
              <span className="font-medium hidden lg:block">{t.dashboard.menuTransactions}</span>
            </button>
            <button className="p-3 rounded-xl flex items-center gap-4 text-gray-500 hover:text-primary hover:bg-white/40 transition-all dark:text-text-muted dark:hover:text-white dark:hover:bg-white/5">
              <span className="material-symbols-outlined">analytics</span>
              <span className="font-medium hidden lg:block">{t.dashboard.menuAnalytics}</span>
            </button>
          </div>
          <div className="h-px bg-gray-300 w-full my-2 dark:bg-gray-700/50"></div>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold opacity-40 px-3 mb-2 uppercase tracking-wider hidden lg:block dark:opacity-60">
              {t.dashboard.menuSettings}
            </p>
            <button className="p-3 rounded-xl flex items-center gap-4 text-gray-500 hover:text-primary hover:bg-white/40 transition-all dark:text-text-muted dark:hover:text-white dark:hover:bg-white/5">
              <span className="material-symbols-outlined">settings</span>
              <span className="font-medium hidden lg:block">{t.dashboard.menuAccount}</span>
            </button>
            <button className="p-3 rounded-xl flex items-center gap-4 text-gray-500 hover:text-primary hover:bg-white/40 transition-all dark:text-text-muted dark:hover:text-white dark:hover:bg-white/5">
              <span className="material-symbols-outlined">security</span>
              <span className="font-medium hidden lg:block">{t.dashboard.menuSecurity}</span>
            </button>
          </div>
          <div className="mt-auto">
            <button className="w-full neu-btn p-3 rounded-xl flex items-center justify-center gap-2 text-red-500 hover:text-red-600 transition-colors dark:text-red-400 dark:hover:text-red-300">
              <span className="material-symbols-outlined">logout</span>
              <span className="font-bold text-sm hidden lg:block">{t.dashboard.menuSignOut}</span>
            </button>
          </div>
        </div>
      </aside>

      <section className="flex-1 flex flex-col gap-8 min-w-0 pr-2 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 neu-out p-8 relative flex flex-col justify-center gap-6 rounded-3xl">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-gray-500 font-bold text-sm uppercase tracking-wide mb-1 dark:text-text-muted">
                  {t.dashboard.totalBalance}
                </h2>
                <div className="flex items-baseline gap-2">
                  <span className="material-symbols-outlined text-accent-green text-sm">arrow_upward</span>
                  <span className="text-accent-green text-sm font-bold">+2.4% {t.dashboard.week}</span>
                </div>
              </div>
              <button className="neu-btn size-10 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 dark:hover:text-white">
                <span className="material-symbols-outlined">visibility</span>
              </button>
            </div>
            <div className="neu-in neu-deep p-6 rounded-2xl flex items-center justify-center bg-gray-100/50 dark:bg-transparent">
              <span className="text-4xl md:text-5xl lg:text-6xl font-mono font-bold text-gray-700 tracking-tighter dark:text-white shadow-black drop-shadow-lg">
                {isLoading ? '...' : `$${totalBalance}`}
              </span>
            </div>
            {/* Balance breakdown */}
            {isConnected && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-white/5">
                  <span className="text-gray-400">Wallet:</span>
                  <span className="font-mono text-gray-300">${usdcBalance}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-primary/5">
                  <span className="text-gray-400">Trading:</span>
                  <span className="font-mono text-primary">${parseFloat(depositBalance).toFixed(2)}</span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={handleOpenDeposit}
                className="neu-btn py-4 rounded-xl flex items-center justify-center gap-2 text-gray-700 hover:text-accent-green transition-colors group dark:text-gray-200 dark:hover:text-accent-green"
              >
                <div className="size-8 rounded-full bg-accent-green/10 flex items-center justify-center text-accent-green group-hover:bg-accent-green group-hover:text-white transition-colors dark:bg-accent-green/20">
                  <span className="material-symbols-outlined text-lg">add</span>
                </div>
                <span className="font-bold">{t.dashboard.deposit}</span>
              </button>
              <button 
                onClick={handleOpenWithdraw}
                className="neu-btn py-4 rounded-xl flex items-center justify-center gap-2 text-gray-700 hover:text-primary transition-colors group dark:text-gray-200 dark:hover:text-blue-400"
              >
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors dark:bg-blue-500/20 dark:text-blue-400">
                  <span className="material-symbols-outlined text-lg">arrow_outward</span>
                </div>
                <span className="font-bold">{t.dashboard.withdraw}</span>
              </button>
            </div>
          </div>
          <div className="neu-out p-6 flex flex-col gap-4 rounded-3xl justify-between">
            <div>
              <h3 className="font-bold text-gray-600 mb-4 dark:text-gray-300">{t.dashboard.quickStats}</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{t.dashboard.activeBets}</span>
                  <span className="text-lg font-bold text-primary dark:text-blue-400">3</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full neu-in overflow-hidden dark:bg-[#0f131b]">
                  <div className="bg-primary h-full rounded-full w-3/4 dark:bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{t.dashboard.winRate}</span>
                  <span className="text-lg font-bold text-accent-green">68%</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full neu-in overflow-hidden dark:bg-[#0f131b]">
                  <div className="bg-accent-green h-full rounded-full w-[68%] shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                </div>
              </div>
            </div>
            {/* Proxy wallet status */}
            <div className={`neu-in p-4 rounded-xl border ${
              isCreatingProxy 
                ? 'border-primary/10 bg-primary/5' 
                : hasProxy 
                  ? 'border-accent-green/10 bg-accent-green/5' 
                  : 'border-yellow-500/10 bg-yellow-500/5'
            }`}>
              <div className="flex items-center gap-3 mb-2">
                {isCreatingProxy ? (
                  <>
                    <span className="material-symbols-outlined text-primary animate-spin">progress_activity</span>
                    <span className="font-bold text-sm text-primary">Creating Trading Wallet...</span>
                  </>
                ) : (
                  <>
                    <span className={`material-symbols-outlined ${hasProxy ? 'text-accent-green' : 'text-yellow-500'}`}>
                      {hasProxy ? 'check_circle' : 'info'}
                    </span>
                    <span className={`font-bold text-sm ${hasProxy ? 'text-accent-green' : 'text-yellow-500'}`}>
                      {hasProxy ? 'Trading Wallet Active' : 'Setup Required'}
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-600 leading-relaxed dark:text-gray-400">
                {isCreatingProxy 
                  ? 'Please confirm the transaction in your wallet to create your trading wallet.'
                  : hasProxy 
                    ? `Your trading wallet is ready. Address: ${proxyAddress?.slice(0, 6)}...${proxyAddress?.slice(-4)}`
                    : 'A trading wallet will be created automatically when you connect.'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-700 dark:text-white">{t.dashboard.activity}</h2>
            <div className="neu-in p-1.5 rounded-xl flex items-center bg-gray-200/50 dark:bg-[#0f131b]">
              <button className="neu-out py-2 px-6 rounded-lg text-sm font-bold text-primary shadow-sm transition-all transform active:scale-95 dark:text-blue-400 dark:shadow-none active dark:bg-blue-500/10">
                {t.dashboard.inProgress}
              </button>
              <button className="py-2 px-6 rounded-lg text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors dark:text-gray-400 dark:hover:text-gray-200">
                {t.dashboard.history}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="neu-out p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-l-4 border-primary group hover:bg-white/40 transition-colors cursor-pointer dark:border-blue-500 dark:hover:bg-white/5">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl neu-in flex items-center justify-center text-gray-400 bg-gray-100 dark:bg-[#0f131b] dark:text-gray-500">
                  <span className="material-symbols-outlined">sports_basketball</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg dark:text-white">Lakers vs Warriors</h3>
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <span>NBA</span>
                    <span className="size-1 rounded-full bg-gray-400"></span>
                    <span>Today, 20:00</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-8 md:gap-12 w-full md:w-auto justify-between md:justify-end pl-16 md:pl-0">
                <div className="flex flex-col items-start md:items-end">
                  <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.selection}</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">Lakers Win</span>
                </div>
                <div className="flex flex-col items-start md:items-end">
                  <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.stake}</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">$200.00</span>
                </div>
                <div className="flex flex-col items-start md:items-end min-w-[80px]">
                  <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.return}</span>
                  <span className="font-bold text-primary dark:text-blue-400">$380.00</span>
                </div>
                <div className="neu-in px-3 py-1 rounded-full bg-yellow-50 text-yellow-600 text-xs font-bold border border-yellow-100 hidden sm:block dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900/30">
                  LIVE
                </div>
              </div>
            </div>

            <div className="neu-out p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-l-4 border-accent-green group hover:bg-white/40 transition-colors cursor-pointer dark:hover:bg-white/5">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl neu-in flex items-center justify-center text-gray-400 bg-gray-100 dark:bg-[#0f131b] dark:text-gray-500">
                  <span className="material-symbols-outlined">sports_soccer</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg dark:text-white">Man City vs Arsenal</h3>
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <span>Premier League</span>
                    <span className="size-1 rounded-full bg-gray-400"></span>
                    <span>Yesterday</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-8 md:gap-12 w-full md:w-auto justify-between md:justify-end pl-16 md:pl-0">
                <div className="flex flex-col items-start md:items-end">
                  <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.selection}</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">Over 2.5 Goals</span>
                </div>
                <div className="flex flex-col items-start md:items-end">
                  <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.stake}</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">$500.00</span>
                </div>
                <div className="flex flex-col items-start md:items-end min-w-[80px]">
                  <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.return}</span>
                  <span className="font-bold text-accent-green">+$950.00</span>
                </div>
                <div className="neu-in px-3 py-1 rounded-full bg-green-50 text-accent-green text-xs font-bold border border-green-100 hidden sm:block dark:bg-green-900/20 dark:border-green-900/30">
                  WON
                </div>
              </div>
            </div>

            <div className="neu-out p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-l-4 border-gray-300 opacity-80 hover:opacity-100 transition-opacity cursor-pointer dark:border-gray-600 dark:hover:bg-white/5">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl neu-in flex items-center justify-center text-gray-400 bg-gray-100 dark:bg-[#0f131b] dark:text-gray-500">
                  <span className="material-symbols-outlined">sports_tennis</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg dark:text-white">Djokovic vs Alcaraz</h3>
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <span>Wimbledon Final</span>
                    <span className="size-1 rounded-full bg-gray-400"></span>
                    <span>14 Jul 2024</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-8 md:gap-12 w-full md:w-auto justify-between md:justify-end pl-16 md:pl-0">
                <div className="flex flex-col items-start md:items-end">
                  <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.selection}</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">Set 1 Winner: Djokovic</span>
                </div>
                <div className="flex flex-col items-start md:items-end">
                  <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.stake}</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">$150.00</span>
                </div>
                <div className="flex flex-col items-start md:items-end min-w-[80px]">
                  <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.return}</span>
                  <span className="font-bold text-gray-400 line-through dark:text-gray-500">$285.00</span>
                </div>
                <div className="neu-in px-3 py-1 rounded-full bg-gray-100 text-gray-400 text-xs font-bold border border-gray-200 hidden sm:block dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
                  LOST
                </div>
              </div>
            </div>

            <div className="neu-out p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-l-4 border-blue-500 group hover:bg-white/40 transition-colors cursor-pointer dark:hover:bg-white/5">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl neu-in flex items-center justify-center text-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400">
                  <span className="material-symbols-outlined">currency_bitcoin</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg dark:text-white">Bitcoin Purchase</h3>
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <span>Crypto Market</span>
                    <span className="size-1 rounded-full bg-gray-400"></span>
                    <span>12 Jul 2024</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-8 md:gap-12 w-full md:w-auto justify-between md:justify-end pl-16 md:pl-0">
                <div className="flex flex-col items-start md:items-end">
                  <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.type}</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">Buy Order</span>
                </div>
                <div className="flex flex-col items-start md:items-end">
                  <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.amount}</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">0.05 BTC</span>
                </div>
                <div className="flex flex-col items-start md:items-end min-w-[80px]">
                  <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.value}</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">$3,200.00</span>
                </div>
                <div className="neu-in px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100 hidden sm:block dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/30">
                  HELD
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside className="w-80 hidden xl:flex flex-col gap-6 shrink-0">
        <div className="neu-out p-6 rounded-3xl flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-gray-700 dark:text-white">{t.dashboard.myCards}</h2>
            <button className="neu-btn size-8 rounded-full flex items-center justify-center text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white">
              <span className="material-symbols-outlined text-sm">add</span>
            </button>
          </div>
          <div className="neu-in p-6 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden group hover:from-primary/5 hover:to-primary/10 transition-colors cursor-pointer dark:from-[#0f131b] dark:to-[#1a212f] dark:hover:from-blue-900/20 dark:hover:to-blue-800/20">
            <div className="absolute top-0 right-0 p-4">
              <span className="material-symbols-outlined text-gray-400 text-3xl dark:text-gray-600">contactless</span>
            </div>
            <div className="flex flex-col gap-8 relative z-10">
              <div className="size-8 bg-red-500/80 rounded-full shadow-sm flex items-center justify-center -ml-2">
                <div className="size-8 bg-yellow-500/80 rounded-full shadow-sm ml-5"></div>
              </div>
              <div>
                <p className="font-mono text-gray-500 text-sm tracking-widest mb-1 dark:text-gray-400">**** **** **** 4288</p>
                <div className="flex justify-between items-end">
                  <p className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.cardHolder}</p>
                  <p className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.expires}</p>
                </div>
                <div className="flex justify-between items-end">
                  <p className="font-bold text-gray-700 dark:text-gray-200">Alex M.</p>
                  <p className="font-bold text-gray-700 dark:text-gray-200">12/25</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="neu-out flex-1 p-6 rounded-3xl flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-lg text-gray-700 dark:text-white">{t.dashboard.performance}</h2>
            <select className="bg-transparent border-none text-xs font-bold text-gray-500 cursor-pointer focus:ring-0 dark:text-gray-400">
              <option className="dark:bg-[#121721]">{t.dashboard.week}</option>
              <option className="dark:bg-[#121721]">{t.dashboard.lastMonth}</option>
            </select>
          </div>
          <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-2">
            <div className="w-full bg-gray-200 rounded-t-lg relative group h-[40%] dark:bg-[#0f131b]">
              <div className="absolute bottom-0 w-full bg-primary rounded-t-lg h-full opacity-80 group-hover:opacity-100 transition-opacity dark:bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]"></div>
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-400">M</span>
            </div>
            <div className="w-full bg-gray-200 rounded-t-lg relative group h-[60%] dark:bg-[#0f131b]">
              <div className="absolute bottom-0 w-full bg-primary rounded-t-lg h-full opacity-80 group-hover:opacity-100 transition-opacity dark:bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]"></div>
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-400">T</span>
            </div>
            <div className="w-full bg-gray-200 rounded-t-lg relative group h-[30%] dark:bg-[#0f131b]">
              <div className="absolute bottom-0 w-full bg-accent-red rounded-t-lg h-full opacity-80 group-hover:opacity-100 transition-opacity shadow-[0_0_8px_rgba(239,68,68,0.3)]"></div>
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-400">W</span>
            </div>
            <div className="w-full bg-gray-200 rounded-t-lg relative group h-[85%] dark:bg-[#0f131b]">
              <div className="absolute bottom-0 w-full bg-primary rounded-t-lg h-full opacity-80 group-hover:opacity-100 transition-opacity dark:bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]"></div>
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-400">T</span>
            </div>
            <div className="w-full bg-gray-200 rounded-t-lg relative group h-[50%] dark:bg-[#0f131b]">
              <div className="absolute bottom-0 w-full bg-primary rounded-t-lg h-full opacity-80 group-hover:opacity-100 transition-opacity dark:bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]"></div>
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-400">F</span>
            </div>
            <div className="w-full bg-gray-200 rounded-t-lg relative group h-[90%] dark:bg-[#0f131b]">
              <div className="absolute bottom-0 w-full bg-accent-green rounded-t-lg h-full opacity-80 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-400">S</span>
            </div>
            <div className="w-full bg-gray-200 rounded-t-lg relative group h-[20%] dark:bg-[#0f131b]">
              <div className="absolute bottom-0 w-full bg-gray-400 rounded-t-lg h-full opacity-50 dark:bg-gray-600"></div>
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-400">S</span>
            </div>
          </div>
        </div>

        <div className="neu-out p-5 rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="neu-btn size-10 rounded-full flex items-center justify-center text-accent-green dark:text-accent-green">
              <span className="material-symbols-outlined text-lg">check_circle</span>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase dark:text-gray-400">{t.dashboard.lastResult}</p>
              <p className="font-bold text-sm dark:text-gray-200">{t.dashboard.won} $950.00</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Deposit/Withdraw Modal */}
      <DepositWithdrawModal
        isOpen={modalMode !== null}
        onClose={handleCloseModal}
        mode={modalMode || 'deposit'}
      />
    </div>
  );
}
