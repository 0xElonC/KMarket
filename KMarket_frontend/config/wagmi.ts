import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygon, polygonAmoy, type Chain } from 'wagmi/chains';

// Define localhost/hardhat chain
export const localhost: Chain = {
  id: 31337,
  name: 'Localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
  },
  blockExplorers: {
    default: { name: 'Local', url: '' },
  },
  testnet: true,
};

export const config = getDefaultConfig({
  appName: 'KMarket Pro',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo',
  chains: [polygon, ...(import.meta.env.DEV ? [polygonAmoy, localhost] : [])],
  ssr: false,
});

// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  // Polygon Mainnet
  [polygon.id]: {
    usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as `0x${string}`,
    vault: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    tradingEngine: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    proxyWalletFactory: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  },
  // Localhost/Hardhat
  [localhost.id]: {
    usdc: '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318' as `0x${string}`,
    vault: '0x610178dA211FEF7D417bC0e6FeD39F05609AD788' as `0x${string}`,
    tradingEngine: '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e' as `0x${string}`,
    proxyWalletFactory: '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0' as `0x${string}`,
  },
} as const;

// Helper to get contract addresses for current chain
export function getContractAddresses(chainId: number | undefined) {
  if (chainId && chainId in CONTRACT_ADDRESSES) {
    return CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  }
  // Default to localhost for development
  return CONTRACT_ADDRESSES[localhost.id];
}
