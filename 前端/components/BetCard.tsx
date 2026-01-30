import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface BetCardProps {
  title: string;
  sub: string;
  selection: string;
  stake: number;
  payout: number;
  status: 'LIVE' | 'WON' | 'LOST' | 'HELD';
  icon: string | React.ReactNode;
  color: string;
  isCrypto?: boolean;
}

const BetStat = ({ label, value, color = "text-gray-300" }: { label: string, value: string, color?: string }) => (
    <div className="flex flex-col">
        <span className="text-[10px] font-bold text-gray-500 uppercase truncate block mb-1">{label}</span>
        <span className={`font-bold ${color} truncate block`}>{value}</span>
    </div>
);

export const BetCard = ({ title, sub, selection, stake, payout, status, icon, color, isCrypto }: BetCardProps) => {
    const { t } = useLanguage();
    
    return (
        <div className={`neu-out p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 border-l-4 ${color} hover:bg-white/5 transition-colors cursor-pointer animate-in slide-in-from-bottom-2 duration-300`}>
            {/* Left Side: Icon & Titles */}
            <div className="flex items-center gap-4 w-full md:w-auto flex-1 min-w-0">
                <div className="size-12 rounded-xl neu-in flex items-center justify-center text-xl bg-[#1a2433] text-gray-400 shrink-0">{icon}</div>
                <div className="min-w-0 overflow-hidden">
                    <h3 className="font-bold text-gray-200 text-lg truncate">{title}</h3>
                    <span className="text-xs font-medium text-gray-500 truncate block">{sub}</span>
                </div>
            </div>

            {/* Right Side: Stats Grid - Fixed Width Columns for alignment */}
            <div className="flex items-center gap-2 md:gap-6 w-full md:w-auto justify-between md:justify-end shrink-0 overflow-x-auto no-scrollbar">
                
                {/* Column 1: Selection/Type */}
                <div className="w-32 shrink-0">
                    <BetStat label={isCrypto ? t.dashboard.type : t.dashboard.selection} value={selection} />
                </div>

                {/* Column 2: Stake/Amount */}
                <div className="w-28 shrink-0">
                    <BetStat label={isCrypto ? t.dashboard.amount : t.dashboard.stake} value={isCrypto ? `${stake} BTC` : `$${stake}`} />
                </div>

                {/* Column 3: Return/Value */}
                <div className="w-24 shrink-0">
                    <BetStat label={isCrypto ? t.dashboard.value : t.dashboard.return} value={`$${payout}`} color="text-primary" />
                </div>

                {/* Status Badge: Fixed Width and Centered */}
                <div className={`hidden sm:flex items-center justify-center w-20 h-8 px-2 neu-in rounded-full text-xs font-bold border border-white/5 shrink-0 ${status === 'WON' ? 'text-success bg-success/10' : status === 'LOST' ? 'text-danger bg-danger/10' : status === 'LIVE' ? 'text-accent bg-accent/10' : 'text-primary bg-primary/10'}`}>
                    {status}
                </div>
            </div>
        </div>
    );
};
