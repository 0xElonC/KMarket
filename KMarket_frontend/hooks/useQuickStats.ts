import { useState, useEffect, useCallback } from 'react';

interface HistorySummary {
    totalBets: number;
    wins: number;
    losses: number;
    totalWagered: string;
    totalPayout: string;
    netProfit: string;
}

interface QuickStatsResult {
    activeBets: number;
    winRate: number;
    totalBets: number;
    wins: number;
    losses: number;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

/**
 * 获取快捷统计数据的 Hook
 */
export function useQuickStats(): QuickStatsResult {
    const [activeBets, setActiveBets] = useState(0);
    const [summary, setSummary] = useState<HistorySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        try {
            const token = localStorage.getItem('kmarket_token');
            if (!token) {
                setError('未登录');
                setLoading(false);
                return;
            }

            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            };

            // 并行获取持仓和历史
            const [positionsRes, historyRes] = await Promise.all([
                fetch('http://localhost:3000/api/trade/positions', { headers }),
                fetch('http://localhost:3000/api/trade/history?page=1&limit=1', { headers }),
            ]);

            if (!positionsRes.ok || !historyRes.ok) {
                throw new Error('获取数据失败');
            }

            const positionsData = await positionsRes.json();
            const historyData = await historyRes.json();

            if (positionsData.success) {
                setActiveBets(positionsData.data.items.length);
            }

            if (historyData.success && historyData.data.summary) {
                setSummary(historyData.data.summary);
            }

            setError(null);
        } catch (err) {
            console.error('Failed to fetch quick stats:', err);
            setError(err instanceof Error ? err.message : '获取数据失败');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // 计算胜率
    const totalSettled = (summary?.wins || 0) + (summary?.losses || 0);
    const winRate = totalSettled > 0 ? Math.round((summary?.wins || 0) / totalSettled * 100) : 0;

    return {
        activeBets,
        winRate,
        totalBets: summary?.totalBets || 0,
        wins: summary?.wins || 0,
        losses: summary?.losses || 0,
        loading,
        error,
        refresh: fetchStats,
    };
}
