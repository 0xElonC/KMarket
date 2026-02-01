import React, { useState, useEffect } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { getTransactionHistory, Transaction, TransactionType } from '../../utils/transactionHistory';
import { ArrowUpRight, ArrowDownLeft, TrendingUp, TrendingDown, Gamepad2 } from 'lucide-react';

export function TransactionHistorySection() {
  const { address } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (address) {
      const history = getTransactionHistory(address);
      setTransactions(history);
    }
  }, [address]);

  const getIcon = (type: TransactionType) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="w-5 h-5 text-accent-green" />;
      case 'withdraw':
        return <ArrowUpRight className="w-5 h-5 text-primary" />;
      case 'bet':
        return <Gamepad2 className="w-5 h-5 text-gray-400" />;
      case 'win':
        return <TrendingUp className="w-5 h-5 text-accent-green" />;
      case 'loss':
        return <TrendingDown className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: TransactionType) => {
    switch (type) {
      case 'deposit':
        return 'Deposit';
      case 'withdraw':
        return 'Withdraw';
      case 'bet':
        return 'Bet Placed';
      case 'win':
        return 'Win';
      case 'loss':
        return 'Loss';
      default:
        return type;
    }
  };

  const getAmountColor = (type: TransactionType) => {
    switch (type) {
      case 'deposit':
      case 'win':
        return 'text-accent-green';
      case 'withdraw':
      case 'bet':
      case 'loss':
        return 'text-red-500';
      default:
        return 'text-gray-600 dark:text-gray-300';
    }
  };

  const getAmountSign = (type: TransactionType) => {
    switch (type) {
      case 'deposit':
      case 'win':
        return '+';
      case 'withdraw':
      case 'bet':
      case 'loss':
        return '-';
      default:
        return '';
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <section className="flex-1 min-w-0">
      <div className="neu-out p-6 rounded-3xl">
        <h3 className="font-bold text-gray-600 dark:text-gray-300 mb-4">Transaction History</h3>
        
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No transactions yet</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="neu-in p-4 rounded-xl flex items-center gap-4 hover:bg-white/50 dark:hover:bg-white/5 transition-all"
              >
                {/* Icon */}
                <div className="shrink-0">
                  {getIcon(tx.type)}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm">
                      {getTypeLabel(tx.type)}
                    </span>
                    <span className={`font-mono font-bold text-sm ${getAmountColor(tx.type)}`}>
                      {getAmountSign(tx.type)}{tx.amount.toFixed(2)} USDC
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                    {tx.description}
                  </p>
                  
                  {tx.details && (
                    <div className="text-xs text-gray-400 mt-1 flex gap-3">
                      {tx.details.odds && (
                        <span>Odds: {tx.details.odds.toFixed(2)}x</span>
                      )}
                      {tx.details.payout && (
                        <span>Payout: ${tx.details.payout.toFixed(2)}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Time & Balance */}
                <div className="shrink-0 text-right">
                  <div className="text-xs text-gray-400">
                    {formatDate(tx.timestamp)}
                  </div>
                  {tx.balance !== undefined && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Bal: ${tx.balance.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

