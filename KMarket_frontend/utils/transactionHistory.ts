// Transaction History Manager for KMarket

export type TransactionType = 'deposit' | 'withdraw' | 'bet' | 'win' | 'loss';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  timestamp: number;
  description: string;
  balance?: number; // Balance after transaction
  details?: {
    asset?: string;
    odds?: number;
    payout?: number;
    priceRange?: string;
  };
}

const STORAGE_KEY = 'kmarket_transaction_history';
const MAX_TRANSACTIONS = 100; // Keep last 100 transactions per address

// Get transaction history for an address
export function getTransactionHistory(address: string): Transaction[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const allHistory = JSON.parse(data);
      return allHistory[address.toLowerCase()] || [];
    }
  } catch (e) {
    console.error('Failed to read transaction history:', e);
  }
  return [];
}

// Add a new transaction
export function addTransaction(
  address: string,
  type: TransactionType,
  amount: number,
  description: string,
  balance?: number,
  details?: Transaction['details']
): Transaction {
  const transaction: Transaction = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    amount,
    timestamp: Date.now(),
    description,
    balance,
    details,
  };

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const allHistory = data ? JSON.parse(data) : {};
    const addressKey = address.toLowerCase();
    const history = allHistory[addressKey] || [];
    
    // Add new transaction at the beginning
    history.unshift(transaction);
    
    // Keep only last MAX_TRANSACTIONS
    if (history.length > MAX_TRANSACTIONS) {
      history.splice(MAX_TRANSACTIONS);
    }
    
    allHistory[addressKey] = history;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allHistory));
    
    // Dispatch custom event for real-time updates
    window.dispatchEvent(new CustomEvent('transactionHistoryUpdate'));
    
    console.log('📝 Transaction recorded:', transaction);
  } catch (e) {
    console.error('Failed to save transaction:', e);
  }

  return transaction;
}

// Remove a specific transaction by ID
export function removeTransaction(address: string, transactionId: string): void {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const allHistory = JSON.parse(data);
      const addressKey = address.toLowerCase();
      const history = allHistory[addressKey] || [];
      
      // Remove transaction with matching ID
      const filteredHistory = history.filter((tx: Transaction) => tx.id !== transactionId);
      
      allHistory[addressKey] = filteredHistory;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allHistory));
      
      // Dispatch custom event for real-time updates
      window.dispatchEvent(new CustomEvent('transactionHistoryUpdate'));
      
      console.log('🗑️ Transaction removed:', transactionId);
    }
  } catch (e) {
    console.error('Failed to remove transaction:', e);
  }
}

// Clear history for an address
export function clearTransactionHistory(address: string): void {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const allHistory = JSON.parse(data);
      delete allHistory[address.toLowerCase()];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allHistory));
    }
  } catch (e) {
    console.error('Failed to clear transaction history:', e);
  }
}

// Get statistics
export function getTransactionStats(address: string): {
  totalDeposits: number;
  totalWithdraws: number;
  totalBets: number;
  totalWins: number;
  totalLosses: number;
  winCount: number;
  lossCount: number;
  winRate: number;
} {
  const history = getTransactionHistory(address);
  
  const stats = {
    totalDeposits: 0,
    totalWithdraws: 0,
    totalBets: 0,
    totalWins: 0,
    totalLosses: 0,
    winCount: 0,
    lossCount: 0,
    winRate: 0,
  };

  history.forEach(tx => {
    switch (tx.type) {
      case 'deposit':
        stats.totalDeposits += tx.amount;
        break;
      case 'withdraw':
        stats.totalWithdraws += tx.amount;
        break;
      case 'bet':
        stats.totalBets += tx.amount;
        break;
      case 'win':
        stats.totalWins += tx.amount;
        stats.winCount++;
        break;
      case 'loss':
        stats.totalLosses += tx.amount;
        stats.lossCount++;
        break;
    }
  });

  const totalTrades = stats.winCount + stats.lossCount;
  stats.winRate = totalTrades > 0 ? (stats.winCount / totalTrades) * 100 : 0;

  return stats;
}
