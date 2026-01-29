import React, { useState } from 'react';
import { Page } from './types';
import Header from './components/Header';
import Home from './pages/Home';
import Markets from './pages/Markets';
import Terminal from './pages/Terminal';
import Dashboard from './pages/Dashboard';
import { ConfirmModal } from './components/ConfirmModal';

export default function App() {
  const [activePage, setActivePage] = useState<Page>(Page.HOME);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<{
    symbol: string;
    name: string;
    price: number;
    change: number;
  } | null>(null);
  const renderPage = () => {
    switch (activePage) {
      case Page.HOME:
        return <Home onNavigate={setActivePage} />;
      case Page.MARKETS:
        return <Markets onNavigate={setActivePage} onSelectAsset={setSelectedAsset} />;
      case Page.TERMINAL:
        return (
          <Terminal
            requestConfirm={() => setShowConfirmModal(true)}
            selectedAsset={selectedAsset}
          />
        );
      case Page.DASHBOARD:
        return <Dashboard />;
      default:
        return <Home onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="h-screen bg-background text-gray-200 font-display flex flex-col overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden">
        <Header activePage={activePage} onNavigate={setActivePage} />
        <main className="flex-1 min-h-0 h-full flex flex-col overflow-y-auto custom-scrollbar p-4 lg:p-8 relative">
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
