import React, { useState, useEffect, useRef } from 'react';
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
import { useTransactionActivity } from '../hooks/useTransactionActivity';
import type { ActivityItem } from '../utils/activityUtils';
import { ActivityList } from '../components/ActivityList';
import { WalletCard } from '../components/dashboard/WalletCard';
import { useQuickStats } from '../hooks/useQuickStats';


type DashboardSection = 'overview' | 'portfolio' | 'transactions' | 'analytics' | 'account';
type LanguageData = ReturnType<typeof useLanguage>['t'];

export default function Dashboard({
  initialSection,
  onSectionConsumed
}: {
  initialSection?: DashboardSection | null;
  onSectionConsumed?: () => void;
}) {
  const { t } = useLanguage();
  const { isConnected, usdcBalance } = useWallet();
  const { depositBalance, hasProxy, isLoading, isCreatingProxy, proxyAddress } = useProxyWallet();
  const [modalMode, setModalMode] = useState<'deposit' | 'withdraw' | null>(null);
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [performanceRange, setPerformanceRange] = useState<'week' | 'lastMonth'>('week');
  const [isPerformanceMenuOpen, setIsPerformanceMenuOpen] = useState(false);
  const performanceMenuRef = useRef<HTMLDivElement | null>(null);
  const { activeBets, winRate, loading: statsLoading } = useQuickStats();

  // Calculate total balance (wallet + trading)
  const totalBalance = isConnected
    ? (parseFloat(usdcBalance) + parseFloat(depositBalance)).toFixed(2)
    : '0.00';

  const handleOpenDeposit = () => setModalMode('deposit');
  const handleOpenWithdraw = () => setModalMode('withdraw');
  const handleCloseModal = () => setModalMode(null);

  const activeMenuClass =
    'neu-in p-3 rounded-xl flex items-center gap-4 text-primary active dark:text-blue-400 dark:bg-[#0f131b] border border-transparent outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0';
  const inactiveMenuClass =
    'p-3 rounded-xl flex items-center gap-4 text-gray-500 hover:text-primary hover:bg-white/40 transition-all dark:text-text-muted dark:hover:text-white dark:hover:bg-white/5 border border-transparent outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0';

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
            usdcBalance={usdcBalance}
            depositBalance={depositBalance}
            isLoading={isLoading}
            isConnected={isConnected}
            hasProxy={hasProxy}
            isCreatingProxy={isCreatingProxy}
            proxyAddress={proxyAddress}
            onDeposit={handleOpenDeposit}
            onWithdraw={handleOpenWithdraw}
            activeBets={activeBets}
            winRate={winRate}
            statsLoading={statsLoading}
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
        isOpen={modalMode !== null}
        onClose={handleCloseModal}
        mode={modalMode || 'deposit'}
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
  usdcBalance,
  depositBalance,
  isLoading,
  isConnected,
  hasProxy,
  isCreatingProxy,
  proxyAddress,
  onDeposit,
  onWithdraw,
  activeBets,
  winRate,
  statsLoading
}: {
  t: LanguageData;
  totalBalance: string;
  usdcBalance: string;
  depositBalance: string;
  isLoading: boolean;
  isConnected: boolean;
  hasProxy: boolean;
  isCreatingProxy: boolean;
  proxyAddress: `0x${string}` | undefined;
  onDeposit: () => void;
  onWithdraw: () => void;
  activeBets: number;
  winRate: number;
  statsLoading: boolean;
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
              <div className="flex items-baseline gap-2">
                <span className="material-symbols-outlined text-accent-green text-sm">arrow_upward</span>
                <span className="text-accent-green text-sm font-bold">+2.4% {t.dashboard.week}</span>
              </div>
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
                <span className="text-lg font-bold text-primary dark:text-blue-400">
                  {statsLoading ? '...' : activeBets}
                </span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full neu-in overflow-hidden dark:bg-[#0f131b]">
                <div
                  className="bg-primary h-full rounded-full dark:bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all"
                  style={{ width: `${Math.min(activeBets * 10, 100)}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{t.dashboard.winRate}</span>
                <span className="text-lg font-bold text-accent-green">
                  {statsLoading ? '...' : `${winRate}%`}
                </span>
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full neu-in overflow-hidden dark:bg-[#0f131b]">
                <div
                  className="bg-accent-green h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all"
                  style={{ width: `${winRate}%` }}
                ></div>
              </div>
            </div>
          </div>
          {/* Proxy wallet status */}
          <div className={`neu-in p-4 rounded-xl border ${isCreatingProxy
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
        </div>
        <ActivityList />
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
      <WalletCard />

      {/* 盈亏表现卡片 - 使用新的折线图组件 */}
      <div className="neu-out rounded-3xl overflow-hidden">
        <PortfolioPerformanceCard />
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
