import React, { useState } from 'react';
import { Bell, Search, Globe, Wallet } from 'lucide-react';
import { Page } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

export default function Header({ activePage }: { activePage: Page }) {
  const { t, language, setLanguage } = useLanguage();
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(true);

  const getTitle = () => {
    switch(activePage) {
      case Page.HOME: return t.header.overview;
      case Page.MARKETS: return t.header.pairExplorer;
      case Page.TERMINAL: return t.header.tradingTerminal;
      case Page.DASHBOARD: return t.header.wealthDashboard;
      default: return 'KMarket';
    }
  };

  const handleConnect = () => {
    // Simulating connection delay
    setTimeout(() => {
        setIsWalletConnected(true);
    }, 500);
  };

  return (
    <header className="w-full h-20 px-4 lg:px-8 flex items-center justify-between shrink-0 z-10">
      <div className="md:hidden flex items-center gap-2">
         {/* Mobile hamburger placeholder */}
         <div className="neu-btn p-2 rounded-lg"><span className="block w-5 h-0.5 bg-gray-400 mb-1"></span><span className="block w-5 h-0.5 bg-gray-400 mb-1"></span><span className="block w-5 h-0.5 bg-gray-400"></span></div>
      </div>

      <h1 className="text-xl font-bold text-gray-100 hidden md:block">{getTitle()}</h1>

      <div className="flex items-center gap-4 lg:gap-6">
        <div className="hidden md:flex neu-in px-4 py-2 rounded-full items-center gap-2 w-64">
          <Search size={16} className="text-gray-500" />
          <input type="text" placeholder={t.header.search} className="bg-transparent border-none outline-none text-sm text-gray-300 placeholder-gray-600 w-full focus:ring-0" />
        </div>

        <div className="flex items-center gap-4">
           {/* Language Switcher */}
           <button 
             onClick={() => setLanguage(language === 'CN' ? 'EN' : 'CN')}
             className="neu-btn px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-primary transition-colors"
           >
             <Globe size={14} />
             <span>{language}</span>
           </button>

           {/* Wallet Connection Logic */}
           {!isWalletConnected ? (
             <button 
                onClick={handleConnect}
                className="neu-btn px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold text-primary hover:text-white hover:bg-primary/10 transition-all active:scale-95"
             >
                <Wallet size={16} />
                <span>{t.header.connectWallet}</span>
             </button>
           ) : (
             <div className="hidden lg:flex flex-col items-end animate-in fade-in zoom-in duration-300">
                <span className="text-[10px] font-bold text-gray-500 uppercase">{t.header.walletBalance}</span>
                <span className="font-digital text-lg font-bold text-primary shadow-blue-500/20 drop-shadow-sm">$14,250.45</span>
             </div>
           )}

           <button 
             onClick={() => setHasNotifications(!hasNotifications)}
             className="neu-btn size-10 rounded-full flex items-center justify-center text-gray-400 hover:text-primary relative transition-colors"
           >
              <Bell size={18} />
              {hasNotifications && (
                 <span className="absolute top-0 right-0 size-2.5 bg-red-500 rounded-full border-2 border-[#1e293b] animate-bounce"></span>
              )}
           </button>

           <div className="size-10 rounded-full neu-out p-1 cursor-pointer hover:border-gray-600 transition-colors">
              <img src="https://picsum.photos/100" alt="User" className="w-full h-full rounded-full object-cover" />
           </div>
        </div>
      </div>
    </header>
  );
}
