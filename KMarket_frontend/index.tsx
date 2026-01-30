import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './contexts/LanguageContext';
import { Web3Provider } from './providers/Web3Provider';
import { WalletProvider } from './contexts/WalletContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <LanguageProvider>
      <Web3Provider>
        <WalletProvider>
          <App />
        </WalletProvider>
      </Web3Provider>
    </LanguageProvider>
  </React.StrictMode>
);