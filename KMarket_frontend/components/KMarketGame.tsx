import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPublicClient, http, formatUnits } from 'viem';
import { localhost } from 'viem/chains';
import { useGameState } from '../contexts/GameStateContext';

// Contract addresses (localhost)
const CONTRACT_ADDRESSES = {
  vault: '0x3Aa5ebB10DC797CAC828524e59A333d0A371443c' as `0x${string}`,
};

// ABIs
const USER_PROXY_WALLET_ABI = [
  {
    name: 'depositBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const VAULT_ABI = [
  {
    name: 'userToProxy',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ type: 'address' }],
  },
] as const;

// 配置
const CFG = {
  ROWS: 20,
  COLS: 20,
  CELL_W: 65,
  CELL_H: 36,
  SPEED: 30,
  GRID_START_X: 0.52,
  PRICE_RANGE: 0.25,
  BET_AMOUNT: 10,
  MIN_BET_DISTANCE: 5,
};

// LocalStorage key for virtual balance
const VIRTUAL_BALANCE_KEY = 'kmarket_virtual_balance';

// Get virtual balance from localStorage
function getVirtualBalance(address: string): number {
  try {
    const data = localStorage.getItem(VIRTUAL_BALANCE_KEY);
    if (data) {
      const balances = JSON.parse(data);
      return balances[address.toLowerCase()] || 0;
    }
  } catch (e) {
    console.error('Failed to read virtual balance:', e);
  }
  return 0;
}

// Save virtual balance to localStorage
function saveVirtualBalance(address: string, balance: number) {
  try {
    const data = localStorage.getItem(VIRTUAL_BALANCE_KEY);
    const balances = data ? JSON.parse(data) : {};
    balances[address.toLowerCase()] = balance;
    localStorage.setItem(VIRTUAL_BALANCE_KEY, JSON.stringify(balances));
  } catch (e) {
    console.error('Failed to save virtual balance:', e);
  }
}

interface GridCell {
  id: number;
  row: number;
  col: number;
  x: number;
  w: number;
  h: number;
  priceHigh: number;
  priceLow: number;
  odds: number;
  status: 'idle' | 'active' | 'won' | 'lost';
  betTime: number | null;
}

interface FloatText {
  text: string;
  x: number;
  y: number;
  color: string;
  isWin: boolean;
  start: number;
  dur: number;
}

interface PricePoint {
  price: number;
  time: number;
}

interface KMarketGameProps {
  userAddress?: string;
  onBalanceChange?: (balance: string) => void;
  onPriceChange?: (price: number, change: number) => void;
}

export function KMarketGame({ userAddress, onBalanceChange, onPriceChange }: KMarketGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [virtualBalance, setVirtualBalance] = useState<number>(0); // 虚拟账本余额
  const [activeBets, setActiveBets] = useState<number>(0);
  const [status, setStatus] = useState<'connecting' | 'live' | 'error'>('connecting');
  const [onChainBalance, setOnChainBalance] = useState<string>('0');
  const lastSyncedBalanceRef = useRef<number>(0); // 上次同步的链上余额

  // Game state persistence
  const { gameState, saveState, setIsGameActive } = useGameState();

  // Refs for animation state
  const priceDataRef = useRef<PricePoint[]>(gameState.current.priceData);
  const basePriceRef = useRef<number | null>(gameState.current.basePrice);
  const animPriceRef = useRef<number | null>(gameState.current.animPrice);
  const targetPriceRef = useRef<number | null>(gameState.current.targetPrice);
  const gridCellsRef = useRef<GridCell[]>(gameState.current.gridCells);
  const floatsRef = useRef<FloatText[]>([]);
  const hoverCellRef = useRef<GridCell | null>(null);
  const lastTimeRef = useRef<number>(gameState.current.lastTime || Date.now());
  const sizeRef = useRef<{ W: number; H: number }>({ W: 0, H: 0 });
  const wsRef = useRef<WebSocket | null>(null);
  const priceChangeRef = useRef<number>(gameState.current.priceChange);

  // Viem client
  const publicClientRef = useRef(createPublicClient({
    chain: localhost,
    transport: http('http://127.0.0.1:8545'),
  }));

  // Get proxy address
  const getProxyAddress = useCallback(async (user: string): Promise<`0x${string}` | null> => {
    try {
      const proxy = await publicClientRef.current.readContract({
        address: CONTRACT_ADDRESSES.vault,
        abi: VAULT_ABI,
        functionName: 'userToProxy',
        args: [user as `0x${string}`],
      });
      return proxy === '0x0000000000000000000000000000000000000000' ? null : proxy;
    } catch (err) {
      console.error('Failed to get proxy address:', err);
      return null;
    }
  }, []);

  // Sync balance - check chain and update virtual balance if deposit detected
  const syncBalance = useCallback(async () => {
    if (!userAddress) return;
    try {
      const proxy = await getProxyAddress(userAddress);
      if (!proxy) return;
      
      const balance = await publicClientRef.current.readContract({
        address: proxy,
        abi: USER_PROXY_WALLET_ABI,
        functionName: 'depositBalance',
      });
      const chainBalance = parseFloat(formatUnits(balance, 6));
      setOnChainBalance(chainBalance.toFixed(2));
      
      // 获取保存的虚拟余额
      const savedVirtual = getVirtualBalance(userAddress);
      const lastSynced = lastSyncedBalanceRef.current;
      
      // 如果链上余额增加了（用户充值了），更新虚拟余额
      if (chainBalance > lastSynced && lastSynced > 0) {
        const deposit = chainBalance - lastSynced;
        const newVirtual = savedVirtual + deposit;
        console.log(`💰 Detected deposit: +${deposit.toFixed(2)} USDC, virtual: ${savedVirtual.toFixed(2)} → ${newVirtual.toFixed(2)}`);
        setVirtualBalance(newVirtual);
        saveVirtualBalance(userAddress, newVirtual);
        onBalanceChange?.(newVirtual.toFixed(2));
      } else if (savedVirtual === 0 && chainBalance > 0) {
        // 首次加载，用链上余额初始化虚拟余额
        console.log(`🔄 Initializing virtual balance: ${chainBalance.toFixed(2)} USDC`);
        setVirtualBalance(chainBalance);
        saveVirtualBalance(userAddress, chainBalance);
        onBalanceChange?.(chainBalance.toFixed(2));
      } else {
        setVirtualBalance(savedVirtual);
        onBalanceChange?.(savedVirtual.toFixed(2));
      }
      
      lastSyncedBalanceRef.current = chainBalance;
    } catch (err) {
      console.error('Failed to sync balance:', err);
    }
  }, [userAddress, getProxyAddress, onBalanceChange]);

  // Update virtual balance (win/loss) - only updates frontend, no chain interaction
  const updateVirtualBalance = useCallback((delta: number) => {
    if (!userAddress) return;
    setVirtualBalance(prev => {
      const newBalance = Math.max(0, prev + delta);
      saveVirtualBalance(userAddress, newBalance);
      onBalanceChange?.(newBalance.toFixed(2));
      console.log(`📊 Virtual balance: ${prev.toFixed(2)} → ${newBalance.toFixed(2)} (${delta >= 0 ? '+' : ''}${delta.toFixed(2)})`);
      return newBalance;
    });
  }, [userAddress, onBalanceChange]);

  // Initialize grid
  const initGrid = useCallback(() => {
    const { W, H } = sizeRef.current;
    const basePrice = basePriceRef.current;
    if (!basePrice || W === 0) return;

    const cells: GridCell[] = [];
    const startX = W * CFG.GRID_START_X;
    const priceStep = (CFG.PRICE_RANGE * 2 / CFG.ROWS) / 100;

    for (let row = 0; row < CFG.ROWS; row++) {
      const pctHigh = CFG.PRICE_RANGE / 100 - row * priceStep;
      const pctLow = pctHigh - priceStep;
      const priceHigh = basePrice * (1 + pctHigh);
      const priceLow = basePrice * (1 + pctLow);

      for (let col = 0; col < CFG.COLS; col++) {
        const x = startX + col * CFG.CELL_W;
        const rowFromCenter = Math.abs(row - (CFG.ROWS - 1) / 2);
        const distFactor = rowFromCenter / (CFG.ROWS / 2);
        const timeFactor = 1 + col * 0.03;
        const odds = (1.2 + distFactor * 1.8) * timeFactor;

        cells.push({
          id: row * CFG.COLS + col,
          row,
          col,
          x,
          w: CFG.CELL_W,
          h: CFG.CELL_H,
          priceHigh,
          priceLow,
          odds: parseFloat(odds.toFixed(2)),
          status: 'idle',
          betTime: null,
        });
      }
    }
    gridCellsRef.current = cells;
  }, []);

  // Price to Y coordinate
  const priceToY = useCallback((price: number): number => {
    const { H } = sizeRef.current;
    const basePrice = basePriceRef.current;
    if (!basePrice) return H / 2;
    const pct = (price - basePrice) / basePrice * 100;
    const totalH = CFG.ROWS * CFG.CELL_H;
    const startY = (H - totalH) / 2;
    return startY + totalH / 2 - (pct / CFG.PRICE_RANGE) * (totalH / 2);
  }, []);

  // Get cell Y position
  const getCellY = useCallback((cell: GridCell): number => {
    return priceToY(cell.priceHigh);
  }, [priceToY]);

  // Get cell at position
  const getCellAt = useCallback((mx: number, my: number): GridCell | null => {
    for (const cell of gridCellsRef.current) {
      const y = getCellY(cell);
      if (mx >= cell.x && mx < cell.x + cell.w &&
          my >= y && my < y + cell.h) {
        return cell;
      }
    }
    return null;
  }, [getCellY]);

  // Add price point
  const addPrice = useCallback((price: number) => {
    priceDataRef.current.push({ price, time: Date.now() });
    if (priceDataRef.current.length > 500) priceDataRef.current.shift();
    targetPriceRef.current = price;
    if (animPriceRef.current === null) animPriceRef.current = price;
    if (basePriceRef.current === null) {
      basePriceRef.current = price;
      initGrid();
    }
    onPriceChange?.(price, priceChangeRef.current);
  }, [initGrid, onPriceChange]);

  // Check if cell is in bettable zone (at least MIN_BET_DISTANCE seconds from price line)
  const isCellBettable = useCallback((cell: GridCell): boolean => {
    const { W } = sizeRef.current;
    const lineX = W / 2;
    const minDistance = CFG.MIN_BET_DISTANCE * CFG.SPEED; // Convert seconds to pixels
    // Cell must be at least minDistance pixels to the RIGHT of the price line
    return cell.x > lineX + minDistance;
  }, []);

  // Handle double click (bet)
  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cell = getCellAt(mx, my);

    if (cell && cell.status === 'idle' && virtualBalance >= CFG.BET_AMOUNT) {
      // Check if cell is far enough from price line
      if (!isCellBettable(cell)) {
        console.log('⚠️ Cannot bet on cells too close to price line! Wait for cells further right.');
        return;
      }
      cell.status = 'active';
      cell.betTime = Date.now();
      // Deduct bet amount from virtual balance
      updateVirtualBalance(-CFG.BET_AMOUNT);
      setActiveBets(gridCellsRef.current.filter(c => c.status === 'active').length);
      console.log('🎲 Bet placed:', { row: cell.row, col: cell.col, odds: cell.odds, priceRange: `${cell.priceLow.toFixed(2)} - ${cell.priceHigh.toFixed(2)}` });
    }
  }, [getCellAt, virtualBalance, isCellBettable, updateVirtualBalance]);

  // Handle mouse move (hover)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    hoverCellRef.current = getCellAt(mx, my);
    // Only show pointer cursor if cell is bettable
    const canBet = hoverCellRef.current && hoverCellRef.current.status === 'idle' && isCellBettable(hoverCellRef.current);
    canvas.style.cursor = canBet ? 'pointer' : 'default';
  }, [getCellAt, isCellBettable]);

  // Add float text
  const addFloat = useCallback((text: string, x: number, y: number, color: string, isWin: boolean) => {
    floatsRef.current.push({ text, x, y, color, isWin, start: Date.now(), dur: 1500 });
  }, []);

  // Gate.io WebSocket connection
  useEffect(() => {
    let isActive = true;
    let pingInterval: number | null = null;

    const connect = () => {
      console.log('🔌 Connecting to Gate.io WebSocket...');
      const ws = new WebSocket('wss://api.gateio.ws/ws/v4/');
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isActive) return;
        console.log('✅ Gate.io WebSocket connected');
        setStatus('live');

        // Subscribe to ticker for real-time price
        const tickerMsg = {
          time: Math.floor(Date.now() / 1000),
          channel: 'spot.tickers',
          event: 'subscribe',
          payload: ['ETH_USDT']
        };
        ws.send(JSON.stringify(tickerMsg));
        console.log('📡 Subscribed to ETH_USDT ticker');

        // Ping every 15 seconds
        pingInterval = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              time: Math.floor(Date.now() / 1000),
              channel: 'spot.ping'
            }));
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        if (!isActive) return;
        try {
          const data = JSON.parse(event.data as string);
          
          // Handle ticker updates
          if (data.channel === 'spot.tickers' && data.event === 'update') {
            const result = data.result;
            if (!result) return;

            const lastPrice = Number(result.last);
            const change = Number(result.change_percentage || 0);
            priceChangeRef.current = change;
            addPrice(lastPrice);
          }
        } catch (err) {
          console.error('Gate.io WebSocket parse error:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('Gate.io WebSocket error:', err);
        if (isActive) setStatus('error');
      };

      ws.onclose = () => {
        console.log('🔌 Gate.io WebSocket closed');
        if (pingInterval) {
          clearInterval(pingInterval);
          pingInterval = null;
        }
        // Reconnect after 3 seconds
        if (isActive) {
          setStatus('connecting');
          setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      isActive = false;
      if (pingInterval) clearInterval(pingInterval);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      // Save state when unmounting
      saveState({
        priceData: priceDataRef.current,
        basePrice: basePriceRef.current,
        animPrice: animPriceRef.current,
        targetPrice: targetPriceRef.current,
        gridCells: gridCellsRef.current,
        lastTime: lastTimeRef.current,
        priceChange: priceChangeRef.current,
      });
    };
  }, [addPrice, saveState]);

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
      if (basePriceRef.current) initGrid();
    };

    const draw = () => {
      const now = Date.now();
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      const { W, H } = sizeRef.current;
      ctx.clearRect(0, 0, W, H);

      // Smooth price animation
      if (targetPriceRef.current && animPriceRef.current) {
        animPriceRef.current += (targetPriceRef.current - animPriceRef.current) * 0.1;
      }

      // Slowly update base price
      if (basePriceRef.current && animPriceRef.current) {
        basePriceRef.current += (animPriceRef.current - basePriceRef.current) * 0.0003;
      }

      // Move grid and check collisions
      const lineX = W / 2;
      const currentP = animPriceRef.current;

      gridCellsRef.current.forEach(cell => {
        cell.x -= CFG.SPEED * dt;

        // Check collision for active cells
        if (cell.status === 'active' && currentP) {
          if (cell.x < lineX && cell.x + cell.w >= lineX - CFG.SPEED * dt) {
            if (currentP >= cell.priceLow && currentP <= cell.priceHigh) {
              // WIN!
              cell.status = 'won';
              const win = CFG.BET_AMOUNT * cell.odds;
              // Add winnings to virtual balance (bet was already deducted)
              updateVirtualBalance(win);
              const y = getCellY(cell);
              addFloat('+$' + win.toFixed(2), cell.x + cell.w / 2, y, '#00ff88', true);
              setActiveBets(gridCellsRef.current.filter(c => c.status === 'active').length);
              console.log('🎉 WIN!', { win, odds: cell.odds });
            }
          }

          if (cell.x + cell.w < lineX && cell.status === 'active') {
            cell.status = 'lost';
            const y = getCellY(cell);
            addFloat('-$' + CFG.BET_AMOUNT.toFixed(2), lineX, y + cell.h / 2, '#ff4757', false);
            setActiveBets(gridCellsRef.current.filter(c => c.status === 'active').length);
            console.log('💔 LOSE - bet amount lost:', CFG.BET_AMOUNT);
            // Bet was already deducted when placed, no need to deduct again
          }
        }

        // Recycle cells
        if (cell.x + cell.w < lineX) {
          const sameRowCells = gridCellsRef.current.filter(c => c.row === cell.row);
          const maxX = Math.max(...sameRowCells.map(c => c.x));
          cell.x = maxX + CFG.CELL_W;
          cell.status = 'idle';
          cell.betTime = null;
          const rowFromCenter = Math.abs(cell.row - (CFG.ROWS - 1) / 2);
          const distFactor = rowFromCenter / (CFG.ROWS / 2);
          const randomFactor = 0.9 + Math.random() * 0.2;
          cell.odds = parseFloat(((1.2 + distFactor * 1.8) * randomFactor).toFixed(2));
        }
      });

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
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Y-axis labels
      if (basePriceRef.current) {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '11px monospace';
        for (let i = 0; i <= CFG.ROWS; i += 2) {
          const pct = CFG.PRICE_RANGE / 100 * (1 - 2 * i / CFG.ROWS);
          const price = basePriceRef.current * (1 + pct);
          const y = priceToY(price);
          ctx.fillText('$' + price.toFixed(2), 8, y + 4);
        }
      }

      // Draw cells
      const minBetDistance = CFG.MIN_BET_DISTANCE * CFG.SPEED;
      
      gridCellsRef.current.forEach(cell => {
        if (cell.x + cell.w < 0 || cell.x > W) return;
        const y = getCellY(cell);
        
        // Check if cell is in bettable zone
        const isBettable = cell.x > lineX + minBetDistance;

        let bg: string, border: string, textColor: string;
        switch (cell.status) {
          case 'won':
            bg = 'rgba(0,255,136,0.25)';
            border = '#00ff88';
            textColor = '#00ff88';
            break;
          case 'lost':
            bg = 'rgba(255,71,87,0.2)';
            border = '#ff4757';
            textColor = '#ff4757';
            break;
          case 'active':
            bg = 'rgba(0,212,255,0.2)';
            border = '#00d4ff';
            textColor = '#00d4ff';
            break;
          default:
            // Idle cells - show differently based on bettable status
            if (isBettable) {
              bg = 'rgba(255,255,255,0.03)';
              border = 'rgba(255,255,255,0.15)';
              textColor = '#888';
            } else {
              // Not bettable - darker/disabled look
              bg = 'rgba(255,255,255,0.01)';
              border = 'rgba(255,255,255,0.05)';
              textColor = '#444';
            }
        }

        // Hover highlight only for bettable cells
        if (hoverCellRef.current === cell && cell.status === 'idle' && isBettable) {
          bg = 'rgba(255,215,0,0.15)';
          border = '#ffd700';
          textColor = '#ffd700';
        }

        ctx.fillStyle = bg;
        ctx.fillRect(cell.x, y, cell.w, cell.h);
        ctx.strokeStyle = border;
        ctx.lineWidth = cell.status === 'active' ? 2 : 1;
        ctx.strokeRect(cell.x, y, cell.w, cell.h);

        ctx.fillStyle = textColor;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(cell.odds + 'x', cell.x + cell.w / 2, y + cell.h / 2 + 4);
        ctx.textAlign = 'left';

        if (cell.status === 'active') {
          ctx.fillStyle = '#ffd700';
          ctx.font = '10px sans-serif';
          ctx.fillText('$' + CFG.BET_AMOUNT, cell.x + 4, y + 12);
        }
      });
      
      // Draw "no bet zone" indicator line
      ctx.strokeStyle = 'rgba(255,71,87,0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(lineX + minBetDistance, 0);
      ctx.lineTo(lineX + minBetDistance, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw price line
      const priceData = priceDataRef.current;
      if (priceData.length >= 2) {
        const pts: { x: number; y: number }[] = [];
        priceData.forEach(d => {
          const age = now - d.time;
          const x = lineX - age * CFG.SPEED / 1000;
          const y = priceToY(d.price);
          if (x > -50 && x < W + 50) pts.push({ x, y });
        });

        if (animPriceRef.current) {
          pts.push({ x: lineX, y: priceToY(animPriceRef.current) });
        }

        if (pts.length >= 2) {
          ctx.shadowColor = 'rgba(0,212,255,0.6)';
          ctx.shadowBlur = 15;
          ctx.strokeStyle = '#00d4ff';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            const p0 = pts[i - 1], p1 = pts[i];
            ctx.quadraticCurveTo(p0.x, p0.y, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
          }
          ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
          ctx.stroke();

          const last = pts[pts.length - 1];
          ctx.shadowColor = '#00ff88';
          ctx.shadowBlur = 25;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(last.x, last.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
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
  }, [initGrid, priceToY, getCellY, addFloat, updateVirtualBalance]);

  // Sync balance on mount and periodically
  useEffect(() => {
    if (userAddress) {
      syncBalance();
      // Periodically check for deposits
      const interval = setInterval(syncBalance, 10000);
      return () => clearInterval(interval);
    }
  }, [userAddress, syncBalance]);

  // Mark game as active and restore active bets count
  useEffect(() => {
    setIsGameActive(true);
    // Restore active bets count from saved state
    if (gameState.current.isInitialized && gridCellsRef.current.length > 0) {
      const activeCount = gridCellsRef.current.filter(c => c.status === 'active').length;
      setActiveBets(activeCount);
      console.log('🔄 Restored game state, active bets:', activeCount);
    }
    return () => setIsGameActive(false);
  }, [setIsGameActive, gameState]);

  return (
    <div className="relative w-full h-full bg-[#0a0a0f] rounded-lg overflow-hidden">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-pointer"
        onDoubleClick={handleDoubleClick}
        onMouseMove={handleMouseMove}
      />
      
      {/* Status overlay */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs">
        <span className={`w-2 h-2 rounded-full ${status === 'live' ? 'bg-[#00ff88]' : status === 'error' ? 'bg-[#ff4757]' : 'bg-yellow-500 animate-pulse'}`} />
        <span className="text-gray-400">{status === 'live' ? 'Gate.io 实时' : status === 'error' ? '连接失败' : '连接中...'}</span>
      </div>

      {/* Balance & bets overlay */}
      <div className="absolute bottom-3 right-3 flex items-center gap-4 text-xs">
        <span className="text-gray-400">活跃: <span className="text-[#00d4ff]">{activeBets}</span></span>
        <span className="text-[#ffd700]">可用余额: ${virtualBalance.toFixed(2)}</span>
        {userAddress && (
          <span className="text-gray-500">链上: ${parseFloat(onChainBalance).toFixed(2)}</span>
        )}
      </div>

      {/* Instructions */}
      <div className="absolute top-3 right-3 text-xs text-gray-500">
        双击右侧格子下注 | 红线左侧不可下注
      </div>
    </div>
  );
}
