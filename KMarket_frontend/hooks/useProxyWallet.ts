import { useState, useCallback, useEffect, useRef } from 'react';
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useWallet } from '../contexts/WalletContext';
import {
  ERC20_ABI,
  PROXY_WALLET_FACTORY_ABI,
  USER_PROXY_WALLET_ABI,
} from '../config/abis';

// USDC has 6 decimals
const USDC_DECIMALS = 6;

export interface ProxyWalletState {
  hasProxy: boolean;
  proxyAddress: `0x${string}` | undefined;
  depositBalance: string;
  isLoading: boolean;
  isCreatingProxy: boolean;
  error: string | null;
}

export interface DepositState {
  isApproving: boolean;
  isDepositing: boolean;
  isCreatingProxy: boolean;
  isPending: boolean;
  isSuccess: boolean;
  error: string | null;
}

export interface WithdrawState {
  isWithdrawing: boolean;
  isPending: boolean;
  isSuccess: boolean;
  error: string | null;
}

/**
 * Hook to manage user's proxy wallet
 * Automatically creates proxy wallet when user connects if they don't have one
 */
export function useProxyWallet(autoCreate: boolean = true): ProxyWalletState & {
  createProxy: () => Promise<void>;
  refetch: () => void;
} {
  const { address, isConnected } = useAccount();
  const { contractAddresses, isSupportedChain } = useWallet();
  const [error, setError] = useState<string | null>(null);
  const [isCreatingProxy, setIsCreatingProxy] = useState(false);
  const autoCreateAttempted = useRef(false);

  // Check if user has a proxy wallet
  const {
    data: hasProxy,
    isLoading: isLoadingHasProxy,
    refetch: refetchHasProxy,
  } = useReadContract({
    address: contractAddresses.proxyWalletFactory,
    abi: PROXY_WALLET_FACTORY_ABI,
    functionName: 'hasProxy',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isSupportedChain,
    },
  });

  // Get proxy wallet address
  const {
    data: proxyAddress,
    isLoading: isLoadingProxy,
    refetch: refetchProxy,
  } = useReadContract({
    address: contractAddresses.proxyWalletFactory,
    abi: PROXY_WALLET_FACTORY_ABI,
    functionName: 'getProxyWallet',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && hasProxy === true && isSupportedChain,
    },
  });

  // Get deposit balance from proxy wallet
  const {
    data: depositBalanceRaw,
    isLoading: isLoadingBalance,
    refetch: refetchBalance,
  } = useReadContract({
    address: proxyAddress as `0x${string}`,
    abi: USER_PROXY_WALLET_ABI,
    functionName: 'depositBalance',
    query: {
      enabled: !!proxyAddress && proxyAddress !== '0x0000000000000000000000000000000000000000' && isSupportedChain,
    },
  });

  // Log balance data
  useEffect(() => {
    console.log('💰 useProxyWallet Balance:', {
      proxyAddress,
      depositBalanceRaw: depositBalanceRaw?.toString(),
      hasProxy,
      isLoadingBalance
    });
  }, [proxyAddress, depositBalanceRaw, hasProxy, isLoadingBalance]);

  // Create proxy wallet
  const { writeContractAsync } = useWriteContract();

  const createProxy = useCallback(async () => {
    if (!address) {
      setError('Please connect your wallet');
      return;
    }

    if (!isSupportedChain) {
      setError('Please switch to a supported network');
      return;
    }

    try {
      setError(null);
      setIsCreatingProxy(true);
      await writeContractAsync({
        address: contractAddresses.proxyWalletFactory,
        abi: PROXY_WALLET_FACTORY_ABI,
        functionName: 'createProxyWallet',
        args: [address],
      });
      // Refetch after creation
      setTimeout(() => {
        refetchHasProxy();
        refetchProxy();
      }, 2000);
    } catch (err) {
      console.error('Failed to create proxy wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to create proxy wallet');
    } finally {
      setIsCreatingProxy(false);
    }
  }, [address, isSupportedChain, contractAddresses.proxyWalletFactory, writeContractAsync, refetchHasProxy, refetchProxy]);

  // Auto-create proxy wallet when user connects
  useEffect(() => {
    if (
      autoCreate &&
      isConnected &&
      address &&
      isSupportedChain &&
      hasProxy === false &&
      !isLoadingHasProxy &&
      !isCreatingProxy &&
      !autoCreateAttempted.current
    ) {
      autoCreateAttempted.current = true;
      console.log('Auto-creating proxy wallet for user:', address);
      createProxy();
    }
  }, [autoCreate, isConnected, address, isSupportedChain, hasProxy, isLoadingHasProxy, isCreatingProxy, createProxy]);

  // Reset auto-create flag when address changes
  useEffect(() => {
    autoCreateAttempted.current = false;
  }, [address]);

  const refetch = useCallback(() => {
    refetchHasProxy();
    refetchProxy();
    refetchBalance();
  }, [refetchHasProxy, refetchProxy, refetchBalance]);

  const depositBalance = depositBalanceRaw
    ? formatUnits(depositBalanceRaw as bigint, USDC_DECIMALS)
    : '0';

  return {
    hasProxy: hasProxy === true,
    proxyAddress: proxyAddress as `0x${string}` | undefined,
    depositBalance,
    isLoading: isLoadingHasProxy || isLoadingProxy || isLoadingBalance,
    isCreatingProxy,
    error,
    createProxy,
    refetch,
  };
}

/**
 * Hook to handle USDC deposits
 */
export function useDeposit() {
  const { address } = useAccount();
  const { contractAddresses, isSupportedChain, refetchBalances } = useWallet();
  const { proxyAddress, hasProxy, isCreatingProxy, refetch: refetchProxy } = useProxyWallet(false); // Don't auto-create here
  
  const [state, setState] = useState<DepositState>({
    isApproving: false,
    isDepositing: false,
    isCreatingProxy: false,
    isPending: false,
    isSuccess: false,
    error: null,
  });

  // Check current allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: contractAddresses.usdc,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && proxyAddress ? [address, proxyAddress] : undefined,
    query: {
      enabled: !!address && !!proxyAddress && isSupportedChain,
    },
  });

  const { writeContractAsync } = useWriteContract();

  const deposit = useCallback(
    async (amount: string) => {
      if (!address || !proxyAddress) {
        setState((s) => ({ ...s, error: 'Wallet not connected or proxy not created' }));
        return;
      }

      if (!isSupportedChain) {
        setState((s) => ({ ...s, error: 'Please switch to a supported network' }));
        return;
      }

      const amountInWei = parseUnits(amount, USDC_DECIMALS);

      try {
        setState({
          isApproving: false,
          isDepositing: false,
          isCreatingProxy: false,
          isPending: true,
          isSuccess: false,
          error: null,
        });

        // Check if we need to approve
        const currentAllowance = allowance as bigint | undefined;
        if (!currentAllowance || currentAllowance < amountInWei) {
          setState((s) => ({ ...s, isApproving: true }));
          
          // Approve the proxy wallet to spend USDC (approve max for convenience)
          const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
          await writeContractAsync({
            address: contractAddresses.usdc,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [proxyAddress, maxApproval],
          });

          // Wait a bit for the approval to be confirmed
          await new Promise((resolve) => setTimeout(resolve, 2000));
          refetchAllowance();
          
          setState((s) => ({ ...s, isApproving: false }));
        }

        // Now deposit
        setState((s) => ({ ...s, isDepositing: true }));
        
        await writeContractAsync({
          address: proxyAddress,
          abi: USER_PROXY_WALLET_ABI,
          functionName: 'deposit',
          args: [amountInWei],
        });

        setState({
          isApproving: false,
          isDepositing: false,
          isCreatingProxy: false,
          isPending: false,
          isSuccess: true,
          error: null,
        });

        // Refetch all balances
        setTimeout(() => {
          refetchProxy();
          refetchAllowance();
          refetchBalances(); // Also refresh wallet USDC balance
        }, 2000);
      } catch (err) {
        console.error('Deposit failed:', err);
        setState({
          isApproving: false,
          isDepositing: false,
          isCreatingProxy: false,
          isPending: false,
          isSuccess: false,
          error: err instanceof Error ? err.message : 'Deposit failed',
        });
      }
    },
    [address, proxyAddress, isSupportedChain, allowance, contractAddresses.usdc, writeContractAsync, refetchAllowance, refetchProxy]
  );

  const reset = useCallback(() => {
    setState({
      isApproving: false,
      isDepositing: false,
      isCreatingProxy: false,
      isPending: false,
      isSuccess: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    hasProxy,
    isCreatingProxy,
    deposit,
    reset,
  };
}

/**
 * Hook to handle USDC withdrawals
 */
export function useWithdraw() {
  const { address } = useAccount();
  const { refetchBalances } = useWallet();
  const { proxyAddress, depositBalance, refetch: refetchProxy } = useProxyWallet(false); // Don't auto-create here
  
  const [state, setState] = useState<WithdrawState>({
    isWithdrawing: false,
    isPending: false,
    isSuccess: false,
    error: null,
  });

  const { writeContractAsync } = useWriteContract();

  const withdraw = useCallback(
    async (amount: string) => {
      if (!address || !proxyAddress) {
        setState((s) => ({ ...s, error: 'Wallet not connected or proxy not created' }));
        return;
      }

      const amountInWei = parseUnits(amount, USDC_DECIMALS);
      const balanceInWei = parseUnits(depositBalance, USDC_DECIMALS);

      if (amountInWei > balanceInWei) {
        setState((s) => ({ ...s, error: 'Insufficient balance' }));
        return;
      }

      try {
        setState({
          isWithdrawing: true,
          isPending: true,
          isSuccess: false,
          error: null,
        });

        await writeContractAsync({
          address: proxyAddress,
          abi: USER_PROXY_WALLET_ABI,
          functionName: 'withdraw',
          args: [amountInWei],
        });

        setState({
          isWithdrawing: false,
          isPending: false,
          isSuccess: true,
          error: null,
        });

        // Refetch all balances
        setTimeout(() => {
          refetchProxy();
          refetchBalances(); // Also refresh wallet USDC balance
        }, 2000);
      } catch (err) {
        console.error('Withdraw failed:', err);
        setState({
          isWithdrawing: false,
          isPending: false,
          isSuccess: false,
          error: err instanceof Error ? err.message : 'Withdraw failed',
        });
      }
    },
    [address, proxyAddress, depositBalance, writeContractAsync, refetchProxy, refetchBalances]
  );

  const reset = useCallback(() => {
    setState({
      isWithdrawing: false,
      isPending: false,
      isSuccess: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    maxAmount: depositBalance,
    withdraw,
    reset,
  };
}
