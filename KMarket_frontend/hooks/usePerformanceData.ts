import { useState, useEffect } from 'react';

// 性能数据点接口
export interface PerformanceDataPoint {
    date: string;          // 日期标签
    profit: number;        // 累计收益
    profitChange: number;  // 当日变化
}

// 性能统计接口
export interface PerformanceStats {
    totalProfit: number;           // 总收益
    profitPercentage: number;      // 收益率
    chartData: PerformanceDataPoint[]; // 图表数据
    period: 'week' | 'month';      // 时间周期
}

/**
 * 生成 Mock 性能数据
 */
function generateMockPerformanceData(period: 'week' | 'month'): PerformanceStats {
    if (period === 'week') {
        return {
            totalProfit: 75.45,
            profitPercentage: 15.09,
            period: 'week',
            chartData: [
                { date: '周一', profit: 25.00, profitChange: 25.00 },
                { date: '周二', profit: 45.50, profitChange: 20.50 },
                { date: '周三', profit: 38.20, profitChange: -7.30 },
                { date: '周四', profit: 62.80, profitChange: 24.60 },
                { date: '周五', profit: 55.30, profitChange: -7.50 },
                { date: '周六', profit: 68.90, profitChange: 13.60 },
                { date: '周日', profit: 75.45, profitChange: 6.55 },
            ],
        };
    } else {
        // 本月数据 (30天)
        const monthData: PerformanceDataPoint[] = [];
        let cumulativeProfit = 0;

        for (let i = 1; i <= 30; i++) {
            const change = (Math.random() - 0.4) * 20; // -8 到 +12 的随机变化
            cumulativeProfit += change;
            monthData.push({
                date: `${i}日`,
                profit: parseFloat(cumulativeProfit.toFixed(2)),
                profitChange: parseFloat(change.toFixed(2)),
            });
        }

        return {
            totalProfit: parseFloat(cumulativeProfit.toFixed(2)),
            profitPercentage: parseFloat(((cumulativeProfit / 500) * 100).toFixed(2)),
            period: 'month',
            chartData: monthData,
        };
    }
}

/**
 * 性能数据 Hook
 */
export function usePerformanceData(initialPeriod: 'week' | 'month' = 'week') {
    const [period, setPeriod] = useState<'week' | 'month'>(initialPeriod);
    const [performanceData, setPerformanceData] = useState<PerformanceStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            // TODO: 替换为真实 API 调用
            // const response = await fetch(`/api/performance?period=${period}`);

            // 模拟网络延迟
            await new Promise(resolve => setTimeout(resolve, 500));

            const mockData = generateMockPerformanceData(period);
            setPerformanceData(mockData);
            setLoading(false);
        };

        fetchData();
    }, [period]);

    return {
        performanceData,
        loading,
        period,
        setPeriod,
    };
}
