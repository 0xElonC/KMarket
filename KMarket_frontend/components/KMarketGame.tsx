import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useMarketWebSocket, WsGridCell, MarketConfig } from '../hooks/useMarketWebSocket';
import { useGameState } from '../contexts/GameStateContext';

interface KMarketGameProps {
  userAddress?: string;
  onBalanceChange?: (balance: string) => void;
  onPriceChange?: (price: number, change: number) => void;
}

// 本地扩展的格子类型 (包含渲染用的 x 坐标)
interface RenderGridCell extends WsGridCell {
  x: number;
  betTime?: number;
}

// 浮动文字
interface FloatText {
  text: string;
  x: number;
  y: number;
  color: string;
  isWin: boolean;
  start: number;
  dur: number;
}

// 默认配置 (如果后端未连接)
const DEFAULT_CONFIG: MarketConfig = {
  symbol: 'ETH_USDT',
  grid: {
    rows: 40,
    cols: 40,
    cellWidth: 65,
    cellHeight: 36,
    scrollSpeed: 30,
    priceRange: 0.25,
    minBetDistance: 5,
    intervalMs: 1000,
  },
  bet: {
    minAmount: '10000000',
    maxAmount: '1000000000',
    currency: 'USDC',
    decimals: 6,
  },
  odds: {
    baseMin: 1.2,
    baseMax: 3.0,
    timeFactor: 0.03,
  },
};

const BET_AMOUNT = 10; // 下注金额 (USDC)

export function KMarketGame({ userAddress, onBalanceChange, onPriceChange }: KMarketGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // WebSocket 数据
  const {
    isConnected,
    config,
    gridCells: wsGridCells,
    currentPrice,
    priceChange,
    subscribe,
  } = useMarketWebSocket();

  // 使用后端配置或默认配置
  const cfg = config || DEFAULT_CONFIG;

  // 本地状态
  const [virtualBalance, setVirtualBalance] = useState(100);
  const [activeBets, setActiveBets] = useState(0);
  const [status, setStatus] = useState<'connecting' | 'live' | 'error'>('connecting');

  // Refs
  const renderCellsRef = useRef<RenderGridCell[]>([]);
  const floatsRef = useRef<FloatText[]>([]);
  const hoverCellRef = useRef<RenderGridCell | null>(null);
  const lastTimeRef = useRef(Date.now());
  const sizeRef = useRef<{ W: number; H: number }>({ W: 0, H: 0 });
  const basePriceRef = useRef<number | null>(null);  // 等待后端价格
  const animPriceRef = useRef<number | null>(null);
  const priceInitializedRef = useRef(false);
  // 价格历史 (用于绘制曲线 K 线)
  const priceHistoryRef = useRef<{ price: number; time: number }[]>([]);
  const lastHistoryUpdateRef = useRef(0);

  // 游戏状态持久化
  const { setIsGameActive } = useGameState();

  // 连接后订阅
  useEffect(() => {
    if (isConnected) {
      subscribe('ETH_USDT');
      setStatus('live');
    } else {
      setStatus('connecting');
    }
  }, [isConnected, subscribe]);

  // 同步 WebSocket 数据到本地渲染格子 (不再计算 x，在 draw 中动态计算)
  useEffect(() => {
    if (wsGridCells.length === 0) return;

    // 将后端格子转换为渲染格子 (x 会在 draw 中动态计算)
    const newCells: RenderGridCell[] = wsGridCells.map(cell => ({
      ...cell,
      x: 0, // 会在 draw 中根据 expiryTime 动态计算
    }));

    renderCellsRef.current = newCells;
    setActiveBets(newCells.filter(c => c.status === 'active').length);
  }, [wsGridCells]);

  // 更新价格 - 首次收到价格时立即初始化
  useEffect(() => {
    if (currentPrice > 0) {
      if (!priceInitializedRef.current) {
        // 首次收到价格，立即设置（不做动画）
        basePriceRef.current = currentPrice;
        animPriceRef.current = currentPrice;
        priceInitializedRef.current = true;
        console.log('📊 Price initialized:', currentPrice);
      }
      onPriceChange?.(currentPrice, priceChange);
    }
  }, [currentPrice, priceChange, onPriceChange]);

  // Price to Y coordinate
  const priceToY = useCallback((price: number): number => {
    const { H } = sizeRef.current;
    const basePrice = basePriceRef.current;
    if (!basePrice) return H / 2;
    const pct = (price - basePrice) / basePrice * 100;
    const totalH = cfg.grid.rows * cfg.grid.cellHeight;
    const startY = (H - totalH) / 2;
    return startY + totalH / 2 - (pct / cfg.grid.priceRange) * (totalH / 2);
  }, [cfg.grid.rows, cfg.grid.cellHeight, cfg.grid.priceRange]);

  // Get cell Y position (基于行号，而非绝对价格，确保格子始终在网格内)
  const getCellY = useCallback((cell: RenderGridCell): number => {
    const { H } = sizeRef.current;
    const totalH = cfg.grid.rows * cfg.grid.cellHeight;
    const startY = (H - totalH) / 2;
    // 行号 0 在顶部，行号 39 在底部
    return startY + cell.row * cfg.grid.cellHeight;
  }, [cfg.grid.rows, cfg.grid.cellHeight]);

  // Get cell at position
  const getCellAt = useCallback((mx: number, my: number): RenderGridCell | null => {
    for (const cell of renderCellsRef.current) {
      const y = getCellY(cell);
      if (mx >= cell.x && mx < cell.x + cfg.grid.cellWidth &&
        my >= y && my < y + cfg.grid.cellHeight) {
        return cell;
      }
    }
    return null;
  }, [getCellY, cfg.grid.cellWidth, cfg.grid.cellHeight]);

  // Check if cell is bettable (based on time to expiry, not pixel distance)
  const isCellBettable = useCallback((cell: RenderGridCell): boolean => {
    const now = Date.now();
    const timeToExpiry = cell.expiryTime - now;
    const minTimeMs = cfg.grid.minBetDistance * 1000; // 最小 5 秒
    return timeToExpiry > minTimeMs;
  }, [cfg.grid.minBetDistance]);

  // Handle double click (bet)
  const handleDoubleClick = useCallback(async (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cell = getCellAt(mx, my);

    if (cell && cell.status === 'idle' && virtualBalance >= BET_AMOUNT) {
      if (!isCellBettable(cell)) {
        console.log('⚠️ 格子太近，无法下注');
        return;
      }

      // 本地标记为 active
      cell.status = 'active';
      cell.betTime = Date.now();

      // 扣除余额
      const newBalance = virtualBalance - BET_AMOUNT;
      setVirtualBalance(newBalance);
      onBalanceChange?.(newBalance.toFixed(2));

      setActiveBets(renderCellsRef.current.filter(c => c.status === 'active').length);

      // TODO: 调用后端下注 API
      console.log('🎲 下注:', { tickId: cell.tickId, odds: cell.odds });
    }
  }, [getCellAt, virtualBalance, isCellBettable, onBalanceChange]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    hoverCellRef.current = getCellAt(mx, my);
    const canBet = hoverCellRef.current && hoverCellRef.current.status === 'idle' && isCellBettable(hoverCellRef.current);
    canvas.style.cursor = canBet ? 'pointer' : 'default';
  }, [getCellAt, isCellBettable]);

  // Add float text
  const addFloat = useCallback((text: string, x: number, y: number, color: string, isWin: boolean) => {
    floatsRef.current.push({ text, x, y, color, isWin, start: Date.now(), dur: 1500 });
  }, []);

  // Main draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.scale(dpr, dpr);
      sizeRef.current = { W, H };
    };

    const draw = () => {
      const now = Date.now();
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      const { W, H } = sizeRef.current;
      ctx.clearRect(0, 0, W, H);

      // 帧率无关的指数衰减函数
      // halfLife: 值变化一半所需的时间（毫秒）
      const expDecay = (current: number, target: number, halfLife: number, deltaMs: number): number => {
        const decay = Math.exp(-0.693 * deltaMs / halfLife);
        return target + (current - target) * decay;
      };

      // Smooth price animation (半衰期 100ms，快速响应)
      if (currentPrice > 0 && animPriceRef.current) {
        animPriceRef.current = expDecay(animPriceRef.current, currentPrice, 100, dt * 1000);
      }

      // 动态调整基准价格，保持价格线在可视区域内
      if (basePriceRef.current && animPriceRef.current) {
        const priceRangePct = cfg.grid.priceRange / 100;
        const maxDeviation = basePriceRef.current * priceRangePct * 0.7;
        const deviation = Math.abs(animPriceRef.current - basePriceRef.current);

        // 根据偏离程度动态调整半衰期
        const halfLife = deviation > maxDeviation ? 200 : 2000;
        basePriceRef.current = expDecay(basePriceRef.current, animPriceRef.current, halfLife, dt * 1000);
      }

      const lineX = W / 2;
      // 锁定区域距离（像素）= 锁定时间(秒) * 每秒像素
      const lockDistancePx = cfg.grid.minBetDistance * cfg.grid.cellWidth; // 5 * 65 = 325px
      // 每毫秒移动的像素 = 格子宽度 / 生成间隔
      const pixelsPerMs = cfg.grid.cellWidth / cfg.grid.intervalMs;

      // 动态计算每个格子的 x 位置 (基于 expiryTime)
      // 格子到期时到达 lineX，之前在右侧
      renderCellsRef.current.forEach(cell => {
        const timeToExpiry = cell.expiryTime - now;
        cell.x = lineX + timeToExpiry * pixelsPerMs;
      });

      // 移除已经滚出屏幕左侧的格子
      renderCellsRef.current = renderCellsRef.current.filter(cell => cell.x + cfg.grid.cellWidth > 0);

      // Draw background grid
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Price line (center)
      ctx.strokeStyle = 'rgba(0,212,255,0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(lineX, 0);
      ctx.lineTo(lineX, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Y-axis labels
      if (basePriceRef.current) {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '11px monospace';
        for (let i = 0; i <= cfg.grid.rows; i += 4) {
          const pct = cfg.grid.priceRange / 100 * (1 - 2 * i / cfg.grid.rows);
          const price = basePriceRef.current * (1 + pct);
          const y = priceToY(price);
          ctx.fillText('$' + price.toFixed(2), 8, y + 4);
        }
      }

      // Draw cells
      renderCellsRef.current.forEach(cell => {
        if (cell.x + cfg.grid.cellWidth < 0 || cell.x > W) return;
        const y = getCellY(cell);

        // 过了中线的格子淡出消失
        const distPastLine = lineX - cell.x;
        if (distPastLine > cfg.grid.cellWidth * 2) return; // 超过 2 个格子宽度后不再渲染

        let opacity = 1;
        if (distPastLine > 0) {
          // 线性淡出: 过线后 2 个格子宽度内淡出
          opacity = Math.max(0, 1 - distPastLine / (cfg.grid.cellWidth * 2));
        }

        const isBettable = cell.x > lineX + lockDistancePx;
        const isLocked = cell.x <= lineX + lockDistancePx && cell.x > lineX;

        let bg: string, border: string, textColor: string;
        switch (cell.status) {
          case 'won':
            bg = `rgba(0,255,136,${0.35 * opacity})`;
            border = `rgba(0,255,136,${opacity})`;
            textColor = `rgba(0,255,136,${opacity})`;
            break;
          case 'lost':
            bg = `rgba(255,71,87,${0.25 * opacity})`;
            border = `rgba(255,71,87,${opacity})`;
            textColor = `rgba(255,71,87,${opacity})`;
            break;
          case 'active':
            bg = `rgba(0,212,255,${0.25 * opacity})`;
            border = `rgba(0,212,255,${opacity})`;
            textColor = `rgba(0,212,255,${opacity})`;
            break;
          default:
            if (isBettable) {
              bg = `rgba(255,255,255,${0.05 * opacity})`;
              border = `rgba(255,255,255,${0.2 * opacity})`;
              textColor = `rgba(136,136,136,${opacity})`;
            } else if (isLocked) {
              bg = `rgba(255,71,87,${0.05 * opacity})`;
              border = `rgba(255,71,87,${0.3 * opacity})`;
              textColor = `rgba(255,71,87,${0.6 * opacity})`;
            } else {
              bg = `rgba(255,255,255,${0.02 * opacity})`;
              border = `rgba(255,255,255,${0.05 * opacity})`;
              textColor = `rgba(68,68,68,${opacity})`;
            }
        }

        // Hover highlight
        if (hoverCellRef.current === cell && cell.status === 'idle' && isBettable) {
          bg = `rgba(255,215,0,${0.2 * opacity})`;
          border = `rgba(255,215,0,${opacity})`;
          textColor = `rgba(255,215,0,${opacity})`;
        }

        ctx.fillStyle = bg;
        ctx.fillRect(cell.x, y, cfg.grid.cellWidth, cfg.grid.cellHeight);
        ctx.strokeStyle = border;
        ctx.lineWidth = cell.status === 'active' ? 2 : 1;
        ctx.strokeRect(cell.x, y, cfg.grid.cellWidth, cfg.grid.cellHeight);

        ctx.fillStyle = textColor;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(cell.odds + 'x', cell.x + cfg.grid.cellWidth / 2, y + cfg.grid.cellHeight / 2 + 4);
        ctx.textAlign = 'left';

        if (cell.status === 'active') {
          ctx.fillStyle = `rgba(255,215,0,${opacity})`;
          ctx.font = '10px sans-serif';
          ctx.fillText('$' + BET_AMOUNT, cell.x + 4, y + 12);
        }
      });

      // No bet zone indicator (红色锁定线)
      ctx.strokeStyle = 'rgba(255,71,87,0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(lineX + lockDistancePx, 0);
      ctx.lineTo(lineX + lockDistancePx, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // 锁定区域标签
      ctx.fillStyle = 'rgba(255,71,87,0.8)';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('LOCKED', lineX + lockDistancePx + 5, 20);

      // Draw price line (curved based on history)
      if (animPriceRef.current) {
        const history = priceHistoryRef.current;

        // 每 100ms 记录一次价格
        if (now - lastHistoryUpdateRef.current > 100) {
          history.push({ price: animPriceRef.current, time: now });
          // 保留最近 500 个点 (约 50 秒)
          if (history.length > 500) history.shift();
          lastHistoryUpdateRef.current = now;
        }

        // 绘制价格曲线
        if (history.length > 1) {
          ctx.shadowColor = 'rgba(0,212,255,0.6)';
          ctx.shadowBlur = 10;
          ctx.strokeStyle = '#00d4ff';
          ctx.lineWidth = 2;
          ctx.beginPath();

          const pricePixelsPerMs = cfg.grid.cellWidth / cfg.grid.intervalMs;

          for (let i = 0; i < history.length; i++) {
            const pt = history[i];
            const age = now - pt.time;
            const x = lineX - age * pricePixelsPerMs;
            const y = priceToY(pt.price);

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }

          // 连接到当前价格点
          const currentY = priceToY(animPriceRef.current);
          ctx.lineTo(lineX, currentY);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Price dot at current position
        const priceY = priceToY(animPriceRef.current);
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 25;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(lineX, priceY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw floats
      floatsRef.current = floatsRef.current.filter(f => {
        const t = (now - f.start) / f.dur;
        if (t > 1) return false;

        const y = f.y - t * 60;
        const alpha = 1 - t;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = f.color;
        ctx.font = (f.isWin ? 'bold 22px' : '16px') + ' sans-serif';
        ctx.textAlign = 'center';

        if (f.isWin) {
          ctx.shadowColor = f.color;
          ctx.shadowBlur = 15;
        }
        ctx.fillText(f.text, f.x, y);
        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;

        return true;
      });

      animationId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [cfg, currentPrice, priceToY, getCellY]);

  // Mark game as active
  useEffect(() => {
    setIsGameActive(true);
    return () => setIsGameActive(false);
  }, [setIsGameActive]);

  return (
    <div className="relative w-full h-full bg-[#0a0a0f] rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-pointer"
        onDoubleClick={handleDoubleClick}
        onMouseMove={handleMouseMove}
      />

      {/* Status overlay */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs">
        <span className={`w-2 h-2 rounded-full ${status === 'live' ? 'bg-[#00ff88]' : status === 'error' ? 'bg-[#ff4757]' : 'bg-yellow-500 animate-pulse'}`} />
        <span className="text-gray-400">
          {status === 'live' ? (isConnected ? '后端实时' : 'Gate.io 实时') : status === 'error' ? '连接失败' : '连接中...'}
        </span>
      </div>

      {/* Balance & bets overlay */}
      <div className="absolute bottom-3 right-3 flex items-center gap-4 text-xs">
        <span className="text-gray-400">活跃: <span className="text-[#00d4ff]">{activeBets}</span></span>
        <span className="text-[#ffd700]">可用余额: ${virtualBalance.toFixed(2)}</span>
      </div>

      {/* Instructions */}
      <div className="absolute top-3 right-3 text-xs text-gray-500">
        双击右侧格子下注 | 红线左侧不可下注
      </div>

      {/* Current price */}
      {currentPrice > 0 && (
        <div className="absolute top-3 left-3 text-xs">
          <span className="text-gray-400">ETH/USDT: </span>
          <span className={`font-bold ${priceChange >= 0 ? 'text-[#00ff88]' : 'text-[#ff4757]'}`}>
            ${currentPrice.toFixed(2)} ({priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%)
          </span>
        </div>
      )}
    </div>
  );
}
