import React, { createContext, useContext, useMemo } from 'react';
import { useAccount, useBalance, useSwitchChain } from 'wagmi';
import { polygon } from 'wagmi/chains';
import { CONTRACT_ADDRESSES } from '../config/wagmi';

interface WalletContextValue {
  isConnected: boolean;
  address: `0x${string}` | undefined;
  shortAddress: string;
  chainId: number | undefined;
  isCorrectChain: boolean;
  switchToPolygon: () => void;
  usdcBalance: string;
  maticBalance: string;
  isLoadingBalances: boolean;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  const { data: maticData, isLoading: isLoadingMatic } = useBalance({
    address,
  });

  const { data: usdcData, isLoading: isLoadingUsdc } = useBalance({
    address,
    token: CONTRACT_ADDRESSES.usdc,
  });

  const shortAddress = useMemo(() => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  const isCorrectChain = chainId === polygon.id;

  const switchToPolygon = () => {
    switchChain?.({ chainId: polygon.id });
  };

  const usdcBalance = useMemo(() => {
    if (!usdcData) return '0.00';
    return parseFloat(usdcData.formatted).toFixed(2);
  }, [usdcData]);

  const maticBalance = useMemo(() => {
    if (!maticData) return '0.00';
    return parseFloat(maticData.formatted).toFixed(4);
  }, [maticData]);

  const value: WalletContextValue = {
    isConnected,
    address,
    shortAddress,
    chainId,
    isCorrectChain,
    switchToPolygon,
    usdcBalance,
    maticBalance,
    isLoadingBalances: isLoadingMatic || isLoadingUsdc,
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
