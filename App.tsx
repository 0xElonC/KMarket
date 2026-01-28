import React, { useState } from 'react';
import { Page } from './types';
import Header from './components/Header';
import Home from './pages/Home';
import Markets from './pages/Markets';
import Terminal from './pages/Terminal';
import Dashboard from './pages/Dashboard';
import { LayoutDashboard, TrendingUp, BarChart2, Wallet, Settings, LogOut } from 'lucide-react';
import { useLanguage } from './contexts/LanguageContext';
import { SidebarItem } from './components/SidebarItem';
import { ConfirmModal } from './components/ConfirmModal';

export default function App() {
  const [activePage, setActivePage] = useState<Page>(Page.HOME);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { t } = useLanguage();
  const renderPage = () => {
    switch (activePage) {
      case Page.HOME:
        return <Home onNavigate={setActivePage} />;
      case Page.MARKETS:
        return <Markets onNavigate={setActivePage} />;
      case Page.TERMINAL:
        return <Terminal requestConfirm={() => setShowConfirmModal(true)} />;
      case Page.DASHBOARD:
        return <Dashboard />;
      default:
        return <Home onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-gray-200 font-display flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Sidebar overlay could go here, sticking to desktop-first structure for code brevity */}
      
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-20 lg:w-64 bg-background border-r border-white/5 shrink-0 z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="neu-out size-10 rounded-xl flex items-center justify-center text-primary">
            <TrendingUp size={24} />
          </div>
          <span className="hidden lg:block text-2xl font-extrabold tracking-tight">KMarket</span>
        </div>

        <nav className="flex-1 flex flex-col gap-4 px-4 py-6">
          <SidebarItem 
            icon={<LayoutDashboard size={20} />} 
            label={t.sidebar.home}
            active={activePage === Page.HOME}
            onClick={() => setActivePage(Page.HOME)}
          />
          <SidebarItem 
            icon={<BarChart2 size={20} />} 
            label={t.sidebar.markets}
            active={activePage === Page.MARKETS}
            onClick={() => setActivePage(Page.MARKETS)}
          />
          <SidebarItem 
            icon={<TrendingUp size={20} />} 
            label={t.sidebar.terminal} 
            active={activePage === Page.TERMINAL}
            onClick={() => setActivePage(Page.TERMINAL)}
          />
          <SidebarItem 
            icon={<Wallet size={20} />} 
            label={t.sidebar.dashboard}
            active={activePage === Page.DASHBOARD}
            onClick={() => setActivePage(Page.DASHBOARD)}
          />
        </nav>

        <div className="p-4 flex flex-col gap-2">
           <SidebarItem icon={<Settings size={20} />} label={t.sidebar.settings} onClick={() => {}} />
           <SidebarItem icon={<LogOut size={20} />} label={t.sidebar.logout} onClick={() => {}} danger />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header activePage={activePage} />
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8 relative">
          {renderPage()}
        </main>
      </div>

      {/* Global Confirm Modal Overlay */}
      {showConfirmModal && (
        <ConfirmModal onClose={() => setShowConfirmModal(false)} />
      )}
    </div>
  );
}
