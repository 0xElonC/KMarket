import { useState, useEffect, useCallback } from 'react';

// 结算历史记录类型
export interface SettlementRecord {
  id: string;
  symbol: string;
  entryPrice: string;      // 下注时的价格
  settlementPrice: string; // 结算时的价格
  rangeLabel: string;      // 价格区间标签
  betType: 'high' | 'low'; // 买升/买跌
  odds: number;
  betAmount: number;
  payout: number;          // 盈亏金额
  result: 'win' | 'loss';
  timestamp: number;       // 结算时间戳
}

const STORAGE_KEY = 'kmarket_settlement_history';
const MAX_HISTORY_ITEMS = 50; // 最多保存50条记录

export function useSettlementHistory() {
  const [history, setHistory] = useState<SettlementRecord[]>([]);

  // 从 localStorage 加载历史记录
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SettlementRecord[];
        setHistory(parsed);
      }
    } catch (error) {
      console.error('Failed to load settlement history:', error);
    }
  }, []);

  // 保存到 localStorage
  const saveToStorage = useCallback((records: SettlementRecord[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (error) {
      console.error('Failed to save settlement history:', error);
    }
  }, []);

  // 添加新的结算记录
  const addSettlement = useCallback((record: Omit<SettlementRecord, 'id' | 'timestamp'>) => {
    const newRecord: SettlementRecord = {
      ...record,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    setHistory(prev => {
      // 新记录放在最前面，限制最大数量
      const updated = [newRecord, ...prev].slice(0, MAX_HISTORY_ITEMS);
      saveToStorage(updated);
      return updated;
    });

    return newRecord;
  }, [saveToStorage]);

  // 清空历史记录
  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // 转换为 HistoryPanel 需要的格式
  const historyItems = history.map(record => ({
    id: record.id,
    symbol: record.symbol,
    entry: record.entryPrice,
    rangeKey: record.rangeLabel,
    odds: `${record.odds.toFixed(1)}x`,
    payout: record.result === 'win'
      ? `+ $${record.payout.toFixed(0)}`
      : `- $${Math.abs(record.payout).toFixed(0)}`,
    tone: record.result as 'win' | 'loss',
  }));

  return {
    history,
    historyItems,
    addSettlement,
    clearHistory,
  };
}
