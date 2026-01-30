import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { NeuButton } from './NeuButton';

const ModalRow = ({ label, value, valueColor = "text-gray-200", mono, bold }: any) => (
  <div className="flex justify-between items-center py-2">
    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
    <span className={`text-lg ${valueColor} ${mono ? 'font-digital' : ''} ${bold ? 'font-extrabold' : 'font-bold'}`}>
      {value}
    </span>
  </div>
);

export const ConfirmModal = ({ onClose }: { onClose: () => void }) => {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md neu-out bg-background rounded-[2rem] p-8 flex flex-col gap-6 relative shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-100">{t.terminal.confirmTrade}</h2>
          <div className="h-1 w-12 bg-gray-700 mx-auto rounded-full"></div>
        </div>
        
        <div className="neu-in rounded-2xl p-6 flex flex-col gap-0 border border-white/5">
          <ModalRow label={t.terminal.market} value="BTC / USD" />
          <div className="h-px w-full bg-gray-700/50 my-2"></div>
          <ModalRow 
            label={t.terminal.tick} 
            value={<div className="flex items-center gap-2 px-3 py-1 rounded-full neu-out bg-gray-800"><span className="text-success text-xs">▲</span> 48,234.50</div>} 
          />
          <div className="h-px w-full bg-gray-700/50 my-2"></div>
          <ModalRow label={t.terminal.amount} value="$500.00" mono />
          <div className="h-px w-full bg-gray-700/50 my-2"></div>
          <ModalRow label={t.terminal.payout} value="$925.00" valueColor="text-success" mono bold />
        </div>

        <div className="flex flex-col gap-4 mt-2">
          <NeuButton className="relative w-full py-4 rounded-xl font-bold text-primary text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform" onClick={onClose}>
            <span className="material-symbols-outlined">check_circle</span>
            {t.terminal.confirmTrade.toUpperCase()}
          </NeuButton>
          <button 
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold text-gray-500 hover:text-red-400 transition-colors"
          >
            {t.terminal.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};
