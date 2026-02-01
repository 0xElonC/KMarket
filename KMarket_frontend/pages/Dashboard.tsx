import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useWallet } from '../contexts/WalletContext';
import { useProxyWallet } from '../hooks/useProxyWallet';
import { AssetAllocationCard } from '../components/dashboard/AssetAllocationCard';
import { PortfolioPerformanceCard } from '../components/dashboard/PortfolioPerformanceCard';
import { YourAssetsSection } from '../components/dashboard/YourAssetsSection';
import { YieldEarnedSection } from '../components/dashboard/YieldEarnedSection';
import { DashboardSidebar } from '../components/dashboard/DashboardSidebar';
import { LiquidityPoolSection } from '../components/dashboard/LiquidityPoolSection';
import { TransactionHistorySection } from '../components/dashboard/TransactionHistorySection';
import { AnalyticsSection } from '../components/dashboard/AnalyticsSection';
import { AccountSection } from '../components/dashboard/AccountSection';
import DepositWithdrawModal from '../components/DepositWithdrawModal';
import { addTransaction } from '../utils/transactionHistory';

type DashboardSection = 'overview' | 'portfolio' | 'transactions' | 'analytics' | 'account';
type LanguageData = ReturnType<typeof useLanguage>['t'];

// LocalStorage key for virtual balance (same as KMarketGame)
const VIRTUAL_BALANCE_KEY = 'kmarket_virtual_balance';

// Get virtual balance from localStorage
function getVirtualBalance(address: string): number {
  try {
    const data = localStorage.getItem(VIRTUAL_BALANCE_KEY);
    if (data) {
      const balances = JSON.parse(data);
      return balances[address.toLowerCase()] || 0;
    }
  } catch (e) {
    console.error('Failed to read virtual balance:', e);
  }
  return 0;
}

// Save virtual balance to localStorage
function saveVirtualBalance(address: string, balance: number) {
  try {
    const data = localStorage.getItem(VIRTUAL_BALANCE_KEY);
    const balances = data ? JSON.parse(data) : {};
    balances[address.toLowerCase()] = balance;
    localStorage.setItem(VIRTUAL_BALANCE_KEY, JSON.stringify(balances));
  } catch (e) {
    console.error('Failed to save virtual balance:', e);
  }
}

export default function Dashboard({
  initialSection,
  onSectionConsumed
}: {
  initialSection?: DashboardSection | null;
  onSectionConsumed?: () => void;
}) {
  const { t } = useLanguage();
  const { usdcBalance, isConnected, address } = useWallet();
  const { depositBalance, hasProxy } = useProxyWallet();
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [performanceRange, setPerformanceRange] = useState<'week' | 'lastMonth'>('week');
  const [isPerformanceMenuOpen, setIsPerformanceMenuOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [virtualBalance, setVirtualBalance] = useState<number>(0);
  const performanceMenuRef = useRef<HTMLDivElement | null>(null);
  const activeMenuClass =
    'neu-in p-3 rounded-xl flex items-center gap-4 text-primary active dark:text-blue-400 dark:bg-[#0f131b] border border-transparent outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0';
  const inactiveMenuClass =
    'p-3 rounded-xl flex items-center gap-4 text-gray-500 hover:text-primary hover:bg-white/40 transition-all dark:text-text-muted dark:hover:text-white dark:hover:bg-white/5 border border-transparent outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0';

  // Load virtual balance on mount and when address changes
  useEffect(() => {
    if (address) {
      const saved = getVirtualBalance(address);
      const chainBalance = parseFloat(depositBalance) || 0;
      
      console.log('📊 Dashboard Balance Check:', {
        address,
        saved,
        chainBalance,
        depositBalance,
        hasProxy
      });
      
      // 如果没有保存的虚拟余额，用链上余额初始化
      if (saved === 0 && chainBalance > 0) {
        console.log(`🔄 Dashboard: Initializing virtual balance from chain: ${chainBalance.toFixed(2)}`);
        setVirtualBalance(chainBalance);
        saveVirtualBalance(address, chainBalance);
      } else if (saved > 0) {
        console.log(`✅ Dashboard: Using saved virtual balance: ${saved.toFixed(2)}`);
        setVirtualBalance(saved);
      } else {
        // 都是 0，等待链上数据
        console.log('⏳ Dashboard: Waiting for chain data...');
        setVirtualBalance(chainBalance);
      }
    }
  }, [address, depositBalance, hasProxy]);

  useEffect(() => {
    if (!initialSection) return;
    setActiveSection(initialSection);
    onSectionConsumed?.();
  }, [initialSection, onSectionConsumed]);

  useEffect(() => {
    if (!isPerformanceMenuOpen) return;
    const handler = (event: MouseEvent) => {
      if (!performanceMenuRef.current) return;
      if (performanceMenuRef.current.contains(event.target as Node)) return;
      setIsPerformanceMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isPerformanceMenuOpen]);

  const handlePerformanceSelect = (range: 'week' | 'lastMonth') => {
    setPerformanceRange(range);
    setIsPerformanceMenuOpen(false);
  };

  const handleOpenDeposit = () => {
    setModalMode('deposit');
    setIsModalOpen(true);
  };

  const handleOpenWithdraw = () => {
    setModalMode('withdraw');
    setIsModalOpen(true);
  };

  // Handle deposit/withdraw success - update virtual balance
  const handleTransactionSuccess = useCallback((amount: string, mode: 'deposit' | 'withdraw') => {
    if (!address) return;
    const amountNum = parseFloat(amount) || 0;
    setVirtualBalance(prev => {
      const newBalance = mode === 'deposit' 
        ? prev + amountNum 
        : Math.max(0, prev - amountNum);
      saveVirtualBalance(address, newBalance);
      
      // Record transaction
      addTransaction(
        address,
        mode,
        amountNum,
        mode === 'deposit' 
          ? `Deposited ${amount} USDC` 
          : `Withdrew ${amount} USDC`,
        newBalance
      );
      
      console.log(`📊 Virtual balance updated: ${prev.toFixed(2)} → ${newBalance.toFixed(2)} (${mode}: ${amount})`);
      return newBalance;
    });
  }, [address]);

  // Calculate total balance - use virtual balance for trading
  const walletBalance = parseFloat(usdcBalance) || 0;
  const tradingBalance = virtualBalance; // Use virtual balance instead of chain balance
  const totalBalance = walletBalance + tradingBalance;

  return (
    <div className="dashboard-skin neu-base flex flex-1 min-h-0 min-w-0 flex-col xl:flex-row gap-8 overflow-visible">
      <DashboardMenu
        t={t}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        activeMenuClass={activeMenuClass}
        inactiveMenuClass={inactiveMenuClass}
      />

      {activeSection === 'overview' ? (
        <>
          <OverviewMainSection 
            t={t} 
            totalBalance={totalBalance}
            walletBalance={walletBalance}
            tradingBalance={tradingBalance}
            isConnected={isConnected}
            hasProxy={hasProxy}
            onDeposit={handleOpenDeposit}
            onWithdraw={handleOpenWithdraw}
          />
          <OverviewSidebar
            t={t}
            performanceRange={performanceRange}
            isPerformanceMenuOpen={isPerformanceMenuOpen}
            onToggleMenu={() => setIsPerformanceMenuOpen((prev) => !prev)}
            onSelectRange={handlePerformanceSelect}
            performanceMenuRef={performanceMenuRef}
          />
        </>
      ) : activeSection === 'portfolio' ? (
        <>
          <section className="flex-1 flex flex-col gap-8 min-w-0 pr-2 pb-4">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <AssetAllocationCard />
              <PortfolioPerformanceCard />
            </div>
            <YourAssetsSection />
            <YieldEarnedSection />
          </section>
          <DashboardSidebar />
        </>
      ) : activeSection === 'transactions' ? (
        <TransactionHistorySection />
      ) : activeSection === 'analytics' ? (
        <AnalyticsSection />
      ) : activeSection === 'account' ? (
        <AccountSection />
      ) : (
        <section className="flex-1 min-w-0" />
      )}

      {/* Deposit/Withdraw Modal */}
      <DepositWithdrawModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        onSuccess={handleTransactionSuccess}
        virtualBalance={virtualBalance}
      />
    </div>
  );
}

function DashboardMenu({
  t,
  activeSection,
  onSectionChange,
  activeMenuClass,
  inactiveMenuClass
}: {
  t: LanguageData;
  activeSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
  activeMenuClass: string;
  inactiveMenuClass: string;
}) {
  const menuButtonClass = (section: DashboardSection) =>
    section === activeSection ? activeMenuClass : inactiveMenuClass;
  const menuLabelClass = (section: DashboardSection) =>
    section === activeSection ? 'font-bold hidden lg:block' : 'font-medium hidden lg:block';

  return (
    <aside className="w-20 lg:w-64 flex flex-col gap-6 shrink-0 z-10">
      <div className="neu-out p-4 flex flex-col gap-4 h-full">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold opacity-40 px-3 mb-2 uppercase tracking-wider hidden lg:block dark:opacity-60">
            {t.dashboard.menuMain}
          </p>
          <button
            className={menuButtonClass('overview')}
            type="button"
            onClick={() => onSectionChange('overview')}
            aria-pressed={activeSection === 'overview'}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span className={menuLabelClass('overview')}>{t.dashboard.menuOverview}</span>
          </button>
          <button
            className={menuButtonClass('portfolio')}
            type="button"
            onClick={() => onSectionChange('portfolio')}
            aria-pressed={activeSection === 'portfolio'}
          >
            <span className="material-symbols-outlined">pie_chart</span>
            <span className={menuLabelClass('portfolio')}>{t.dashboard.menuPortfolio}</span>
          </button>
          <button
            className={menuButtonClass('transactions')}
            type="button"
            onClick={() => onSectionChange('transactions')}
            aria-pressed={activeSection === 'transactions'}
          >
            <span className="material-symbols-outlined">history</span>
            <span className={menuLabelClass('transactions')}>{t.dashboard.menuTransactions}</span>
          </button>
          <button
            className={menuButtonClass('analytics')}
            type="button"
            onClick={() => onSectionChange('analytics')}
            aria-pressed={activeSection === 'analytics'}
          >
            <span className="material-symbols-outlined">analytics</span>
            <span className={menuLabelClass('analytics')}>{t.dashboard.menuAnalytics}</span>
          </button>
        </div>
        <div className="h-px bg-gray-300 w-full my-2 dark:bg-gray-700/50"></div>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold opacity-40 px-3 mb-2 uppercase tracking-wider hidden lg:block dark:opacity-60">
            {t.dashboard.menuSettings}
          </p>
          <button
            className={menuButtonClass('account')}
            type="button"
            onClick={() => onSectionChange('account')}
            aria-pressed={activeSection === 'account'}
          >
            <span className="material-symbols-outlined">settings</span>
            <span className={menuLabelClass('account')}>{t.dashboard.menuAccount}</span>
          </button>
        </div>
        <div className="mt-auto">
          <button
            className="w-full neu-btn p-3 rounded-xl flex items-center justify-center gap-2 text-red-500 hover:text-red-600 transition-colors dark:text-red-400 dark:hover:text-red-300"
            type="button"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-bold text-sm hidden lg:block">{t.dashboard.menuSignOut}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

function OverviewMainSection({ 
  t, 
  totalBalance,
  walletBalance,
  tradingBalance,
  isConnected,
  hasProxy,
  onDeposit,
  onWithdraw
}: { 
  t: LanguageData;
  totalBalance: number;
  walletBalance: number;
  tradingBalance: number;
  isConnected: boolean;
  hasProxy: boolean;
  onDeposit: () => void;
  onWithdraw: () => void;
}) {
  return (
    <section className="flex-1 flex flex-col gap-8 min-w-0 pr-2 pb-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 neu-out p-8 relative flex flex-col justify-center gap-6 rounded-3xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-gray-500 font-bold text-sm uppercase tracking-wide mb-1 dark:text-text-muted">
                {t.dashboard.totalBalance}
              </h2>
              {isConnected ? (
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>钱包: ${walletBalance.toFixed(2)}</span>
                  <span>|</span>
                  <span>交易: ${tradingBalance.toFixed(2)}</span>
                </div>
              ) : (
                <div className="text-xs text-gray-500">请先连接钱包</div>
              )}
            </div>
            <button
              className="neu-btn size-10 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 dark:hover:text-white"
              type="button"
            >
              <span className="material-symbols-outlined">visibility</span>
            </button>
          </div>
          <div className="neu-in neu-deep p-6 rounded-2xl flex items-center justify-center bg-gray-100/50 dark:bg-transparent">
            <span className="text-4xl md:text-5xl lg:text-6xl font-mono font-bold text-gray-700 tracking-tighter dark:text-white shadow-black drop-shadow-lg">
              ${isConnected ? totalBalance.toFixed(2) : '0.00'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button
              className="neu-btn py-4 rounded-xl flex items-center justify-center gap-2 text-gray-700 hover:text-accent-green transition-colors group dark:text-gray-200 dark:hover:text-accent-green"
              type="button"
              onClick={onDeposit}
            >
              <div className="size-8 rounded-full bg-accent-green/10 flex items-center justify-center text-accent-green group-hover:bg-accent-green group-hover:text-white transition-colors dark:bg-accent-green/20">
                <span className="material-symbols-outlined text-lg">add</span>
              </div>
              <span className="font-bold">{t.dashboard.deposit}</span>
            </button>
            <button
              className="neu-btn py-4 rounded-xl flex items-center justify-center gap-2 text-gray-700 hover:text-primary transition-colors group dark:text-gray-200 dark:hover:text-blue-400"
              type="button"
              onClick={onWithdraw}
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
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t.dashboard.activeBets}
                </span>
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
          <div className="neu-in p-4 rounded-xl border border-primary/10 bg-primary/5 dark:bg-blue-900/10 dark:border-blue-500/10">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-primary dark:text-blue-400">local_fire_department</span>
              <span className="font-bold text-primary text-sm dark:text-blue-400">{t.dashboard.hotPromo}</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed dark:text-gray-400">{t.dashboard.promoDesc}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-700 dark:text-white">{t.dashboard.activity}</h2>
          <div className="neu-in p-1.5 rounded-xl flex items-center bg-gray-200/50 dark:bg-[#0f131b]">
            <button className="neu-out py-2 px-6 rounded-lg text-sm font-bold text-primary shadow-sm transition-all transform active:scale-95 dark:text-blue-400 dark:shadow-none dark:neu-btn active dark:bg-blue-500/10">
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
              <div className="size-12 rounded-xl neu-in flex items-center justify-center text-gray-400 bg-gray-100 dark:bg-[#0f131b] dark:text-blue-400 border border-blue-500/20">
                <span className="material-symbols-outlined">currency_bitcoin</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg dark:text-white font-mono">BTC/USD</h3>
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <span>5m Turbo</span>
                  <span className="size-1 rounded-full bg-gray-400"></span>
                  <span className="text-blue-400">Live</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto justify-between md:justify-end pl-16 md:pl-0">
              <div className="flex flex-col items-start md:items-end">
                <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.selection}</span>
                <span className="font-bold text-accent-green flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">trending_up</span> LONG
                </span>
              </div>
              <div className="flex flex-col items-start md:items-end">
                <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.stake}</span>
                <span className="font-bold text-gray-200">+2 Ticks</span>
              </div>
              <div className="flex flex-col items-start md:items-end">
                <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.return}</span>
                <span className="font-bold text-primary dark:text-blue-400">1.85x</span>
              </div>
              <div className="neu-in px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100 hidden sm:block dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30 animate-pulse">
                LIVE
              </div>
            </div>
          </div>

          <div className="neu-out p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-l-4 border-accent-green group hover:bg-white/40 transition-colors cursor-pointer dark:hover:bg-white/5">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl neu-in flex items-center justify-center text-gray-400 bg-gray-100 dark:bg-[#0f131b] dark:text-gray-300 border border-gray-700">
                <span className="material-symbols-outlined">token</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg dark:text-white font-mono">ETH/USD</h3>
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <span>1m Blitz</span>
                  <span className="size-1 rounded-full bg-gray-400"></span>
                  <span>Expired 2m ago</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto justify-between md:justify-end pl-16 md:pl-0">
              <div className="flex flex-col items-start md:items-end">
                <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.selection}</span>
                <span className="font-bold text-accent-red flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">trending_down</span> SHORT
                </span>
              </div>
              <div className="flex flex-col items-start md:items-end">
                <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.stake}</span>
                <span className="font-bold text-accent-green">-15 Ticks</span>
              </div>
              <div className="flex flex-col items-start md:items-end">
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
              <div className="size-12 rounded-xl neu-in flex items-center justify-center text-gray-400 bg-gray-100 dark:bg-[#0f131b] dark:text-purple-400 border border-purple-500/20">
                <span className="material-symbols-outlined">deployed_code</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg dark:text-white font-mono">SOL/USD</h3>
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <span>15m Options</span>
                  <span className="size-1 rounded-full bg-gray-400"></span>
                  <span>10:45 AM</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto justify-between md:justify-end pl-16 md:pl-0">
              <div className="flex flex-col items-start md:items-end">
                <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.selection}</span>
                <span className="font-bold text-accent-green flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">trending_up</span> LONG
                </span>
              </div>
              <div className="flex flex-col items-start md:items-end">
                <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.stake}</span>
                <span className="font-bold text-accent-red">-4 Ticks</span>
              </div>
              <div className="flex flex-col items-start md:items-end">
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
              <div className="size-12 rounded-xl neu-in flex items-center justify-center text-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-500/20">
                <span className="material-symbols-outlined">account_balance</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg dark:text-white font-mono">USDT Deposit</h3>
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                  <span>Wallet Transfer</span>
                  <span className="size-1 rounded-full bg-gray-400"></span>
                  <span>09:30 AM</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto justify-between md:justify-end pl-16 md:pl-0">
              <div className="flex flex-col items-start md:items-end">
                <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.type}</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">ERC-20</span>
              </div>
              <div className="flex flex-col items-start md:items-end">
                <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.status}</span>
                <span className="font-bold text-accent-green">Confirmed</span>
              </div>
              <div className="flex flex-col items-start md:items-end">
                <span className="text-xs font-bold text-gray-400 uppercase">{t.dashboard.amount}</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">3,200 USDT</span>
              </div>
              <div className="neu-in px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100 hidden sm:block dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/30">
                COMPLETED
              </div>
            </div>
          </div>
        </div>
      </div>

      <LiquidityPoolSection />
    </section>
  );
}

function OverviewSidebar({
  t,
  performanceRange,
  isPerformanceMenuOpen,
  onToggleMenu,
  onSelectRange,
  performanceMenuRef
}: {
  t: LanguageData;
  performanceRange: 'week' | 'lastMonth';
  isPerformanceMenuOpen: boolean;
  onToggleMenu: () => void;
  onSelectRange: (range: 'week' | 'lastMonth') => void;
  performanceMenuRef: React.RefObject<HTMLDivElement>;
}) {
  const rangeLabel = performanceRange === 'week' ? t.dashboard.week : t.dashboard.lastMonth;

  return (
    <aside className="w-80 hidden xl:flex flex-col gap-6 shrink-0">
      <div className="neu-out p-6 rounded-3xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-gray-700 dark:text-white">{t.dashboard.myWallet}</h2>
          <button
            className="neu-btn size-8 rounded-full flex items-center justify-center text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white"
            type="button"
          >
            <span className="material-symbols-outlined text-sm">add</span>
          </button>
        </div>
        <div className="frosted-glass p-6 rounded-2xl relative overflow-hidden group hover:border-white/30 transition-all cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
          <div className="absolute -right-10 -top-10 size-40 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -left-10 -bottom-10 size-40 bg-purple-500/20 rounded-full blur-3xl"></div>
          <div className="absolute top-0 right-0 p-4">
            <span className="material-symbols-outlined text-white/50 text-3xl">contactless</span>
          </div>
          <div className="flex flex-col gap-8 relative z-10">
            <div className="w-12 h-9 rounded bg-gradient-to-br from-yellow-200 to-yellow-500 border border-yellow-600/50 flex items-center justify-center relative shadow-lg">
              <div className="absolute w-full h-[1px] bg-black/20 top-1/3"></div>
              <div className="absolute w-full h-[1px] bg-black/20 bottom-1/3"></div>
              <div className="absolute h-full w-[1px] bg-black/20 left-1/3"></div>
              <div className="absolute h-full w-[1px] bg-black/20 right-1/3"></div>
            </div>
            <div>
              <p className="font-mono text-gray-200 text-sm tracking-widest mb-2 shadow-black drop-shadow-md">
                •••• •••• •••• 4288
              </p>
              <div className="flex justify-between items-end">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {t.dashboard.cardHolder}
                </p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {t.dashboard.expires}
                </p>
              </div>
              <div className="flex justify-between items-end">
                <p className="font-bold text-white tracking-wide">ALEX M.</p>
                <p className="font-bold text-white tracking-wide">12/25</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="neu-out flex-1 p-6 rounded-3xl flex flex-col gap-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-lg text-gray-700 dark:text-white">{t.dashboard.performance}</h2>
          <div className="relative" ref={performanceMenuRef}>
            <button
              className="neu-btn w-28 px-2 py-1 rounded-lg text-xs font-bold text-gray-500 cursor-pointer flex items-center justify-between gap-2 focus:outline-none focus-visible:outline-none focus-visible:ring-0 dark:text-gray-400"
              type="button"
              onClick={onToggleMenu}
              aria-haspopup="listbox"
              aria-expanded={isPerformanceMenuOpen}
            >
              <span className="truncate">{rangeLabel}</span>
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>
            {isPerformanceMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-28 neu-out rounded-xl p-1 z-20"
                role="listbox"
                aria-label={t.dashboard.performance}
              >
                <button
                  className={`w-full text-left px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                    performanceRange === 'week'
                      ? 'neu-in text-primary dark:text-blue-400'
                      : 'text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white'
                  }`}
                  type="button"
                  onClick={() => onSelectRange('week')}
                  role="option"
                  aria-selected={performanceRange === 'week'}
                >
                  {t.dashboard.week}
                </button>
                <button
                  className={`w-full text-left px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                    performanceRange === 'lastMonth'
                      ? 'neu-in text-primary dark:text-blue-400'
                      : 'text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white'
                  }`}
                  type="button"
                  onClick={() => onSelectRange('lastMonth')}
                  role="option"
                  aria-selected={performanceRange === 'lastMonth'}
                >
                  {t.dashboard.lastMonth}
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 flex items-end justify-between gap-3 px-2 pb-2">
          <div className="w-full bg-gray-200 rounded-t-lg relative group h-[40%] dark:bg-[#0d1118] neu-in">
            <div className="absolute bottom-0 w-full bg-neon-bar rounded-t-lg h-full opacity-80 group-hover:opacity-100 transition-opacity shadow-neon-glow"></div>
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-400">M</span>
          </div>
          <div className="w-full bg-gray-200 rounded-t-lg relative group h-[60%] dark:bg-[#0d1118] neu-in">
            <div className="absolute bottom-0 w-full bg-neon-bar rounded-t-lg h-full opacity-80 group-hover:opacity-100 transition-opacity shadow-neon-glow"></div>
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-400">T</span>
          </div>
          <div className="w-full bg-gray-200 rounded-t-lg relative group h-[30%] dark:bg-[#0d1118] neu-in">
            <div className="absolute bottom-0 w-full bg-neon-bar-red rounded-t-lg h-full opacity-80 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-400">W</span>
          </div>
          <div className="w-full bg-gray-200 rounded-t-lg relative group h-[85%] dark:bg-[#0d1118] neu-in">
            <div className="absolute bottom-0 w-full bg-neon-bar rounded-t-lg h-full opacity-80 group-hover:opacity-100 transition-opacity shadow-neon-glow"></div>
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-400">T</span>
          </div>
          <div className="w-full bg-gray-200 rounded-t-lg relative group h-[50%] dark:bg-[#0d1118] neu-in">
            <div className="absolute bottom-0 w-full bg-neon-bar rounded-t-lg h-full opacity-80 group-hover:opacity-100 transition-opacity shadow-neon-glow"></div>
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-400">F</span>
          </div>
          <div className="w-full bg-gray-200 rounded-t-lg relative group h-[90%] dark:bg-[#0d1118] neu-in">
            <div className="absolute bottom-0 w-full bg-neon-bar-green rounded-t-lg h-full opacity-80 group-hover:opacity-100 transition-opacity shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-400">S</span>
          </div>
          <div className="w-full bg-gray-200 rounded-t-lg relative group h-[20%] dark:bg-[#0d1118] neu-in">
            <div className="absolute bottom-0 w-full bg-gray-400 rounded-t-lg h-full opacity-30 dark:bg-gray-700"></div>
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
  );
}
