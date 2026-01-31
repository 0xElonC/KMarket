import { BetCellStatus, BetType } from '../types';

// 根据 betType 获取单元格样式
export const getCellStyle = (status: BetCellStatus | string, betType: BetType, isLocked: boolean): string => {
  if (status === 'win' || status === 'fail') {
    return 'bet-cell-base';
  }
  if (status === 'selected') {
    if (betType === 'high') {
      return isLocked ? 'bet-cell-base bet-cell-selected-high-deep' : 'bet-cell-base bet-cell-selected-high';
    }
    return isLocked ? 'bet-cell-base bet-cell-selected-low-deep' : 'bet-cell-base bet-cell-selected-low';
  }
  if (status === 'dissolved') {
    return 'bet-cell-base bet-cell-dissolved';
  }
  return 'bet-cell-base';
};

// 根据 betType 获取标签颜色
export const getLabelColor = (status: BetCellStatus | string, betType: BetType, isLockedDefault: boolean): string => {
  if (isLockedDefault || status === 'win' || status === 'fail') {
    return 'text-gray-500';
  }
  if (status === 'default') {
    return betType === 'high'
      ? 'text-emerald-600 group-hover:text-emerald-400'
      : 'text-red-600 group-hover:text-red-400';
  }
  if (status === 'selected') {
    return betType === 'high' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold';
  }
  return 'text-gray-600';
};

// 根据 betType 获取赔率颜色
export const getOddsColor = (status: BetCellStatus | string, betType: BetType, isLockedDefault: boolean): string => {
  if (isLockedDefault || status === 'win' || status === 'fail') {
    return 'text-gray-500';
  }
  if (status === 'default') {
    return betType === 'high'
      ? 'text-emerald-500/70 text-glow-hover'
      : 'text-red-500/70 text-glow-hover';
  }
  if (status === 'selected') {
    return 'text-white font-bold drop-shadow-md';
  }
  return 'text-gray-500';
};
