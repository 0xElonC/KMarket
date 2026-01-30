import React, { useState } from 'react';
import { Globe, Wallet, TrendingUp } from 'lucide-react';
import { Page } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

export default function Header({
  activePage,
  onNavigate,
  onOpenDashboardAccount,
  onPrefetchPage
}: {
  activePage: Page;
  onNavigate: (page: Page) => void;
  onOpenDashboardAccount?: () => void;
  onPrefetchPage?: (page: Page) => void;
}) {
  const { t, language, setLanguage } = useLanguage();
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  const handleConnect = () => {
    // Simulating connection delay
    setTimeout(() => {
        setIsWalletConnected(true);
    }, 500);
  };

  return (
    <header className="w-full h-20 px-4 lg:px-8 flex items-center justify-between shrink-0 z-10 header-halo relative">
      <div className="flex items-center gap-4">
        <div className="md:hidden flex items-center gap-2">
          {/* Mobile hamburger placeholder */}
          <div className="neu-btn p-2 rounded-lg">
            <span className="block w-5 h-0.5 bg-gray-400 mb-1"></span>
            <span className="block w-5 h-0.5 bg-gray-400 mb-1"></span>
            <span className="block w-5 h-0.5 bg-gray-400"></span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-3 select-none">
          <div className="size-10 rounded-xl neu-out flex items-center justify-center text-primary">
            <TrendingUp size={20} />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-gray-100">KMarket</span>
        </div>
      </div>

      <nav className="hidden lg:flex items-center gap-2 p-2 rounded-full header-tab-wrap absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
        {([
          { label: t.sidebar.home, page: Page.HOME },
          { label: t.sidebar.markets, page: Page.MARKETS },
          { label: t.sidebar.terminal, page: Page.TERMINAL },
          { label: t.sidebar.dashboard, page: Page.DASHBOARD }
        ] as const).map((item) => {
          const isActive = activePage === item.page;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate(item.page)}
              onMouseEnter={() => onPrefetchPage?.(item.page)}
              onFocus={() => onPrefetchPage?.(item.page)}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-colors header-tab-btn ${
                isActive
                  ? 'text-blue-400 active'
                  : 'text-slate-500 hover:text-blue-400'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-4 lg:gap-6">
        <div className="flex items-center gap-3 lg:gap-4">
          <div className="min-w-[160px] sm:min-w-[180px] lg:min-w-[200px] flex items-center justify-end">
            {/* Wallet Connection Logic */}
            {!isWalletConnected ? (
              <button
                onClick={handleConnect}
                className="neu-btn header-solid-btn px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold text-primary hover:text-white hover:bg-primary/10 transition-all active:scale-95 whitespace-nowrap"
              >
                <Wallet size={16} />
                <span>{t.header.connectWallet}</span>
              </button>
            ) : (
              <div className="hidden lg:flex flex-col items-end animate-in fade-in zoom-in duration-300">
                <span className="text-[10px] font-bold text-gray-500 uppercase">{t.header.walletBalance}</span>
                <span className="font-digital text-lg font-bold text-primary header-balance-glow">$14,250.45</span>
              </div>
            )}
          </div>

          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'CN' ? 'EN' : 'CN')}
            className="neu-btn header-solid-btn px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-primary transition-colors"
          >
            <Globe size={14} />
            <span>{language}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onOpenDashboardAccount) {
                onOpenDashboardAccount();
                return;
              }
              onNavigate(Page.DASHBOARD);
            }}
            className="size-10 rounded-full neu-out p-1 cursor-pointer hover:border-gray-600 transition-colors"
            aria-label="Open account"
          >
            <img src="https://picsum.photos/100" alt="User" className="w-full h-full rounded-full object-cover" />
          </button>
        </div>
      </div>
    </header>
  );
}
