import React, { Suspense, useCallback, useState, useTransition } from 'react';
import { Page } from './types';
import Header from './components/Header';
import Home from './pages/Home';
import Markets from './pages/Markets';
import Dashboard from './pages/Dashboard';
import { ConfirmModal } from './components/ConfirmModal';

const loadTerminal = () => import('./pages/Terminal');
const Terminal = React.lazy(loadTerminal);

export default function App() {
  const [activePage, setActivePage] = useState<Page>(Page.HOME);
  const [navPage, setNavPage] = useState<Page>(Page.HOME);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [dashboardSection, setDashboardSection] = useState<'account' | null>(null);
  const [, startTransition] = useTransition();
  const [selectedAsset, setSelectedAsset] = useState<{
    symbol: string;
    name: string;
    price: number;
    change: number;
  } | null>(null);
  const handleNavigate = useCallback(
    (page: Page) => {
      setNavPage((prev) => (prev === page ? prev : page));
      startTransition(() => {
        setActivePage((prev) => (prev === page ? prev : page));
      });
    },
    [startTransition]
  );
  const handleOpenDashboardAccount = useCallback(() => {
    setNavPage(Page.DASHBOARD);
    startTransition(() => {
      setActivePage(Page.DASHBOARD);
      setDashboardSection('account');
    });
  }, [startTransition]);
  const handlePrefetchPage = useCallback((page: Page) => {
    if (page !== Page.TERMINAL) return;
    loadTerminal();
  }, []);
  const renderPage = () => {
    switch (activePage) {
      case Page.HOME:
        return <Home onNavigate={handleNavigate} />;
      case Page.MARKETS:
        return <Markets onNavigate={handleNavigate} onSelectAsset={setSelectedAsset} />;
      case Page.TERMINAL:
        return (
          <Suspense fallback={<div className="flex-1" />}>
            <Terminal
              requestConfirm={() => setShowConfirmModal(true)}
              selectedAsset={selectedAsset}
            />
          </Suspense>
        );
      case Page.DASHBOARD:
        return (
          <Dashboard
            initialSection={dashboardSection}
            onSectionConsumed={() => setDashboardSection(null)}
          />
        );
      default:
        return <Home onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="h-screen bg-background text-gray-200 font-display flex flex-col overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden">
        <Header
          activePage={navPage}
          onNavigate={handleNavigate}
          onOpenDashboardAccount={handleOpenDashboardAccount}
          onPrefetchPage={handlePrefetchPage}
        />
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
