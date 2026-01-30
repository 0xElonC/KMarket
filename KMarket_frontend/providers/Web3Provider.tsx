import React from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme, type Locale } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { config } from '../config/wagmi';
import { useLanguage } from '../contexts/LanguageContext';

const queryClient = new QueryClient();

const customTheme = darkTheme({
  accentColor: '#3b82f6',
  accentColorForeground: 'white',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small',
});

// Override specific theme properties to match neumorphic design
customTheme.colors.modalBackground = '#121721';
customTheme.colors.modalBorder = 'rgba(255, 255, 255, 0.05)';
customTheme.colors.profileForeground = '#121721';
customTheme.colors.connectButtonBackground = '#121721';
customTheme.colors.connectButtonInnerBackground = 'linear-gradient(145deg, #202c3f, #1b2535)';
customTheme.shadows.connectButton = '5px 5px 10px #151d29, -5px -5px 10px #27354d';

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();

  // Map language to RainbowKit locale
  const locale: Locale = language === 'CN' ? 'zh-CN' : 'en-US';

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={customTheme} locale={locale}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
