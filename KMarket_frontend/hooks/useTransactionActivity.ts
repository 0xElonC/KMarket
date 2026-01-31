import { useState, useEffect } from 'react';
import { ActivityItem, PositionDto, BetResponseDto, mapPositionToActivity, mapHistoryToActivity } from '../utils/activityUtils';

interface PositionsResponse {
    success: boolean;
    data: {
        items: PositionDto[];
        totalInBets: string;
    };
}

interface HistoryResponse {
    success: boolean;
    data: {
        items: BetResponseDto[];
        total: number;
        page: number;
        limit: number;
    };
}

interface UseTransactionActivityResult {
    activities: ActivityItem[];
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

/**
 * 获取交易动态数据的 Hook
 * 合并持仓和历史数据
 */
export function useTransactionActivity(
    historyLimit: number = 10,
    refreshInterval: number = 3000
): UseTransactionActivityResult {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchActivities = async () => {
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
                fetch(`http://localhost:3000/api/trade/history?page=1&limit=${historyLimit}`, { headers }),
            ]);

            if (!positionsRes.ok || !historyRes.ok) {
                throw new Error('获取数据失败');
            }

            const positionsData: PositionsResponse = await positionsRes.json();
            const historyData: HistoryResponse = await historyRes.json();

            if (!positionsData.success || !historyData.success) {
                throw new Error('API 返回错误');
            }

            // 转换数据
            const positionActivities = positionsData.data.items.map(mapPositionToActivity);
            const historyActivities = historyData.data.items.map(mapHistoryToActivity);

            // 合并并按时间排序 (最新的在前)
            const combined = [...positionActivities, ...historyActivities];
            combined.sort((a, b) => b.timestamp - a.timestamp);

            setActivities(combined);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch activities:', err);
            setError(err instanceof Error ? err.message : '获取数据失败');
        } finally {
            setLoading(false);
        }
    };

    // 初始加载
    useEffect(() => {
        fetchActivities();
    }, []);

    // 定时刷新
    useEffect(() => {
        if (refreshInterval <= 0) return;

        const interval = setInterval(fetchActivities, refreshInterval);
        return () => clearInterval(interval);
    }, [refreshInterval, historyLimit]);

    return {
        activities,
        loading,
        error,
        refresh: fetchActivities,
    };
}
