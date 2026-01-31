import React, { useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { BetCell } from '../../types';
import { getCellStyle, getLabelColor, getOddsColor } from '../../utils/cellStyles';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

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
  smoothScrollPxRef?: React.MutableRefObject<number>;
  panOffsetPx?: number;
  lockLineX?: number;
  lockLinePercent?: number;
  lockTimeSec?: number;  // 新增: 基于时间的 Lock 判定 (秒)
  defaultBetAmount: number;
  onBet?: (cellId: string, amount: number) => void;
}

// 单个格子组件 - 使用 memo 避免不必要的重渲染
const BettingCell = memo(function BettingCell({
  cell,
  left,
  top,
  width,
  height,
  isLocked,
  isLockedDefault,
  shouldGray,
  usePx,
  defaultBetAmount,
  onBet,
}: {
  cell: BetCell;
  left: number;
  top: number;
  width: number;
  height: number;
  isLocked: boolean;
  isLockedDefault: boolean;
  shouldGray: boolean;
  usePx: boolean;
  defaultBetAmount: number;
  onBet?: (cellId: string, amount: number) => void;
}) {
  const handleDoubleClick = useCallback(() => {
    if (cell.status === 'dissolved' || isLocked) return;
    onBet?.(cell.id, defaultBetAmount);
  }, [cell.id, cell.status, isLocked, defaultBetAmount, onBet]);

  const cellWidth = usePx ? width : `${width}%`;
  const cellHeight = usePx ? height : `${height}%`;
  const cellLeft = usePx ? left : `${left}%`;
  const cellTop = usePx ? top : `${top}%`;

  return (
    <div
      className={`${getCellStyle(cell.status, cell.betType, isLocked)} group ${shouldGray ? 'opacity-50 pointer-events-none' : 'cursor-pointer'} absolute`}
      style={{
        left: cellLeft,
        top: cellTop,
        width: cellWidth,
        height: cellHeight,
      }}
      onDoubleClick={handleDoubleClick}
    >
      <span className={`text-[9px] font-bold ${cell.priceRange ? '' : 'uppercase'} ${getLabelColor(cell.status, cell.betType, isLockedDefault)}`}>
        {cell.status === 'selected' ? 'BET' : (cell.priceRange?.label ?? cell.label)}
      </span>
      <span className={`text-[10px] font-mono mt-1 ${getOddsColor(cell.status, cell.betType, isLockedDefault)}`}>
        {cell.odds.toFixed(1)}x
      </span>
    </div>
  );
});

export const BettingCellsLayer = memo(function BettingCellsLayer({
  cells,
  gridRows,
  totalCols,
  gridWidthPx,
  rowHeightPx,
  scrollOffsetPx = 0,
  scrollOffsetPercent = 0,
  smoothScrollPxRef,
  panOffsetPx = 0,
  lockLineX = 0,
  lockLinePercent = 0,
  lockTimeSec = 5,
  defaultBetAmount,
  onBet
}: BettingCellsLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const usePx = (gridWidthPx ?? 0) > 0 && (rowHeightPx ?? 0) > 0;
  const gridWidthPercent = 100 / totalCols;
  const cellHeightPercent = 100 / gridRows;

  // 动画数据存储在 ref 中
  const particlesRef = useRef<Particle[]>([]);
  const fallingCellsRef = useRef<FallingCell[]>([]);
  const winAnimationsRef = useRef<WinAnimation[]>([]);
  const processedCellsRef = useRef<Set<string>>(new Set());
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(performance.now());

  // 缓存 props 到 ref，避免 effect 重新执行
  const propsRef = useRef({
    gridRows,
    gridWidthPx,
    rowHeightPx,
    scrollOffsetPx,
    scrollOffsetPercent,
    smoothScrollPxRef,
    panOffsetPx,
    totalCols,
    usePx,
    defaultBetAmount,
  });
  propsRef.current = {
    gridRows,
    gridWidthPx,
    rowHeightPx,
    scrollOffsetPx,
    scrollOffsetPercent,
    smoothScrollPxRef,
    panOffsetPx,
    totalCols,
    usePx,
    defaultBetAmount,
  };

  // 计算格子屏幕位置
  const getCellScreenPosition = useCallback((cell: BetCell) => {
    const viewport = containerRef.current?.closest('.overflow-hidden');
    if (!viewport) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const {
      gridRows,
      gridWidthPx,
      rowHeightPx,
      scrollOffsetPx,
      scrollOffsetPercent,
      smoothScrollPxRef,
      panOffsetPx,
      totalCols,
      usePx
    } = propsRef.current;
    const viewportRect = viewport.getBoundingClientRect();
    const cellWidth = usePx && (gridWidthPx ?? 0) > 0
      ? (gridWidthPx as number)
      : viewportRect.width / totalCols;
    const cellHeight = usePx && (rowHeightPx ?? 0) > 0
      ? (rowHeightPx as number)
      : viewportRect.height / gridRows;
    const smoothScrollPx = smoothScrollPxRef?.current;
    const scrollOffset = usePx
      ? (smoothScrollPx ?? scrollOffsetPx)
      : (viewportRect.width * (scrollOffsetPercent / 100));

    const screenX = viewportRect.left + (cell.col * cellWidth) - scrollOffset + cellWidth / 2;
    const screenY = viewportRect.top + (cell.row * cellHeight) + cellHeight / 2 + panOffsetPx;

    return { x: screenX, y: screenY, width: cellWidth, height: cellHeight };
  }, []);

  // 生成爆炸粒子 - 适中的爆炸效果
  const spawnExplosion = useCallback((x: number, y: number, color: string) => {
    for (let i = 0; i < 25; i++) {  // 25 个粒子
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6;  // 适中的速度
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
        size: 2 + Math.random() * 3,  // 适中的粒子大小
      });
    }
  }, []);

  // 检测 win/fail 状态变化 - 只在 cells 变化时检查
  useEffect(() => {
    cells.forEach(cell => {
      if (cell.status === 'win' && !processedCellsRef.current.has(cell.id)) {
        console.log('🎆 触发爆炸动画', {
          cellId: cell.id,
          row: cell.row,
          col: cell.col,
          betType: cell.betType,
          status: cell.status,
        });
        const pos = getCellScreenPosition(cell);
        const winColor = cell.betType === 'high' ? '#10b981' : '#ef4444';
        spawnExplosion(pos.x, pos.y, winColor);

        const profit = Math.round(propsRef.current.defaultBetAmount * cell.odds);
        winAnimationsRef.current.push({
          cellId: cell.id,
          profit,
          startTime: performance.now(),
          x: pos.x,
          y: pos.y,
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
    });
  }, [cells, getCellScreenPosition, spawnExplosion]);

  // Canvas 动画循环 - 只在组件挂载时启动
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

      // 只在有动画时才绘制
      const hasAnimations = particlesRef.current.length > 0 ||
                           fallingCellsRef.current.length > 0 ||
                           winAnimationsRef.current.length > 0;

      if (hasAnimations) {
        // 更新和绘制粒子
        particlesRef.current = particlesRef.current.filter(p => {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 0.2 * dt;
          p.life -= 0.025 * dt;  // 稍微慢一点消失

          if (p.life <= 0) return false;

          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = p.size * 3;  // 稍微增强发光
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
          f.opacity -= 0.02 * dt;

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
          const duration = 1000;  // 减少到 1 秒
          if (elapsed > duration) return false;

          const progress = elapsed / duration;
          const yOffset = -50 * progress;
          const opacity = 1 - progress;
          const scale = 1 + progress * 0.15;

          ctx.save();
          ctx.globalAlpha = opacity;
          ctx.translate(anim.x, anim.y + yOffset);
          ctx.scale(scale, scale);
          ctx.fillStyle = anim.color;
          ctx.shadowColor = anim.color;
          ctx.shadowBlur = 10;
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`+$${anim.profit}`, 0, 0);
          ctx.restore();

          return true;
        });

        ctx.globalAlpha = 1;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-10 overflow-visible">
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

      {cells.map((cell) => {
        const left = usePx
          ? cell.col * (gridWidthPx ?? 0)
          : cell.col * gridWidthPercent;
        const top = usePx && (rowHeightPx ?? 0) > 0
          ? cell.row * (rowHeightPx ?? 0)
          : cell.row * cellHeightPercent;

        // 位置基准 Lock 判定: 列的左边缘到达 Lock 线位置时锁定
        const smoothScrollPx = smoothScrollPxRef?.current;
        const cellLeftInView = usePx
          ? (left as number) - (smoothScrollPx ?? scrollOffsetPx)
          : (left as number) - scrollOffsetPercent;
        const isLocked = usePx ? cellLeftInView <= lockLineX : cellLeftInView <= lockLinePercent;
        const isLockedDefault = isLocked && cell.status === 'default';
        const shouldGray = isLockedDefault || cell.status === 'win' || cell.status === 'fail';

        return (
          <BettingCell
            key={cell.id}
            cell={cell}
            left={left}
            top={top}
            width={usePx ? (gridWidthPx ?? 0) : gridWidthPercent}
            height={usePx && (rowHeightPx ?? 0) > 0 ? (rowHeightPx ?? 0) : cellHeightPercent}
            isLocked={isLocked}
            isLockedDefault={isLockedDefault}
            shouldGray={shouldGray}
            usePx={usePx}
            defaultBetAmount={defaultBetAmount}
            onBet={onBet}
          />
        );
      })}
    </div>
  );
});
