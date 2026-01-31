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
    usdc: '0x68B1D87F95878fE05B998F19b66F4baba5De1aed' as `0x${string}`,
    vault: '0x3Aa5ebB10DC797CAC828524e59A333d0A371443c' as `0x${string}`,
    tradingEngine: '0xc6e7DF5E7b4f2A278906862b61205850344D4e7d' as `0x${string}`,
    proxyWalletFactory: '0x59b670e9fA9D0A427751Af201D676719a970857b' as `0x${string}`,
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
