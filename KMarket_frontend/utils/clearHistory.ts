// Clear all transaction history for development/testing

export function clearAllHistory(): void {
  try {
    localStorage.removeItem('kmarket_transaction_history');
    console.log('✅ All transaction history cleared');
  } catch (e) {
    console.error('Failed to clear history:', e);
  }
}

export function clearAllVirtualBalances(): void {
  try {
    localStorage.removeItem('kmarket_virtual_balance');
    console.log('✅ All virtual balances cleared');
  } catch (e) {
    console.error('Failed to clear virtual balances:', e);
  }
}

export function resetAll(): void {
  clearAllHistory();
  clearAllVirtualBalances();
  console.log('🔄 All data reset! Please refresh the page.');
}

// Add to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).clearHistory = clearAllHistory;
  (window as any).clearBalances = clearAllVirtualBalances;
  (window as any).resetAll = resetAll;
  console.log('💡 Debug commands available: clearHistory(), clearBalances(), resetAll()');
}
