import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygon, polygonAmoy } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'KMarket Pro',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo',
  chains: [polygon, ...(import.meta.env.DEV ? [polygonAmoy] : [])],
  ssr: false,
});

export const CONTRACT_ADDRESSES = {
  usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as `0x${string}`,
} as const;
