import { useState, useEffect } from 'react';

// 钱包数据接口
export interface WalletData {
    // 基础余额
    available: string;      // 可用余额
    claimable: string;      // 待领取余额
    inBets: string;         // 在押资金
    total: string;          // 总资产

    // LP 合约数据
    vaultBalance: string;        // Vault 合约余额
    pendingDeposit: string;      // 待确认充值
    pendingWithdraw: string;     // 待确认提现

    // 统计数据
    totalDeposited: string;      // 累计充值
    totalWithdrawn: string;      // 累计提现
    netProfit: string;           // 净收益
    profitPercentage: number;    // 收益率

    // 链上数据
    chainId: number;
    blockNumber: number;
    lastSyncTime: Date;
}

/**
 * 生成 Mock 钱包数据
 */
function generateMockWalletData(): WalletData {
    return {
        // 基础余额 (Wei 格式) - 调整为几百的数量级
        available: '500000000000000000000',        // 500 USDT
        claimable: '150000000000000000000',        // 150 USDT
        inBets: '225450000000000000000',           // 225.45 USDT
        total: '875450000000000000000',            // 875.45 USDT

        // LP 合约数据
        vaultBalance: '650000000000000000000',     // 650 USDT
        pendingDeposit: '25000000000000000000',    // 25 USDT
        pendingWithdraw: '0',                      // 0 USDT

        // 统计数据
        totalDeposited: '2000000000000000000000',  // 2,000 USDT
        totalWithdrawn: '1500000000000000000000',  // 1,500 USDT
        netProfit: '75450000000000000000',         // +75.45 USDT (调整为几十)
        profitPercentage: 15.09,                   // +15.09%

        // 链上数据
        chainId: 1,
        blockNumber: 12345678,
        lastSyncTime: new Date(),
    };
}

/**
 * 钱包数据 Hook
 */
export function useWalletData() {
    const [walletData, setWalletData] = useState<WalletData | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 获取钱包数据
    const fetchWalletData = async () => {
        try {
            setError(null);

            // TODO: 替换为真实 API 调用
            // const response = await fetch('/api/users/balance', {
            //   headers: { Authorization: `Bearer ${token}` }
            // });

            // 模拟网络延迟
            await new Promise(resolve => setTimeout(resolve, 800));

            // 使用 Mock 数据
            const mockData = generateMockWalletData();
            setWalletData(mockData);
        } catch (err) {
            console.error('Failed to fetch wallet data:', err);
            setError(err instanceof Error ? err.message : '获取钱包数据失败');
        } finally {
            setLoading(false);
            setSyncing(false);
        }
    };

    // 手动刷新
    const refresh = async () => {
        setSyncing(true);
        await fetchWalletData();
    };

    // 初始加载
    useEffect(() => {
        fetchWalletData();
    }, []);

    // 自动刷新 (每 30 秒)
    useEffect(() => {
        const interval = setInterval(() => {
            if (!syncing) {
                fetchWalletData();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [syncing]);

    return {
        walletData,
        loading,
        syncing,
        error,
        refresh,
    };
}
