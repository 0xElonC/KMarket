import React from 'react';
import { Bell, Globe, Wallet, TrendingUp, AlertTriangle } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Page } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useWallet } from '../contexts/WalletContext';

export default function Header({
  activePage,
  onNavigate
}: {
  activePage: Page;
  onNavigate: (page: Page) => void;
}) {
  const { t, language, setLanguage } = useLanguage();
  const { isCorrectChain, switchToPolygon, usdcBalance, isLoadingBalances } = useWallet();
  const [hasNotifications, setHasNotifications] = React.useState(true);

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


        <div className="flex items-center gap-4">
           {/* Language Switcher */}
           <button
             onClick={() => setLanguage(language === 'CN' ? 'EN' : 'CN')}
             className="neu-btn header-solid-btn px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-primary transition-colors"
           >
             <Globe size={14} />
             <span>{language}</span>
           </button>

           {/* RainbowKit Wallet Connection */}
           <ConnectButton.Custom>
             {({
               account,
               chain,
               openAccountModal,
               openChainModal,
               openConnectModal,
               mounted,
             }) => {
               const ready = mounted;
               const connected = ready && account && chain;

               return (
                 <div
                   {...(!ready && {
                     'aria-hidden': true,
                     style: {
                       opacity: 0,
                       pointerEvents: 'none',
                       userSelect: 'none',
                     },
                   })}
                   className="flex items-center gap-3"
                 >
                   {(() => {
                     if (!connected) {
                       return (
                         <button
                           onClick={openConnectModal}
                           className="neu-btn header-solid-btn px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold text-primary hover:text-white hover:bg-primary/10 transition-all active:scale-95"
                         >
                           <Wallet size={16} />
                           <span>{t.header.connectWallet}</span>
                         </button>
                       );
                     }

                     if (!isCorrectChain) {
                       return (
                         <button
                           onClick={switchToPolygon}
                           className="neu-btn header-solid-btn px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold text-amber-500 hover:text-amber-400 transition-all active:scale-95"
                         >
                           <AlertTriangle size={16} />
                           <span>{t.header.wrongNetwork}</span>
                         </button>
                       );
                     }

                     return (
                       <>
                         {/* Balance Display */}
                         <div className="hidden lg:flex neu-btn header-solid-btn px-3 py-2 rounded-xl items-center gap-2 text-sm font-bold text-primary">
                           <span className="font-digital">
                             {isLoadingBalances ? '...' : `$${usdcBalance}`}
                           </span>
                         </div>

                         {/* Chain Button */}
                         <button
                           onClick={openChainModal}
                           className="neu-btn header-solid-btn p-2 rounded-lg flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-primary transition-colors"
                           title={chain.name}
                         >
                           {chain.hasIcon && chain.iconUrl && (
                             <img
                               alt={chain.name ?? 'Chain icon'}
                               src={chain.iconUrl}
                               className="size-4 rounded-full"
                             />
                           )}
                         </button>

                         {/* Account Button */}
                         <button
                           onClick={openAccountModal}
                           className="neu-btn header-solid-btn px-3 py-2 rounded-xl flex items-center gap-2 text-sm font-bold text-gray-300 hover:text-primary transition-all"
                         >
                           <span className="font-mono text-xs">{account.displayName}</span>
                         </button>

                         {/* Notification Bell */}
                         <button
                           onClick={() => setHasNotifications(!hasNotifications)}
                           className="neu-btn header-solid-btn size-10 rounded-full flex items-center justify-center text-gray-400 hover:text-primary relative transition-colors"
                         >
                           <Bell size={18} />
                           {hasNotifications && (
                             <span className="absolute top-0 right-0 size-2.5 bg-red-500 rounded-full border-2 border-[#121721] animate-bounce"></span>
                           )}
                         </button>
                       </>
                     );
                   })()}
                 </div>
               );
             }}
           </ConnectButton.Custom>
        </div>
      </div>
    </header>
  );
}
