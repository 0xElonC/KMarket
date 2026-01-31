import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, AlertCircle, Wallet, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useProxyWallet, useDeposit, useWithdraw } from '../hooks/useProxyWallet';

interface DepositWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'deposit' | 'withdraw';
}

export default function DepositWithdrawModal({ isOpen, onClose, mode }: DepositWithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const { usdcBalance, isConnected, address } = useWallet();
  const { hasProxy, proxyAddress, depositBalance, isLoading: isLoadingProxy, isCreatingProxy, createProxy, refetch } = useProxyWallet();
  const deposit = useDeposit();
  const withdraw = useWithdraw();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      deposit.reset();
      withdraw.reset();
      refetch();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isDeposit = mode === 'deposit';
  const maxAmount = isDeposit ? usdcBalance : depositBalance;
  const isProcessing = isDeposit 
    ? deposit.isPending || deposit.isApproving || deposit.isDepositing
    : withdraw.isPending || withdraw.isWithdrawing;
  const isSuccess = isDeposit ? deposit.isSuccess : withdraw.isSuccess;
  const error = isDeposit ? deposit.error : withdraw.error;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    if (isDeposit) {
      await deposit.deposit(amount);
    } else {
      await withdraw.withdraw(amount);
    }
  };

  const handleMaxClick = () => {
    setAmount(maxAmount);
  };

  const handleCreateProxy = async () => {
    await createProxy();
  };

  // Render content based on state
  const renderContent = () => {
    // Not connected
    if (!isConnected || !address) {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <Wallet className="w-16 h-16 text-gray-400" />
          <p className="text-gray-400 text-center">Please connect your wallet first</p>
        </div>
      );
    }

    // Creating proxy wallet
    if (isCreatingProxy) {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <h3 className="text-lg font-bold text-white">Creating Trading Wallet</h3>
          <p className="text-gray-400 text-center text-sm">
            Please confirm the transaction in your wallet...
          </p>
        </div>
      );
    }

    // Loading proxy state
    if (isLoadingProxy) {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-gray-400">Loading wallet state...</p>
        </div>
      );
    }

    // No proxy wallet - need to create one
    if (!hasProxy) {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <Wallet className="w-16 h-16 text-primary" />
          <h3 className="text-lg font-bold text-white">Create Trading Wallet</h3>
          <p className="text-gray-400 text-center text-sm max-w-xs">
            You need to create a trading wallet before you can deposit or withdraw funds.
            This is a one-time setup.
          </p>
          <button
            onClick={handleCreateProxy}
            disabled={isCreatingProxy}
            className="mt-4 neu-btn px-6 py-3 rounded-xl flex items-center gap-2 text-primary hover:text-white hover:bg-primary/20 transition-all disabled:opacity-50"
          >
            {isCreatingProxy ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Wallet className="w-5 h-5" />
            )}
            <span className="font-bold">Create Wallet</span>
          </button>
        </div>
      );
    }

    // Success state
    if (isSuccess) {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <CheckCircle className="w-16 h-16 text-accent-green" />
          <h3 className="text-lg font-bold text-white">
            {isDeposit ? 'Deposit Successful!' : 'Withdrawal Successful!'}
          </h3>
          <p className="text-gray-400 text-center">
            {isDeposit 
              ? `Successfully deposited ${amount} USDC`
              : `Successfully withdrew ${amount} USDC`
            }
          </p>
          <button
            onClick={onClose}
            className="mt-4 neu-btn px-6 py-3 rounded-xl text-primary hover:text-white hover:bg-primary/20 transition-all font-bold"
          >
            Close
          </button>
        </div>
      );
    }

    // Main form
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Balance Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="neu-in p-4 rounded-xl">
            <p className="text-xs text-gray-400 mb-1">Wallet Balance</p>
            <p className="text-lg font-bold text-white">${usdcBalance} USDC</p>
          </div>
          <div className="neu-in p-4 rounded-xl">
            <p className="text-xs text-gray-400 mb-1">Trading Balance</p>
            <p className="text-lg font-bold text-primary">${parseFloat(depositBalance).toFixed(2)} USDC</p>
          </div>
        </div>

        {/* Amount Input */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-gray-400">Amount (USDC)</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              disabled={isProcessing}
              className="w-full neu-in p-4 pr-20 rounded-xl bg-transparent text-white text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleMaxClick}
              disabled={isProcessing}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-primary/20 text-primary text-xs font-bold hover:bg-primary/30 transition-colors disabled:opacity-50"
            >
              MAX
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Available: {maxAmount} USDC
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Status Messages */}
        {isProcessing && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
            <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
            <p className="text-sm text-primary">
              {deposit.isApproving && 'Approving USDC...'}
              {deposit.isDepositing && 'Processing deposit...'}
              {withdraw.isWithdrawing && 'Processing withdrawal...'}
              {!deposit.isApproving && !deposit.isDepositing && !withdraw.isWithdrawing && 'Processing...'}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isProcessing || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > parseFloat(maxAmount)}
          className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            isDeposit
              ? 'neu-btn text-accent-green hover:bg-accent-green/20'
              : 'neu-btn text-primary hover:bg-primary/20'
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isDeposit ? (
            <ArrowDownToLine className="w-5 h-5" />
          ) : (
            <ArrowUpFromLine className="w-5 h-5" />
          )}
          <span>{isDeposit ? 'Deposit' : 'Withdraw'}</span>
        </button>

        {/* Proxy Address Info */}
        {proxyAddress && (
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Trading Wallet: {proxyAddress.slice(0, 6)}...{proxyAddress.slice(-4)}
            </p>
          </div>
        )}
      </form>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md neu-out rounded-3xl p-6 bg-[#121721]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-xl neu-in flex items-center justify-center ${
              isDeposit ? 'text-accent-green' : 'text-primary'
            }`}>
              {isDeposit ? (
                <ArrowDownToLine className="w-5 h-5" />
              ) : (
                <ArrowUpFromLine className="w-5 h-5" />
              )}
            </div>
            <h2 className="text-xl font-bold text-white">
              {isDeposit ? 'Deposit USDC' : 'Withdraw USDC'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="neu-btn size-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {renderContent()}
      </div>
    </div>
  );
}
