import React, { createContext, useContext, useMemo, useEffect, useState, useCallback } from 'react';
import { useAccount, useBalance, useSwitchChain, useSignMessage } from 'wagmi';
import { polygon } from 'wagmi/chains';
import { getContractAddresses, localhost } from '../config/wagmi';
import { authApi, getStoredToken, setStoredToken, removeStoredToken, LoginResponse } from '../config/api';

interface ContractAddresses {
  usdc: `0x${string}`;
  vault: `0x${string}`;
  tradingEngine: `0x${string}`;
  proxyWalletFactory: `0x${string}`;
}

interface WalletContextValue {
  // Wallet state
  isConnected: boolean;
  address: `0x${string}` | undefined;
  shortAddress: string;
  chainId: number | undefined;
  isCorrectChain: boolean;
  isSupportedChain: boolean;
  switchToPolygon: () => void;
  switchToLocalhost: () => void;
  usdcBalance: string;
  nativeBalance: string;
  isLoadingBalances: boolean;
  contractAddresses: ContractAddresses;
  refetchBalances: () => void;
  
  // Auth state
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  authUser: LoginResponse['user'] | null;
  authError: string | null;
  login: () => Promise<void>;
  logout: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

// Supported chain IDs
const SUPPORTED_CHAINS = [polygon.id, localhost.id];

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authUser, setAuthUser] = useState<LoginResponse['user'] | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Get contract addresses for current chain
  const contractAddresses = useMemo(() => {
    return getContractAddresses(chainId);
  }, [chainId]);

  const { data: nativeData, isLoading: isLoadingNative, refetch: refetchNative } = useBalance({
    address,
  });

  const { data: usdcData, isLoading: isLoadingUsdc, refetch: refetchUsdc } = useBalance({
    address,
    token: contractAddresses.usdc,
  });

  const refetchBalances = useCallback(() => {
    refetchNative();
    refetchUsdc();
  }, [refetchNative, refetchUsdc]);

  const shortAddress = useMemo(() => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  const isCorrectChain = chainId === polygon.id;
  const isSupportedChain = chainId !== undefined && SUPPORTED_CHAINS.includes(chainId);

  const switchToPolygon = () => {
    switchChain?.({ chainId: polygon.id });
  };

  const switchToLocalhost = () => {
    switchChain?.({ chainId: localhost.id });
  };

  const usdcBalance = useMemo(() => {
    if (!usdcData) return '0.00';
    return parseFloat(usdcData.formatted).toFixed(2);
  }, [usdcData]);

  const nativeBalance = useMemo(() => {
    if (!nativeData) return '0.00';
    return parseFloat(nativeData.formatted).toFixed(4);
  }, [nativeData]);

  // Check if already authenticated on mount or when wallet connects
  useEffect(() => {
    const token = getStoredToken();
    if (token && isConnected) {
      setIsAuthenticated(true);
    } else if (!isConnected) {
      // Wallet disconnected, clear auth
      setIsAuthenticated(false);
      setAuthUser(null);
      setAuthError(null);
      removeStoredToken();
    }
  }, [isConnected]);

  // Listen for logout events (e.g., from API interceptor on 401)
  useEffect(() => {
    const handleLogout = () => {
      setIsAuthenticated(false);
      setAuthUser(null);
      setAuthError(null);
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  // Login function
  const login = useCallback(async () => {
    if (!address || !isConnected) {
      setAuthError('Please connect your wallet first');
      return;
    }

    setIsAuthLoading(true);
    setAuthError(null);

    try {
      // Step 1: Get nonce from backend
      const nonceResponse = await authApi.getNonce();
      if (!nonceResponse.success) {
        throw new Error('Failed to get nonce');
      }
      const { nonce } = nonceResponse.data;

      // Step 2: Sign the message
      const message = `Sign this message to login to KMarket:\nNonce: ${nonce}`;
      const signature = await signMessageAsync({ message });

      // Step 3: Login with signature
      const loginResponse = await authApi.login(address, signature, nonce);
      if (!loginResponse.success) {
        throw new Error(loginResponse.message || 'Login failed');
      }

      // Step 4: Store token and update state
      setStoredToken(loginResponse.data.accessToken);
      setIsAuthenticated(true);
      setAuthUser(loginResponse.data.user);
      setAuthError(null);

      console.log('Login successful:', loginResponse.data.user);
    } catch (err) {
      console.error('Login failed:', err);
      setIsAuthenticated(false);
      setAuthUser(null);
      setAuthError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsAuthLoading(false);
    }
  }, [address, isConnected, signMessageAsync]);

  // Logout function
  const logout = useCallback(() => {
    removeStoredToken();
    setIsAuthenticated(false);
    setAuthUser(null);
    setAuthError(null);
  }, []);

  const value: WalletContextValue = {
    isConnected,
    address,
    shortAddress,
    chainId,
    isCorrectChain,
    isSupportedChain,
    switchToPolygon,
    switchToLocalhost,
    usdcBalance,
    nativeBalance,
    isLoadingBalances: isLoadingNative || isLoadingUsdc,
    contractAddresses,
    refetchBalances,
    // Auth
    isAuthenticated,
    isAuthLoading,
    authUser,
    authError,
    login,
    logout,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
