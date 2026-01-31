import { useState, useCallback, useRef, useEffect } from 'react';
import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { localhost } from 'viem/chains';
import { BetCell, BetType, CandleData } from '../types';
import { computePriceDomain, FLOW_CONFIG } from '../utils/chartConfig';

// Demo owner account (for testing only!)
const DEMO_OWNER_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as const;
const DEMO_OWNER_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;

// Contract addresses (localhost)
const CONTRACT_ADDRESSES = {
  usdc: '0x68B1D87F95878fE05B998F19b66F4baba5De1aed' as `0x${string}`,
  vault: '0x3Aa5ebB10DC797CAC828524e59A333d0A371443c' as `0x${string}`,
  tradingEngine: '0xc6e7DF5E7b4f2A278906862b61205850344D4e7d' as `0x${string}`,
  proxyWalletFactory: '0x59b670e9fA9D0A427751Af201D676719a970857b' as `0x${string}`,
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
  {
    name: 'depositmock',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
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

// Demo bet record
export interface DemoBet {
  id: string;
  cellId: string;
  userAddress: string;
  amount: number; // USDC amount
  odds: number;
  betType: BetType;
  row: number;
  col: number;
  priceHigh: number;
  priceLow: number;
  betTime: number;
  targetUpdateCount: number;
  status: 'pending' | 'won' | 'lost' | 'settled';
  profit?: number; // Calculated profit/loss
}

// Settlement result for UI display
export interface SettlementResult {
  betId: string;
  isWin: boolean;
  amount: number;
  profit: number;
  timestamp: number;
}

interface UseDemoBettingOptions {
  userAddress?: string;
  gridRows?: number;
  enabled?: boolean;
}

export function useDemoBetting({
  userAddress,
  gridRows = 6,
  enabled = true,
}: UseDemoBettingOptions = {}) {
  const [demoBets, setDemoBets] = useState<DemoBet[]>([]);
  const [settlementResults, setSettlementResults] = useState<SettlementResult[]>([]);
  const [isSettling, setIsSettling] = useState(false);
  const [onChainBalance, setOnChainBalance] = useState<string>('0');
  const [error, setError] = useState<string | null>(null);
  
  const processedBetsRef = useRef<Set<string>>(new Set());

  // Create viem clients
  const publicClient = createPublicClient({
    chain: localhost,
    transport: http('http://127.0.0.1:8545'),
  });

  const account = privateKeyToAccount(DEMO_OWNER_PRIVATE_KEY);
  const walletClient = createWalletClient({
    account,
    chain: localhost,
    transport: http('http://127.0.0.1:8545'),
  });

  // Get user's proxy wallet address
  const getProxyAddress = useCallback(async (user: string): Promise<`0x${string}` | null> => {
    try {
      const proxy = await publicClient.readContract({
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
  }, [publicClient]);

  // Get on-chain balance
  const fetchOnChainBalance = useCallback(async () => {
    if (!userAddress) return;
    
    try {
      const proxy = await getProxyAddress(userAddress);
      if (!proxy) {
        setOnChainBalance('0');
        return;
      }

      const balance = await publicClient.readContract({
        address: proxy,
        abi: USER_PROXY_WALLET_ABI,
        functionName: 'depositBalance',
      });
      
      setOnChainBalance(formatUnits(balance, 6)); // USDC has 6 decimals
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  }, [userAddress, getProxyAddress, publicClient]);

  // Initialize
  useEffect(() => {
    if (!userAddress || !enabled) return;
    
    const init = async () => {
      await fetchOnChainBalance();
    };
    
    init();
  }, [userAddress, enabled, fetchOnChainBalance]);

  // Place a demo bet (frontend only, no blockchain interaction yet)
  const placeBet = useCallback((
    cellId: string,
    amount: number,
    odds: number,
    betType: BetType,
    row: number,
    col: number,
    priceHigh: number,
    priceLow: number,
    currentUpdateCount: number,
    columnsToSettle: number = 2, // How many columns until settlement
  ): DemoBet | null => {
    if (!userAddress) {
      setError('No user address');
      return null;
    }

    const bet: DemoBet = {
      id: `bet_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      cellId,
      userAddress,
      amount,
      odds,
      betType,
      row,
      col,
      priceHigh,
      priceLow,
      betTime: Date.now(),
      targetUpdateCount: Math.floor(currentUpdateCount) + columnsToSettle,
      status: 'pending',
    };

    setDemoBets(prev => [...prev, bet]);
    console.log('📝 Demo bet placed:', bet);
    
    return bet;
  }, [userAddress]);

  // Check and resolve bets based on current price
  const resolveBets = useCallback((
    currentPrice: number,
    updateCount: number,
    chartData: CandleData[],
    basePrice?: number | null,
  ) => {
    if (demoBets.length === 0) return;

    const betsToResolve = demoBets.filter(
      bet => bet.status === 'pending' && 
             updateCount >= bet.targetUpdateCount &&
             !processedBetsRef.current.has(bet.id)
    );

    if (betsToResolve.length === 0) return;

    // Calculate price domain
    let effectiveMax: number;
    let rowValue: number;

    if (basePrice !== null && basePrice !== undefined) {
      const range = basePrice * (FLOW_CONFIG.PRICE_RANGE / 100) * 2;
      effectiveMax = basePrice + range / 2;
      rowValue = range / gridRows;
    } else {
      const priceDomain = computePriceDomain(chartData);
      const baseRange = priceDomain.max - priceDomain.min || 1;
      effectiveMax = priceDomain.max;
      rowValue = baseRange / gridRows;
    }

    const results: SettlementResult[] = [];
    const updatedBets: DemoBet[] = [];

    betsToResolve.forEach(bet => {
      processedBetsRef.current.add(bet.id);

      const cellTopPrice = effectiveMax - bet.row * rowValue;
      const cellBottomPrice = effectiveMax - (bet.row + 1) * rowValue;

      // Determine win/loss based on bet type
      let isWin: boolean;
      if (bet.betType === 'high') {
        // For 'high' bet, win if price is in or above the cell range
        isWin = currentPrice >= cellBottomPrice;
      } else {
        // For 'low' bet, win if price is in or below the cell range
        isWin = currentPrice <= cellTopPrice;
      }

      // Calculate profit based on odds
      // Win: profit = amount * (odds - 1)
      // Lose: profit = -amount * (odds - 1)
      const profitMultiplier = bet.odds - 1;
      const profit = isWin ? bet.amount * profitMultiplier : -bet.amount * profitMultiplier;

      const updatedBet: DemoBet = {
        ...bet,
        status: isWin ? 'won' : 'lost',
        profit,
      };
      updatedBets.push(updatedBet);

      const result: SettlementResult = {
        betId: bet.id,
        isWin,
        amount: bet.amount,
        profit,
        timestamp: Date.now(),
      };
      results.push(result);

      console.log(isWin ? '🎉 Demo bet WON!' : '💔 Demo bet LOST', {
        betId: bet.id,
        betType: bet.betType,
        amount: bet.amount,
        odds: bet.odds,
        profit: profit.toFixed(2),
        currentPrice: currentPrice.toFixed(2),
        cellRange: `${cellBottomPrice.toFixed(2)} - ${cellTopPrice.toFixed(2)}`,
      });
    });

    // Update bets state
    setDemoBets(prev => 
      prev.map(bet => {
        const updated = updatedBets.find(u => u.id === bet.id);
        return updated || bet;
      })
    );

    // Add settlement results for UI display
    setSettlementResults(prev => [...prev, ...results]);

    // Auto-clear old results after 5 seconds
    setTimeout(() => {
      setSettlementResults(prev => 
        prev.filter(r => Date.now() - r.timestamp < 5000)
      );
    }, 5000);

    return results;
  }, [demoBets, gridRows]);

  // Settle bets on-chain using depositmock (win) or withdraw (lose)
  const settleOnChain = useCallback(async (betsToSettle: DemoBet[]) => {
    if (!userAddress || betsToSettle.length === 0) return;

    setIsSettling(true);
    setError(null);

    try {
      // Get user's proxy wallet
      const proxy = await getProxyAddress(userAddress);
      if (!proxy) {
        throw new Error('No proxy wallet found');
      }

      // Process each bet
      for (const bet of betsToSettle) {
        if (bet.profit === undefined) continue;

        const amountWei = parseUnits(Math.abs(bet.profit).toFixed(6), 6);

        if (bet.profit > 0) {
          // Win: use depositmock to add profit
          console.log(`⛓️ Adding profit: +${bet.profit.toFixed(2)} USDC`);
          
          const hash = await walletClient.writeContract({
            address: proxy,
            abi: USER_PROXY_WALLET_ABI,
            functionName: 'depositmock',
            args: [amountWei],
          });

          await publicClient.waitForTransactionReceipt({ hash });
          console.log('✅ Profit added:', hash);
        } else if (bet.profit < 0) {
          // Lose: use withdraw to deduct loss (if balance allows)
          // For demo, we'll just log it - actual withdraw would fail if no real USDC in vault
          console.log(`⛓️ Loss recorded: ${bet.profit.toFixed(2)} USDC (simulated)`);
          
          // Try to withdraw, but catch error if insufficient balance
          try {
            const hash = await walletClient.writeContract({
              address: proxy,
              abi: USER_PROXY_WALLET_ABI,
              functionName: 'withdraw',
              args: [amountWei],
            });
            await publicClient.waitForTransactionReceipt({ hash });
            console.log('✅ Loss deducted:', hash);
          } catch (withdrawErr) {
            console.log('⚠️ Could not deduct loss on-chain (simulated only):', withdrawErr);
          }
        }
      }

      // Update bet status
      setDemoBets(prev =>
        prev.map(bet => {
          const settled = betsToSettle.find(b => b.id === bet.id);
          return settled ? { ...bet, status: 'settled' as const } : bet;
        })
      );

      // Refresh on-chain balance
      await fetchOnChainBalance();

    } catch (err) {
      console.error('Settlement failed:', err);
      setError(err instanceof Error ? err.message : 'Settlement failed');
    } finally {
      setIsSettling(false);
    }
  }, [userAddress, getProxyAddress, walletClient, publicClient, fetchOnChainBalance]);

  // Auto-settle resolved bets on-chain
  const autoSettleOnChain = useCallback(async () => {
    const resolvedBets = demoBets.filter(
      bet => (bet.status === 'won' || bet.status === 'lost') && bet.status !== 'settled'
    );
    
    if (resolvedBets.length > 0) {
      await settleOnChain(resolvedBets);
    }
  }, [demoBets, settleOnChain]);

  // Clear old processed bets
  useEffect(() => {
    const activeIds = new Set(demoBets.map(bet => bet.id));
    processedBetsRef.current.forEach(id => {
      if (!activeIds.has(id)) {
        setTimeout(() => {
          processedBetsRef.current.delete(id);
        }, 5000);
      }
    });
  }, [demoBets]);

  // Clear settled bets after some time
  const clearSettledBets = useCallback(() => {
    setDemoBets(prev => prev.filter(bet => bet.status !== 'settled'));
  }, []);

  return {
    demoBets,
    settlementResults,
    isSettling,
    onChainBalance,
    error,
    placeBet,
    resolveBets,
    settleOnChain,
    autoSettleOnChain,
    clearSettledBets,
    fetchOnChainBalance,
  };
}
