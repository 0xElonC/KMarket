import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BetCell } from '../../types';

// 根据 betType 获取单元格样式
const getCellStyle = (status: string, betType: 'high' | 'low', isLocked: boolean) => {
  // 结算后的格子使用普通样式（变灰处理由 shouldGray 控制）
  if (status === 'win' || status === 'fail') {
    return 'bet-cell-base';
  }
  if (status === 'selected') {
    if (betType === 'high') {
      return isLocked ? 'bet-cell-base bet-cell-selected-high-deep' : 'bet-cell-base bet-cell-selected-high';
    }
    return isLocked ? 'bet-cell-base bet-cell-selected-low-deep' : 'bet-cell-base bet-cell-selected-low';
  }
  return {
    default: 'bet-cell-base',
    dissolved: 'bet-cell-base bet-cell-dissolved'
  }[status] || 'bet-cell-base';
};

// 根据 betType 获取标签颜色
const getLabelColor = (status: string, betType: 'high' | 'low', isLockedDefault: boolean) => {
  // LOCK 后失效的下注块（未下注）或结算后都变灰
  if (isLockedDefault || status === 'win' || status === 'fail') {
    return 'text-gray-500';
  }
  if (status === 'default') {
    return betType === 'high' ? 'text-emerald-600 group-hover:text-emerald-400' : 'text-red-600 group-hover:text-red-400';
  }
  if (status === 'selected') {
    return betType === 'high' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold';
  }
  return 'text-gray-600';
};

// 根据 betType 获取赔率颜色
const getOddsColor = (status: string, betType: 'high' | 'low', isLockedDefault: boolean) => {
  // LOCK 后失效的下注块（未下注）或结算后都变灰
  if (isLockedDefault || status === 'win' || status === 'fail') {
    return 'text-gray-500';
  }
  if (status === 'default') {
    return betType === 'high' ? 'text-emerald-500/70 text-glow-hover' : 'text-red-500/70 text-glow-hover';
  }
  if (status === 'selected') {
    return 'text-white font-bold drop-shadow-md';
  }
  return 'text-gray-500';
};

// 粒子接口
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

// 掉落物体接口
interface FallingCell {
  cellId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  width: number;
  height: number;
  opacity: number;
}

// 赢得动画接口
interface WinAnimation {
  cellId: string;
  profit: number;
  startTime: number;
  x: number;
  y: number;
  color: string;
}

interface BettingCellsLayerProps {
  cells: BetCell[];
  gridRows: number;
  totalCols: number;
  gridWidthPx?: number;
  rowHeightPx?: number;
  scrollOffsetPx?: number;
  scrollOffsetPercent?: number;
  lockLineX?: number;
  lockLinePercent?: number;
  defaultBetAmount: number;
  onBet?: (cellId: string, amount: number) => void;
}

export function BettingCellsLayer({
  cells,
  gridRows,
  totalCols,
  gridWidthPx,
  rowHeightPx,
  scrollOffsetPx = 0,
  scrollOffsetPercent = 0,
  lockLineX = 0,
  lockLinePercent = 0,
  defaultBetAmount,
  onBet
}: BettingCellsLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const usePx = (gridWidthPx ?? 0) > 0;
  const gridWidthPercent = 100 / totalCols;
  const cellHeightPercent = 100 / gridRows;

  // 使用 ref 存储动画数据，避免触发重渲染
  const particlesRef = useRef<Particle[]>([]);
  const fallingCellsRef = useRef<FallingCell[]>([]);
  const winAnimationsRef = useRef<WinAnimation[]>([]);
  const prevCellsRef = useRef<Map<string, string>>(new Map());
  const processedCellsRef = useRef<Set<string>>(new Set());
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(performance.now());

  // 计算格子在屏幕上的绝对位置 - 基于 NOW 线位置
  const getCellScreenPosition = useCallback((cell: BetCell) => {
    const viewport = containerRef.current?.closest('.overflow-hidden');
    if (!viewport) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const viewportRect = viewport.getBoundingClientRect();
    const cellWidth = usePx && (gridWidthPx ?? 0) > 0
      ? (gridWidthPx as number)
      : viewportRect.width / totalCols;
    const cellHeight = usePx && (rowHeightPx ?? 0) > 0
      ? (rowHeightPx as number)
      : viewportRect.height / gridRows;
    const scrollOffset = usePx
      ? scrollOffsetPx
      : (viewportRect.width * (scrollOffsetPercent / 100));

    const screenX = viewportRect.left + (cell.col * cellWidth) - scrollOffset + cellWidth / 2;
    const screenY = viewportRect.top + (cell.row * cellHeight) + cellHeight / 2;

    return { x: screenX, y: screenY, width: cellWidth, height: cellHeight };
  }, [gridRows, gridWidthPx, rowHeightPx, scrollOffsetPercent, scrollOffsetPx, totalCols, usePx]);

  // 生成爆炸粒子
  const spawnExplosion = useCallback((x: number, y: number, color: string) => {
    for (let i = 0; i < 30; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        life: 1,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }, []);

  // 检测状态变化
  useEffect(() => {
    cells.forEach(cell => {
      if (cell.status === 'win' && !processedCellsRef.current.has(cell.id)) {
        const pos = getCellScreenPosition(cell);
        const centerX = pos.x;
        const centerY = pos.y;

        const winColor = cell.betType === 'high' ? '#10b981' : '#ef4444';
        spawnExplosion(centerX, centerY, winColor);

        const profit = Math.round(defaultBetAmount * cell.odds);
        winAnimationsRef.current.push({
          cellId: cell.id,
          profit,
          startTime: performance.now(),
          x: centerX,
          y: centerY,
          color: winColor
        });
        processedCellsRef.current.add(cell.id);
      }

      if (cell.status === 'fail' && !processedCellsRef.current.has(cell.id)) {
        const pos = getCellScreenPosition(cell);
        fallingCellsRef.current.push({
          cellId: cell.id,
          x: pos.x - pos.width / 2,
          y: pos.y - pos.height / 2,
          vx: -2,
          vy: -3,
          rotation: 0,
          width: pos.width,
          height: pos.height,
          opacity: 1,
        });
        processedCellsRef.current.add(cell.id);
      }

      prevCellsRef.current.set(cell.id, cell.status);
    });
  }, [cells, getCellScreenPosition, defaultBetAmount, spawnExplosion]);

  // Canvas 动画循环
  useEffect(() => {
    const animate = (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const dt = Math.min((now - lastTimeRef.current) / 16, 3);
      lastTimeRef.current = now;

      // 全屏 canvas 尺寸
      const dpr = window.devicePixelRatio || 1;
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const targetWidth = Math.round(screenWidth * dpr);
      const targetHeight = Math.round(screenHeight * dpr);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        canvas.style.width = `${screenWidth}px`;
        canvas.style.height = `${screenHeight}px`;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, screenWidth, screenHeight);

      // 获取 viewport 位置
      const viewport = containerRef.current?.closest('.overflow-hidden');
      const viewportRect = viewport?.getBoundingClientRect();

      // 更新和绘制粒子
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.2 * dt;
        p.life -= 0.025 * dt;

        if (p.life <= 0) return false;

        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size * 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        return true;
      });

      // 更新和绘制掉落格子
      fallingCellsRef.current = fallingCellsRef.current.filter(f => {
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.vy += 0.5 * dt;
        f.rotation -= 0.1 * dt;
        f.opacity -= 0.015 * dt;

        if (f.y > screenHeight + 200 || f.opacity <= 0) return false;

        ctx.save();
        ctx.globalAlpha = f.opacity;
        ctx.translate(f.x + f.width / 2, f.y + f.height / 2);
        ctx.rotate(f.rotation);
        ctx.fillStyle = 'rgba(107, 114, 128, 0.8)';
        ctx.fillRect(-f.width / 2, -f.height / 2, f.width, f.height);
        ctx.fillStyle = 'rgba(209, 213, 219, 0.9)';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('LOSS', 0, 0);
        ctx.restore();

        return true;
      });

      // 更新和绘制盈利动画
      winAnimationsRef.current = winAnimationsRef.current.filter(anim => {
        const elapsed = now - anim.startTime;
        const duration = 1200;
        if (elapsed > duration) return false;

        const progress = elapsed / duration;
        const yOffset = -60 * progress;
        const opacity = 1 - progress;
        const scale = 1 + progress * 0.2;

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(anim.x, anim.y + yOffset);
        ctx.scale(scale, scale);
        ctx.fillStyle = anim.color;
        ctx.shadowColor = anim.color;
        ctx.shadowBlur = 15;
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`+$${anim.profit}`, 0, 0);
        ctx.restore();

        return true;
      });

      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-10 overflow-visible">
      {/* Canvas 动画层 - 使用 Portal 避免被父级 transform/overflow 影响 */}
      {typeof document !== 'undefined'
        ? createPortal(
          <canvas
            ref={canvasRef}
            className="fixed pointer-events-none"
            style={{
              zIndex: 9999,
              top: 0,
              left: 0,
            }}
          />,
          document.body
        )
        : null}

      {/* 渲染正常格子 */}
      {cells.map((cell) => {

        const left = usePx
          ? cell.col * (gridWidthPx ?? 0)
          : cell.col * gridWidthPercent;
        const top = usePx && (rowHeightPx ?? 0) > 0
          ? cell.row * (rowHeightPx ?? 0)
          : cell.row * cellHeightPercent;
        const cellLeftInView = usePx
          ? (left as number) - scrollOffsetPx
          : (left as number) - scrollOffsetPercent;
        const isLocked = usePx ? cellLeftInView <= lockLineX : cellLeftInView <= lockLinePercent;
        const effectiveStatus = cell.status;
        // LOCK 后失效的下注块（未下注的）变灰
        const isLockedDefault = isLocked && cell.status === 'default';
        // 失效的或结算后的格子变灰且禁用交互
        const shouldGray = isLockedDefault || cell.status === 'win' || cell.status === 'fail';

        return (
          <div
            key={cell.id}
            className={`${getCellStyle(effectiveStatus, cell.betType, isLocked)} group ${shouldGray ? 'opacity-50 pointer-events-none' : 'cursor-pointer'} absolute`}
            style={{
              left: usePx ? left : `${left}%`,
              top: usePx && (rowHeightPx ?? 0) > 0 ? top : `${top}%`,
              width: usePx ? (gridWidthPx ?? 0) : `${gridWidthPercent}%`,
              height: usePx && (rowHeightPx ?? 0) > 0 ? (rowHeightPx ?? 0) : `${cellHeightPercent}%`
            }}
            onDoubleClick={() => {
              if (cell.status === 'dissolved' || isLocked) return;
              onBet?.(cell.id, defaultBetAmount);
            }}
          >
            <span className={`text-[9px] font-bold uppercase ${getLabelColor(effectiveStatus, cell.betType, isLockedDefault)}`}>
              {cell.status === 'selected' ? 'BET' : cell.label}
            </span>
            <span className={`text-[10px] font-mono mt-1 ${getOddsColor(effectiveStatus, cell.betType, isLockedDefault)}`}>{cell.odds.toFixed(1)}x</span>
          </div>
        );
      })}
    </div>
  );
}
