import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useWalletData } from '../../hooks/useWalletData';
import { ethers } from 'ethers';

/**
 * 我的钱包组件 - 显示 LP 合约存款数据
 */
export function WalletCard() {
    const { t } = useLanguage();
    const { walletData, loading, syncing, error, refresh } = useWalletData();

    if (loading) {
        return <WalletSkeleton />;
    }

    if (error || !walletData) {
        return (
            <div className="neu-out p-6 rounded-3xl">
                <p className="text-red-500 dark:text-red-400 text-center">{error || '加载失败'}</p>
            </div>
        );
    }

    // 格式化金额
    const formatAmount = (wei: string) => {
        try {
            const ether = ethers.formatEther(wei);
            const num = parseFloat(ether);
            return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } catch {
            return '0.00';
        }
    };

    const total = formatAmount(walletData.total);
    const vaultBalance = formatAmount(walletData.vaultBalance);
    const pendingDeposit = formatAmount(walletData.pendingDeposit);
    const netProfit = formatAmount(walletData.netProfit);
    const totalDeposited = formatAmount(walletData.totalDeposited);
    const totalWithdrawn = formatAmount(walletData.totalWithdrawn);

    return (
        <div className="neu-out p-6 rounded-3xl flex flex-col gap-6">
            {/* 标题栏 */}
            <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg text-gray-700 dark:text-white">{t.dashboard.myWallet}</h2>
                <button
                    className={`neu-btn size-8 rounded-full flex items-center justify-center text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white ${syncing ? 'animate-spin' : ''
                        }`}
                    type="button"
                    onClick={refresh}
                    disabled={syncing}
                >
                    <span className="material-symbols-outlined text-sm">refresh</span>
                </button>
            </div>

            {/* 链上数据 */}
            <div className="neu-in p-5 rounded-xl bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200/50 dark:border-purple-500/20">
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">link</span>
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">链上数据</span>
                </div>
                <div className="space-y-3">
                    {/* Vault 余额 */}
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Vault 余额</span>
                        <span className="text-lg font-bold text-gray-800 dark:text-white font-mono">${vaultBalance}</span>
                    </div>

                    {/* 待确认充值 */}
                    {parseFloat(pendingDeposit) > 0 && (
                        <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">pending</span>
                                待确认充值
                            </span>
                            <span className="text-sm font-bold text-orange-500 font-mono">${pendingDeposit}</span>
                        </div>
                    )}

                    {/* 累计充值 */}
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 dark:text-gray-500">累计充值</span>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 font-mono">${totalDeposited}</span>
                    </div>

                    {/* 累计提现 */}
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 dark:text-gray-500">累计提现</span>
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 font-mono">${totalWithdrawn}</span>
                    </div>

                    {/* 净收益 */}
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">净收益</span>
                        <span className="text-lg font-bold text-accent-green font-mono">+${netProfit}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * 加载骨架屏
 */
function WalletSkeleton() {
    return (
        <div className="neu-out p-6 rounded-3xl flex flex-col gap-6 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                <div className="size-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            </div>
            <div className="neu-in p-6 rounded-2xl">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-3"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
            </div>
            <div className="neu-in p-5 rounded-xl">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-4"></div>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex justify-between">
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
